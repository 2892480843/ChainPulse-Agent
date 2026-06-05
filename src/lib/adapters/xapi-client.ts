import { xapiTraces } from "@/lib/mock-data";
import type { XApiTrace } from "@/lib/types";

export interface XApiClient {
  searchActions(query: string): Promise<string[]>;
  getActionSchema(action: string): Promise<Record<string, unknown>>;
  callAction(action: string, input: Record<string, unknown>): Promise<XApiTrace>;
  getTrace(taskId: string): Promise<XApiTrace[]>;
}

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

// Future integration point:
// Replace mockXApiClient with a server-only implementation that injects XAPI_KEY
// from environment variables and proxies requests through Next.js route handlers.
