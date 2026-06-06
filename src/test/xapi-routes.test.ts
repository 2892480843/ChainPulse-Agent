import { afterEach, describe, expect, it } from "vitest";
import { GET as healthGET } from "@/app/api/xapi/health/route";
import { POST as callPOST } from "@/app/api/xapi/call/route";
import { GET as schemaGET } from "@/app/api/xapi/schema/route";
import { GET as searchGET } from "@/app/api/xapi/search/route";
import { createXApiService } from "@/lib/server/xapi-service";

async function readJson(response: Response) {
  return response.json() as Promise<Record<string, any>>;
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
    expect(body.data.configured).toBe(false);
    expect(body.trace.status).toBe("fallback");
  });

  it("returns 400 for empty search query", async () => {
    const response = await searchGET(new Request("http://localhost/api/xapi/search?query="));
    const body = await readJson(response);

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("BAD_REQUEST");
    expect(body.error.recoverable).toBe(true);
  });

  it("returns fallback search results without XAPI_KEY", async () => {
    delete process.env.XAPI_KEY;

    const response = await searchGET(new Request("http://localhost/api/xapi/search?query=crypto"));
    const body = await readJson(response);

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.mode).toBe("unconfigured");
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.trace.status).toBe("fallback");
  });

  it("requires an operator token when configured", async () => {
    process.env.AGENT_OPERATOR_TOKEN = "test-operator-token";

    const response = await searchGET(new Request("http://localhost/api/xapi/search?query=crypto"));
    const body = await readJson(response);

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects xAPI actions outside the allowlist", async () => {
    process.env.XAPI_ALLOWED_ACTIONS = "crypto.token.price";

    const response = await schemaGET(new Request("http://localhost/api/xapi/schema?action=twitter.search_timeline"));
    const body = await readJson(response);

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("ACTION_NOT_ALLOWED");
  });


  it("returns 400 when schema action is missing", async () => {
    const response = await schemaGET(new Request("http://localhost/api/xapi/schema"));
    const body = await readJson(response);

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("BAD_REQUEST");
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
    expect(body.error.code).toBe("BAD_REQUEST");
  });

  it("does not leak secrets when upstream execution fails", async () => {
    const service = createXApiService({
      env: {
        XAPI_KEY: "unit-test-secret-123",
        XAPI_ACTION_HOST: "action.xapi.to"
      },
      runner: async () => {
        throw new Error("upstream rejected Authorization: Bearer unit-test-secret-123");
      }
    });

    const result = await service.callAction("crypto.token.price", { symbol: "ETH" }, "task_eth_risk_001");

    expect(result.mode).toBe("fallback");
    expect(JSON.stringify(result)).not.toContain("unit-test-secret-123");
    expect(result.error?.message).toContain("[redacted]");
    expect(result.trace.status).toBe("fallback");
  });

  it("discovers the action schema before calling the action", async () => {
    const calls: string[][] = [];
    const service = createXApiService({
      env: {
        XAPI_KEY: "unit-live-for-order-test",
        XAPI_ACTION_HOST: "action.xapi.to"
      },
      runner: async (args) => {
        calls.push(args);
        if (args[0] === "get") {
          return {
            action: "crypto.token.price",
            schema: {
              input: {
                symbol: "string"
              }
            }
          };
        }
        return {
          symbol: "ETH",
          volatility24h: 2.8
        };
      }
    });

    const result = await service.callAction("crypto.token.price", { symbol: "ETH" }, "task_order_test");

    expect(result.mode).toBe("live");
    expect(calls.map((args) => args[0])).toEqual(["get", "call"]);
    expect(calls[0]).toEqual(["get", "crypto.token.price", "--format", "json"]);
    expect(calls[1][0]).toBe("call");
  });
});
