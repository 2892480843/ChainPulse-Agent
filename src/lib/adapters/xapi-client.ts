import { xapiTraces } from "@/lib/mock-data";
import type { XApiTrace } from "@/lib/types";
import type { XApiActionSchema, XApiActionSearchResult, XApiCallResult, XApiHealthStatus, XApiRouteResponse } from "@/lib/xapi-types";

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
  label: "live xAPI" | "mock fallback";
  reason: "connected" | "no XAPI_KEY" | "upstream failed" | "checking xAPI";
  response?: XApiRouteResponse<XApiHealthStatus>;
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

async function fetchJson<T>(url: string, init?: RequestInit): Promise<XApiRouteResponse<T>> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store"
  });
  return response.json() as Promise<XApiRouteResponse<T>>;
}
