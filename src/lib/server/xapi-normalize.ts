import { xapiTraces } from "@/lib/mock-data";
import type { XApiActionSchema, XApiActionSearchResult, XApiCallResult } from "@/lib/xapi-types";

export function fallbackSearchActions(query: string): XApiActionSearchResult[] {
  const normalized = query.trim().toLowerCase();
  const matched = xapiTraces.filter((trace) => {
    const haystack = `${trace.action} ${trace.capability} ${trace.outputPreview}`.toLowerCase();
    return normalized.length === 0 || haystack.includes(normalized);
  });
  const source = matched.length > 0 ? matched : xapiTraces;
  const unique = new Map<string, XApiActionSearchResult>();

  for (const trace of source) {
    unique.set(trace.action, {
      action: trace.action,
      capability: trace.capability,
      description: trace.outputPreview
    });
  }

  return [...unique.values()];
}

export function fallbackActionSchema(action: string): XApiActionSchema {
  const trace = findTrace(action);
  return {
    action,
    capability: trace?.capability,
    schemaVersion: "mock-2026-06",
    input: inferInputSchema(trace?.input ?? {}),
    raw: {
      source: "mock fallback",
      note: "Fallback schema generated from local mock trace data."
    }
  };
}

export function fallbackCallResult(action: string, input: Record<string, unknown>): XApiCallResult {
  const trace = findTrace(action) ?? xapiTraces[0];
  return {
    action,
    capability: trace.capability,
    output: {
      ...trace.output,
      fallbackInput: input
    },
    outputPreview: trace.outputPreview,
    raw: {
      source: "mock fallback",
      traceId: trace.id
    }
  };
}

export function normalizeSearchOutput(raw: unknown, query: string): XApiActionSearchResult[] {
  const candidates = Array.isArray(raw) ? raw : getArrayProperty(raw, ["actions", "data", "results", "items"]);
  if (!candidates) return fallbackSearchActions(query);

  return candidates
    .map((item) => normalizeSearchItem(item))
    .filter((item): item is XApiActionSearchResult => Boolean(item?.action));
}

export function normalizeSchemaOutput(action: string, raw: unknown): XApiActionSchema {
  const record = isRecord(raw) ? raw : {};
  const input = getInputSchema(record);
  const capability = typeof record.capability === "string" ? record.capability : findTrace(action)?.capability;
  const schemaVersion = typeof record.schemaVersion === "string" ? record.schemaVersion : typeof record.version === "string" ? record.version : undefined;

  return {
    action,
    capability,
    schemaVersion,
    input,
    raw
  };
}

export function normalizeCallOutput(action: string, input: Record<string, unknown>, raw: unknown): XApiCallResult {
  const trace = findTrace(action);
  const output = isRecord(raw) ? raw : { value: raw };
  return {
    action,
    capability: trace?.capability ?? inferCapability(action),
    output,
    outputPreview: summarizeOutput(output),
    raw: {
      input,
      output
    }
  };
}

function findTrace(action: string) {
  return xapiTraces.find((trace) => trace.action === action);
}

function inferInputSchema(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => {
      if (Array.isArray(value)) return [key, "array"];
      if (value === null) return [key, "null"];
      return [key, typeof value];
    })
  );
}

function normalizeSearchItem(item: unknown): XApiActionSearchResult | null {
  if (typeof item === "string") {
    return {
      action: item,
      capability: inferCapability(item)
    };
  }
  if (!isRecord(item)) return null;

  const action = getStringProperty(item, ["action", "actionId", "id", "name"]);
  if (!action) return null;

  return {
    action,
    capability: getStringProperty(item, ["capability", "source", "category"]) ?? inferCapability(action),
    description: getStringProperty(item, ["description", "summary", "title"])
  };
}

function getInputSchema(record: Record<string, unknown>) {
  const direct = record.input;
  if (isRecord(direct)) return direct;
  const schema = record.schema;
  if (isRecord(schema)) {
    if (isRecord(schema.input)) return schema.input;
    if (isRecord(schema.properties)) return schema.properties;
  }
  if (isRecord(record.parameters)) return record.parameters;
  return {};
}

function getArrayProperty(value: unknown, keys: string[]) {
  if (!isRecord(value)) return null;
  for (const key of keys) {
    if (Array.isArray(value[key])) return value[key] as unknown[];
  }
  return null;
}

function getStringProperty(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (typeof record[key] === "string") return record[key] as string;
  }
  return undefined;
}

function inferCapability(action: string) {
  const prefix = action.split(".")[0];
  const map: Record<string, string> = {
    ai: "AI",
    crypto: "Crypto",
    news: "News",
    reddit: "Reddit",
    sms: "SMS",
    tiktok: "TikTok",
    twitter: "Twitter / X",
    web: "Web"
  };
  return map[prefix] ?? "xAPI";
}

function summarizeOutput(output: Record<string, unknown>) {
  const keys = Object.keys(output);
  if (keys.length === 0) return "empty JSON response";
  return `${keys.slice(0, 4).join(", ")}${keys.length > 4 ? "..." : ""}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
