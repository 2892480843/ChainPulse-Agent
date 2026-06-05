"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  Activity,
  Eye,
  FileText,
  LayoutDashboard,
  Network,
  Presentation,
  Settings,
  ShieldCheck
} from "lucide-react";
import { navigationItems } from "@/lib/navigation";
import type { PageKey } from "@/lib/types";

const iconMap = {
  workspace: LayoutDashboard,
  demo: Presentation,
  tasks: Activity,
  reports: FileText,
  trace: Network,
  attestation: ShieldCheck,
  watchlist: Eye,
  settings: Settings
} satisfies Record<PageKey, typeof LayoutDashboard>;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside aria-label="主导航侧栏" className="sticky top-0 hidden h-[100dvh] w-[280px] shrink-0 self-start overflow-y-auto border-r border-slate-200 bg-white/95 px-4 py-4 thin-scrollbar lg:block">
      <div className="flex items-center gap-3">
        <LogoMark />
        <div>
          <p className="text-sm font-semibold text-slate-950">ChainPulse Agent</p>
          <p className="text-xs text-slate-500">xAPI intelligence console</p>
        </div>
      </div>

      <nav className="mt-5 space-y-1">
        {navigationItems.map((item) => {
          const Icon = iconMap[item.key];
          const active = pathname === item.path || pathname?.startsWith(`${item.path}/`);
          return (
            <Link
              key={item.key}
              href={item.path}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "inline-flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 active:scale-[0.98]",
                active ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
              )}
            >
              <Icon aria-hidden className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-5 grid gap-3">
        <QuotaCard label="xAPI quota" value="72%" detail="14,280 / 20,000 calls" tone="blue" />
        <QuotaCard label="Agent runs" value="18/25" detail="7 runs available today" tone="green" />
      </div>

      <div className="mt-5 space-y-1 border-t border-slate-200 pt-4 text-xs text-slate-500">
        <p>Demo workspace</p>
        <p>xAPI mock adapter online</p>
        <p>No real wallet connected</p>
      </div>
    </aside>
  );
}

function QuotaCard({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: "blue" | "green" }) {
  const progress = value.includes("%") ? Number(value.replace("%", "")) : 72;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-600">{label}</p>
        <p className={clsx("text-xs font-semibold", tone === "blue" ? "text-blue-700" : "text-emerald-700")}>{value}</p>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div className={clsx("h-full rounded-full", tone === "blue" ? "bg-blue-500" : "bg-emerald-500")} style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-2 text-[11px] text-slate-500">{detail}</p>
    </div>
  );
}

function LogoMark() {
  return (
    <span className="grid h-10 w-10 place-items-center rounded-lg border border-blue-100 bg-blue-50">
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
        <path d="M3 12h3l2-6 4 12 3-9 2 3h4" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="19" cy="12" r="2" fill="#10b981" />
      </svg>
    </span>
  );
}
