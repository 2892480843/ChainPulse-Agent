import { NextResponse } from "next/server";
import { runPersistentWorkspaceAgent } from "@/lib/server/agent-runner";
import { saveAgentRun } from "@/lib/server/agent-store";
import { authorizeOperator, enforceJsonBodySize, enforceRateLimit, rejectJson } from "@/lib/server/api-guard";
import { isRecord } from "@/lib/server/xapi-route";
import type { AgentRunApiResponse } from "@/lib/agent-types";
import type { WorkspaceAdvancedFilters, WorkspaceRunContext } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
      {
        ok: false,
        error: {
          code: "BAD_REQUEST",
          message: "topic, mode, advancedFilters, and createdAt are required"
        }
      },
      { status: 400 }
    );
  }

  const run = await runPersistentWorkspaceAgent(context);
  await saveAgentRun(run);

  return NextResponse.json<AgentRunApiResponse>({
    ok: true,
    data: run
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
    advancedFilters: {
      evidenceWindow: advancedFilters.evidenceWindow as WorkspaceAdvancedFilters["evidenceWindow"],
      minimumConfidence: advancedFilters.minimumConfidence as WorkspaceAdvancedFilters["minimumConfidence"],
      xapiClasses: advancedFilters.xapiClasses as WorkspaceAdvancedFilters["xapiClasses"]
    },
    createdAt: value.createdAt
  };
}
