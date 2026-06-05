"use client";

import Link from "next/link";
import { Bell, Presentation } from "lucide-react";
import { GlobalSearch } from "./GlobalSearch";

export function Header() {
  return (
    <header className="border-b border-slate-200 bg-white/90 px-4 py-2.5 sm:px-6 sm:py-3 lg:px-8">
      <div className="mx-auto flex max-w-[1400px] items-center gap-2 md:justify-between">
        <GlobalSearch />
        <div className="flex shrink-0 items-center gap-2">
          <Link className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 active:scale-[0.98] sm:w-auto sm:px-3" href="/demo" aria-label="Open Demo Mode">
            <Presentation aria-hidden className="h-4 w-4" />
            <span className="hidden sm:inline">Demo Mode</span>
          </Link>
          <span className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 md:inline-flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            系统状态：正常
          </span>
          <button className="hidden h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 active:scale-[0.98] sm:inline-flex" type="button" aria-label="通知">
            <Bell aria-hidden className="h-4 w-4" />
          </button>
          <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 xl:flex">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-blue-600 text-xs font-semibold text-white">W</span>
            <div>
              <p className="text-xs font-semibold text-slate-900">Web3 Researcher</p>
              <p className="text-[11px] text-slate-500">demo workspace</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
