export type PageKey = "workspace" | "tasks" | "reports" | "trace" | "attestation" | "watchlist" | "settings";

export type ScanMode = "Alpha Scan" | "Risk Scan" | "DAO 尽调";

export type Verdict = "POSITIVE" | "OBSERVE" | "CAUTION" | "NEGATIVE";

export type ReportStatus = "已完成" | "已上链" | "未上链";

export type TraceStatus = "success" | "failed" | "running" | "fallback";

export type SourceMode = "live" | "partial" | "fallback" | "mock";

export type TraceSource = "ai" | "xapi" | "chain" | "system";

export interface EvidenceItem {
  id: string;
  source: string;
  title: string;
  summary: string;
  weight: number;
  traceId?: string;
  sourceUrl?: string;
  sourceTimestamp?: string;
  rawId?: string;
  confidence?: number;
  sourceMode?: SourceMode;
}

export interface Report {
  id: string;
  title: string;
  topic: string;
  mode: ScanMode;
  summary: string;
  riskScore: number;
  alphaScore: number;
  confidence: number;
  verdict: Verdict;
  status: ReportStatus;
  createdAt: string;
  reportHash: string;
  evidenceHash: string;
  actions: string[];
  rationale?: string[];
  evidence: EvidenceItem[];
  taskId?: string;
  traceIds?: string[];
  sourceMode?: SourceMode;
  attestation?: ReportAttestation;
  ai?: import("@/lib/ai-types").AgentAiAudit;
}

export interface ReportAttestation {
  reportHash: string;
  evidenceHash: string;
  txHash: string;
  walletAddress: string;
  block: string;
  timestamp: string;
  chainId?: number;
  contractAddress?: string;
  reportId?: string;
  metadataURI?: string;
  explorerTxUrl?: string;
  onChainStatus?: "confirmed" | "mismatch" | "pending";
}

export interface RunningTask {
  id: string;
  topic: string;
  mode: ScanMode;
  status: "Running" | "Completed" | "Failed" | "Cancelled";
  startedAt: string;
  elapsed: string;
  progress: number;
  currentStep: string;
  logs: string[];
  completedAt?: string;
  reportId?: string;
  traceIds?: string[];
  sourceMode?: SourceMode;
}

export interface XApiTrace {
  id: string;
  taskId: string;
  source?: TraceSource;
  action: string;
  capability: string;
  schemaFetched: boolean;
  inputHash: string;
  outputHash: string;
  outputPreview: string;
  startedAt: string;
  endedAt: string;
  status: TraceStatus;
  latencyMs: number;
  method: "GET" | "POST";
  headers: Record<string, string>;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  error?: string;
  sourceMode?: SourceMode;
  provider?: string;
  model?: string;
  baseUrl?: string;
  promptHash?: string;
  reasoningSummary?: string;
}

export interface WatchlistTarget {
  id: string;
  name: string;
  symbol: string;
  category: "Token" | "Protocol" | "KOL" | "DAO";
  alertState: "Normal" | "Warning" | "Critical";
  riskScore: number;
  alphaScore: number;
  lastScan: string;
  signals24h: number[];
}

export interface ReportFilters {
  query: string;
  mode: "All" | ScanMode;
  verdict: "All" | Verdict;
  status: "All" | ReportStatus;
  minRisk: number;
  maxRisk: number;
  startDate: string;
  endDate: string;
}

export interface WatchlistFilters {
  query: string;
  category: "All" | WatchlistTarget["category"];
  alertState: "All" | WatchlistTarget["alertState"];
  sortBy: "risk-desc" | "alpha-desc" | "recent";
}

export interface WorkspaceAdvancedFilters {
  evidenceWindow: "24h" | "7d" | "30d";
  minimumConfidence: "0.65" | "0.75" | "0.85";
  xapiClasses: "Twitter + Web + News + Crypto" | "Web + News + AI" | "Crypto + AI";
}

export interface WorkspaceRunContext {
  taskId?: string;
  topic: string;
  mode: ScanMode;
  advancedFilters: WorkspaceAdvancedFilters;
  createdAt: string;
  language?: "en" | "zh";
  runtimeLabel?: "live xAPI" | "partial xAPI" | "unavailable";
  runtimeReason?: "connected" | "partial fallback" | "no XAPI_KEY" | "upstream failed" | "checking xAPI";
  schemaFirst?: boolean;
  traceIds?: string[];
  runtimeLogs?: string[];
  reportId?: string;
  sourceMode?: SourceMode;
}
