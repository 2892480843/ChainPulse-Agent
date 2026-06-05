"use client";

import Link from "next/link";
import clsx from "clsx";
import { CheckCircle2, ClipboardCopy, Eye, FileText, Network, PlayCircle, Route, ShieldCheck, Timer } from "lucide-react";
import { attestation, reports, xapiTraces } from "@/lib/mock-data";
import { useAppActions } from "@/components/shell/AppShell";
import { PageHeading } from "@/components/ui/PageHeading";
import { ProofChain } from "@/components/ui/ProofChain";
import { buttonClass, cardClass, primaryButtonClass } from "@/components/ui/styles";

const demoSteps = [
  {
    title: "Step 1",
    path: "/workspace",
    href: "/workspace",
    cta: "Open workspace",
    goal: "Input ETH and choose Risk Scan.",
    lookFor: "The Agent turns a target, mode, evidence window, and confidence threshold into a run context.",
    time: "35s",
    icon: PlayCircle
  },
  {
    title: "Step 2",
    path: "/tasks",
    href: "/tasks",
    cta: "Open tasks",
    goal: "Watch the Agent run through timeline and logs.",
    lookFor: "Timeline stages explain why each workflow step matters before a report exists.",
    time: "35s",
    icon: Route
  },
  {
    title: "Step 3",
    path: "/trace?task=task_eth_risk_001",
    href: "/trace?task=task_eth_risk_001",
    cta: "Open xAPI trace",
    goal: "Inspect xAPI action, schema, input hash, and output hash.",
    lookFor: "Schema-first tool calling makes every external action reviewable.",
    time: "40s",
    icon: Network
  },
  {
    title: "Step 4",
    path: "/reports/rep_eth_001",
    href: "/reports/rep_eth_001",
    cta: "Open ETH report",
    goal: "Read risk score, evidence, rationale, and suggested actions.",
    lookFor: "Evidence cards link back to the exact Trace that produced them.",
    time: "45s",
    icon: FileText
  },
  {
    title: "Step 5",
    path: "/attestation",
    href: "/attestation",
    cta: "Open attestation",
    goal: "Verify reportHash, evidenceHash, and txHash.",
    lookFor: "The same decision record can be reviewed by a DAO after anchoring.",
    time: "25s",
    icon: ShieldCheck
  }
];

const judgeNotes = [
  {
    title: "Agent 不是黑盒",
    detail: "每个 xAPI action、schema、input/output hash 都能在 Trace 回看。"
  },
  {
    title: "报告不是孤证",
    detail: "Evidence 卡片回链到 Trace，结论有来源、有权重、有置信度。"
  },
  {
    title: "证明不是截图",
    detail: "Report Hash 与 Evidence Hash 被锚定，DAO 后续可复核同一份记录。"
  }
];

export function DemoPage() {
  const { copyText } = useAppActions();
  const ethReport = reports[0];
  const demoLinks = demoSteps.map((step) => ({ step: step.title, goal: step.goal, url: step.href }));

  return (
    <section className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className={clsx(cardClass, "p-4 sm:p-5")}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <PageHeading
              eyebrow="Demo Mode"
              title="路演导演台"
              description="3 分钟内展示一条完整链路：输入目标、Agent 运行、xAPI Trace、证据报告、链上证明。重点不是功能堆叠，而是让评委一眼看懂可审计智能分析。"
            />
            <button className={primaryButtonClass} type="button" onClick={() => copyText(JSON.stringify(demoLinks, null, 2), "demo-links")}>
              <ClipboardCopy aria-hidden className="h-4 w-4" />
              Copy demo links
            </button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <DemoSignal label="核心价值" value="Evidence-first Agent" detail="先证据，再结论" />
            <DemoSignal label="推荐路线" value="$ETH Risk Scan" detail="最完整证明链" />
            <DemoSignal label="路演节奏" value="3 min" detail="Trace 与 Report 是重心" />
          </div>
        </div>

        <aside className={clsx(cardClass, "p-4 sm:p-5")}>
          <div className="flex items-center gap-2">
            <Eye aria-hidden className="h-4 w-4 text-blue-700" />
            <h2 className="text-sm font-semibold text-slate-950">评委观察清单</h2>
          </div>
          <ul className="mt-3 space-y-3">
            {judgeNotes.map((note) => (
              <li key={note.title} className="grid grid-cols-[22px_1fr] gap-2">
                <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 text-emerald-600" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">{note.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{note.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      <ProofChain
        topic="ETH"
        mode="Risk Scan"
        actions={xapiTraces.filter((trace) => trace.taskId === "task_eth_risk_001").map((trace) => trace.action)}
        evidenceCount={ethReport.evidence.length}
        reportHash={ethReport.reportHash}
        evidenceHash={ethReport.evidenceHash}
        txHash={attestation.txHash}
        attested
        compact
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-5">
          {demoSteps.map((step) => {
            const Icon = step.icon;
            return (
              <article key={step.path} className={clsx(cardClass, "grid gap-3 p-4")}>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-blue-700">
                      <Icon aria-hidden className="h-4 w-4" />
                    </span>
                    <h2 className="text-sm font-semibold text-slate-950">{step.title}</h2>
                    <span className="mono rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-600">{step.path}</span>
                  </div>
                  <dl className="mt-3 grid gap-2 text-sm">
                    <div>
                      <dt className="text-xs font-semibold uppercase text-slate-500">Goal</dt>
                      <dd className="mt-1 text-slate-700">{step.goal}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-slate-500">Judges should see</dt>
                      <dd className="mt-1 text-slate-700">{step.lookFor}</dd>
                    </div>
                  </dl>
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
                    <Timer aria-hidden className="h-3.5 w-3.5" />
                    {step.time}
                  </span>
                  <Link className={buttonClass} href={step.href}>
                    {step.cta}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>

        <aside className={clsx(cardClass, "p-4")}>
          <h2 className="text-sm font-semibold text-slate-950">3-minute talk track</h2>
          <ol className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
            <li>1. 用 Workspace 说明 Agent 如何接收目标、模式与证据窗口。</li>
            <li>2. 用 Trace 证明 xAPI 调用可审计，而不是只看最终答案。</li>
            <li>3. 用 Report 与 Attestation 收束成可复核的 DAO 决策记录。</li>
          </ol>
        </aside>
      </div>
    </section>
  );
}

function DemoSignal({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}
