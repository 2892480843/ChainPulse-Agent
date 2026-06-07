import { NextResponse } from "next/server";
import { writeAgentReportDraft } from "@/lib/server/report-writer";
import { authorizeOperator, enforceJsonBodySize, enforceRateLimit, rejectJson } from "@/lib/server/api-guard";
import { isRecord } from "@/lib/server/xapi-route";
import type { ReportDraftResult } from "@/lib/server/report-writer";
import type { AgentPlan } from "@/lib/ai-types";
import type { EvidenceItem, SourceMode, WorkspaceAdvancedFilters, WorkspaceRunContext, XApiTrace } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authFailure = authorizeOperator(request);
  if (authFailure) return rejectJson(authFailure);

  const rateLimitFailure = enforceRateLimit(request, "ai");
  if (rateLimitFailure) return rejectJson(rateLimitFailure);

  const body = await request.json().catch(() => null);
  const bodySizeFailure = enforceJsonBodySize(body, 24_576);
  if (bodySizeFailure) return rejectJson(bodySizeFailure);

  const payload = parseReportRequest(body);
  if (!payload) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "BAD_REQUEST",
          message: "context, evidence, traces, and sourceMode are required",
          recoverable: true
        }
      },
      { status: 400 }
    );
  }

  const result = await writeAgentReportDraft(payload);
  return NextResponse.json<{ ok: true; data: ReportDraftResult }>({
    ok: true,
    data: result
  });
}

function parseReportRequest(value: unknown): { context: WorkspaceRunContext; evidence: EvidenceItem[]; traces: XApiTrace[]; sourceMode: SourceMode; plan?: AgentPlan } | null {
  if (!isRecord(value)) return null;
  const context = parseWorkspaceContext(value.context);
  if (!context || !Array.isArray(value.evidence) || !Array.isArray(value.traces)) return null;
  const sourceMode = value.sourceMode === "live" || value.sourceMode === "partial" || value.sourceMode === "fallback" || value.sourceMode === "mock" ? value.sourceMode : null;
  if (!sourceMode) return null;

  return {
    context,
    evidence: value.evidence.filter(isEvidenceItem),
    traces: value.traces.filter(isTrace),
    sourceMode,
    plan: isAgentPlan(value.plan) ? value.plan : undefined
  };
}

function parseWorkspaceContext(value: unknown): WorkspaceRunContext | null {
  if (!isRecord(value)) return null;
  if (typeof value.topic !== "string" || typeof value.mode !== "string") return null;
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
    createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date().toLocaleTimeString("zh-CN", { hour12: false })
  };
}

function isEvidenceItem(value: unknown): value is EvidenceItem {
  return isRecord(value) && typeof value.id === "string" && typeof value.source === "string" && typeof value.title === "string" && typeof value.summary === "string" && typeof value.weight === "number";
}

function isTrace(value: unknown): value is XApiTrace {
  return isRecord(value) && typeof value.id === "string" && typeof value.taskId === "string" && typeof value.action === "string" && typeof value.outputHash === "string";
}

function isAgentPlan(value: unknown): value is AgentPlan {
  return isRecord(value) && typeof value.objective === "string" && Array.isArray(value.selectedTools) && typeof value.reason === "string" && typeof value.evidenceStrategy === "string" && Array.isArray(value.riskQuestions);
}
