import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createRuntimeTrace, redactSensitive } from "@/lib/server/xapi-trace";
import { normalizeCallOutput, normalizeSchemaOutput, normalizeSearchOutput } from "@/lib/server/xapi-normalize";
import type { XApiActionSchema, XApiActionSearchResult, XApiCallResult, XApiHealthStatus, XApiRouteError, XApiServiceResult } from "@/lib/xapi-types";

const execFileAsync = promisify(execFile);
const defaultHost = "action.xapi.to";
const defaultTimeoutMs = 12_000;

export type XApiRunner = (args: string[], options: { env: NodeJS.ProcessEnv; timeoutMs: number }) => Promise<unknown>;

export interface XApiServiceOptions {
  env?: Partial<NodeJS.ProcessEnv>;
  runner?: XApiRunner;
}

export interface XApiService {
  searchActions(query: string): Promise<XApiServiceResult<XApiActionSearchResult[]>>;
  getActionSchema(actionId: string): Promise<XApiServiceResult<XApiActionSchema>>;
  callAction(actionId: string, input: Record<string, unknown>, taskId?: string, options?: { schemaFetched?: boolean }): Promise<XApiServiceResult<XApiCallResult>>;
  healthCheck(): Promise<XApiServiceResult<XApiHealthStatus>>;
}

export function createXApiService(options: XApiServiceOptions = {}): XApiService {
  const env = {
    ...process.env,
    ...options.env
  };
  const runner = options.runner ?? runXApiCli;
  const apiKey = env.XAPI_KEY;
  const host = env.XAPI_ACTION_HOST || defaultHost;
  const timeoutMs = readTimeout(env.XAPI_TIMEOUT_MS);

  async function executeLive<T>({
    args,
    action,
    capability,
    input,
    taskId,
    normalize
  }: {
    args: string[];
    action: string;
    capability: string;
    input: Record<string, unknown>;
    taskId?: string;
    normalize: (raw: unknown) => T;
  }): Promise<XApiServiceResult<T>> {
    const startedAt = Date.now();

    if (!apiKey) {
      return {
        ok: false,
        mode: "unconfigured",
        trace: createRuntimeTrace({
          taskId,
          action,
          capability,
          status: "failed",
          input,
          startedAt,
          error: "no XAPI_KEY configured"
        }),
        error: {
          code: "XAPI_KEY_MISSING",
          message: "no XAPI_KEY configured",
          recoverable: true
        }
      };
    }

    try {
      const raw = await runner(args, {
        env: {
          ...env,
          XAPI_KEY: apiKey,
          XAPI_ACTION_HOST: host
        },
        timeoutMs
      });
      const data = normalize(raw);
      return {
        ok: true,
        mode: "live",
        data,
        trace: createRuntimeTrace({
          taskId,
          action,
          capability,
          status: "success",
          input,
          output: data,
          startedAt
        })
      };
    } catch (error) {
      const safeMessage = redactSensitive(error, [apiKey]);
      return {
        ok: false,
        mode: "fallback",
        trace: createRuntimeTrace({
          taskId,
          action,
          capability,
          status: "failed",
          input,
          startedAt,
          error: safeMessage
        }),
        error: upstreamError(safeMessage)
      };
    }
  }

  return {
    async healthCheck() {
      return executeLive<XApiHealthStatus>({
        args: ["config", "health", "--format", "json"],
        action: "xapi.health",
        capability: "xAPI",
        input: { host },
        normalize: () => ({
          configured: true,
          host,
          upstreamAvailable: true,
          cli: "available",
          message: "xAPI CLI health check completed"
        })
      });
    },

    async searchActions(query) {
      return executeLive<XApiActionSearchResult[]>({
        args: ["search", query, "--format", "json"],
        action: "xapi.search",
        capability: "xAPI",
        input: { query },
        normalize: (raw) => normalizeSearchOutput(raw, query)
      });
    },

    async getActionSchema(actionId) {
      return executeLive<XApiActionSchema>({
        args: ["get", actionId, "--format", "json"],
        action: actionId,
        capability: "Schema Discovery",
        input: { action: actionId },
        normalize: (raw) => normalizeSchemaOutput(actionId, raw)
      });
    },

    async callAction(actionId, input, taskId, callOptions = {}) {
      const startedAt = Date.now();

      if (!apiKey) {
        return {
          ok: false,
          mode: "unconfigured",
          trace: createRuntimeTrace({
            taskId,
            action: actionId,
            capability: inferCapability(actionId),
            status: "failed",
            input,
            startedAt,
            error: "no XAPI_KEY configured"
          }),
          error: {
            code: "XAPI_KEY_MISSING",
            message: "no XAPI_KEY configured",
            recoverable: true
          }
        };
      }

      try {
        if (!callOptions.schemaFetched) {
          await runner(["get", actionId, "--format", "json"], {
            env: {
              ...env,
              XAPI_KEY: apiKey,
              XAPI_ACTION_HOST: host
            },
            timeoutMs
          });
        }
        const raw = await runner(["call", actionId, "--input", JSON.stringify(input), "--format", "json"], {
          env: {
            ...env,
            XAPI_KEY: apiKey,
            XAPI_ACTION_HOST: host
          },
          timeoutMs
        });
        const data = normalizeCallOutput(actionId, input, raw);
        return {
          ok: true,
          mode: "live",
          data,
          trace: createRuntimeTrace({
            taskId,
            action: actionId,
            capability: data.capability,
            status: "success",
            input,
            output: data,
            startedAt
          })
        };
      } catch (error) {
        const safeMessage = redactSensitive(error, [apiKey]);
        return {
          ok: false,
          mode: "fallback",
          trace: createRuntimeTrace({
            taskId,
            action: actionId,
            capability: inferCapability(actionId),
            status: "failed",
            input,
            startedAt,
            error: safeMessage
          }),
          error: upstreamError(safeMessage)
        };
      }
    }
  };
}

export async function runXApiCli(args: string[], options: { env: NodeJS.ProcessEnv; timeoutMs: number }) {
  const { stdout } = await execFileAsync("npx", ["xapi-to", ...args], {
    env: options.env,
    timeout: options.timeoutMs,
    maxBuffer: 1024 * 1024
  });

  const text = stdout.trim();
  if (!text) return {};
  return JSON.parse(text);
}

function readTimeout(value: string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultTimeoutMs;
}

function upstreamError(message: string): XApiRouteError {
  return {
    code: "UPSTREAM_FAILED",
    message,
    recoverable: true
  };
}

function inferCapability(action: string) {
  const prefix = action.split(".")[0];
  const map: Record<string, string> = {
    ai: "AI",
    crypto: "Crypto",
    news: "News",
    twitter: "Twitter / X",
    web: "Web"
  };
  return map[prefix] ?? "xAPI";
}
