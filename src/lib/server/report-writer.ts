import { createAiService } from "@/lib/server/ai-service";
import type { AgentPlan, AiGenerateResult, AiProviderMode, AiReportDraft } from "@/lib/ai-types";
import type { EvidenceItem, ScanMode, SourceMode, Verdict, WorkspaceRunContext, XApiTrace } from "@/lib/types";

type AiService = ReturnType<typeof createAiService>;

export interface ReportDraftResult {
  draft: AiReportDraft;
  aiResult: AiGenerateResult<AiReportDraft>;
  mode: AiProviderMode;
  fallbackReason?: string;
}

export async function writeAgentReportDraft({
  context,
  evidence,
  traces,
  sourceMode,
  plan,
  aiService = createAiService()
}: {
  context: WorkspaceRunContext;
  evidence: EvidenceItem[];
  traces: XApiTrace[];
  sourceMode: SourceMode;
  plan?: AgentPlan;
  aiService?: AiService;
}): Promise<ReportDraftResult> {
  const fallbackDraft = createHeuristicReportDraft({ context, evidence, traces, sourceMode });
  const aiResult = await aiService.generate<AiReportDraft>({
    system: "You are the report-writing layer for ChainPulse, an AI blockchain research agent. Use only the supplied evidence. Return compact JSON only.",
    user: JSON.stringify({
      task: "Write an evidence-grounded blockchain risk/alpha report draft.",
      context,
      plan,
      evidence,
      traceSummary: traces.map((trace) => ({
        id: trace.id,
        source: trace.source ?? "xapi",
        action: trace.action,
        status: trace.status,
        sourceMode: trace.sourceMode,
        outputPreview: trace.outputPreview
      })),
      sourceMode
    }),
    schema: reportDraftSchema
  });
  const validDraft = aiResult.ok ? validateReportDraft(aiResult.data) : null;

  if (validDraft) {
    return {
      draft: validDraft,
      aiResult,
      mode: "live"
    };
  }

  return {
    draft: fallbackDraft,
    aiResult,
    mode: aiResult.mode === "disabled" ? "disabled" : "fallback",
    fallbackReason: aiResult.error?.message ?? "AI report writer returned an invalid draft"
  };
}

export function createHeuristicReportDraft({
  context,
  evidence,
  traces,
  sourceMode
}: {
  context: WorkspaceRunContext;
  evidence: EvidenceItem[];
  traces: XApiTrace[];
  sourceMode: SourceMode;
}): AiReportDraft {
  const scores = scoreReport(context.mode, sourceMode, evidence, traces);
  const topic = normalizeTopicQuery(context.topic).toUpperCase();

  return {
    title: `${topic} ${context.mode} Agent Report`,
    summary: `${topic} ${context.mode} completed with ${evidence.length} normalized evidence items in ${sourceMode} mode. Risk ${scores.riskScore}, alpha ${scores.alphaScore}, confidence ${Math.round(scores.confidence * 100)}%.`,
    riskScore: scores.riskScore,
    alphaScore: scores.alphaScore,
    confidence: scores.confidence,
    verdict: scores.verdict,
    rationale: createRationale(scores, evidence, sourceMode),
    actions: createReportActions(scores)
  };
}

function validateReportDraft(value: unknown): AiReportDraft | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Partial<AiReportDraft>;
  const verdict = record.verdict;
  const riskScore = clampScoreInput(record.riskScore);
  const alphaScore = clampScoreInput(record.alphaScore);
  const confidence = clampConfidenceInput(record.confidence);
  const rationale = Array.isArray(record.rationale) ? record.rationale.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 8) : [];
  const actions = Array.isArray(record.actions) ? record.actions.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 8) : [];

  if (typeof record.title !== "string" || !record.title.trim()) return null;
  if (typeof record.summary !== "string" || !record.summary.trim()) return null;
  if (!isVerdict(verdict)) return null;
  if (riskScore === null || alphaScore === null || confidence === null) return null;

  return {
    title: record.title.trim(),
    summary: record.summary.trim(),
    verdict,
    riskScore,
    alphaScore,
    confidence,
    rationale: rationale.length > 0 ? rationale : ["AI draft supplied a valid score but no rationale."],
    actions: actions.length > 0 ? actions : ["Review the evidence packet before taking action."]
  };
}

function scoreReport(mode: ScanMode, sourceMode: SourceMode, evidence: EvidenceItem[], traces: XApiTrace[]) {
  const fallbackPenalty = sourceMode === "fallback" ? 8 : sourceMode === "partial" ? 4 : 0;
  const failedPenalty = traces.filter((trace) => trace.status === "failed").length * 10;
  const evidenceStrength = Math.round(evidence.reduce((sum, item) => sum + (item.confidence ?? 0.65), 0) * 8);
  const baseRisk = mode === "Risk Scan" ? 42 : mode.includes("DAO") ? 38 : 28;
  const riskScore = clampScore(baseRisk + fallbackPenalty + failedPenalty - Math.min(12, evidence.length * 2));
  const alphaBase = mode === "Alpha Scan" ? 70 : 58;
  const alphaScore = clampScore(alphaBase + Math.min(16, evidenceStrength) - Math.round(riskScore / 4));
  const confidence = round(clampScore(62 + evidence.length * 5 - fallbackPenalty) / 100, 2);
  const verdict: Verdict = riskScore >= 70 ? "NEGATIVE" : riskScore >= 55 ? "CAUTION" : alphaScore >= 70 ? "POSITIVE" : "OBSERVE";

  return { riskScore, alphaScore, confidence, verdict };
}

function createRationale(scores: ReturnType<typeof scoreReport>, evidence: EvidenceItem[], sourceMode: SourceMode) {
  return [
    `Verdict ${scores.verdict} follows risk ${scores.riskScore}, alpha ${scores.alphaScore}, and ${Math.round(scores.confidence * 100)}% confidence.`,
    `${evidence.length} normalized evidence items were used; sourceMode=${sourceMode}.`,
    sourceMode === "live" ? "All AI/tool steps were live." : "At least one AI/tool step used fallback or disabled mode and is marked for audit."
  ];
}

function createReportActions(scores: ReturnType<typeof scoreReport>) {
  if (scores.verdict === "NEGATIVE" || scores.riskScore >= 70) {
    return ["Hold automated execution until a second review confirms the evidence.", "Create a follow-up scan within 6 hours."];
  }
  if (scores.verdict === "CAUTION") {
    return ["Keep the report in review until fresh evidence confirms the signal.", "Watch for risk score movement above 70."];
  }
  if (scores.verdict === "POSITIVE") {
    return ["Keep monitoring alpha momentum and source freshness.", "Anchor the report once the operator approves the evidence packet."];
  }
  return ["Observe the target over the next evidence window.", "Re-run the agent if a watchlist threshold changes."];
}

function isVerdict(value: unknown): value is Verdict {
  return value === "POSITIVE" || value === "OBSERVE" || value === "CAUTION" || value === "NEGATIVE";
}

function clampScoreInput(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) return null;
  return Math.round(value);
}

function clampConfidenceInput(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) return null;
  return round(value, 2);
}

function normalizeTopicQuery(topic: string) {
  return topic.trim().replace(/^\$/, "") || "ETH";
}

function round(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

const reportDraftSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "summary", "verdict", "riskScore", "alphaScore", "confidence", "rationale", "actions"],
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    verdict: { type: "string", enum: ["POSITIVE", "OBSERVE", "CAUTION", "NEGATIVE"] },
    riskScore: { type: "number", minimum: 0, maximum: 100 },
    alphaScore: { type: "number", minimum: 0, maximum: 100 },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    rationale: {
      type: "array",
      minItems: 1,
      maxItems: 8,
      items: { type: "string" }
    },
    actions: {
      type: "array",
      minItems: 1,
      maxItems: 8,
      items: { type: "string" }
    }
  }
} as const;
