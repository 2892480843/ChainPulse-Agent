export type PageKey = "workspace" | "demo" | "tasks" | "reports" | "trace" | "attestation" | "watchlist" | "settings";

export type ScanMode = "Alpha Scan" | "Risk Scan" | "DAO 尽调";

export type Verdict = "POSITIVE" | "OBSERVE" | "CAUTION" | "NEGATIVE";

export type ReportStatus = "已完成" | "已上链" | "未上链";

export type TraceStatus = "success" | "failed" | "running" | "fallback";

export interface EvidenceItem {
  id: string;
  source: string;
  title: string;
  summary: string;
  weight: number;
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
  evidence: EvidenceItem[];
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
}

export interface XApiTrace {
  id: string;
  taskId: string;
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
  runtimeLabel?: "live xAPI" | "mock fallback";
  runtimeReason?: "connected" | "no XAPI_KEY" | "upstream failed" | "checking xAPI";
  schemaFirst?: boolean;
  traceIds?: string[];
  runtimeLogs?: string[];
}
