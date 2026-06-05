import type { PageKey, ScanMode, WorkspaceAdvancedFilters } from "./types";

export interface NavigationItem {
  key: PageKey;
  label: string;
  path: string;
}

export const navigationItems: NavigationItem[] = [
  { key: "workspace", label: "工作台", path: "/workspace" },
  { key: "tasks", label: "运行中的任务", path: "/tasks" },
  { key: "reports", label: "报告中心", path: "/reports" },
  { key: "trace", label: "xAPI Trace", path: "/trace" },
  { key: "attestation", label: "链上证明", path: "/attestation" },
  { key: "watchlist", label: "Watchlist", path: "/watchlist" },
  { key: "settings", label: "设置", path: "/settings" }
];

export const modeOptions: Array<{ mode: ScanMode; title: string; description: string }> = [
  { mode: "Alpha Scan", title: "Alpha Scan", description: "追踪新闻、社交和价格侧的机会信号。" },
  { mode: "Risk Scan", title: "Risk Scan", description: "识别操纵传播、异常波动和证据冲突。" },
  { mode: "DAO 尽调", title: "DAO 尽调", description: "为治理提案生成可复查的投票前报告。" }
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
