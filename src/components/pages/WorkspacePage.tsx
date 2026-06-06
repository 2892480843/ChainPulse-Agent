"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { ArrowRight, Brain, FileCheck2, Gauge, Loader2, Network, Play, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { fetchAiHealth } from "@/lib/adapters/ai-client";
import { fetchStoredReports, mergeReportsWithMock } from "@/lib/adapters/agent-data-client";
import { persistWorkspaceRun, runWorkspaceAgent, type WorkspaceAgentRunResult } from "@/lib/adapters/xapi-client";
import { reports } from "@/lib/mock-data";
import { defaultWorkspaceAdvancedFilters, modeOptions } from "@/lib/navigation";
import type { ScanMode, WorkspaceAdvancedFilters, WorkspaceRunContext } from "@/lib/types";
import type { AiHealthStatus } from "@/lib/ai-types";
import { useAppActions } from "@/components/shell/AppShell";
import { ModeBadge } from "@/components/ui/ModeBadge";
import { PageHeading } from "@/components/ui/PageHeading";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TokenIcon } from "@/components/ui/TokenIcon";
import { buttonClass, cardClass, inputClass, primaryButtonClass } from "@/components/ui/styles";

const quickCases = [
  { label: "ETH Risk Baseline", query: "$ETH", detail: "Stable asset signal, trace, report, and attestation", badge: "$ETH baseline" },
  { label: "ZEC Liquidity Watch", query: "$ZEC", detail: "Privacy token news, social concentration, and liquidity risk" },
  { label: "DAO Proposal Review", query: "Uniswap DAO proposal", detail: "Governance evidence packet before vote execution" }
];

export function WorkspacePage() {
  const router = useRouter();
  const { notify } = useAppActions();
  const [workspaceInput, setWorkspaceInput] = useState("$ETH");
  const [selectedMode, setSelectedMode] = useState<ScanMode>("Risk Scan");
  const [isRunning, setIsRunning] = useState(false);
  const [lastRun, setLastRun] = useState<WorkspaceAgentRunResult | null>(null);
  const [advancedFilters, setAdvancedFilters] = useState<WorkspaceAdvancedFilters>(defaultWorkspaceAdvancedFilters);
  const [recentReports, setRecentReports] = useState(reports);
  const [aiHealth, setAiHealth] = useState<AiHealthStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchStoredReports()
      .then((items) => {
        if (!cancelled) setRecentReports(mergeReportsWithMock(items));
      })
      .catch(() => {
        if (!cancelled) setRecentReports(mergeReportsWithMock([]));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchAiHealth()
      .then((health) => {
        if (!cancelled) setAiHealth(health);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  function updateAdvancedFilter<Key extends keyof WorkspaceAdvancedFilters>(key: Key, value: WorkspaceAdvancedFilters[Key]) {
    setAdvancedFilters((current) => ({ ...current, [key]: value }));
  }

  async function runAgent() {
    setIsRunning(true);
    const context: WorkspaceRunContext = {
      topic: workspaceInput || "ETH",
      mode: selectedMode,
      advancedFilters,
      createdAt: new Date().toLocaleTimeString("zh-CN", { hour12: false })
    };
    let persisted = true;
    try {
      const result = await runWorkspaceAgent(context);
      persistWorkspaceRun(result);
      setLastRun(result);
      notify(result.ai?.plan ? "AI plan created / Agent run saved" : result.label === "live xAPI" ? "live xAPI run completed" : `${result.reason} / fallback run saved`);
      router.push(`/tasks?task=${result.taskId}`);
    } catch {
      persisted = false;
      notify("Agent task created, local run context was not saved");
      router.push("/tasks");
    } finally {
      setIsRunning(false);
    }
    return persisted;
  }

  function fillQuickCase(value: string) {
    setWorkspaceInput(value);
    notify("Scenario preset loaded");
  }

  return (
    <section className="space-y-5">
      <PageHeading
        eyebrow="Workspace"
        title="Agent Operations"
        description="Run AI-planned blockchain investigations, collect auditable evidence, write grounded reports, and prepare Sepolia attestations from one controlled workflow."
      />
      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <div className={clsx(cardClass, "p-4 sm:p-5")}>
          <div className="mb-4 flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                  <FileCheck2 aria-hidden className="h-4 w-4" />
                </span>
                <h2 className="text-sm font-semibold text-slate-950">Run configuration</h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">Define the target, scan mode, evidence window, confidence threshold, and tool scope before the AI planner creates the run.</p>
            </div>
            <span className={clsx("w-fit rounded-full px-2.5 py-1 text-xs font-semibold ring-1", lastRun?.label === "live xAPI" ? "bg-emerald-50 text-emerald-700 ring-emerald-100" : "bg-amber-50 text-amber-700 ring-amber-100")}>
              {formatRuntimeLabel(lastRun?.label)}
            </span>
            <span className="w-fit rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 ring-1 ring-violet-100">
              AI {aiHealth ? `${aiHealth.provider} / ${aiHealth.model} / ${aiHealth.mode}` : "checking"}
            </span>
          </div>
          <div className="grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">Investigation target</span>
              <input
                className={inputClass}
                name="workspace-target"
                value={workspaceInput}
                onChange={(event) => setWorkspaceInput(event.target.value)}
                placeholder="ETH、0x…、@KOL、DAO proposal…"
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <div className="grid gap-3 md:grid-cols-3">
              {modeOptions.map((option) => (
                <button
                  key={option.mode}
                  type="button"
                  onClick={() => setSelectedMode(option.mode)}
                  className={clsx(
                    "rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 active:scale-[0.98]",
                    selectedMode === option.mode ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"
                  )}
                >
                  <p className="text-sm font-semibold text-slate-950">{option.title}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{option.description}</p>
                </button>
              ))}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <SlidersHorizontal aria-hidden className="h-4 w-4" />
                Evidence controls
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <label className="grid gap-1 text-xs text-slate-600">
                  Evidence window
                  <select
                    className={inputClass}
                    name="evidence-window"
                    value={advancedFilters.evidenceWindow}
                    autoComplete="off"
                    onChange={(event) => updateAdvancedFilter("evidenceWindow", event.target.value as WorkspaceAdvancedFilters["evidenceWindow"])}
                  >
                    <option>24h</option>
                    <option>7d</option>
                    <option>30d</option>
                  </select>
                </label>
                <label className="grid gap-1 text-xs text-slate-600">
                  Minimum confidence
                  <select
                    className={inputClass}
                    name="minimum-confidence"
                    value={advancedFilters.minimumConfidence}
                    autoComplete="off"
                    onChange={(event) => updateAdvancedFilter("minimumConfidence", event.target.value as WorkspaceAdvancedFilters["minimumConfidence"])}
                  >
                    <option>0.65</option>
                    <option>0.75</option>
                    <option>0.85</option>
                  </select>
                </label>
                <label className="grid gap-1 text-xs text-slate-600">
                  xAPI classes
                  <select
                    className={inputClass}
                    name="xapi-classes"
                    value={advancedFilters.xapiClasses}
                    autoComplete="off"
                    onChange={(event) => updateAdvancedFilter("xapiClasses", event.target.value as WorkspaceAdvancedFilters["xapiClasses"])}
                  >
                    <option>Twitter + Web + News + Crypto</option>
                    <option>Web + News + AI</option>
                    <option>Crypto + AI</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="grid gap-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-3 text-xs text-blue-900 md:grid-cols-[1fr_auto] md:items-center">
              <div className="grid gap-1">
                <p>Run Agent executes AI plan -&gt; evidence tools -&gt; AI report writer -&gt; hash audit</p>
                <p>
                  Current input: <span className="font-semibold">{workspaceInput || "ETH"}</span> / {selectedMode} / {advancedFilters.evidenceWindow} / confidence {advancedFilters.minimumConfidence}
                </p>
              </div>
              <span className="mono w-fit rounded-full bg-white px-2 py-1 text-[11px] text-blue-700 ring-1 ring-blue-100">schema-first run</span>
            </div>
            {lastRun ? (
              <div className={clsx("grid gap-2 rounded-lg border px-3 py-3 text-xs md:grid-cols-4", lastRun.label === "live xAPI" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800")}>
                <RunFact label="Runtime" value={formatRuntimeLabel(lastRun.label)} />
                <RunFact label="AI" value={lastRun.ai ? `${lastRun.ai.model} / ${lastRun.ai.mode}` : "fallback"} />
                <RunFact label="Tools" value={lastRun.ai?.toolPlan?.join(", ") ?? lastRun.action} />
                <RunFact label="Trace" value={`${lastRun.traces.length} steps`} />
              </div>
            ) : null}
            {lastRun?.ai ? (
              <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm text-violet-900">
                <div className="flex items-center gap-2 font-semibold">
                  <Brain aria-hidden className="h-4 w-4" />
                  AI plan created
                </div>
                <p className="mt-2 text-xs leading-5">{lastRun.ai.reasoningSummary ?? lastRun.ai.plan?.reason}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
                  {(lastRun.ai.toolPlan ?? []).map((tool) => (
                    <span key={tool} className="rounded-full bg-white px-2 py-1 text-violet-700 ring-1 ring-violet-100">
                      {tool}
                    </span>
                  ))}
                </div>
                <p className="mono mt-3 truncate text-[11px] text-violet-700">prompt {lastRun.ai.promptHash} / output {lastRun.ai.outputHash}</p>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <button className={primaryButtonClass} type="button" onClick={runAgent} disabled={isRunning}>
                {isRunning ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Play aria-hidden className="h-4 w-4" />}
                Run Agent
              </button>
              {["$ETH", "$ZEC", "Uniswap DAO proposal", "@defi_mochi"].map((sample) => (
                <button key={sample} type="button" className={buttonClass} onClick={() => fillQuickCase(sample)}>
                  {sample}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-1">
          <StatCard icon={Gauge} label="Risk average" value="41" detail="8 points below 7d mean" tone="green" />
          <StatCard icon={Network} label="Tool calls" value="184" detail="96.7% success rate" tone="blue" />
          <StatCard icon={ShieldCheck} label="Proof receipts" value="12" detail="11 confirmed" tone="orange" />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className={clsx(cardClass, "overflow-hidden")}>
          <SectionHeader title="Recent reports" action="stored + fallback" />
          <div className="thin-scrollbar overflow-x-auto border-t border-slate-200">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-y border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Report</th>
                  <th className="px-4 py-3">Mode</th>
                  <th className="px-4 py-3">Risk</th>
                  <th className="px-4 py-3">Verdict</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentReports.slice(0, 3).map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <TokenIcon symbol={report.topic} />
                        <div>
                          <Link className="font-medium text-blue-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100" href={`/reports/${report.id}`}>
                            {report.title}
                          </Link>
                          <p className="text-xs text-slate-500">{report.createdAt}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <ModeBadge mode={report.mode} />
                    </td>
                    <td className="px-4 py-3">
                      <ScoreBar value={report.riskScore} />
                    </td>
                    <td className="px-4 py-3">{report.verdict}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={report.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className={clsx(cardClass, "p-4")}>
          <h2 className="text-sm font-semibold text-slate-950">Scenario presets</h2>
          <div className="mt-3 grid gap-2">
            {quickCases.map((item) => (
              <button key={item.label} className={clsx("rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 active:scale-[0.98]", item.query === "$ETH" ? "border-blue-200 bg-blue-50 hover:border-blue-300" : "border-slate-200 hover:border-blue-200 hover:bg-blue-50")} type="button" onClick={() => fillQuickCase(item.query)}>
                <span className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-slate-900">{item.label}</span>
                  {item.badge ? <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-blue-700 ring-1 ring-blue-100">{item.badge}</span> : <ArrowRight aria-hidden className="h-4 w-4 text-slate-400" />}
                </span>
                <p className="mt-1 text-xs text-slate-500">{item.detail}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function RunFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/70 px-2.5 py-2 ring-1 ring-white/70">
      <p className="text-[11px] font-semibold uppercase opacity-70">{label}</p>
      <p className="mono mt-1 truncate text-xs font-semibold">{value}</p>
    </div>
  );
}

function formatRuntimeLabel(label?: WorkspaceAgentRunResult["label"]) {
  if (!label) return "Fallback audit";
  if (label === "mock fallback") return "Fallback audit";
  return label;
}
