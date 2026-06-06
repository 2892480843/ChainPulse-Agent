import type { SourceMode, TraceSource } from "@/lib/types";

export type AiProviderMode = "live" | "fallback" | "disabled";

export interface AiGenerateOptions {
  system: string;
  user: string;
  schema?: unknown;
  temperature?: number;
  model?: string;
}

export interface AiGenerateResult<T = unknown> {
  ok: boolean;
  mode: AiProviderMode;
  provider: string;
  model: string;
  baseUrl: string;
  data?: T;
  raw?: unknown;
  error?: {
    code: string;
    message: string;
    recoverable: boolean;
  };
  trace: {
    promptHash: string;
    outputHash: string;
    latencyMs: number;
  };
}

export interface AgentPlan {
  objective: string;
  selectedTools: string[];
  reason: string;
  evidenceStrategy: string;
  riskQuestions: string[];
}

export interface AiReportDraft {
  title: string;
  summary: string;
  verdict: "POSITIVE" | "OBSERVE" | "CAUTION" | "NEGATIVE";
  riskScore: number;
  alphaScore: number;
  confidence: number;
  rationale: string[];
  actions: string[];
}

export interface AgentToolCallAudit {
  source: TraceSource;
  action: string;
  mode: SourceMode;
  status: string;
  inputHash: string;
  outputHash: string;
  latencyMs: number;
}

export interface AgentAiAudit {
  provider: string;
  model: string;
  baseUrl: string;
  promptHash: string;
  outputHash: string;
  mode: AiProviderMode;
  plan?: AgentPlan;
  toolPlan?: string[];
  toolCalls?: AgentToolCallAudit[];
  reasoningSummary?: string;
  fallbackReason?: string;
}

export interface AiHealthStatus {
  provider: string;
  model: string;
  baseUrl: string;
  enabled: boolean;
  configured: boolean;
  mode: AiProviderMode;
}
