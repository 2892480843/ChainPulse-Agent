import { afterEach, describe, expect, it } from "vitest";
import { GET as healthGET } from "@/app/api/xapi/health/route";
import { POST as callPOST } from "@/app/api/xapi/call/route";
import { GET as schemaGET } from "@/app/api/xapi/schema/route";
import { GET as searchGET } from "@/app/api/xapi/search/route";
import { createXApiService } from "@/lib/server/xapi-service";
import type { XApiHttpOptions } from "@/lib/server/xapi-service";

async function readJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

// MCP response wrapper
function mcpOkResponse(data: unknown): unknown {
  return {
    result: {
      content: [{ type: "text", text: JSON.stringify(data) }]
    },
    jsonrpc: "2.0",
    id: 1
  };
}

describe("xAPI route handlers", () => {
  afterEach(() => {
    delete process.env.AGENT_OPERATOR_TOKEN;
    delete process.env.XAPI_ALLOWED_ACTIONS;
    delete process.env.XAPI_ROUTE_RATE_LIMIT_PER_MIN;
  });

  it("falls back when XAPI_KEY is not configured", async () => {
    delete process.env.XAPI_KEY;

    const response = await healthGET();
    const body = await readJson(response);

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.mode).toBe("unconfigured");
    expect((body.data as Record<string, unknown>).configured).toBe(false);
    expect((body.trace as Record<string, unknown>).status).toBe("fallback");
  });

  it("returns 400 for empty search query", async () => {
    const response = await searchGET(new Request("http://localhost/api/xapi/search?query="));
    const body = await readJson(response);

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect((body.error as Record<string, unknown>).code).toBe("BAD_REQUEST");
    expect((body.error as Record<string, unknown>).recoverable).toBe(true);
  });

  it("returns unconfigured when XAPI_KEY is missing for search", async () => {
    delete process.env.XAPI_KEY;

    const response = await searchGET(new Request("http://localhost/api/xapi/search?query=crypto"));
    const body = await readJson(response);

    expect(response.status).toBe(200);
    expect(body.ok).toBe(false);
    expect(body.mode).toBe("unconfigured");
    expect((body.error as Record<string, unknown>).code).toBe("XAPI_KEY_MISSING");
  });

  it("requires an operator token when configured", async () => {
    process.env.AGENT_OPERATOR_TOKEN = "test-operator-token";

    const response = await searchGET(new Request("http://localhost/api/xapi/search?query=crypto"));
    const body = await readJson(response);

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect((body.error as Record<string, unknown>).code).toBe("UNAUTHORIZED");
  });

  it("rejects xAPI actions outside the allowlist", async () => {
    process.env.XAPI_ALLOWED_ACTIONS = "crypto.token.price";

    const response = await schemaGET(new Request("http://localhost/api/xapi/schema?action=twitter.search_timeline"));
    const body = await readJson(response);

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect((body.error as Record<string, unknown>).code).toBe("ACTION_NOT_ALLOWED");
  });

  it("returns 400 when schema action is missing", async () => {
    const response = await schemaGET(new Request("http://localhost/api/xapi/schema"));
    const body = await readJson(response);

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect((body.error as Record<string, unknown>).code).toBe("BAD_REQUEST");
  });

  it("returns 400 for invalid call body", async () => {
    const response = await callPOST(
      new Request("http://localhost/api/xapi/call", {
        method: "POST",
        body: JSON.stringify({ action: "crypto.token.price" })
      })
    );
    const body = await readJson(response);

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect((body.error as Record<string, unknown>).code).toBe("BAD_REQUEST");
  });

  it("does not leak secrets when upstream execution fails", async () => {
    const service = createXApiService({
      env: {
        XAPI_KEY: "unit-test-secret-123",
        XAPI_ACTION_HOST: "action.xapi.to"
      },
      runner: async (_path: string, _options: XApiHttpOptions) => {
        throw new Error("upstream rejected Authorization: Bearer unit-test-secret-123");
      }
    });

    const result = await service.callAction("crypto.token.price", { token: "ETH", chain: "eth" }, "task_eth_risk_001");

    expect(result.mode).toBe("fallback");
    expect(JSON.stringify(result)).not.toContain("unit-test-secret-123");
    expect(result.error?.message).toContain("[redacted]");
    expect(result.trace.status).toBe("fallback");
  });

  it("discovers the action schema before calling the action via MCP", async () => {
    const paths: string[] = [];
    const service = createXApiService({
      env: {
        XAPI_KEY: "unit-live-for-order-test",
        XAPI_ACTION_HOST: "action.xapi.to",
        XAPI_MCP_HOST: "mcp.xapi.to"
      },
      runner: async (path: string, _options: XApiHttpOptions) => {
        paths.push(path);
        // Schema GET for mcp path
        if (path.startsWith("/mcp")) {
          const body = _options.body as Record<string, unknown> | undefined;
          const params = body?.params as Record<string, unknown> | undefined;
          const toolName = params?.name;
          if (toolName === "GET") {
            return mcpOkResponse({
              id: "crypto.token.price",
              parameters: { type: "object", required: ["token", "chain"], properties: { token: { type: "string" }, chain: { type: "string" } } }
            });
          }
          // CALL
          return mcpOkResponse([{ symbol: "ETH", current_price_usd: "1565" }]);
        }
        // Health
        return { status: "ok" };
      }
    });

    const result = await service.callAction("crypto.token.price", { token: "ETH", chain: "eth" }, "task_order_test");

    expect(result.mode).toBe("live");
    expect(paths.some((p) => p.startsWith("/mcp"))).toBe(true);
  });
});
