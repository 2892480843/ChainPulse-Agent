export type PageKey = "workspace" | "tasks" | "reports" | "trace" | "attestation" | "watchlist" | "settings";

export type ScanMode = "Alpha Scan" | "Risk Scan" | "DAO 尽调";

export type Verdict = "POSITIVE" | "OBSERVE" | "CAUTION" | "NEGATIVE";

export type ReportStatus = "已完成" | "已上链" | "未上链";

export type TraceStatus = "success" | "failed" | "running";

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
  status: "Running" | "Completed" | "Failed";
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
  minRisk: number;
  maxRisk: number;
}

export interface WatchlistFilters {
  query: string;
  category: "All" | WatchlistTarget["category"];
  alertState: "All" | WatchlistTarget["alertState"];
  sortBy: "risk-desc" | "alpha-desc" | "recent";
}
