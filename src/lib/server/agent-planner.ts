import { createAiService } from "@/lib/server/ai-service";
import { filterAllowedXApiActions } from "@/lib/server/api-guard";
import type { AgentPlan, AiGenerateResult, AiProviderMode } from "@/lib/ai-types";
import type { WorkspaceRunContext } from "@/lib/types";
import type { XApiActionSearchResult } from "@/lib/xapi-types";

type AiService = ReturnType<typeof createAiService>;

export interface AgentPlanResult {
  plan: AgentPlan;
  aiResult: AiGenerateResult<AgentPlan>;
  mode: AiProviderMode;
  fallbackReason?: string;
  availableTools: string[];
}

export async function planAgentTools({
  context,
  candidates,
  availableTools,
  aiService = createAiService()
}: {
  context: WorkspaceRunContext;
  candidates?: XApiActionSearchResult[];
  availableTools?: string[];
  aiService?: AiService;
}): Promise<AgentPlanResult> {
  const tools = buildAvailableTools(context, candidates ?? [], availableTools);
  const fallbackPlan = createRuleBasedAgentPlan(context, candidates ?? [], tools);
  const isZh = context.language === "zh";
  const aiResult = await aiService.generate<AgentPlan>({
    system: `You are the planning layer for ChainPulse, an AI blockchain research agent. Select evidence tools only from the provided allowlist. Return compact JSON only.${isZh ? " All text fields must be written in Simplified Chinese (简体中文)." : ""}`,
    user: JSON.stringify({
      task: "Create an auditable evidence collection plan before any tool execution.",
      topic: context.topic,
      mode: context.mode,
      evidenceWindow: context.advancedFilters.evidenceWindow,
      minimumConfidence: context.advancedFilters.minimumConfidence,
      xapiClasses: context.advancedFilters.xapiClasses,
      availableTools: tools,
      outputLanguage: isZh ? "zh-CN" : "en"
    }),
    schema: agentPlanSchema
  });
  const validPlan = aiResult.ok ? validateAgentPlan(aiResult.data, tools) : null;

  if (validPlan) {
    return {
      plan: validPlan,
      aiResult,
      mode: "live",
      availableTools: tools
    };
  }

  return {
    plan: fallbackPlan,
    aiResult,
    mode: aiResult.mode === "disabled" ? "disabled" : "fallback",
    fallbackReason: aiResult.error?.message ?? "AI planner returned an invalid tool plan",
    availableTools: tools
  };
}

export function buildAvailableTools(context: WorkspaceRunContext, candidates: XApiActionSearchResult[] = [], providedTools: string[] = []) {
  const preferred = preferredActionsForContext(context);
  const searched = candidates.map((candidate) => candidate.action);
  const unique = dedupe([...providedTools, ...preferred, ...searched]);
  const allowed = filterAllowedXApiActions(unique);
  return allowed.length > 0 ? allowed : ["twitter.search", "web.search.realtime", "crypto.token.price"];
}

export function createRuleBasedAgentPlan(context: WorkspaceRunContext, candidates: XApiActionSearchResult[] = [], availableTools?: string[]): AgentPlan {
  const tools = availableTools ?? buildAvailableTools(context, candidates);
  const minimum = context.advancedFilters.xapiClasses === "Crypto + AI" ? 3 : 4;
  const selectedTools = tools.slice(0, Math.max(minimum, Math.min(5, tools.length)));
  const topic = normalizeTopicQuery(context.topic).toUpperCase();

  return {
    objective: `${topic} ${context.mode} evidence plan`,
    selectedTools: selectedTools.length > 0 ? selectedTools : ["twitter.search", "web.search.realtime", "crypto.token.price"],
    reason: "Rule planner selected a balanced xAPI evidence mix because AI planning was unavailable or invalid.",
    evidenceStrategy: `Collect cross-source evidence over ${context.advancedFilters.evidenceWindow}, then normalize every tool output with trace hashes before report writing.`,
    riskQuestions: [
      "Are social and news signals consistent?",
      "Does market or holder data contradict the narrative?",
      "Is evidence confidence above the configured threshold?"
    ]
  };
}

function validateAgentPlan(value: unknown, availableTools: string[]): AgentPlan | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Partial<AgentPlan>;
  const selectedTools = Array.isArray(record.selectedTools) ? record.selectedTools.filter((tool): tool is string => typeof tool === "string" && availableTools.includes(tool)) : [];
  const riskQuestions = Array.isArray(record.riskQuestions) ? record.riskQuestions.filter((question): question is string => typeof question === "string").slice(0, 6) : [];

  if (!record.objective || typeof record.objective !== "string") return null;
  if (!record.reason || typeof record.reason !== "string") return null;
  if (!record.evidenceStrategy || typeof record.evidenceStrategy !== "string") return null;
  if (selectedTools.length === 0) return null;

  return {
    objective: record.objective,
    selectedTools: dedupe(selectedTools).slice(0, 5),
    reason: record.reason,
    evidenceStrategy: record.evidenceStrategy,
    riskQuestions: riskQuestions.length > 0 ? riskQuestions : ["Review evidence consistency before scoring."]
  };
}

function preferredActionsForContext(context: WorkspaceRunContext) {
  const classes = context.advancedFilters.xapiClasses;

  if (classes === "Web + News + AI") {
    return ["web.search.realtime", "web.search.news", "ai.text.summarize", "ai.text.chat.fast"];
  }

  if (classes === "Crypto + AI") {
    return ["crypto.token.price", "crypto.token.metadata", "ai.text.summarize", "web.search.realtime"];
  }

  if (context.mode.includes("DAO")) {
    return ["web.search.realtime", "web.search.news", "twitter.search", "ai.text.summarize"];
  }

  return ["twitter.search", "web.search.realtime", "web.search.news", "crypto.token.price"];
}

function dedupe(items: string[]) {
  return [...new Set(items.filter(Boolean))];
}

function normalizeTopicQuery(topic: string) {
  return topic.trim().replace(/^\$/, "") || "ETH";
}

const agentPlanSchema = {
  type: "object",
  additionalProperties: false,
  required: ["objective", "selectedTools", "reason", "evidenceStrategy", "riskQuestions"],
  properties: {
    objective: { type: "string" },
    selectedTools: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: { type: "string" }
    },
    reason: { type: "string" },
    evidenceStrategy: { type: "string" },
    riskQuestions: {
      type: "array",
      minItems: 1,
      maxItems: 6,
      items: { type: "string" }
    }
  }
} as const;
