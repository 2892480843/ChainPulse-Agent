"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Search } from "lucide-react";
import { searchChainPulse } from "@/lib/search";

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const results = useMemo(() => searchChainPulse(query), [query]);
  const showResults = open && query.trim().length > 0 && results.length > 0;

  function openResult(path: string) {
    setOpen(false);
    router.push(path);
  }

  return (
    <div className="relative min-w-0 flex-1 md:max-w-xl">
      <label>
        <span className="sr-only">全局搜索</span>
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
            if (!showResults) return;
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
          placeholder="搜索任务、报告、地址 / KOL…"
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showResults}
          aria-controls="global-search-results"
          aria-haspopup="listbox"
        />
      </label>

      {showResults ? (
        <div id="global-search-results" className="absolute left-0 top-11 z-40 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl" role="listbox">
          <div className="max-h-96 overflow-auto p-2">
            {results.map((result, index) => (
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
                  <span className="block truncate text-sm font-semibold text-slate-950">{result.title}</span>
                  <span className="block truncate text-xs text-slate-500">{result.description}</span>
                  <span className="mono mt-1 block truncate text-[11px] text-blue-700">{result.path}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
