import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST as runPOST } from "@/app/api/agent/run/route";
import { GET as aiHealthGET } from "@/app/api/ai/health/route";
import { DELETE as operatorSessionDELETE, GET as operatorSessionGET, POST as operatorSessionPOST } from "@/app/api/operator/session/route";
import { POST as reportAttestationPOST } from "@/app/api/reports/[id]/attestation/route";
import { GET as reportsGET } from "@/app/api/reports/route";
import { GET as reportGET } from "@/app/api/reports/[id]/route";
import { GET as tasksGET } from "@/app/api/tasks/route";
import { GET as taskGET } from "@/app/api/tasks/[id]/route";
import { GET as tracesGET } from "@/app/api/traces/route";
import { setAgentStorePathForTest } from "@/lib/server/agent-store";
import { operatorCookieName } from "@/lib/server/api-guard";
import type { AgentCollectionResponse, AgentEntityResponse, AgentRunApiResponse, StoredAgentRun } from "@/lib/agent-types";
import type { Report, RunningTask, XApiTrace } from "@/lib/types";

let runtimeDir = "";
let previousXApiKey: string | undefined;
let previousAgentToken: string | undefined;
let previousAllowedActions: string | undefined;
let previousAgentRateLimit: string | undefined;
let previousAiKey: string | undefined;
let previousAiEnabled: string | undefined;
let previousAiRateLimit: string | undefined;

async function readJson<T>(response: Response) {
  return response.json() as Promise<T>;
}

describe("agent persistence routes", () => {
  beforeEach(async () => {
    runtimeDir = await mkdtemp(path.join(tmpdir(), "chainpulse-agent-"));
    previousXApiKey = process.env.XAPI_KEY;
    previousAgentToken = process.env.AGENT_OPERATOR_TOKEN;
    previousAllowedActions = process.env.XAPI_ALLOWED_ACTIONS;
    previousAgentRateLimit = process.env.AGENT_RUN_RATE_LIMIT_PER_MIN;
    previousAiKey = process.env.AI_API_KEY;
    previousAiEnabled = process.env.AI_ENABLED;
    previousAiRateLimit = process.env.AI_ROUTE_RATE_LIMIT_PER_MIN;
    setAgentStorePathForTest(path.join(runtimeDir, "store.json"));
    delete process.env.XAPI_KEY;
    delete process.env.AGENT_OPERATOR_TOKEN;
    delete process.env.XAPI_ALLOWED_ACTIONS;
    delete process.env.AGENT_RUN_RATE_LIMIT_PER_MIN;
    delete process.env.AI_API_KEY;
    delete process.env.AI_ENABLED;
    delete process.env.AI_ROUTE_RATE_LIMIT_PER_MIN;
  });

  afterEach(async () => {
    setAgentStorePathForTest(null);

    if (previousXApiKey === undefined) {
      delete process.env.XAPI_KEY;
    } else {
      process.env.XAPI_KEY = previousXApiKey;
    }
    if (previousAgentToken === undefined) {
      delete process.env.AGENT_OPERATOR_TOKEN;
    } else {
      process.env.AGENT_OPERATOR_TOKEN = previousAgentToken;
    }
    if (previousAllowedActions === undefined) {
      delete process.env.XAPI_ALLOWED_ACTIONS;
    } else {
      process.env.XAPI_ALLOWED_ACTIONS = previousAllowedActions;
    }
    if (previousAgentRateLimit === undefined) {
      delete process.env.AGENT_RUN_RATE_LIMIT_PER_MIN;
    } else {
      process.env.AGENT_RUN_RATE_LIMIT_PER_MIN = previousAgentRateLimit;
    }
    if (previousAiKey === undefined) {
      delete process.env.AI_API_KEY;
    } else {
      process.env.AI_API_KEY = previousAiKey;
    }
    if (previousAiEnabled === undefined) {
      delete process.env.AI_ENABLED;
    } else {
      process.env.AI_ENABLED = previousAiEnabled;
    }
    if (previousAiRateLimit === undefined) {
      delete process.env.AI_ROUTE_RATE_LIMIT_PER_MIN;
    } else {
      process.env.AI_ROUTE_RATE_LIMIT_PER_MIN = previousAiRateLimit;
    }

    await rm(runtimeDir, { recursive: true, force: true });
  });

  it("persists a multi-action run and exposes task, report, and trace records", async () => {
    const response = await runPOST(
      new Request("http://localhost/api/agent/run", {
        method: "POST",
        body: JSON.stringify({
          topic: "$ETH",
          mode: "Risk Scan",
          advancedFilters: {
            evidenceWindow: "24h",
            minimumConfidence: "0.65",
            xapiClasses: "Twitter + Web + News + Crypto"
          },
          createdAt: "12:00:00"
        })
      })
    );
    const body = await readJson<AgentRunApiResponse>(response);

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data?.sourceMode).toBe("fallback");
    expect(body.data?.traces.filter((trace) => trace.method === "POST").length).toBeGreaterThanOrEqual(3);
    expect(body.data?.report.evidence.length).toBeGreaterThanOrEqual(3);
    expect(body.data?.task.reportId).toBe(body.data?.report.id);
    expect(body.data?.report.reportHash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(body.data?.report.evidenceHash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(body.data?.ai?.model).toBeTruthy();
    expect(body.data?.ai?.promptHash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(body.data?.ai?.outputHash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(body.data?.ai?.plan?.selectedTools.length).toBeGreaterThanOrEqual(3);
    expect(body.data?.report.ai?.mode).not.toBe("live");

    const taskId = body.data?.task.id ?? "";
    const reportId = body.data?.report.id ?? "";

    const tasks = await readJson<AgentCollectionResponse<RunningTask>>(await tasksGET());
    expect(tasks.data.map((task) => task.id)).toContain(taskId);

    const taskDetail = await readJson<AgentEntityResponse<StoredAgentRun>>(
      await taskGET(new Request(`http://localhost/api/tasks/${taskId}`), { params: Promise.resolve({ id: taskId }) })
    );
    expect(taskDetail.data?.task.id).toBe(taskId);
    expect(taskDetail.data?.report.id).toBe(reportId);

    const reportList = await readJson<AgentCollectionResponse<Report>>(await reportsGET());
    expect(reportList.data.map((report) => report.id)).toContain(reportId);

    const reportDetail = await readJson<AgentEntityResponse<StoredAgentRun>>(
      await reportGET(new Request(`http://localhost/api/reports/${reportId}`), { params: Promise.resolve({ id: reportId }) })
    );
    expect(reportDetail.data?.report.taskId).toBe(taskId);

    const traces = await readJson<AgentCollectionResponse<XApiTrace>>(await tracesGET(new Request(`http://localhost/api/traces?task=${taskId}`)));
    expect(traces.data.length).toBe(body.data?.traces.length);
    expect(traces.data.every((trace) => trace.taskId === taskId)).toBe(true);
  });

  it("requires an operator token when configured", async () => {
    process.env.AGENT_OPERATOR_TOKEN = "test-operator-token";

    const response = await runPOST(
      new Request("http://localhost/api/agent/run", {
        method: "POST",
        body: JSON.stringify({
          topic: "$ETH",
          mode: "Risk Scan",
          advancedFilters: {
            evidenceWindow: "24h",
            minimumConfidence: "0.65",
            xapiClasses: "Twitter + Web + News + Crypto"
          },
          createdAt: "12:00:00"
        })
      })
    );
    const body = await readJson<AgentRunApiResponse>(response);

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error?.code).toBe("UNAUTHORIZED");
  });

  it("protects stored read APIs when an operator token is configured", async () => {
    process.env.AGENT_OPERATOR_TOKEN = "test-operator-token";

    const blocked = await reportsGET();
    const blockedBody = await readJson<AgentRunApiResponse>(blocked);
    expect(blocked.status).toBe(401);
    expect(blockedBody.error?.code).toBe("UNAUTHORIZED");

    const allowed = await reportsGET(
      new Request("http://localhost/api/reports", {
        headers: {
          cookie: `${operatorCookieName}=test-operator-token`
        }
      })
    );
    const allowedBody = await readJson<AgentCollectionResponse<Report>>(allowed);
    expect(allowed.status).toBe(200);
    expect(allowedBody.ok).toBe(true);
  });

  it("sets an HttpOnly operator cookie through the session route", async () => {
    process.env.AGENT_OPERATOR_TOKEN = "test-operator-token";

    const response = await operatorSessionPOST(
      new Request("http://localhost/api/operator/session", {
        method: "POST",
        body: JSON.stringify({
          token: "test-operator-token"
        })
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain(operatorCookieName);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  });

  it("persists an attestation receipt back to the stored report", async () => {
    const runResponse = await runPOST(
      new Request("http://localhost/api/agent/run", {
        method: "POST",
        body: JSON.stringify({
          topic: "$ETH",
          mode: "Risk Scan",
          advancedFilters: {
            evidenceWindow: "24h",
            minimumConfidence: "0.65",
            xapiClasses: "Twitter + Web + News + Crypto"
          },
          createdAt: "12:00:00"
        })
      })
    );
    const runBody = await readJson<AgentRunApiResponse>(runResponse);
    const report = runBody.data?.report;
    expect(report).toBeTruthy();

    const receipt = {
      reportHash: report?.reportHash ?? "",
      evidenceHash: report?.evidenceHash ?? "",
      txHash: "0x1111111111111111111111111111111111111111111111111111111111111111",
      walletAddress: "0x0000000000000000000000000000000000000002",
      block: "123",
      timestamp: "2026-06-06T00:00:00.000Z",
      chainId: 11155111,
      contractAddress: "0x0000000000000000000000000000000000000003",
      reportId: "2",
      metadataURI: `chainpulse://reports/${report?.id}`,
      explorerTxUrl: "https://sepolia.etherscan.io/tx/0x1111111111111111111111111111111111111111111111111111111111111111",
      onChainStatus: "confirmed" as const
    };

    const response = await reportAttestationPOST(
      new Request(`http://localhost/api/reports/${report?.id}/attestation`, {
        method: "POST",
        body: JSON.stringify(receipt)
      }),
      { params: Promise.resolve({ id: report?.id ?? "" }) }
    );
    const body = await readJson<AgentEntityResponse<Report>>(response);

    expect(response.status).toBe(200);
    expect(body.data?.attestation?.txHash).toBe(receipt.txHash);
    expect(body.data?.attestation?.walletAddress).toBe(receipt.walletAddress);

    const detail = await readJson<AgentEntityResponse<StoredAgentRun>>(
      await reportGET(new Request(`http://localhost/api/reports/${report?.id}`), { params: Promise.resolve({ id: report?.id ?? "" }) })
    );
    expect(detail.data?.report.attestation?.onChainStatus).toBe("confirmed");
  });

  it("reports operator session status without leaking the configured token", async () => {
    process.env.AGENT_OPERATOR_TOKEN = "test-operator-token";

    const locked = await operatorSessionGET(new Request("http://localhost/api/operator/session"));
    const lockedBody = await readJson<{ ok: boolean; data: { configured: boolean; authenticated: boolean; mode: string } }>(locked);
    expect(locked.status).toBe(200);
    expect(lockedBody.data).toEqual({
      configured: true,
      authenticated: false,
      mode: "locked"
    });
    expect(JSON.stringify(lockedBody)).not.toContain("test-operator-token");

    const authenticated = await operatorSessionGET(
      new Request("http://localhost/api/operator/session", {
        headers: {
          cookie: `${operatorCookieName}=test-operator-token`
        }
      })
    );
    const authenticatedBody = await readJson<{ ok: boolean; data: { configured: boolean; authenticated: boolean; mode: string } }>(authenticated);
    expect(authenticatedBody.data).toEqual({
      configured: true,
      authenticated: true,
      mode: "authenticated"
    });
    expect(JSON.stringify(authenticatedBody)).not.toContain("test-operator-token");

    const closed = await operatorSessionDELETE();
    const closedBody = await readJson<{ ok: boolean; data: { configured: boolean; authenticated: boolean; mode: string } }>(closed);
    expect(closedBody.data).toEqual({
      configured: true,
      authenticated: false,
      mode: "locked"
    });
  });

  it("protects AI health when an operator token is configured", async () => {
    process.env.AGENT_OPERATOR_TOKEN = "test-operator-token";

    const blocked = await aiHealthGET(new Request("http://localhost/api/ai/health"));
    const blockedBody = await readJson<AgentRunApiResponse>(blocked);
    expect(blocked.status).toBe(401);
    expect(blockedBody.error?.code).toBe("UNAUTHORIZED");

    const allowed = await aiHealthGET(
      new Request("http://localhost/api/ai/health", {
        headers: {
          cookie: `${operatorCookieName}=test-operator-token`
        }
      })
    );
    const allowedBody = await readJson<{ ok: boolean; data: { configured: boolean; model: string } }>(allowed);
    expect(allowed.status).toBe(200);
    expect(allowedBody.ok).toBe(true);
    expect(allowedBody.data.configured).toBe(false);
    expect(JSON.stringify(allowedBody)).not.toContain("AI_API_KEY");
  });

  it("serializes concurrent writes without dropping a run", async () => {
    const createRequest = (taskId: string) =>
      new Request("http://localhost/api/agent/run", {
        method: "POST",
        body: JSON.stringify({
          taskId,
          topic: taskId.endsWith("1") ? "$ETH" : "$ZEC",
          mode: "Risk Scan",
          advancedFilters: {
            evidenceWindow: "24h",
            minimumConfidence: "0.65",
            xapiClasses: "Twitter + Web + News + Crypto"
          },
          createdAt: "12:00:00"
        })
      });

    const [first, second] = await Promise.all([runPOST(createRequest("task_concurrent_1")), runPOST(createRequest("task_concurrent_2"))]);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    const tasks = await readJson<AgentCollectionResponse<RunningTask>>(await tasksGET());
    expect(tasks.data.map((task) => task.id)).toEqual(expect.arrayContaining(["task_concurrent_1", "task_concurrent_2"]));
  });
});
