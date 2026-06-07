import { hashJson, redactSensitive } from "@/lib/server/xapi-trace";
import type { AiGenerateOptions, AiGenerateResult, AiHealthStatus } from "@/lib/ai-types";

type AiEnv = Record<string, string | undefined>;

type AiServiceOptions = {
  env?: AiEnv;
  fetcher?: typeof fetch;
};

type AiConfig = {
  provider: string;
  baseUrl: string;
  apiKey?: string;
  model: string;
  temperature: number;
  timeoutMs: number;
  enabled: boolean;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

const defaultProvider = "openai";
const defaultBaseUrl = "https://api.openai.com/v1";
const defaultModel = "gpt-4.1-mini";
const defaultTemperature = 0.2;
const defaultTimeoutMs = 30_000;
const zeroHash = "0x0000000000000000000000000000000000000000000000000000000000000000";

export function createAiService(options: AiServiceOptions = {}) {
  const env = options.env ?? process.env;
  const fetcher = options.fetcher ?? fetch;
  const config = readAiConfig(env);

  return {
    getHealth(): AiHealthStatus {
      return {
        provider: config.provider,
        model: config.model,
        baseUrl: config.baseUrl,
        enabled: config.enabled,
        configured: Boolean(config.apiKey),
        mode: config.enabled ? (config.apiKey ? "live" : "disabled") : "disabled"
      };
    },

    async generate<T = unknown>(input: AiGenerateOptions): Promise<AiGenerateResult<T>> {
      return generateAi<T>(input, config, fetcher);
    }
  };
}

export function readAiConfig(env: AiEnv = process.env): AiConfig {
  return {
    provider: env.AI_PROVIDER?.trim() || defaultProvider,
    baseUrl: (env.AI_BASE_URL?.trim() || defaultBaseUrl).replace(/\/$/, ""),
    apiKey: env.AI_API_KEY?.trim() || undefined,
    model: env.AI_MODEL?.trim() || defaultModel,
    temperature: readNumber(env.AI_TEMPERATURE, defaultTemperature),
    timeoutMs: Math.max(1_000, readNumber(env.AI_TIMEOUT_MS, defaultTimeoutMs)),
    enabled: env.AI_ENABLED?.trim().toLowerCase() !== "false"
  };
}

async function generateAi<T>(options: AiGenerateOptions, config: AiConfig, fetcher: typeof fetch): Promise<AiGenerateResult<T>> {
  const startedAt = Date.now();
  const model = options.model?.trim() || config.model;
  const temperature = typeof options.temperature === "number" ? options.temperature : config.temperature;
  const promptPayload = {
    provider: config.provider,
    model,
    system: options.system,
    user: options.user,
    schema: options.schema ?? null,
    temperature
  };
  const promptHash = hashJson(promptPayload);

  if (!config.enabled) {
    return failedResult<T>({
      config,
      model,
      mode: "disabled",
      promptHash,
      startedAt,
      code: "AI_DISABLED",
      message: "AI generation is disabled",
      recoverable: true
    });
  }

  if (!config.apiKey) {
    return failedResult<T>({
      config,
      model,
      mode: "disabled",
      promptHash,
      startedAt,
      code: "AI_API_KEY_MISSING",
      message: "AI_API_KEY is not configured",
      recoverable: true
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetcher(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model,
        temperature,
        messages: [
          { role: "system", content: options.schema ? `${options.system}\n\nIMPORTANT: You must respond with valid JSON only. No explanation, no markdown, just a JSON object matching this schema: ${JSON.stringify(options.schema)}` : options.system },
          { role: "user", content: options.user }
        ],
        ...(options.schema ? { response_format: { type: "json_object" } } : {})
      }),
      signal: controller.signal
    });

    const raw = await response.json().catch(() => null);
    if (!response.ok) {
      return failedResult<T>({
        config,
        model,
        mode: "fallback",
        promptHash,
        startedAt,
        code: "AI_UPSTREAM_ERROR",
        message: redactSensitive(readErrorMessage(raw) ?? `AI upstream returned ${response.status}`, [config.apiKey]),
        recoverable: true,
        raw
      });
    }

    const content = readContent(raw);
    if (!content) {
      return failedResult<T>({
        config,
        model,
        mode: "fallback",
        promptHash,
        startedAt,
        code: "AI_EMPTY_OUTPUT",
        message: "AI response did not include message content",
        recoverable: true,
        raw
      });
    }

    const parsed = parseJsonContent(content);
    if (!parsed.ok) {
      return failedResult<T>({
        config,
        model,
        mode: "fallback",
        promptHash,
        startedAt,
        code: "AI_INVALID_JSON",
        message: parsed.message,
        recoverable: true,
        raw
      });
    }

    return {
      ok: true,
      mode: "live",
      provider: config.provider,
      model,
      baseUrl: config.baseUrl,
      data: parsed.value as T,
      raw,
      trace: {
        promptHash,
        outputHash: hashJson(parsed.value),
        latencyMs: Math.max(0, Date.now() - startedAt)
      }
    };
  } catch (error) {
    return failedResult<T>({
      config,
      model,
      mode: "fallback",
      promptHash,
      startedAt,
      code: isAbortError(error) ? "AI_TIMEOUT" : "AI_REQUEST_FAILED",
      message: redactSensitive(error instanceof Error ? error.message : String(error), [config.apiKey]),
      recoverable: true
    });
  } finally {
    clearTimeout(timeout);
  }
}

function failedResult<T = unknown>({
  config,
  model,
  mode,
  promptHash,
  startedAt,
  code,
  message,
  recoverable,
  raw
}: {
  config: AiConfig;
  model: string;
  mode: "fallback" | "disabled";
  promptHash: string;
  startedAt: number;
  code: string;
  message: string;
  recoverable: boolean;
  raw?: unknown;
}): AiGenerateResult<T> {
  return {
    ok: false,
    mode,
    provider: config.provider,
    model,
    baseUrl: config.baseUrl,
    raw,
    error: {
      code,
      message,
      recoverable
    },
    trace: {
      promptHash,
      outputHash: zeroHash,
      latencyMs: Math.max(0, Date.now() - startedAt)
    }
  };
}

function parseJsonContent(content: string): { ok: true; value: unknown } | { ok: false; message: string } {
  const trimmed = content.trim();
  try {
    return { ok: true, value: JSON.parse(trimmed) };
  } catch {
    // Try to extract JSON from markdown code blocks
    const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      try {
        return { ok: true, value: JSON.parse(codeBlockMatch[1].trim()) };
      } catch {
        // fall through
      }
    }
    // Try to extract first {...} block
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return { ok: true, value: JSON.parse(jsonMatch[0]) };
      } catch {
        // fall through
      }
    }
    return { ok: false, message: `AI response was not valid JSON: ${trimmed.slice(0, 100)}` };
  }
}

function readContent(value: unknown) {
  const response = value as ChatCompletionResponse | null;
  return response?.choices?.[0]?.message?.content?.trim();
}

function readErrorMessage(value: unknown) {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const error = record.error;
  if (error && typeof error === "object" && typeof (error as Record<string, unknown>).message === "string") {
    return (error as Record<string, string>).message;
  }
  return undefined;
}

function readNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}
