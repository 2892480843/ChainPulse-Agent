"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { Download, Eye, FileText, Filter, ShieldCheck } from "lucide-react";
import { fetchStoredReports } from "@/lib/adapters/agent-data-client";
import { clampRisk, filterReports } from "@/lib/filters";
import type { Report, ReportFilters } from "@/lib/types";
import { useAppActions } from "@/components/shell/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { ModeBadge } from "@/components/ui/ModeBadge";
import { PageHeading } from "@/components/ui/PageHeading";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TokenIcon } from "@/components/ui/TokenIcon";
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import { buttonClass, cardClass, inputClass, primaryButtonClass } from "@/components/ui/styles";

const defaultFilters: ReportFilters = {
  query: "",
  mode: "All",
  verdict: "All",
  status: "All",
  minRisk: 0,
  maxRisk: 100,
  startDate: "",
  endDate: ""
};

const iconButtonClass =
  "inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 active:scale-[0.98]";

export function ReportCenterPage() {
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const initialFilters = useMemo(() => filtersFromSearchParams(new URLSearchParams(queryString)), [queryString]);

  return <ReportCenterContent key={queryString} initialFilters={initialFilters} />;
}

function ReportCenterContent({ initialFilters }: { initialFilters: ReportFilters }) {
  const { downloadJson, language, notify } = useAppActions();
  const copy = reportCopy[language];
  const router = useRouter();
  const [filters, setFilterState] = useState(initialFilters);
  const [reportItems, setReportItems] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetchStoredReports()
      .then((items) => {
        if (!cancelled) setReportItems(items);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setReportItems([]);
          setError(err instanceof Error ? err.message : copy.loadFailed);
          notify(copy.loadFailed);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [copy.loadFailed, notify]);

  const filteredReports = useMemo(() => filterReports(reportItems, filters), [filters, reportItems]);
  const stats = useMemo(() => createReportStats(reportItems), [reportItems]);

  function setFilters(nextFilters: ReportFilters) {
    setFilterState(nextFilters);
    const nextQuery = filtersToQuery(nextFilters);
    router.push(nextQuery ? `/reports?${nextQuery}` : "/reports");
  }

  function updateRisk(key: "minRisk" | "maxRisk", value: string) {
    setFilters({ ...filters, [key]: clampRisk(Number(value)) });
  }

  function exportAll() {
    const date = new Date().toISOString().slice(0, 10);
    downloadJson(`chainpulse-real-reports-${date}.json`, filteredReports);
  }

  return (
    <section className="space-y-5">
      <PageHeading eyebrow={copy.eyebrow} title={copy.title} description={copy.description} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className={clsx(cardClass, "overflow-hidden")}>
          <div className="border-b border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                  <Filter aria-hidden className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-slate-950">{copy.filters}</h2>
                  <p className="mt-0.5 text-xs text-slate-500">{copy.filtersDetail}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className={buttonClass} type="button" onClick={() => setFilters({ ...defaultFilters, status: "未上链" })}>
                  {copy.needsAttestation}
                </button>
                <button className={buttonClass} type="button" onClick={() => setFilters({ ...defaultFilters, minRisk: 60 })}>
                  {copy.highRisk}
                </button>
                <button className={buttonClass} type="button" onClick={() => setFilters(defaultFilters)}>
                  {copy.reset}
                </button>
                <button className={primaryButtonClass} type="button" onClick={exportAll} disabled={filteredReports.length === 0}>
                  <Download aria-hidden className="h-4 w-4" />
                  {copy.export}
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-12">
              <label className="grid gap-1 sm:col-span-2 lg:col-span-4">
                <span className="text-xs font-medium text-slate-600">{copy.search}</span>
                <input
                  type="search"
                  name="report-search"
                  className={inputClass}
                  value={filters.query}
                  onChange={(event) => setFilters({ ...filters, query: event.target.value })}
                  placeholder={copy.searchPlaceholder}
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
              <SelectFilter label={copy.mode} value={filters.mode} options={["All", "Alpha Scan", "Risk Scan", "DAO 尽调"]} onChange={(value) => setFilters({ ...filters, mode: value as ReportFilters["mode"] })} />
              <SelectFilter label={copy.verdict} value={filters.verdict} options={["All", "POSITIVE", "OBSERVE", "CAUTION", "NEGATIVE"]} onChange={(value) => setFilters({ ...filters, verdict: value as ReportFilters["verdict"] })} />
              <SelectFilter label={copy.status} value={filters.status} options={["All", "已上链", "未上链", "已完成"]} onChange={(value) => setFilters({ ...filters, status: value as ReportFilters["status"] })} />
              <label className="grid gap-1 lg:col-span-1">
                <span className="text-xs font-medium text-slate-600">{copy.minRisk}</span>
                <input className={inputClass} name="min-risk" type="number" min={0} max={100} inputMode="numeric" value={filters.minRisk} autoComplete="off" onChange={(event) => updateRisk("minRisk", event.target.value)} />
              </label>
              <label className="grid gap-1 lg:col-span-1">
                <span className="text-xs font-medium text-slate-600">{copy.maxRisk}</span>
                <input className={inputClass} name="max-risk" type="number" min={0} max={100} inputMode="numeric" value={filters.maxRisk} autoComplete="off" onChange={(event) => updateRisk("maxRisk", event.target.value)} />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                {copy.showing} {filteredReports.length} / {reportItems.length}
              </span>
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
                {copy.avgConfidence} {stats.averageConfidence}%
              </span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                {stats.attestedCount} {copy.onChain}
              </span>
            </div>
          </div>

          {error ? (
            <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <p className="font-semibold">{copy.loadFailed}</p>
              <p className="mono mt-1 text-xs">{error}</p>
            </div>
          ) : null}

          {loading ? (
            <EmptyState title={copy.loading} detail={copy.loadingDetail} />
          ) : filteredReports.length === 0 ? (
            <EmptyState title={reportItems.length === 0 ? copy.emptyTitle : copy.noMatches} detail={reportItems.length === 0 ? copy.emptyDetail : copy.noMatchesDetail} />
          ) : (
            <div className="thin-scrollbar overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">{copy.report}</th>
                    <th className="px-4 py-3">{copy.mode}</th>
                    <th className="px-4 py-3">{copy.risk}</th>
                    <th className="px-4 py-3">{copy.evidence}</th>
                    <th className="px-4 py-3">{copy.created}</th>
                    <th className="px-4 py-3">{copy.verdict}</th>
                    <th className="px-4 py-3">{copy.status}</th>
                    <th className="px-4 py-3 text-center">{copy.action}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReports.map((report) => (
                    <tr key={report.id} className="group hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <TokenIcon symbol={report.topic} />
                          <div className="min-w-0">
                            <Link className="font-semibold text-slate-950 underline-offset-2 group-hover:text-blue-700 group-hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100" href={`/reports/${report.id}`}>
                              {report.title}
                            </Link>
                            <p className="max-w-[420px] truncate text-xs text-slate-500">{report.summary}</p>
                            <p className="mono mt-1 text-[11px] text-slate-400">{report.id} / {report.sourceMode ?? "live"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <ModeBadge mode={report.mode} />
                      </td>
                      <td className="px-4 py-3">
                        <CompactScore value={report.riskScore} />
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{report.evidence.length}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{report.createdAt}</td>
                      <td className="px-4 py-3">
                        <VerdictBadge verdict={report.verdict} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={report.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-1.5">
                          <Link className={iconButtonClass} aria-label={`${copy.open} ${report.title}`} href={`/reports/${report.id}`}>
                            <Eye aria-hidden className="h-4 w-4" />
                          </Link>
                          <button className={iconButtonClass} type="button" aria-label={`${copy.download} ${report.title}`} onClick={() => downloadJson(`${report.id}.json`, report)}>
                            <Download aria-hidden className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <SummaryCard icon={FileText} label={copy.totalReports} value={`${reportItems.length}`} detail={copy.backendOnly} />
          <SummaryCard icon={ShieldCheck} label={copy.proofCoverage} value={`${reportItems.length ? Math.round((stats.attestedCount / reportItems.length) * 100) : 0}%`} detail={copy.userWalletOnly} />
          <div className={clsx(cardClass, "p-4 text-sm text-slate-600")}>
            <h2 className="font-semibold text-slate-950">{copy.dataBoundary}</h2>
            <p className="mt-2 leading-6">{copy.dataBoundaryDetail}</p>
          </div>
        </aside>
      </div>
    </section>
  );
}

function SelectFilter({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 lg:col-span-2">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <select name={label} className={inputClass} value={value} autoComplete="off" onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function CompactScore({ value }: { value: number }) {
  const color = value >= 70 ? "bg-red-500" : value >= 50 ? "bg-orange-500" : "bg-emerald-500";

  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center gap-1 text-[11px] text-slate-500">
        <span className="tabular-nums font-semibold text-slate-900">{value}</span>
        <span>/100</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div className={clsx("h-full rounded-full", color)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, detail }: { icon: typeof FileText; label: string; value: string; detail: string }) {
  return (
    <div className={clsx(cardClass, "p-4")}>
      <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
        <Icon aria-hidden className="h-4 w-4 text-blue-700" />
        {label}
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function createReportStats(items: Report[]) {
  const averageConfidence = items.length > 0 ? Math.round((items.reduce((sum, report) => sum + report.confidence, 0) / items.length) * 100) : 0;

  return {
    averageConfidence,
    attestedCount: items.filter((report) => report.status === "已上链").length
  };
}

function filtersFromSearchParams(searchParams: Pick<URLSearchParams, "get">): ReportFilters {
  return {
    query: searchParams.get("query") ?? defaultFilters.query,
    mode: parseMode(searchParams.get("mode")),
    verdict: parseVerdict(searchParams.get("verdict")),
    status: parseStatus(searchParams.get("status")),
    minRisk: clampRisk(Number(searchParams.get("minRisk") ?? defaultFilters.minRisk)),
    maxRisk: clampRisk(Number(searchParams.get("maxRisk") ?? defaultFilters.maxRisk)),
    startDate: searchParams.get("startDate") ?? defaultFilters.startDate,
    endDate: searchParams.get("endDate") ?? defaultFilters.endDate
  };
}

function filtersToQuery(filters: ReportFilters): string {
  const params = new URLSearchParams();
  if (filters.query) params.set("query", filters.query);
  if (filters.mode !== "All") params.set("mode", filters.mode);
  if (filters.verdict !== "All") params.set("verdict", filters.verdict);
  if (filters.status !== "All") params.set("status", filters.status);
  if (filters.minRisk !== 0) params.set("minRisk", String(filters.minRisk));
  if (filters.maxRisk !== 100) params.set("maxRisk", String(filters.maxRisk));
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
  return params.toString();
}

function parseMode(value: string | null): ReportFilters["mode"] {
  return value === "Alpha Scan" || value === "Risk Scan" || value === "DAO 尽调" ? value : "All";
}

function parseVerdict(value: string | null): ReportFilters["verdict"] {
  return value === "POSITIVE" || value === "OBSERVE" || value === "CAUTION" || value === "NEGATIVE" ? value : "All";
}

function parseStatus(value: string | null): ReportFilters["status"] {
  return value === "已完成" || value === "已上链" || value === "未上链" ? value : "All";
}

const reportCopy = {
  en: {
    eyebrow: "Reports",
    title: "Report Center",
    description: "Review backend-persisted Agent reports only. Local ETH/ZEC demo records are not shown.",
    filters: "Filters",
    filtersDetail: "Filter real reports by topic, verdict, proof status, and risk score.",
    needsAttestation: "Needs attestation",
    highRisk: "High risk",
    reset: "Reset",
    export: "Export",
    search: "Search reports",
    searchPlaceholder: "Topic, title, summary...",
    mode: "Mode",
    verdict: "Verdict",
    status: "Status",
    minRisk: "Min risk",
    maxRisk: "Max risk",
    showing: "Showing",
    avgConfidence: "Avg confidence",
    onChain: "on-chain",
    loadFailed: "Report load failed",
    loading: "Loading reports",
    loadingDetail: "Reading persisted reports from the backend store.",
    emptyTitle: "No real reports yet",
    emptyDetail: "Run a real Agent first. This page does not display local demo data.",
    noMatches: "No reports matched",
    noMatchesDetail: "Adjust filters and try again.",
    report: "Report",
    risk: "Risk",
    evidence: "Evidence",
    created: "Created",
    action: "Action",
    open: "Open",
    download: "Download",
    totalReports: "Total reports",
    backendOnly: "backend store only",
    proofCoverage: "Proof coverage",
    userWalletOnly: "user-wallet writes only",
    dataBoundary: "Data boundary",
    dataBoundaryDetail: "Reports are created by /api/agent/run after live AI and live xAPI evidence complete. Missing configuration returns an error instead of mock data."
  },
  zh: {
    eyebrow: "报告",
    title: "报告中心",
    description: "只查看后端持久化的 Agent 报告。本地 ETH/ZEC 演示记录不会展示。",
    filters: "筛选",
    filtersDetail: "按主题、结论、证明状态和风险分筛选真实报告。",
    needsAttestation: "待上链",
    highRisk: "高风险",
    reset: "重置",
    export: "导出",
    search: "搜索报告",
    searchPlaceholder: "主题、标题、摘要...",
    mode: "模式",
    verdict: "结论",
    status: "状态",
    minRisk: "最低风险",
    maxRisk: "最高风险",
    showing: "显示",
    avgConfidence: "平均置信度",
    onChain: "已上链",
    loadFailed: "报告加载失败",
    loading: "正在加载报告",
    loadingDetail: "正在从后端存储读取持久化报告。",
    emptyTitle: "暂无真实报告",
    emptyDetail: "请先运行真实 Agent。本页面不会显示本地演示数据。",
    noMatches: "没有匹配报告",
    noMatchesDetail: "调整筛选条件后重试。",
    report: "报告",
    risk: "风险",
    evidence: "证据",
    created: "创建时间",
    action: "操作",
    open: "打开",
    download: "下载",
    totalReports: "报告总数",
    backendOnly: "仅后端存储",
    proofCoverage: "证明覆盖率",
    userWalletOnly: "仅用户钱包写入",
    dataBoundary: "数据边界",
    dataBoundaryDetail: "报告只能由 /api/agent/run 在真实 AI 和真实 xAPI 证据完成后创建。缺少配置会返回错误，不会生成 mock 数据。"
  }
} as const;
