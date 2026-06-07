import { NextResponse } from "next/server";
import { runPersistentWorkspaceAgent } from "@/lib/server/agent-runner";
import { saveAgentRun, saveRunningTaskPlaceholder } from "@/lib/server/agent-store";
import { authorizeOperator, enforceJsonBodySize, enforceRateLimit, rejectJson } from "@/lib/server/api-guard";
import { isRecord } from "@/lib/server/xapi-route";
import type { AgentRunApiResponse } from "@/lib/agent-types";
import type { WorkspaceAdvancedFilters, WorkspaceRunContext } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Keep background jobs alive (module-level, survives across requests on local server)
const activeJobs = new Map<string, Promise<void>>();

export async function POST(request: Request) {
  const authFailure = authorizeOperator(request);
  if (authFailure) return rejectJson(authFailure);

  const rateLimitFailure = enforceRateLimit(request, "agent-run");
  if (rateLimitFailure) return rejectJson(rateLimitFailure);

  const body = await request.json().catch(() => null);
  const bodySizeFailure = enforceJsonBodySize(body, 8192);
  if (bodySizeFailure) return rejectJson(bodySizeFailure);

  const context = parseWorkspaceContext(body);

  if (!context) {
    return NextResponse.json<AgentRunApiResponse>(
      { ok: false, error: { code: "BAD_REQUEST", message: "topic, mode, advancedFilters, and createdAt are required" } },
      { status: 400 }
    );
  }

  const taskId = context.taskId ?? `cp-run-${Date.now().toString(36)}`;
  const contextWithId: WorkspaceRunContext = { ...context, taskId };

  // If already running, return immediately
  if (activeJobs.has(taskId)) {
    return NextResponse.json<AgentRunApiResponse>({ ok: true, data: { taskId } as never });
  }

  // 1. Save "Running" placeholder SYNCHRONOUSLY so tasks page can see it right away
  await saveRunningTaskPlaceholder(taskId, {
    topic: context.topic,
    mode: context.mode,
    createdAt: context.createdAt
  });

  // In test environments, run synchronously so tests can assert on returned data
  const isTestEnv = process.env.VITEST === "true" || process.env.NODE_ENV === "test";

  if (isTestEnv) {
    try {
      const run = await runPersistentWorkspaceAgent(contextWithId);
      await saveAgentRun(run);
      return NextResponse.json<AgentRunApiResponse>({ ok: true, data: run });
    } finally {
      activeJobs.delete(taskId);
    }
  }

  // 2. Start agent in background — do NOT await it
  const job: Promise<void> = runPersistentWorkspaceAgent(contextWithId)
    .then((run) => saveAgentRun(run))
    .then(() => undefined)
    .catch((err) => {
      console.error(`[Agent] run failed for ${taskId}:`, err instanceof Error ? err.message : err);
    })
    .finally(() => {
      activeJobs.delete(taskId);
    });

  activeJobs.set(taskId, job);

  // 3. Return the taskId immediately — client can redirect right away
  return NextResponse.json<AgentRunApiResponse>({
    ok: true,
    data: { taskId, status: "Running" } as never
  });
}

function parseWorkspaceContext(value: unknown): WorkspaceRunContext | null {
  if (!isRecord(value)) return null;
  if (typeof value.topic !== "string" || typeof value.mode !== "string" || typeof value.createdAt !== "string") return null;
  if (!isRecord(value.advancedFilters)) return null;
  if (value.topic.trim().length === 0 || value.topic.length > 160) return null;
  if (!["Alpha Scan", "Risk Scan"].includes(value.mode) && !value.mode.includes("DAO")) return null;

  const advancedFilters = value.advancedFilters as Partial<WorkspaceAdvancedFilters>;
  if (typeof advancedFilters.evidenceWindow !== "string" || typeof advancedFilters.minimumConfidence !== "string" || typeof advancedFilters.xapiClasses !== "string") return null;
  if (!["24h", "7d", "30d"].includes(advancedFilters.evidenceWindow)) return null;
  if (!["0.65", "0.75", "0.85"].includes(advancedFilters.minimumConfidence)) return null;
  if (!["Twitter + Web + News + Crypto", "Web + News + AI", "Crypto + AI"].includes(advancedFilters.xapiClasses)) return null;

  return {
    taskId: typeof value.taskId === "string" ? value.taskId : undefined,
    topic: value.topic,
    mode: value.mode as WorkspaceRunContext["mode"],
    language: value.language === "zh" ? "zh" : value.language === "en" ? "en" : undefined,
    advancedFilters: {
      evidenceWindow: advancedFilters.evidenceWindow as WorkspaceAdvancedFilters["evidenceWindow"],
      minimumConfidence: advancedFilters.minimumConfidence as WorkspaceAdvancedFilters["minimumConfidence"],
      xapiClasses: advancedFilters.xapiClasses as WorkspaceAdvancedFilters["xapiClasses"]
    },
    createdAt: value.createdAt
  };
}
