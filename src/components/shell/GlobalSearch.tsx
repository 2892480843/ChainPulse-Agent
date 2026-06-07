"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Search } from "lucide-react";
import { fetchStoredReports, fetchStoredTasks, fetchStoredTraces } from "@/lib/adapters/agent-data-client";
import { searchChainPulse, type SearchResult, type SearchResultType } from "@/lib/search";
import type { Report, RunningTask, XApiTrace } from "@/lib/types";
import { useAppActions } from "./AppContext";

const groupLabels: Record<SearchResultType, string> = {
  Report: "Reports",
  Task: "Tasks",
  Trace: "AI / Tool Trace"
};

const groupOrder: SearchResultType[] = ["Task", "Report", "Trace"];

export function GlobalSearch() {
  const router = useRouter();
  const { language } = useAppActions();
  const copy = searchCopy[language];
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [records, setRecords] = useState<{ reports: Report[]; tasks: RunningTask[]; traces: XApiTrace[] }>({
    reports: [],
    tasks: [],
    traces: []
  });
  const [loadState, setLoadState] = useState<"idle" | "loading" | "failed">("idle");
  const results = useMemo(() => searchChainPulse(query, records), [query, records]);
  const groupedResults = useMemo(() => groupResults(results), [results]);
  const showPanel = open && query.trim().length > 0;

  useEffect(() => {
    let cancelled = false;
    setLoadState("loading");
    Promise.all([fetchStoredReports(), fetchStoredTasks(), fetchStoredTraces()])
      .then(([reports, tasks, traces]) => {
        if (!cancelled) {
          setRecords({ reports, tasks, traces });
          setLoadState("idle");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRecords({ reports: [], tasks: [], traces: [] });
          setLoadState("failed");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function openResult(path: string) {
    setQuery("");
    setOpen(false);
    setActiveIndex(0);
    router.push(path);
  }

  return (
    <div className="relative min-w-0 flex-1 md:max-w-xl">
      <label>
        <span className="sr-only">{copy.label}</span>
        <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          name="global-search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              return;
            }
            if (!showPanel || results.length === 0) return;
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveIndex((current) => Math.min(current + 1, results.length - 1));
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((current) => Math.max(current - 1, 0));
            }
            if (event.key === "Enter") {
              event.preventDefault();
              openResult(results[activeIndex].path);
            }
          }}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm transition-colors focus-visible:border-blue-500 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
          placeholder={copy.placeholder}
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showPanel}
          aria-controls="global-search-results"
          aria-haspopup="listbox"
        />
      </label>

      {showPanel ? (
        <div id="global-search-results" className="absolute left-0 top-11 z-40 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl" role="listbox">
          <div className="max-h-96 overflow-auto p-2">
            {results.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-600">
                <p className="font-medium text-slate-900">{loadState === "loading" ? copy.loading : copy.empty}</p>
                <p className="mt-1 text-xs text-slate-500">{loadState === "failed" ? copy.failed : copy.emptyDetail}</p>
              </div>
            ) : (
              groupedResults.map((group) => (
                <div key={group.type} className="mt-2 first:mt-0">
                  <p className="px-2 py-1 text-[11px] font-semibold uppercase text-slate-500">{groupLabels[group.type]}</p>
                  <div className="grid gap-1">
                    {group.results.map(({ result, index }) => (
                      <button
                        key={`${result.type}-${result.id}`}
                        type="button"
                        role="option"
                        aria-selected={index === activeIndex}
                        aria-label={`${result.type} ${result.title} ${result.description} ${result.path}`}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => openResult(result.path)}
                        className={clsx(
                          "grid w-full grid-cols-[76px_1fr] gap-3 rounded-lg px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100",
                          index === activeIndex ? "bg-blue-50" : "hover:bg-slate-50"
                        )}
                      >
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-center text-[11px] font-semibold text-slate-600">{result.type}</span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-slate-950">
                            <HighlightMatch value={result.title} query={query} />
                          </span>
                          <span className="block truncate text-xs text-slate-500">
                            <HighlightMatch value={result.description} query={query} />
                          </span>
                          <span className="mono mt-1 block truncate text-[11px] text-blue-700">{result.path}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

const searchCopy = {
  en: {
    label: "Global search",
    placeholder: "Search backend tasks, reports, hashes...",
    empty: "No backend match",
    loading: "Loading backend records",
    emptyDetail: "Run a real Agent first, then search persisted tasks, reports, and traces.",
    failed: "Backend search data is unavailable. Check operator access or API status."
  },
  zh: {
    label: "全局搜索",
    placeholder: "搜索后端任务、报告、哈希...",
    empty: "没有后端匹配结果",
    loading: "正在加载后端记录",
    emptyDetail: "请先运行真实 Agent，然后搜索持久化任务、报告和 Trace。",
    failed: "后端搜索数据不可用，请检查操作员权限或 API 状态。"
  }
} as const;

function groupResults(results: SearchResult[]) {
  return groupOrder
    .map((type) => ({
      type,
      results: results
        .map((result, index) => ({ result, index }))
        .filter((entry) => entry.result.type === type)
    }))
    .filter((group) => group.results.length > 0);
}

function HighlightMatch({ value, query }: { value: string; query: string }) {
  const cleanQuery = query.trim();
  if (!cleanQuery) return value;
  const matchIndex = value.toLowerCase().indexOf(cleanQuery.toLowerCase());
  if (matchIndex < 0) return value;
  const before = value.slice(0, matchIndex);
  const match = value.slice(matchIndex, matchIndex + cleanQuery.length);
  const after = value.slice(matchIndex + cleanQuery.length);

  return (
    <>
      {before}
      <mark className="rounded bg-yellow-100 px-0.5 text-slate-950">{match}</mark>
      {after}
    </>
  );
}
