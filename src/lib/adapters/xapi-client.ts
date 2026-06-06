import { xapiTraces } from "@/lib/mock-data";
import type { AgentAiAudit } from "@/lib/ai-types";
import type { AgentRunApiResponse } from "@/lib/agent-types";
import type { Report, RunningTask, SourceMode, WorkspaceRunContext, XApiTrace } from "@/lib/types";
import type { XApiActionSchema, XApiActionSearchResult, XApiCallResult, XApiHealthStatus, XApiRouteMode, XApiRouteResponse } from "@/lib/xapi-types";

export interface XApiClient {
  searchActions(query: string): Promise<string[]>;
  getActionSchema(action: string): Promise<Record<string, unknown>>;
  callAction(action: string, input: Record<string, unknown>): Promise<XApiTrace>;
  getTrace(taskId: string): Promise<XApiTrace[]>;
}

export interface XApiRouteClient {
  healthCheck(): Promise<XApiRouteResponse<XApiHealthStatus>>;
  searchActions(query: string): Promise<XApiRouteResponse<XApiActionSearchResult[]>>;
  getActionSchema(action: string): Promise<XApiRouteResponse<XApiActionSchema>>;
  callAction(action: string, input: Record<string, unknown>, taskId: string): Promise<XApiRouteResponse<XApiCallResult>>;
}

export interface XApiRuntimeSnapshot {
  label: "live xAPI" | "partial xAPI" | "mock fallback";
  reason: "connected" | "partial fallback" | "no XAPI_KEY" | "upstream failed" | "checking xAPI";
  response?: XApiRouteResponse<XApiHealthStatus>;
}

export interface WorkspaceAgentRunResult {
  taskId: string;
  context: WorkspaceRunContext;
  label: XApiRuntimeSnapshot["label"];
  reason: XApiRuntimeSnapshot["reason"];
  mode: XApiRouteMode;
  action: string;
  schemaFirst: boolean;
  traces: XApiTrace[];
  logs: string[];
  task?: RunningTask;
  report?: Report;
  sourceMode?: SourceMode;
  ai?: AgentAiAudit;
}

export const workspaceRunStorageKeys = {
  context: "chainpulse:last-run",
  traces: "chainpulse:last-run-traces",
  result: "chainpulse:last-run-result"
} as const;

export const mockXApiClient: XApiClient = {
  async searchActions(query) {
    const normalized = query.trim().toLowerCase();
    return xapiTraces
      .filter((trace) => normalized.length === 0 || trace.action.toLowerCase().includes(normalized) || trace.capability.toLowerCase().includes(normalized))
      .map((trace) => trace.action);
  },

  async getActionSchema(action) {
    return {
      action,
      schemaVersion: "2026-05",
      input: {
        query: "string",
        limit: "number",
        freshness: "string"
      },
      note: "Replace this mock schema with the server-side xAPI schema discovery response when XAPI_KEY is configured."
    };
  },

  async callAction(action, input) {
    const trace = xapiTraces.find((item) => item.action === action) ?? xapiTraces[0];
    return {
      ...trace,
      input
    };
  },

  async getTrace(taskId) {
    const traces = xapiTraces.filter((trace) => trace.taskId === taskId);
    return traces.length > 0 ? [...traces, ...xapiTraces.filter((trace) => trace.status === "failed")] : xapiTraces;
  }
};

export const routeXApiClient: XApiRouteClient = {
  async healthCheck() {
    return fetchJson<XApiHealthStatus>("/api/xapi/health");
  },

  async searchActions(query) {
    return fetchJson<XApiActionSearchResult[]>(`/api/xapi/search?query=${encodeURIComponent(query)}`);
  },

  async getActionSchema(action) {
    return fetchJson<XApiActionSchema>(`/api/xapi/schema?action=${encodeURIComponent(action)}`);
  },

  async callAction(action, input, taskId) {
    return fetchJson<XApiCallResult>("/api/xapi/call", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ taskId, action, input })
    });
  }
};

export async function getXApiRuntimeSnapshot(): Promise<XApiRuntimeSnapshot> {
  try {
    const response = await routeXApiClient.healthCheck();
    if (response.mode === "live") {
      return {
        label: "live xAPI",
        reason: "connected",
        response
      };
    }

    return {
      label: "mock fallback",
      reason: response.mode === "unconfigured" ? "no XAPI_KEY" : "upstream failed",
      response
    };
  } catch {
    return {
      label: "mock fallback",
      reason: "upstream failed"
    };
  }
}

export async function runWorkspaceAgent(context: WorkspaceRunContext): Promise<WorkspaceAgentRunResult> {
  const taskId = context.taskId ?? createWorkspaceTaskId();
  const query = normalizeTopicQuery(context.topic);

  try {
    const serverRun = await runWorkspaceAgentOnServer({ ...context, taskId });
    return serverRun;
  } catch {
    // Keep the browser-only fallback path available for offline demos and route test failures.
  }

  try {
    const health = await routeXApiClient.healthCheck();
    const search = await routeXApiClient.searchActions(query);
    const action = search.data?.[0]?.action ?? selectFallbackAction(query);
    const schema = await routeXApiClient.getActionSchema(action);
    const callInput = buildActionInput(context, schema.data);
    const call = await routeXApiClient.callAction(action, callInput, taskId);
    const responses = [
      { response: health, fallbackAction: "xapi.health", fallbackCapability: "xAPI", method: "GET" as const, schemaFetched: false },
      { response: search, fallbackAction: "xapi.search", fallbackCapability: "xAPI", method: "GET" as const, schemaFetched: false },
      { response: schema, fallbackAction: action, fallbackCapability: "Schema Discovery", method: "GET" as const, schemaFetched: true },
      { response: call, fallbackAction: action, fallbackCapability: call.data?.capability ?? "xAPI", method: "POST" as const, schemaFetched: true }
    ];
    const traces = responses.map((item) =>
      routeResponseToTrace({
        ...item,
        taskId,
        mode: item.response.mode
      })
    );
    const label = resolveRunLabel(responses.map((item) => item.response.mode));
    const reason = resolveRunReason(responses.map((item) => item.response));
    const logs = createRunLogs(context, label, reason, action, true, traces);

    return {
      taskId,
      context: {
        ...context,
        taskId,
        runtimeLabel: label,
        runtimeReason: reason,
        schemaFirst: true,
        traceIds: traces.map((trace) => trace.id),
        runtimeLogs: logs,
        sourceMode: label === "live xAPI" ? "live" : label === "partial xAPI" ? "partial" : "fallback"
      },
      label,
      reason,
      mode: label === "live xAPI" ? "live" : label === "partial xAPI" ? "fallback" : health.mode,
      action,
      schemaFirst: true,
      traces,
      logs,
      sourceMode: label === "live xAPI" ? "live" : label === "partial xAPI" ? "partial" : "fallback"
    };
  } catch (error) {
    const fallback = createOfflineFallbackRun(context, taskId, error);
    return fallback;
  }
}

async function runWorkspaceAgentOnServer(context: WorkspaceRunContext): Promise<WorkspaceAgentRunResult> {
  const response = await fetch("/api/agent/run", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(context),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`agent run failed: ${response.status}`);
  }

  const body = (await response.json()) as AgentRunApiResponse;
  if (!body.ok || !body.data) {
    throw new Error(body.error?.message ?? "agent run failed");
  }

  const run = body.data;
  const action = run.traces.find((trace) => trace.method === "POST" && !trace.action.startsWith("xapi."))?.action ?? "xapi.agent";
  const label: XApiRuntimeSnapshot["label"] = run.sourceMode === "live" ? "live xAPI" : run.sourceMode === "partial" ? "partial xAPI" : "mock fallback";
  const reason: XApiRuntimeSnapshot["reason"] = run.context.runtimeReason ?? (run.sourceMode === "live" ? "connected" : run.sourceMode === "partial" ? "partial fallback" : "upstream failed");

  return {
    taskId: run.task.id,
    context: run.context,
    label,
    reason,
    mode: run.sourceMode === "live" ? "live" : "fallback",
    action,
    schemaFirst: true,
    traces: run.traces,
    logs: run.task.logs,
    task: run.task,
    report: run.report,
    sourceMode: run.sourceMode,
    ai: run.ai ?? run.report.ai
  };
}

export function persistWorkspaceRun(result: WorkspaceAgentRunResult) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(workspaceRunStorageKeys.context, JSON.stringify(result.context));
  window.sessionStorage.setItem(workspaceRunStorageKeys.traces, JSON.stringify(result.traces));
  window.sessionStorage.setItem(workspaceRunStorageKeys.result, JSON.stringify(result));
}

export function readWorkspaceRunTraces(taskId?: string | null): XApiTrace[] {
  if (typeof window === "undefined") return [];
  const raw = window.sessionStorage.getItem(workspaceRunStorageKeys.traces);
  if (!raw) return [];

  try {
    const traces = JSON.parse(raw) as XApiTrace[];
    if (!Array.isArray(traces)) return [];
    return taskId ? traces.filter((trace) => trace.taskId === taskId) : traces;
  } catch {
    return [];
  }
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<XApiRouteResponse<T>> {
  const response = await fetch(url, {
    ...init,
    headers: init?.headers,
    credentials: "same-origin",
    cache: "no-store"
  });
  return response.json() as Promise<XApiRouteResponse<T>>;
}

function createWorkspaceTaskId() {
  return `cp-run-${Date.now().toString(36)}`;
}

function normalizeTopicQuery(topic: string) {
  return topic.trim().replace(/^\$/, "") || "ETH";
}

function selectFallbackAction(query: string) {
  const normalized = query.toLowerCase();
  const trace = xapiTraces.find((item) => item.action.includes("price") && normalized.includes("eth")) ?? xapiTraces[0];
  return trace.action;
}

function buildActionInput(context: WorkspaceRunContext, schema?: XApiActionSchema): Record<string, unknown> {
  const topic = normalizeTopicQuery(context.topic);
  const schemaKeys = Object.keys(schema?.input ?? {});

  if (schemaKeys.includes("symbol")) {
    return {
      symbol: topic.toUpperCase(),
      window: context.advancedFilters.evidenceWindow
    };
  }

  return {
    query: context.topic,
    mode: context.mode,
    freshness: context.advancedFilters.evidenceWindow,
    minimumConfidence: Number(context.advancedFilters.minimumConfidence),
    xapiClasses: context.advancedFilters.xapiClasses
  };
}

function routeResponseToTrace({
  response,
  taskId,
  fallbackAction,
  fallbackCapability,
  method,
  schemaFetched,
  mode
}: {
  response: XApiRouteResponse<unknown>;
  taskId: string;
  fallbackAction: string;
  fallbackCapability: string;
  method: "GET" | "POST";
  schemaFetched: boolean;
  mode: XApiRouteMode;
}): XApiTrace {
  const trace = response.trace;
  const timestamp = formatTraceTime(trace?.timestamp);
  const status = trace?.status === "fallback" || mode === "unconfigured" || mode === "fallback" ? "fallback" : trace?.status === "failed" ? "failed" : "success";

  return {
    id: trace?.id ?? `cp-xapi-local-${fallbackAction}`,
    taskId: trace?.taskId ?? taskId,
    action: trace?.action ?? fallbackAction,
    capability: trace?.capability ?? fallbackCapability,
    schemaFetched,
    inputHash: trace?.inputHash ?? zeroHash,
    outputHash: trace?.outputHash ?? zeroHash,
    outputPreview: summarizeRouteResponse(response, mode),
    startedAt: timestamp,
    endedAt: timestamp,
    status,
    latencyMs: trace?.latencyMs ?? 0,
    method,
    headers: {
      "xapi-action": trace?.action ?? fallbackAction,
      "xapi-runtime-mode": mode,
      "schema-first": schemaFetched ? "yes" : "not-required"
    },
    input: trace?.input ?? {},
    output: response.data && typeof response.data === "object" ? (response.data as Record<string, unknown>) : { value: response.data },
    error: response.error?.message ?? trace?.error,
    sourceMode: mode === "live" ? "live" : "fallback"
  };
}

function summarizeRouteResponse(response: XApiRouteResponse<unknown>, mode: XApiRouteMode) {
  if (response.error?.message) return `${mode}: ${response.error.message}`;
  if (isCallResult(response.data)) return `${mode}: ${response.data.outputPreview}`;
  if (Array.isArray(response.data)) return `${mode}: ${response.data.length} action candidates`;
  if (isSchemaResult(response.data)) return `${mode}: schema-first ${Object.keys(response.data.input).length} input fields`;
  if (isHealthResult(response.data)) return `${mode}: ${response.data.message}`;
  return `${mode}: route response captured`;
}

function resolveRunReason(responses: Array<XApiRouteResponse<unknown>>): XApiRuntimeSnapshot["reason"] {
  const liveCount = responses.filter((response) => response.mode === "live").length;
  if (liveCount === responses.length) return "connected";
  if (liveCount > 0) return "partial fallback";
  if (responses.some((response) => response.mode === "unconfigured" || response.error?.code === "XAPI_KEY_MISSING")) return "no XAPI_KEY";
  return "upstream failed";
}

function resolveRunLabel(modes: XApiRouteMode[]): XApiRuntimeSnapshot["label"] {
  const liveCount = modes.filter((mode) => mode === "live").length;
  if (liveCount === modes.length) return "live xAPI";
  if (liveCount > 0) return "partial xAPI";
  return "mock fallback";
}

function createRunLogs(context: WorkspaceRunContext, label: XApiRuntimeSnapshot["label"], reason: XApiRuntimeSnapshot["reason"], action: string, schemaFirst: boolean, traces: XApiTrace[]) {
  const timestamp = context.createdAt;
  return [
    `[${timestamp}] Intent Parser resolved topic=${context.topic} mode=${context.mode}`,
    `[${timestamp}] xAPI health check completed: ${label} / ${reason}`,
    `[${timestamp}] xAPI search selected action=${action}`,
    `[${timestamp}] schema discovery ${schemaFirst ? "completed before call" : "missing"}`,
    `[${timestamp}] call action completed with ${traces.length} runtime traces`,
    `[${timestamp}] evidence packet ready for local hash verification`
  ];
}

function createOfflineFallbackRun(context: WorkspaceRunContext, taskId: string, error: unknown): WorkspaceAgentRunResult {
  const fallbackTraces = xapiTraces
    .filter((trace) => trace.taskId === "task_eth_risk_001")
    .slice(0, 3)
    .map((trace, index) => ({
      ...trace,
      id: `cp-xapi-offline-${index + 1}`,
      taskId,
      status: "fallback" as const,
      outputPreview: `mock fallback: ${trace.outputPreview}`,
      sourceMode: "fallback" as const,
      headers: {
        ...trace.headers,
        "xapi-runtime-mode": "fallback",
        "schema-first": trace.schemaFetched ? "yes" : "no"
      },
      error: index === 0 ? formatFallbackError(error) : trace.error
    }));
  const action = fallbackTraces[0]?.action ?? "twitter.search_timeline";
  const logs = createRunLogs(context, "mock fallback", "upstream failed", action, true, fallbackTraces);

  return {
    taskId,
    context: {
      ...context,
      taskId,
      runtimeLabel: "mock fallback",
      runtimeReason: "upstream failed",
      schemaFirst: true,
      traceIds: fallbackTraces.map((trace) => trace.id),
      runtimeLogs: logs,
      sourceMode: "fallback"
    },
    label: "mock fallback",
    reason: "upstream failed",
    mode: "fallback",
    action,
    schemaFirst: true,
    traces: fallbackTraces,
    logs,
    sourceMode: "fallback"
  };
}

function formatTraceTime(timestamp?: string) {
  if (!timestamp) return new Date().toLocaleTimeString("zh-CN", { hour12: false });
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return date.toLocaleTimeString("zh-CN", { hour12: false });
}

function formatFallbackError(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 160) : String(error).slice(0, 160);
}

function isCallResult(value: unknown): value is XApiCallResult {
  return value !== null && typeof value === "object" && "outputPreview" in value;
}

function isSchemaResult(value: unknown): value is XApiActionSchema {
  return value !== null && typeof value === "object" && "input" in value && "action" in value;
}

function isHealthResult(value: unknown): value is XApiHealthStatus {
  return value !== null && typeof value === "object" && "message" in value && "upstreamAvailable" in value;
}

const zeroHash = "0x0000000000000000000000000000000000000000000000000000000000000000";
