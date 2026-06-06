import type { PageKey, ScanMode, WorkspaceAdvancedFilters } from "./types";

export interface NavigationItem {
  key: PageKey;
  label: string;
  path: string;
}

export const navigationItems: NavigationItem[] = [
  { key: "workspace", label: "Workspace", path: "/workspace" },
  { key: "demo", label: "Review Console", path: "/demo" },
  { key: "tasks", label: "Agent Runs", path: "/tasks" },
  { key: "reports", label: "Reports", path: "/reports" },
  { key: "trace", label: "Audit Trace", path: "/trace" },
  { key: "attestation", label: "Proofs", path: "/attestation" },
  { key: "watchlist", label: "Watchlist", path: "/watchlist" },
  { key: "settings", label: "Settings", path: "/settings" }
];

export const modeOptions: Array<{ mode: ScanMode; title: string; description: string }> = [
  { mode: "Alpha Scan", title: "Alpha Scan", description: "Track opportunity signals from news, social data, and market movement." },
  { mode: "Risk Scan", title: "Risk Scan", description: "Identify manipulation risk, abnormal volatility, and conflicting evidence." },
  { mode: "DAO 尽调", title: "DAO Review", description: "Generate a reviewable pre-vote report for governance proposals." }
];

export const timelineSteps = ["任务解析", "xAPI 搜索", "读取 Schema", "数据采集", "证据归一化", "推理与打分", "生成报告"];

export const defaultWorkspaceAdvancedFilters: WorkspaceAdvancedFilters = {
  evidenceWindow: "24h",
  minimumConfidence: "0.65",
  xapiClasses: "Twitter + Web + News + Crypto"
};

export function pageKeyFromPath(pathname: string | null): PageKey {
  const item = navigationItems.find((entry) => pathname === entry.path || pathname?.startsWith(`${entry.path}/`));
  return item?.key ?? "workspace";
}
