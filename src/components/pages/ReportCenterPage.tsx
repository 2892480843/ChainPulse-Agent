"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { AlertTriangle, CheckCircle2, Download, Eye, FileText, Filter, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { fetchStoredReports, mergeReportsWithMock } from "@/lib/adapters/agent-data-client";
import { filterReports, clampRisk } from "@/lib/filters";
import { reports } from "@/lib/mock-data";
import type { Report, ReportFilters } from "@/lib/types";
import { useAppActions } from "@/components/shell/AppShell";
import { DistributionCard } from "@/components/ui/DistributionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ModeBadge } from "@/components/ui/ModeBadge";
import { PageHeading } from "@/components/ui/PageHeading";
import { StatCard } from "@/components/ui/StatCard";
import { TokenIcon } from "@/components/ui/TokenIcon";
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import { buttonClass, cardClass, inputClass, primaryButtonClass, selectedButtonClass } from "@/components/ui/styles";

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

const dateRangePresets = [
  { key: "all", label: "全部" },
  { key: "today", label: "今天" },
  { key: "7d", label: "近 7 天" },
  { key: "30d", label: "近 30 天" },
  { key: "custom", label: "自定义" }
] as const;

type DateRangePreset = (typeof dateRangePresets)[number]["key"];

const iconButtonClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 active:scale-[0.98]";

export function ReportCenterPage() {
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const initialFilters = useMemo(() => filtersFromSearchParams(new URLSearchParams(queryString)), [queryString]);
  const initialDatePreset = useMemo(() => parseDateRangePreset(searchParams.get("dateRange"), initialFilters), [searchParams, initialFilters]);

  return <ReportCenterContent key={queryString} initialFilters={initialFilters} initialDatePreset={initialDatePreset} />;
}

function ReportCenterContent({ initialFilters, initialDatePreset }: { initialFilters: ReportFilters; initialDatePreset: DateRangePreset }) {
  const { downloadJson } = useAppActions();
  const router = useRouter();
  const [filters, setFilterState] = useState(initialFilters);
  const [datePreset, setDatePreset] = useState<DateRangePreset>(initialDatePreset);
  const [reportItems, setReportItems] = useState<Report[]>(reports);

  useEffect(() => {
    let cancelled = false;
    fetchStoredReports()
      .then((items) => {
        if (!cancelled) setReportItems(mergeReportsWithMock(items));
      })
      .catch(() => {
        if (!cancelled) setReportItems(mergeReportsWithMock([]));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredReports = useMemo(() => filterReports(reportItems, filters), [filters, reportItems]);
  const activeFilters = useMemo(() => getActiveFilterLabels(filters), [filters]);
  const stats = useMemo(() => createReportStats(filteredReports), [filteredReports]);

  function setFilters(nextFilters: ReportFilters, nextDatePreset = datePreset) {
    setFilterState(nextFilters);
    setDatePreset(nextDatePreset);
    const nextQuery = filtersToQuery(nextFilters, nextDatePreset);
    router.push(nextQuery ? `/reports?${nextQuery}` : "/reports");
  }

  function updateRisk(key: "minRisk" | "maxRisk", value: string) {
    setFilters({ ...filters, [key]: clampRisk(Number(value)) });
  }

  function updateDatePreset(nextDatePreset: DateRangePreset) {
    if (nextDatePreset === "custom") {
      setFilters(filters, "custom");
      return;
    }

    setFilters({ ...filters, ...getDateRangeForPreset(nextDatePreset, reportItems) }, nextDatePreset);
  }

  function updateCustomDate(key: "startDate" | "endDate", value: string) {
    setFilters({ ...filters, [key]: value }, "custom");
  }

  function clearCustomDateRange() {
    setFilters({ ...filters, startDate: "", endDate: "" }, "custom");
  }

  function exportAll() {
    const date = new Date().toISOString().slice(0, 10);
    const verdict = filters.verdict === "All" ? "all-verdicts" : filters.verdict.toLowerCase();
    const range = `${filters.minRisk}-${filters.maxRisk}`;
    downloadJson(`chainpulse-reports-${date}-${verdict}-risk-${range}.json`, filteredReports);
  }

  function applyQuickFilter(kind: "eth-demo" | "needs-attestation" | "high-risk") {
    if (kind === "eth-demo") {
      setFilters({ ...defaultFilters, query: "ETH", mode: "Risk Scan" }, "all");
      return;
    }
    if (kind === "needs-attestation") {
      setFilters({ ...defaultFilters, status: "未上链" }, "all");
      return;
    }
    if (kind === "high-risk") {
      setFilters({ ...defaultFilters, minRisk: 60 }, "all");
    }
  }

  return (
    <section className="space-y-5">
      <PageHeading eyebrow="Reports" title="报告中心" description="按模式、风险分、结论、日期和关键词筛选持久化 Agent 报告，并明确区分 live、partial 与 fallback 来源。" />
      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className={clsx(cardClass, "overflow-hidden")}>
          <div className="border-b border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                    <Filter aria-hidden className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-950">Report scan controls</h2>
                    <p className="mt-0.5 text-xs text-slate-500">Use filters as a review lens, then open a report for evidence and proof details.</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className={buttonClass} type="button" onClick={() => applyQuickFilter("eth-demo")}>
                  ETH baseline
                </button>
                <button className={buttonClass} type="button" onClick={() => applyQuickFilter("needs-attestation")}>
                  Needs attestation
                </button>
                <button className={buttonClass} type="button" onClick={() => applyQuickFilter("high-risk")}>
                  High risk
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-12">
              <label className="grid gap-1 sm:col-span-2 lg:col-span-3">
                <span className="text-xs font-medium text-slate-600">搜索报告</span>
                <input
                  id="report-search"
                  type="search"
                  name="report-search"
                  className={inputClass}
                  value={filters.query}
                  onChange={(event) => setFilters({ ...filters, query: event.target.value })}
                  placeholder="Topic, title, summary..."
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
              <label className="grid gap-1 lg:col-span-2">
                <span className="text-xs font-medium text-slate-600">模式</span>
                <select name="report-mode" className={inputClass} value={filters.mode} autoComplete="off" onChange={(event) => setFilters({ ...filters, mode: event.target.value as ReportFilters["mode"] })}>
                  <option>All</option>
                  <option>Alpha Scan</option>
                  <option>Risk Scan</option>
                  <option>DAO 尽调</option>
                </select>
              </label>
              <label className="grid gap-1 lg:col-span-2">
                <span className="text-xs font-medium text-slate-600">结论</span>
                <select name="report-verdict" className={inputClass} value={filters.verdict} autoComplete="off" onChange={(event) => setFilters({ ...filters, verdict: event.target.value as ReportFilters["verdict"] })}>
                  <option>All</option>
                  <option>POSITIVE</option>
                  <option>OBSERVE</option>
                  <option>CAUTION</option>
                  <option>NEGATIVE</option>
                </select>
              </label>
              <label className="grid gap-1 lg:col-span-2">
                <span className="text-xs font-medium text-slate-600">证明状态</span>
                <select name="report-status" className={inputClass} value={filters.status} autoComplete="off" onChange={(event) => setFilters({ ...filters, status: event.target.value as ReportFilters["status"] })}>
                  <option>All</option>
                  <option>已上链</option>
                  <option>未上链</option>
                  <option>已完成</option>
                </select>
              </label>
              <label className="grid gap-1 lg:col-span-1">
                <span className="text-xs font-medium text-slate-600">最低风险分</span>
                <input className={inputClass} name="min-risk" type="number" min={0} max={100} inputMode="numeric" value={filters.minRisk} autoComplete="off" onChange={(event) => updateRisk("minRisk", event.target.value)} />
              </label>
              <label className="grid gap-1 lg:col-span-1">
                <span className="text-xs font-medium text-slate-600">最高风险分</span>
                <input className={inputClass} name="max-risk" type="number" min={0} max={100} inputMode="numeric" value={filters.maxRisk} autoComplete="off" onChange={(event) => updateRisk("maxRisk", event.target.value)} />
              </label>
              <fieldset className="grid gap-2 sm:col-span-2 lg:col-span-12">
                <legend className="text-xs font-medium text-slate-600">日期范围</legend>
                <div className="flex flex-wrap items-center gap-2">
                  {dateRangePresets.map((option) => (
                    <button
                      key={option.key}
                      className={clsx(
                        "inline-flex h-9 items-center justify-center rounded-lg border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 active:scale-[0.98]",
                        datePreset === option.key ? selectedButtonClass : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50"
                      )}
                      type="button"
                      aria-pressed={datePreset === option.key}
                      onClick={() => updateDatePreset(option.key)}
                    >
                      {option.label}
                    </button>
                  ))}
                  {datePreset !== "custom" ? <span className="text-xs text-slate-500">{formatDateRangeHint(filters)}</span> : null}
                </div>
                {datePreset === "custom" ? (
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
                    <label className="grid gap-1">
                      <span className="text-xs font-medium text-slate-600">开始日期</span>
                      <input className={inputClass} name="start-date" type="date" value={filters.startDate} autoComplete="off" onChange={(event) => updateCustomDate("startDate", event.target.value)} />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs font-medium text-slate-600">结束日期</span>
                      <input className={inputClass} name="end-date" type="date" value={filters.endDate} autoComplete="off" onChange={(event) => updateCustomDate("endDate", event.target.value)} />
                    </label>
                    <button className={buttonClass} type="button" onClick={clearCustomDateRange}>
                      清空日期
                    </button>
                  </div>
                ) : null}
              </fieldset>
            </div>

            <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">Showing {filteredReports.length} of {reportItems.length} reports</span>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">Avg confidence {stats.averageConfidence}%</span>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">{stats.attestedCount} on-chain</span>
                <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700 ring-1 ring-orange-100">{stats.highRiskCount} high risk</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className={buttonClass} type="button" onClick={() => setFilters(defaultFilters, "all")}>
                  重置
                </button>
                <button className={primaryButtonClass} type="button" onClick={exportAll}>
                  <Download aria-hidden className="h-4 w-4" />
                  导出报告
                </button>
              </div>
            </div>

            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Active filters</span>
                {activeFilters.length > 0 ? (
                  activeFilters.map((label) => (
                    <span key={label} className="rounded-full bg-white px-2.5 py-1 text-xs text-slate-700 ring-1 ring-slate-200">
                      {label}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-500">None, showing the full persistent + fallback report set.</span>
                )}
              </div>
            </div>
          </div>
          <div className="overflow-hidden">
            <table className="w-full table-fixed text-left text-sm">
              <colgroup>
                <col style={{ width: "28%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "7%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "9%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "8%" }} />
              </colgroup>
              <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase text-slate-500 shadow-[inset_0_-1px_0_rgb(226,232,240)]">
                <tr>
                  <th className="px-3 py-3">Report</th>
                  <th className="px-3 py-3">Mode</th>
                  <th className="px-3 py-3 text-right">Risk</th>
                  <th className="px-3 py-3 text-right">Alpha</th>
                  <th className="px-3 py-3">Evidence</th>
                  <th className="px-3 py-3">Audit trail</th>
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Verdict</th>
                  <th className="px-3 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReports.map((report) => (
                  <tr key={report.id} className="group hover:bg-slate-50">
                    <td className="px-3 py-3 align-middle">
                      <div className="flex items-center gap-3">
                        <TokenIcon symbol={report.topic} />
                        <div className="min-w-0">
                          <Link className="font-semibold text-slate-950 underline-offset-2 group-hover:text-blue-700 group-hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100" aria-label={`打开 ${report.title}`} href={`/reports/${report.id}`}>
                            {report.title}
                          </Link>
                          <p className="max-w-[520px] truncate text-xs text-slate-500">{report.summary}</p>
                          <p className="mono mt-1 text-[11px] text-slate-400">
                            {report.id} / {report.sourceMode ?? "mock"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <ModeBadge mode={report.mode} />
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <CompactScoreBar value={report.riskScore} />
                    </td>
                    <td className="px-3 py-3 text-right align-middle">
                      <span className="tabular-nums text-base font-semibold text-slate-950">{report.alphaScore}</span>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <EvidenceSummary report={report} />
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <AuditTrailSummary report={report} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 align-middle text-xs text-slate-500">
                      <span className="block">{report.createdAt.slice(0, 10)}</span>
                      <span className="mono mt-1 block text-[11px] text-slate-400">{report.createdAt.slice(11)}</span>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <VerdictBadge verdict={report.verdict} />
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <div className="flex justify-center gap-1.5">
                        <Link className={iconButtonClass} aria-label={`查看 ${report.title}`} href={`/reports/${report.id}`}>
                          <Eye aria-hidden className="h-4 w-4" />
                        </Link>
                        <button className={iconButtonClass} type="button" aria-label={`下载 ${report.title}`} onClick={() => downloadJson(`${report.topic.toLowerCase()}-${new Date().toISOString().slice(0, 10)}-report.json`, report)}>
                          <Download aria-hidden className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredReports.length === 0 ? <EmptyState title="没有匹配报告" detail="调整关键词、日期或风险分范围后重试。" /> : null}
          </div>
        </div>

        <aside className="space-y-4">
          <StatCard icon={FileText} label="报告总数" value={`${reportItems.length}`} detail="persistent + fallback data" tone="blue" />
          <StatCard icon={ShieldCheck} label="Proof coverage" value={`${reportItems.length ? Math.round((reportItems.filter((report) => report.status === "已上链").length / reportItems.length) * 100) : 0}%`} detail="已上链报告占比" tone="green" />
          <div className={clsx(cardClass, "p-4")}>
            <div className="flex items-center gap-2">
              <SlidersHorizontal aria-hidden className="h-4 w-4 text-blue-700" />
              <h2 className="text-sm font-semibold text-slate-950">Review posture</h2>
            </div>
            <div className="mt-3 space-y-3 text-sm">
              <ReviewRow label="Needs attention" value={`${reportItems.filter((report) => report.verdict === "CAUTION" || report.riskScore >= 60).length} reports`} tone="orange" />
              <ReviewRow label="Ready to present" value={`${reportItems.filter((report) => report.status === "已上链").length} attested`} tone="green" />
              <ReviewRow label="Evidence packets" value={`${reportItems.reduce((sum, report) => sum + report.evidence.length, 0)} linked`} tone="blue" />
            </div>
          </div>
          <DistributionCard title="结论分布" rows={[["POSITIVE", 1], ["OBSERVE", 2], ["CAUTION", 1], ["NEGATIVE", 0]]} />
          <DistributionCard title="模式分布" rows={[["Risk Scan", 2], ["Alpha Scan", 1], ["DAO 尽调", 1]]} />
          <div className={clsx(cardClass, "p-4 text-sm text-slate-600")}>
            <h2 className="mb-2 font-semibold text-slate-950">数据说明</h2>
            <p>报告列表合并展示持久化 Agent run 与显式 sourceMode 标记的 fallback 数据；审计时请优先查看每条报告、证据和 Trace 的 sourceMode。</p>
          </div>
        </aside>
      </div>
    </section>
  );
}

function EvidenceSummary({ report }: { report: Report }) {
  const evidenceCount = report.evidence.length;
  const topWeight = Math.max(...report.evidence.map((item) => Math.round(item.weight * 100)));
  const sourceCount = new Set(report.evidence.map((item) => item.source)).size;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-slate-900">
        {evidenceCount} {evidenceCount === 1 ? "item" : "items"} / top {topWeight}%
      </p>
      <div className="flex flex-wrap gap-1.5">
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-600">{sourceCount} sources</span>
        <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] text-blue-700 ring-1 ring-blue-100">linked</span>
      </div>
    </div>
  );
}

function CompactScoreBar({ value }: { value: number }) {
  const color = value >= 70 ? "bg-red-500" : value >= 50 ? "bg-orange-500" : "bg-emerald-500";

  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center justify-end gap-1 text-[11px] text-slate-500">
        <span className="tabular-nums font-semibold text-slate-900">{value}</span>
        <span>/100</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div className={clsx("h-full rounded-full", color)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function AuditTrailSummary({ report }: { report: Report }) {
  const attested = report.status === "已上链";
  const hashReady = Boolean(report.reportHash && report.evidenceHash);

  return (
    <div className="flex flex-col items-start gap-1.5">
      <span className={clsx("inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold ring-1", hashReady ? "bg-emerald-50 text-emerald-700 ring-emerald-100" : "bg-slate-100 text-slate-600 ring-slate-200")}>
        <CheckCircle2 aria-hidden className="h-3.5 w-3.5" />
        hash ready
      </span>
      <span className={clsx("inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold ring-1", attested ? "bg-blue-50 text-blue-700 ring-blue-100" : "bg-orange-50 text-orange-700 ring-orange-100")}>
        {attested ? <ShieldCheck aria-hidden className="h-3.5 w-3.5" /> : <AlertTriangle aria-hidden className="h-3.5 w-3.5" />}
        {attested ? "attested" : "pending"}
      </span>
    </div>
  );
}

function ReviewRow({ label, value, tone }: { label: string; value: string; tone: "blue" | "green" | "orange" }) {
  const dotClass = {
    blue: "bg-blue-500",
    green: "bg-emerald-500",
    orange: "bg-orange-500"
  }[tone];

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="flex items-center gap-2 text-slate-600">
        <span className={clsx("h-2 w-2 rounded-full", dotClass)} />
        {label}
      </span>
      <span className="font-semibold text-slate-950">{value}</span>
    </div>
  );
}

function createReportStats(items: Report[]) {
  const averageConfidence = items.length > 0
    ? Math.round((items.reduce((sum, report) => sum + report.confidence, 0) / items.length) * 100)
    : 0;

  return {
    averageConfidence,
    attestedCount: items.filter((report) => report.status === "已上链").length,
    highRiskCount: items.filter((report) => report.riskScore >= 60).length
  };
}

function getDateRangeForPreset(preset: Exclude<DateRangePreset, "custom">, items: Report[] = reports): Pick<ReportFilters, "startDate" | "endDate"> {
  if (preset === "all") return { startDate: "", endDate: "" };

  const anchorDate = getLatestReportDate(items);
  if (preset === "today") return { startDate: anchorDate, endDate: anchorDate };

  return {
    startDate: shiftDate(anchorDate, preset === "7d" ? -6 : -29),
    endDate: anchorDate
  };
}

function getDatePresetFromFilters(filters: ReportFilters): DateRangePreset {
  if (!filters.startDate && !filters.endDate) return "all";

  const todayRange = getDateRangeForPreset("today");
  if (filters.startDate === todayRange.startDate && filters.endDate === todayRange.endDate) return "today";

  const sevenDayRange = getDateRangeForPreset("7d");
  if (filters.startDate === sevenDayRange.startDate && filters.endDate === sevenDayRange.endDate) return "7d";

  const thirtyDayRange = getDateRangeForPreset("30d");
  if (filters.startDate === thirtyDayRange.startDate && filters.endDate === thirtyDayRange.endDate) return "30d";

  return "custom";
}

function formatDateRangeHint(filters: ReportFilters) {
  if (!filters.startDate && !filters.endDate) return "当前显示全部日期";
  return `当前范围：${filters.startDate || "不限"} 至 ${filters.endDate || "不限"}`;
}

function getLatestReportDate(items: Report[]) {
  return items.reduce((latest, report) => {
    const reportDate = report.createdAt.slice(0, 10);
    return reportDate > latest ? reportDate : latest;
  }, items[0]?.createdAt.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
}

function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function getActiveFilterLabels(filters: ReportFilters) {
  const labels: string[] = [];
  if (filters.query) labels.push(`Query: ${filters.query}`);
  if (filters.mode !== "All") labels.push(`Mode: ${filters.mode}`);
  if (filters.verdict !== "All") labels.push(`Verdict: ${filters.verdict}`);
  if (filters.status !== "All") labels.push(`Status: ${filters.status}`);
  if (filters.minRisk !== 0 || filters.maxRisk !== 100) labels.push(`Risk: ${filters.minRisk}-${filters.maxRisk}`);
  if (filters.startDate || filters.endDate) labels.push(`Date: ${filters.startDate || "start"} to ${filters.endDate || "end"}`);
  return labels;
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

function filtersToQuery(filters: ReportFilters, datePreset?: DateRangePreset): string {
  const params = new URLSearchParams();
  if (filters.query) params.set("query", filters.query);
  if (filters.mode !== "All") params.set("mode", filters.mode);
  if (filters.verdict !== "All") params.set("verdict", filters.verdict);
  if (filters.status !== "All") params.set("status", filters.status);
  if (filters.minRisk !== 0) params.set("minRisk", String(filters.minRisk));
  if (filters.maxRisk !== 100) params.set("maxRisk", String(filters.maxRisk));
  if (datePreset === "custom") params.set("dateRange", "custom");
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
  return params.toString();
}

function parseDateRangePreset(value: string | null, filters: ReportFilters): DateRangePreset {
  return value === "custom" ? "custom" : getDatePresetFromFilters(filters);
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
