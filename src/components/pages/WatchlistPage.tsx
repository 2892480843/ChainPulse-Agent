"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { AlertTriangle, Bell, Eye, Plus, RefreshCcw } from "lucide-react";
import { filterWatchlist } from "@/lib/filters";
import { watchlistTargets } from "@/lib/mock-data";
import type { WatchlistFilters, WatchlistTarget } from "@/lib/types";
import { useAppActions } from "@/components/shell/AppShell";
import { AlertBadge } from "@/components/ui/AlertBadge";
import { PageHeading } from "@/components/ui/PageHeading";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { Sparkline } from "@/components/ui/Sparkline";
import { StatCard } from "@/components/ui/StatCard";
import { TokenIcon } from "@/components/ui/TokenIcon";
import { buttonClass, cardClass, inputClass, primaryButtonClass } from "@/components/ui/styles";

const defaultFilters: WatchlistFilters = {
  query: "",
  category: "All",
  alertState: "All",
  sortBy: "risk-desc"
};

export function WatchlistPage() {
  const { notify } = useAppActions();
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetQuery = searchParams.get("target") ?? "";
  const [filters, setFilters] = useState<WatchlistFilters>(defaultFilters);
  const [watchItems, setWatchItems] = useState(watchlistTargets);
  const [showAdd, setShowAdd] = useState(false);
  const [draftTarget, setDraftTarget] = useState("AAVE");
  const [highlightState, setHighlightState] = useState(() => ({ sourceTargetQuery: targetQuery, highlightedId: targetQuery }));
  let highlightedId = highlightState.highlightedId;

  if (highlightState.sourceTargetQuery !== targetQuery) {
    highlightedId = targetQuery;
    setHighlightState({ sourceTargetQuery: targetQuery, highlightedId: targetQuery });
  }

  const [overviewFeedback, setOverviewFeedback] = useState("等待下一次扫描");
  const [recentAlert, setRecentAlert] = useState("1 Critical / 2 Warning");
  const filteredWatchlist = useMemo(() => filterWatchlist(watchItems, filters), [filters, watchItems]);

  function addMockWatchTarget(name: string) {
    const cleanName = name.trim() || "AAVE";
    const nextTarget: WatchlistTarget = {
      id: `wl_${cleanName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Date.now()}`,
      name: cleanName,
      symbol: cleanName.startsWith("@") ? "KOL" : cleanName.slice(0, 4).toUpperCase(),
      category: cleanName.startsWith("@") ? "KOL" : "Token",
      alertState: "Normal",
      riskScore: 35,
      alphaScore: 57,
      lastScan: "just now",
      signals24h: [24, 25, 27, 28, 31, 33, 35, 36, 35, 37]
    };
    setWatchItems((current) => [nextTarget, ...current]);
    setShowAdd(false);
    setHighlightState({ sourceTargetQuery: targetQuery, highlightedId: nextTarget.id });
    router.push(`/watchlist?target=${nextTarget.id}`);
    setOverviewFeedback(`${cleanName} 已加入今日扫描队列`);
    notify("监控目标已添加");
  }

  function scanTarget(item: WatchlistTarget) {
    const timestamp = new Date().toLocaleTimeString("zh-CN", { hour12: false });
    setOverviewFeedback(`${timestamp} 已扫描 ${item.name}`);
    setRecentAlert(`${item.name} scan completed, risk score ${item.riskScore}`);
    setHighlightState({ sourceTargetQuery: targetQuery, highlightedId: item.id });
    router.push(`/watchlist?target=${item.id}`);
    notify("Watchlist scan triggered");
  }

  return (
    <section className="space-y-5">
      <PageHeading eyebrow="Monitoring" title="Watchlist" description="管理 Token、Protocol、DAO 与 KOL 监控目标，观察 24h 信号变化和最近告警。" />
      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className={clsx(cardClass, "overflow-hidden")}>
          <div className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-5">
            <label className="grid gap-1 md:col-span-2">
              <span className="text-xs font-medium text-slate-600">搜索</span>
              <input type="search" name="watchlist-search" className={inputClass} value={filters.query} autoComplete="off" onChange={(event) => setFilters({ ...filters, query: event.target.value })} spellCheck={false} />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-slate-600">类别</span>
              <select name="watchlist-category" className={inputClass} value={filters.category} autoComplete="off" onChange={(event) => setFilters({ ...filters, category: event.target.value as WatchlistFilters["category"] })}>
                <option>All</option>
                <option>Token</option>
                <option>Protocol</option>
                <option>KOL</option>
                <option>DAO</option>
              </select>
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-slate-600">告警状态</span>
              <select name="watchlist-alert-state" className={inputClass} value={filters.alertState} autoComplete="off" onChange={(event) => setFilters({ ...filters, alertState: event.target.value as WatchlistFilters["alertState"] })}>
                <option>All</option>
                <option>Normal</option>
                <option>Warning</option>
                <option>Critical</option>
              </select>
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-slate-600">排序</span>
              <select name="watchlist-sort" className={inputClass} value={filters.sortBy} autoComplete="off" onChange={(event) => setFilters({ ...filters, sortBy: event.target.value as WatchlistFilters["sortBy"] })}>
                <option value="risk-desc">风险优先</option>
                <option value="alpha-desc">Alpha 优先</option>
                <option value="recent">最近扫描</option>
              </select>
            </label>
            <div className="flex flex-wrap items-end gap-2 md:col-span-5">
              <button className={primaryButtonClass} type="button" onClick={() => setShowAdd(true)}>
                <Plus aria-hidden className="h-4 w-4" />
                添加监控目标
              </button>
              <button
                className={buttonClass}
                type="button"
                onClick={() => {
                  setRecentAlert("Alert policy panel opened");
                  notify("告警设置已打开");
                }}
              >
                <Bell aria-hidden className="h-4 w-4" />
                告警设置
              </button>
            </div>
          </div>

          {showAdd ? (
            <div className="border-b border-blue-100 bg-blue-50 p-4">
              <form
                className="flex flex-col gap-3 sm:flex-row sm:items-end"
                onSubmit={(event) => {
                  event.preventDefault();
                  addMockWatchTarget(draftTarget);
                }}
              >
                <label className="grid flex-1 gap-1">
                  <span className="text-xs font-medium text-blue-900">新监控目标</span>
                  <input className={inputClass} name="new-watch-target" value={draftTarget} autoComplete="off" onChange={(event) => setDraftTarget(event.target.value)} spellCheck={false} />
                </label>
                <button className={primaryButtonClass} type="submit">
                  添加
                </button>
                <button className={buttonClass} type="button" onClick={() => setShowAdd(false)}>
                  取消
                </button>
              </form>
            </div>
          ) : null}

          <div className="thin-scrollbar overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">Target</th>
                  <th className="px-4 py-2.5">Category</th>
                  <th className="px-4 py-2.5">Alert</th>
                  <th className="px-4 py-2.5">Risk</th>
                  <th className="px-4 py-2.5">24h Signals</th>
                  <th className="px-4 py-2.5">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredWatchlist.map((item) => (
                  <tr
                    key={item.id}
                    data-testid={`watchlist-row-${item.name}`}
                    data-highlighted={highlightedId === item.id}
                    className={clsx("transition-colors hover:bg-slate-50", highlightedId === item.id && "bg-blue-50 ring-1 ring-inset ring-blue-200")}
                  >
                    <td className="px-4 py-2.5 tabular-nums">
                      <div className="flex items-center gap-3">
                        <TokenIcon symbol={item.symbol} />
                        <div>
                          <p className="font-medium text-slate-900">{item.name}</p>
                          <p className="text-xs text-slate-500">{item.lastScan}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">{item.category}</td>
                    <td className="px-4 py-2.5">
                      <AlertBadge state={item.alertState} />
                    </td>
                    <td className="px-4 py-2.5">
                      <ScoreBar value={item.riskScore} />
                    </td>
                    <td className="px-4 py-2.5">
                      <Sparkline values={item.signals24h} />
                    </td>
                    <td className="px-4 py-2.5">
                      <button className={buttonClass} type="button" onClick={() => scanTarget(item)}>
                        <RefreshCcw aria-hidden className="h-4 w-4" />
                        扫描
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="space-y-4">
          <StatCard icon={Eye} label="监控目标" value={`${filteredWatchlist.length}`} detail="当前筛选结果" tone="blue" />
          <StatCard icon={AlertTriangle} label="最近告警" value="3" detail={recentAlert} tone="orange" />
          <div className={clsx(cardClass, "p-4")}>
            <h2 className="text-sm font-semibold text-slate-950">今日概览</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{overviewFeedback}</p>
          </div>
          <div className={clsx(cardClass, "p-4")}>
            <h2 className="text-sm font-semibold text-slate-950">扫描任务计划</h2>
            <div className="mt-3 space-y-3 text-sm">
              <ScheduleRow title="Risk Scan" value="每 6 小时" />
              <ScheduleRow title="Alpha Scan" value="每日 09:00" />
              <ScheduleRow title="DAO 尽调" value="手动触发" />
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function ScheduleRow({ title, value }: { title: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
      <span className="text-slate-700">{title}</span>
      <span className="text-xs font-medium text-slate-500">{value}</span>
    </div>
  );
}
