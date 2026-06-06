import type { AgentAiAudit } from "@/lib/ai-types";
import type { Report, RunningTask, SourceMode, WorkspaceRunContext, XApiTrace } from "@/lib/types";

export interface StoredAgentRun {
  task: RunningTask;
  report: Report;
  traces: XApiTrace[];
  context: WorkspaceRunContext;
  sourceMode: SourceMode;
  ai?: AgentAiAudit;
  createdAt: string;
  updatedAt: string;
}

export interface AgentRunApiResponse {
  ok: boolean;
  data?: StoredAgentRun;
  error?: {
    code: string;
    message: string;
  };
}

export interface AgentCollectionResponse<T> {
  ok: boolean;
  data: T[];
}

export interface AgentEntityResponse<T> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
