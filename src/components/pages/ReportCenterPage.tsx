"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { Download, Eye, FileText } from "lucide-react";
import { filterReports, clampRisk } from "@/lib/filters";
import { reports } from "@/lib/mock-data";
import type { ReportFilters } from "@/lib/types";
import { useAppActions } from "@/components/shell/AppShell";
import { DistributionCard } from "@/components/ui/DistributionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ModeBadge } from "@/components/ui/ModeBadge";
import { PageHeading } from "@/components/ui/PageHeading";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { StatCard } from "@/components/ui/StatCard";
import { TokenIcon } from "@/components/ui/TokenIcon";
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import { buttonClass, cardClass, inputClass, primaryButtonClass } from "@/components/ui/styles";

const defaultFilters: ReportFilters = {
  query: "",
  mode: "All",
  verdict: "All",
  minRisk: 0,
  maxRisk: 100,
  startDate: "",
  endDate: ""
};

export function ReportCenterPage() {
  const { downloadJson } = useAppActions();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const parsedFilters = filtersFromSearchParams(new URLSearchParams(queryString));
  const [filterState, setFilterState] = useState(() => ({ sourceQueryString: queryString, filters: parsedFilters }));
  let filters = filterState.filters;

  if (filterState.sourceQueryString !== queryString) {
    filters = parsedFilters;
    setFilterState({ sourceQueryString: queryString, filters: parsedFilters });
  }

  const filteredReports = useMemo(() => filterReports(reports, filters), [filters]);

  function setFilters(nextFilters: ReportFilters) {
    setFilterState({ sourceQueryString: queryString, filters: nextFilters });
    const nextQuery = filtersToQuery(nextFilters);
    router.push(nextQuery ? `/reports?${nextQuery}` : "/reports");
  }

  function updateRisk(key: "minRisk" | "maxRisk", value: string) {
    setFilters({ ...filters, [key]: clampRisk(Number(value)) });
  }

  function exportAll() {
    const date = new Date().toISOString().slice(0, 10);
    const verdict = filters.verdict === "All" ? "all-verdicts" : filters.verdict.toLowerCase();
    const range = `${filters.minRisk}-${filters.maxRisk}`;
    downloadJson(`chainpulse-reports-${date}-${verdict}-risk-${range}.json`, filteredReports);
  }

  return (
    <section className="space-y-5">
      <PageHeading eyebrow="Reports" title="报告中心" description="按模式、风险分、结论、日期和关键词筛选本地 mock 报告，导出结构化 JSON 用于路演演示。" />
      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className={clsx(cardClass, "overflow-hidden")}>
          <div className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-8">
            <label className="grid gap-1 md:col-span-2">
              <span className="text-xs font-medium text-slate-600">搜索报告</span>
              <input
                id="report-search"
                type="search"
                name="report-search"
                className={inputClass}
                value={filters.query}
                onChange={(event) => setFilters({ ...filters, query: event.target.value })}
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-slate-600">模式</span>
              <select name="report-mode" className={inputClass} value={filters.mode} autoComplete="off" onChange={(event) => setFilters({ ...filters, mode: event.target.value as ReportFilters["mode"] })}>
                <option>All</option>
                <option>Alpha Scan</option>
                <option>Risk Scan</option>
                <option>DAO 尽调</option>
              </select>
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-slate-600">结论</span>
              <select name="report-verdict" className={inputClass} value={filters.verdict} autoComplete="off" onChange={(event) => setFilters({ ...filters, verdict: event.target.value as ReportFilters["verdict"] })}>
                <option>All</option>
                <option>POSITIVE</option>
                <option>OBSERVE</option>
                <option>CAUTION</option>
                <option>NEGATIVE</option>
              </select>
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-slate-600">最低风险分</span>
              <input className={inputClass} name="min-risk" type="number" min={0} max={100} inputMode="numeric" value={filters.minRisk} autoComplete="off" onChange={(event) => updateRisk("minRisk", event.target.value)} />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-slate-600">最高风险分</span>
              <input className={inputClass} name="max-risk" type="number" min={0} max={100} inputMode="numeric" value={filters.maxRisk} autoComplete="off" onChange={(event) => updateRisk("maxRisk", event.target.value)} />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-slate-600">开始日期</span>
              <input className={inputClass} name="start-date" type="date" value={filters.startDate} autoComplete="off" onChange={(event) => setFilters({ ...filters, startDate: event.target.value })} />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-slate-600">结束日期</span>
              <input className={inputClass} name="end-date" type="date" value={filters.endDate} autoComplete="off" onChange={(event) => setFilters({ ...filters, endDate: event.target.value })} />
            </label>
            <div className="flex flex-wrap items-end gap-2 md:col-span-8">
              <button className={buttonClass} type="button" onClick={() => setFilters(defaultFilters)}>
                重置
              </button>
              <button className={primaryButtonClass} type="button" onClick={exportAll}>
                <Download aria-hidden className="h-4 w-4" />
                导出报告
              </button>
            </div>
          </div>
          <div className="thin-scrollbar overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">Report</th>
                  <th className="px-4 py-2.5">Mode</th>
                  <th className="px-4 py-2.5">Risk</th>
                  <th className="px-4 py-2.5">Alpha</th>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Verdict</th>
                  <th className="px-4 py-2.5">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <TokenIcon symbol={report.topic} />
                        <div>
                          <p className="font-medium text-slate-900">{report.title}</p>
                          <p className="max-w-[520px] truncate text-xs text-slate-500">{report.summary}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <ModeBadge mode={report.mode} />
                    </td>
                    <td className="px-4 py-2.5">
                      <ScoreBar value={report.riskScore} />
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">{report.alphaScore}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{report.createdAt.slice(0, 10)}</td>
                    <td className="px-4 py-2.5">
                      <VerdictBadge verdict={report.verdict} />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-2">
                        <Link className={buttonClass} aria-label={`查看 ${report.title}`} href={`/reports/${report.id}`}>
                          <Eye aria-hidden className="h-4 w-4" />
                        </Link>
                        <button className={buttonClass} type="button" aria-label={`下载 ${report.title}`} onClick={() => downloadJson(`${report.topic.toLowerCase()}-${new Date().toISOString().slice(0, 10)}-report.json`, report)}>
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
          <StatCard icon={FileText} label="报告总数" value={`${reports.length}`} detail="本地 mock 数据" tone="blue" />
          <DistributionCard title="结论分布" rows={[["POSITIVE", 1], ["OBSERVE", 2], ["CAUTION", 1], ["NEGATIVE", 0]]} />
          <DistributionCard title="模式分布" rows={[["Risk Scan", 2], ["Alpha Scan", 1], ["DAO 尽调", 1]]} />
          <div className={clsx(cardClass, "p-4 text-sm text-slate-600")}>
            <h2 className="mb-2 font-semibold text-slate-950">数据说明</h2>
            <p>所有报告、Hash、证据和链上字段均为 mock，用于表达 Agent workflow 与 xAPI Trace，不包含真实 API Key。</p>
          </div>
        </aside>
      </div>
    </section>
  );
}

function filtersFromSearchParams(searchParams: Pick<URLSearchParams, "get">): ReportFilters {
  return {
    query: searchParams.get("query") ?? defaultFilters.query,
    mode: parseMode(searchParams.get("mode")),
    verdict: parseVerdict(searchParams.get("verdict")),
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
