"use client";

import Link from "next/link";
import clsx from "clsx";
import { CheckCircle2, ClipboardCopy, Eye, FileText, Network, PlayCircle, Route, ShieldCheck, Timer } from "lucide-react";
import { attestation, reports, xapiTraces } from "@/lib/mock-data";
import { useAppActions } from "@/components/shell/AppShell";
import { PageHeading } from "@/components/ui/PageHeading";
import { ProofChain } from "@/components/ui/ProofChain";
import { buttonClass, cardClass, primaryButtonClass } from "@/components/ui/styles";

const runbookSteps = [
  {
    title: "Run setup",
    path: "/workspace",
    href: "/workspace",
    cta: "Open workspace",
    goal: "Choose a topic, scan mode, evidence window, and confidence threshold.",
    lookFor: "AI planning creates a tool plan before evidence collection starts.",
    time: "35s",
    icon: PlayCircle
  },
  {
    title: "Execution",
    path: "/tasks",
    href: "/tasks",
    cta: "Open tasks",
    goal: "Review the saved Agent run, timeline, and execution log.",
    lookFor: "The run exposes state, timing, report handoff, and source mode.",
    time: "35s",
    icon: Route
  },
  {
    title: "Tool audit",
    path: "/trace?task=task_eth_risk_001",
    href: "/trace?task=task_eth_risk_001",
    cta: "Open audit trace",
    goal: "Inspect AI reasoning traces and evidence tool calls.",
    lookFor: "Prompt hash, input hash, output hash, latency, and fallback mode are visible.",
    time: "40s",
    icon: Network
  },
  {
    title: "Report review",
    path: "/reports/rep_eth_001",
    href: "/reports/rep_eth_001",
    cta: "Open ETH report",
    goal: "Read risk score, evidence, rationale, and suggested actions.",
    lookFor: "The report is AI-generated, evidence-grounded, and hash-ready.",
    time: "45s",
    icon: FileText
  },
  {
    title: "Proof receipt",
    path: "/attestation",
    href: "/attestation",
    cta: "Open attestation",
    goal: "Verify reportHash, evidenceHash, and txHash.",
    lookFor: "The same decision record can be reviewed after Sepolia anchoring.",
    time: "25s",
    icon: ShieldCheck
  }
];

const auditNotes = [
  {
    title: "AI reasoning is inspectable",
    detail: "Planner output, model metadata, prompt hash, and reasoning summary remain available for review."
  },
  {
    title: "Evidence is not detached",
    detail: "Evidence cards link back to the trace that produced them, including source mode and confidence."
  },
  {
    title: "Proof is reproducible",
    detail: "Report hash and evidence hash can be recomputed locally before or after on-chain anchoring."
  }
];

const scorecardItems = [
  {
    label: "Agent workflow",
    status: "ready",
    detail: "Workspace run captures AI plan, tool execution, runtime traces, report generation, and handoff."
  },
  {
    label: "xAPI integration",
    status: "live/fallback transparent",
    detail: "Server routes keep XAPI_KEY private; UI labels live, partial, fallback, and mock evidence states."
  },
  {
    label: "Evidence traceability",
    status: "ready",
    detail: "Evidence cards point to source action, weight, contribution, confidence, and related Trace."
  },
  {
    label: "Local hash verification",
    status: "ready",
    detail: "Report JSON and evidence packet are deterministically hashed and compared in the browser."
  },
  {
    label: "On-chain readiness",
    status: "wallet/contract gated",
    detail: "Real write actions stay disabled until contract, explorer, and browser wallet are available."
  },
  {
    label: "Test/build readiness",
    status: "gated",
    detail: "lint, typecheck, test, and build are the final acceptance commands before release."
  }
];

export function DemoPage() {
  const { copyText } = useAppActions();
  const ethReport = reports[0];
  const runbookLinks = runbookSteps.map((step) => ({ step: step.title, goal: step.goal, url: step.href }));

  return (
    <section className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className={clsx(cardClass, "p-4 sm:p-5")}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <PageHeading
              eyebrow="Review Console"
              title="Operator Runbook"
              description="A compact release review path for the full Agent lifecycle: AI plan, evidence tools, audit traces, generated report, and Sepolia proof receipt."
            />
            <button className={primaryButtonClass} type="button" onClick={() => copyText(JSON.stringify(runbookLinks, null, 2), "runbook-links")}>
              <ClipboardCopy aria-hidden className="h-4 w-4" />
              Copy runbook links
            </button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <RunbookSignal label="Operating model" value="AI + evidence tools" detail="plan, collect, write, verify" />
            <RunbookSignal label="Baseline path" value="$ETH Risk Scan" detail="complete proof chain" />
            <RunbookSignal label="Review target" value="5 checkpoints" detail="trace and report first" />
          </div>
        </div>

        <aside className={clsx(cardClass, "p-4 sm:p-5")}>
          <div className="flex items-center gap-2">
            <Eye aria-hidden className="h-4 w-4 text-blue-700" />
            <h2 className="text-sm font-semibold text-slate-950">Audit review checklist</h2>
          </div>
          <ul className="mt-3 space-y-3">
            {auditNotes.map((note) => (
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

      <div className={clsx(cardClass, "p-4 sm:p-5")}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-950">Release acceptance checklist</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">Use this panel to verify that the product is explainable, auditable, recomputable, and explicit about live versus fallback data.</p>
          </div>
          <span className="w-fit rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">release gate</span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {scorecardItems.map((item) => (
            <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-950">{item.label}</p>
                <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-blue-700 ring-1 ring-blue-100">{item.status}</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-600">{item.detail}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-5">
          {runbookSteps.map((step) => {
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
                      <dt className="text-xs font-semibold uppercase text-slate-500">Operator should verify</dt>
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
          <h2 className="text-sm font-semibold text-slate-950">Operator review flow</h2>
          <ol className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
            <li>1. Start from Workspace to confirm the Agent objective, mode, and evidence policy.</li>
            <li>2. Use Audit Trace to review AI planning and each external evidence call.</li>
            <li>3. Finish in Report and Attestation with a recomputable decision record.</li>
          </ol>
        </aside>
      </div>
    </section>
  );
}

function RunbookSignal({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}
