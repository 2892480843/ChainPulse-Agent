"use client";

import { Bell } from "lucide-react";
import { buttonClass } from "@/components/ui/styles";
import { GlobalSearch } from "./GlobalSearch";

export function Header() {
  return (
    <header className="border-b border-slate-200 bg-white/90 px-4 py-3 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <GlobalSearch />
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            系统状态：正常
          </span>
          <button className={buttonClass} type="button" aria-label="通知">
            <Bell aria-hidden className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-blue-600 text-xs font-semibold text-white">W</span>
            <div className="hidden sm:block">
              <p className="text-xs font-semibold text-slate-900">Web3 Researcher</p>
              <p className="text-[11px] text-slate-500">demo workspace</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
