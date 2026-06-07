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
  Settings,
  ShieldCheck
} from "lucide-react";
import { navigationItems } from "@/lib/navigation";
import type { PageKey } from "@/lib/types";
import { useAppActions } from "./AppContext";

const iconMap = {
  workspace: LayoutDashboard,
  tasks: Activity,
  reports: FileText,
  trace: Network,
  attestation: ShieldCheck,
  watchlist: Eye,
  settings: Settings
} satisfies Record<PageKey, typeof LayoutDashboard>;

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useAppActions();

  return (
    <aside aria-label="Primary navigation" className="sticky top-0 hidden h-[100dvh] w-[280px] shrink-0 self-start overflow-y-auto border-r border-slate-200 bg-white/95 px-4 py-4 thin-scrollbar lg:block">
      <div className="flex items-center gap-3">
        <LogoMark />
        <div>
          <p className="text-sm font-semibold text-slate-950">ChainPulse Agent</p>
          <p className="text-xs text-slate-500">{t("shell.subtitle")}</p>
        </div>
      </div>

      <nav className="mt-5 space-y-0.5">
        {navigationItems.map((item, index) => {
          const Icon = iconMap[item.key];
          const active = pathname === item.path || pathname?.startsWith(`${item.path}/`);
          return (
            <Link
              key={item.key}
              href={item.path}
              aria-current={active ? "page" : undefined}
              style={{ animationDelay: `${index * 40}ms` }}
              className={clsx(
                "animate-stagger inline-flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100",
                active
                  ? "bg-blue-50 text-blue-700 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.12)]"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-950 hover:translate-x-0.5"
              )}
            >
              <span className={clsx("grid h-7 w-7 shrink-0 place-items-center rounded-md transition-colors", active ? "bg-blue-100 text-blue-700" : "text-slate-400 group-hover:text-slate-600")}>
                <Icon aria-hidden className="h-4 w-4" />
              </span>
              <span>{t(`nav.${item.key}`)}</span>
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-500" />}
            </Link>
          );
        })}
      </nav>

      <div className="mt-5 grid gap-3">
        <QuotaCard label={t("shell.evidenceQuota")} value="72%" detail={t("shell.evidenceQuotaDetail")} tone="blue" />
        <QuotaCard label={t("shell.agentCapacity")} value="18/25" detail={t("shell.agentCapacityDetail")} tone="green" />
      </div>

      <div className="mt-5 space-y-1 border-t border-slate-200 pt-4 text-xs text-slate-500">
        <p>{t("shell.reasoning")}</p>
        <p>{t("shell.evidenceTools")}</p>
        <p>{t("shell.attestationEnabled")}</p>
      </div>
    </aside>
  );
}

function QuotaCard({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: "blue" | "green" }) {
  const progress = value.includes("%") ? Number(value.replace("%", "")) : 72;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
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
    <span className="grid h-10 w-10 place-items-center rounded-lg border border-blue-100 bg-blue-50 shadow-[0_8px_20px_rgba(37,99,235,0.12)]">
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
        <path d="M3 12h3l2-6 4 12 3-9 2 3h4" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="19" cy="12" r="2" fill="#10b981" />
      </svg>
    </span>
  );
}
