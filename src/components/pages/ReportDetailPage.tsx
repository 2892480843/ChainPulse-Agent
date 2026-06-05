"use client";

import Link from "next/link";
import clsx from "clsx";
import { ArrowLeft, Download, ExternalLink, ShieldCheck } from "lucide-react";
import { attestation, reports } from "@/lib/mock-data";
import { useAppActions } from "@/components/shell/AppShell";
import { DistributionCard } from "@/components/ui/DistributionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { HashRow } from "@/components/ui/HashRow";
import { InfoPanel } from "@/components/ui/InfoPanel";
import { ModeBadge } from "@/components/ui/ModeBadge";
import { PageHeading } from "@/components/ui/PageHeading";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TokenIcon } from "@/components/ui/TokenIcon";
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import { buttonClass, cardClass, primaryButtonClass } from "@/components/ui/styles";

const explorerBaseUrl = process.env.NEXT_PUBLIC_EXPLORER_BASE_URL || "https://sepolia.etherscan.io";

export function ReportDetailPage({ reportId }: { reportId: string }) {
  const { copiedKey, copyText, downloadJson, notify } = useAppActions();
  const report = reports.find((item) => item.id === reportId);

  if (!report) {
    return (
      <section className="space-y-5">
        <PageHeading eyebrow="Report detail" title="报告详情" description="当前路由没有匹配到本地 mock 报告。" />
        <div className={cardClass}>
          <EmptyState title="未找到报告" detail="请返回报告中心，从列表进入可用的 mock 报告详情。" />
        </div>
        <Link className={buttonClass} href="/reports">
          <ArrowLeft aria-hidden className="h-4 w-4" />
          返回报告中心
        </Link>
      </section>
    );
  }

  const sourceRows = report.evidence.map((item) => [item.source.replace("xapi:", ""), Math.round(item.weight * 100)] as [string, number]);
  const isAttested = report.status === "已上链";

  return (
    <section className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <PageHeading eyebrow="Report detail" title={report.title} description={report.summary} />
        <Link className={buttonClass} href="/reports">
          <ArrowLeft aria-hidden className="h-4 w-4" />
          返回报告中心
        </Link>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <div className={clsx(cardClass, "p-4 sm:p-5")}>
            <div className="flex flex-wrap items-center gap-3">
              <TokenIcon symbol={report.topic} />
              <div>
                <h2 className="text-lg font-semibold text-slate-950">{report.topic}</h2>
                <p className="text-xs text-slate-500">{report.createdAt}</p>
              </div>
              <ModeBadge mode={report.mode} />
              <StatusBadge status={report.status} />
              <VerdictBadge verdict={report.verdict} />
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <ScoreMetric label="Risk Score" value={report.riskScore} />
              <ScoreMetric label="Alpha Score" value={report.alphaScore} />
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">Confidence</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{Math.round(report.confidence * 100)}%</p>
                <p className="mt-2 text-xs text-slate-500">mock evidence confidence</p>
              </div>
            </div>
          </div>

          <div className={clsx(cardClass, "p-4 sm:p-5")}>
            <h2 className="text-sm font-semibold text-slate-950">Evidence</h2>
            <div className="mt-3 grid gap-3">
              {report.evidence.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-slate-900">{item.title}</p>
                    <span className="mono rounded-full bg-white px-2 py-1 text-xs text-slate-500">{Math.round(item.weight * 100)}%</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{item.source}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.summary}</p>
                </div>
              ))}
            </div>
          </div>

          <div className={clsx(cardClass, "p-4 sm:p-5")}>
            <h2 className="text-sm font-semibold text-slate-950">Actions</h2>
            <ul className="mt-3 grid gap-2">
              {report.actions.map((action) => (
                <li key={action} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {action}
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <HashRow label="Report Hash" value={report.reportHash} onCopy={copyText} copiedKey={copiedKey} />
            <HashRow label="Evidence Hash" value={report.evidenceHash} onCopy={copyText} copiedKey={copiedKey} />
          </div>
        </div>

        <aside className="space-y-4">
          <StatCard icon={ShieldCheck} label="Hash proof readiness" value={isAttested ? "Ready" : "Draft"} detail={isAttested ? "report hash confirmed" : "ready for mock attestation"} tone={isAttested ? "green" : "orange"} />
          <div className={clsx(cardClass, "p-4")}>
            <h2 className="text-sm font-semibold text-slate-950">链上状态</h2>
            {isAttested ? (
              <div className="mt-3 space-y-3">
                <HashRow label="Tx Hash" value={attestation.txHash} onCopy={copyText} copiedKey={copiedKey} />
                <a className={buttonClass} href={`${explorerBaseUrl.replace(/\/$/, "")}/tx/${attestation.txHash}`} target="_blank" rel="noreferrer">
                  <ExternalLink aria-hidden className="h-4 w-4" />
                  打开 Explorer
                </a>
              </div>
            ) : (
              <button className={primaryButtonClass} type="button" onClick={() => notify("Attest on-chain mock 已排队")}>
                Attest on-chain
              </button>
            )}
          </div>
          <DistributionCard title="xAPI sources summary" rows={sourceRows} />
          <DistributionCard title="Evidence weight distribution" rows={sourceRows} />
          <InfoPanel
            title="Hash proof readiness"
            rows={[
              ["Report Hash", report.reportHash.slice(0, 18)],
              ["Evidence Hash", report.evidenceHash.slice(0, 18)],
              ["Status", report.status]
            ]}
          />
          <button className={buttonClass} type="button" onClick={() => downloadJson(`${report.topic.toLowerCase()}-report-detail.json`, report)}>
            <Download aria-hidden className="h-4 w-4" />
            下载详情 JSON
          </button>
        </aside>
      </div>
    </section>
  );
}

function ScoreMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-950">{value}</p>
      <div className="mt-3">
        <ScoreBar value={value} />
      </div>
    </div>
  );
}
