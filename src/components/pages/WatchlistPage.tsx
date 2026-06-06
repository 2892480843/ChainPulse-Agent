"use client";

import Link from "next/link";
import clsx from "clsx";
import { Bell, CalendarClock, Database, Play, ShieldAlert } from "lucide-react";
import { useAppActions } from "@/components/shell/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeading } from "@/components/ui/PageHeading";
import { cardClass, primaryButtonClass } from "@/components/ui/styles";

export function WatchlistPage() {
  const { language } = useAppActions();
  const copy = watchlistCopy[language];

  return (
    <section className="space-y-5">
      <PageHeading eyebrow={copy.eyebrow} title={copy.title} description={copy.description} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className={cardClass}>
          <EmptyState title={copy.notEnabledTitle} detail={copy.notEnabledDetail} />
          <div className="border-t border-slate-200 p-4">
            <Link className={primaryButtonClass} href="/workspace">
              <Play aria-hidden className="h-4 w-4" />
              {copy.runAgent}
            </Link>
          </div>
        </div>

        <aside className="space-y-4">
          <StatusPanel icon={Database} title={copy.storeTitle} detail={copy.storeDetail} />
          <StatusPanel icon={CalendarClock} title={copy.schedulerTitle} detail={copy.schedulerDetail} />
          <StatusPanel icon={Bell} title={copy.alertTitle} detail={copy.alertDetail} />
          <div className={clsx(cardClass, "p-4")}>
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-700 ring-1 ring-amber-100">
                <ShieldAlert aria-hidden className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-slate-950">{copy.noMockTitle}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{copy.noMockDetail}</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function StatusPanel({ icon: Icon, title, detail }: { icon: typeof Database; title: string; detail: string }) {
  return (
    <div className={clsx(cardClass, "p-4")}>
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700 ring-1 ring-blue-100">
          <Icon aria-hidden className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
        </div>
      </div>
    </div>
  );
}

const watchlistCopy = {
  en: {
    eyebrow: "Monitoring",
    title: "Watchlist",
    description: "Scheduled monitoring is not exposed until a real backend watchlist store and scheduler are implemented.",
    notEnabledTitle: "Watchlist backend is not enabled",
    notEnabledDetail: "This page no longer shows local targets or synthetic scans. Use Workspace for real one-off Agent runs until the automation backend is available.",
    runAgent: "Run Agent",
    storeTitle: "Required store",
    storeDetail: "A real watchlist needs persisted targets, ownership, scan cadence, and threshold policy.",
    schedulerTitle: "Required scheduler",
    schedulerDetail: "Recurring scans should run server-side and create normal Agent tasks/reports/traces.",
    alertTitle: "Required alerts",
    alertDetail: "Alerts should be created from stored reports and delivered through configured channels.",
    noMockTitle: "No mock monitoring",
    noMockDetail: "The previous local watchlist table was hidden because it could be mistaken for live intelligence."
  },
  zh: {
    eyebrow: "监控",
    title: "监控列表",
    description: "在真实后端监控目标存储和调度器实现前，定时监控功能不会对外展示。",
    notEnabledTitle: "监控后端尚未启用",
    notEnabledDetail: "本页面不再展示本地目标或模拟扫描。在自动化后端可用前，请先在工作台执行真实的一次性 Agent 运行。",
    runAgent: "运行 Agent",
    storeTitle: "需要真实存储",
    storeDetail: "真实 Watchlist 需要持久化目标、归属关系、扫描频率和阈值策略。",
    schedulerTitle: "需要后端调度",
    schedulerDetail: "定时扫描应在服务端执行，并生成正常的 Agent 任务、报告和 Trace。",
    alertTitle: "需要真实告警",
    alertDetail: "告警应从已存储报告生成，并通过配置好的渠道发送。",
    noMockTitle: "不展示模拟监控",
    noMockDetail: "旧的本地监控表已隐藏，因为它容易被误认为实时情报。"
  }
} as const;
