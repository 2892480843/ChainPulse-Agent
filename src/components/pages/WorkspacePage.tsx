"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { AlertTriangle, Brain, FileText, Loader2, Play, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { fetchAiHealth } from "@/lib/adapters/ai-client";
import { fetchStoredReports } from "@/lib/adapters/agent-data-client";
import { AgentRunError, persistWorkspaceRun, runWorkspaceAgent, type WorkspaceAgentRunResult } from "@/lib/adapters/xapi-client";
import { defaultWorkspaceAdvancedFilters, modeOptions } from "@/lib/navigation";
import type { AiHealthStatus } from "@/lib/ai-types";
import type { Report, ScanMode, WorkspaceAdvancedFilters, WorkspaceRunContext } from "@/lib/types";
import { useAppActions } from "@/components/shell/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { ModeBadge } from "@/components/ui/ModeBadge";
import { PageHeading } from "@/components/ui/PageHeading";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TokenIcon } from "@/components/ui/TokenIcon";
import { buttonClass, cardClass, inputClass, primaryButtonClass } from "@/components/ui/styles";

const exampleTargets = ["ETH", "AAVE", "Uniswap DAO proposal", "@defi_research"];

export function WorkspacePage() {
  const router = useRouter();
  const { language, notify } = useAppActions();
  const copy = workspaceCopy[language];
  const [workspaceInput, setWorkspaceInput] = useState("ETH");
  const [selectedMode, setSelectedMode] = useState<ScanMode>("Risk Scan");
  const [isRunning, setIsRunning] = useState(false);
  const [lastRun, setLastRun] = useState<WorkspaceAgentRunResult | null>(null);
  const [runError, setRunError] = useState("");
  const [advancedFilters, setAdvancedFilters] = useState<WorkspaceAdvancedFilters>(defaultWorkspaceAdvancedFilters);
  const [recentReports, setRecentReports] = useState<Report[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [aiHealth, setAiHealth] = useState<AiHealthStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    refreshReports()
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setReportsLoading(false);
      });
    return () => {
      cancelled = true;
    };

    async function refreshReports() {
      const items = await fetchStoredReports();
      if (!cancelled) setRecentReports(items);
    }
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

  const runtimeReady = aiHealth?.mode === "live" && aiHealth.configured;
  const attestedCount = useMemo(() => recentReports.filter((report) => report.status === "已上链").length, [recentReports]);

  function updateAdvancedFilter<Key extends keyof WorkspaceAdvancedFilters>(key: Key, value: WorkspaceAdvancedFilters[Key]) {
    setAdvancedFilters((current) => ({ ...current, [key]: value }));
  }

  async function runAgent() {
    setIsRunning(true);
    setRunError("");
    const context: WorkspaceRunContext = {
      topic: workspaceInput.trim() || "ETH",
      mode: selectedMode,
      advancedFilters,
      createdAt: new Date().toLocaleTimeString("zh-CN", { hour12: false })
    };

    try {
      const result = await runWorkspaceAgent(context);
      persistWorkspaceRun(result);
      setLastRun(result);
      notify(copy.runSaved);
      router.push(`/tasks?task=${result.taskId}`);
    } catch (error) {
      const message = error instanceof AgentRunError ? `${error.code}: ${error.message}` : error instanceof Error ? error.message : copy.runFailed;
      setRunError(message);
      notify(copy.runFailed);
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <section className="space-y-5">
      <PageHeading eyebrow={copy.eyebrow} title={copy.title} description={copy.description} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className={clsx(cardClass, "p-4 sm:p-5")}>
          <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                  <Brain aria-hidden className="h-4 w-4" />
                </span>
                <h2 className="text-sm font-semibold text-slate-950">{copy.runConfig}</h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{copy.runConfigDetail}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <RuntimePill label="AI" value={aiHealth ? `${aiHealth.provider} / ${aiHealth.model} / ${aiHealth.mode}` : copy.checking} live={runtimeReady} />
              <RuntimePill label="Data" value={copy.realOnly} live />
            </div>
          </div>

          <div className="mt-4 grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">{copy.target}</span>
              <input
                className={inputClass}
                name="workspace-target"
                value={workspaceInput}
                onChange={(event) => setWorkspaceInput(event.target.value)}
                placeholder={copy.targetPlaceholder}
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
                    "cursor-pointer rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 active:scale-[0.98]",
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
                {copy.evidenceControls}
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <SelectControl label={copy.window} value={advancedFilters.evidenceWindow} options={["24h", "7d", "30d"]} onChange={(value) => updateAdvancedFilter("evidenceWindow", value as WorkspaceAdvancedFilters["evidenceWindow"])} />
                <SelectControl label={copy.confidence} value={advancedFilters.minimumConfidence} options={["0.65", "0.75", "0.85"]} onChange={(value) => updateAdvancedFilter("minimumConfidence", value as WorkspaceAdvancedFilters["minimumConfidence"])} />
                <SelectControl label={copy.toolScope} value={advancedFilters.xapiClasses} options={["Twitter + Web + News + Crypto", "Web + News + AI", "Crypto + AI"]} onChange={(value) => updateAdvancedFilter("xapiClasses", value as WorkspaceAdvancedFilters["xapiClasses"])} />
              </div>
            </div>

            {runError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-800">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle aria-hidden className="h-4 w-4" />
                  {copy.realRunBlocked}
                </div>
                <p className="mono mt-2 text-xs" spellCheck={false}>
                  {runError}
                </p>
              </div>
            ) : null}

            {lastRun ? (
              <div className={clsx("grid gap-2 rounded-lg border px-3 py-3 text-xs md:grid-cols-4", lastRun.label === "live xAPI" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800")}>
                <RunFact label={copy.runtime} value={formatRuntimeLabel(lastRun.label, language)} />
                <RunFact label="AI" value={lastRun.ai ? `${lastRun.ai.model} / ${lastRun.ai.mode}` : copy.unavailable} />
                <RunFact label={copy.tools} value={lastRun.ai?.toolPlan?.join(", ") ?? lastRun.action} />
                <RunFact label="Trace" value={`${lastRun.traces.length}`} />
              </div>
            ) : null}

            {lastRun?.ai ? (
              <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm text-violet-900">
                <div className="flex items-center gap-2 font-semibold">
                  <Brain aria-hidden className="h-4 w-4" />
                  {copy.aiPlanCreated}
                </div>
                <p className="mt-2 text-xs leading-5">{lastRun.ai.reasoningSummary ?? lastRun.ai.plan?.reason}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
                  {(lastRun.ai.toolPlan ?? []).map((tool) => (
                    <span key={tool} className="rounded-full bg-white px-2 py-1 text-violet-700 ring-1 ring-violet-100">
                      {tool}
                    </span>
                  ))}
                </div>
                <p className="mono mt-3 truncate text-[11px] text-violet-700">
                  prompt {lastRun.ai.promptHash} / output {lastRun.ai.outputHash}
                </p>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button className={primaryButtonClass} type="button" onClick={runAgent} disabled={isRunning}>
                {isRunning ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Play aria-hidden className="h-4 w-4" />}
                {isRunning ? copy.running : copy.runAgent}
              </button>
              {exampleTargets.map((sample) => (
                <button key={sample} type="button" className={buttonClass} onClick={() => setWorkspaceInput(sample)}>
                  {sample}
                </button>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <StatusCard icon={FileText} label={copy.backendReports} value={`${recentReports.length}`} detail={reportsLoading ? copy.loadingReports : copy.persistedOnly} />
          <StatusCard icon={ShieldCheck} label={copy.attestedReports} value={`${attestedCount}`} detail={copy.userWalletProofs} />
          <div className={clsx(cardClass, "p-4 text-sm text-slate-600")}>
            <h2 className="font-semibold text-slate-950">{copy.requirements}</h2>
            <div className="mt-3 grid gap-2">
              <Requirement ok={Boolean(aiHealth?.configured)} label="AI_API_KEY" />
              <Requirement ok={Boolean(aiHealth?.enabled)} label="AI_ENABLED" />
              <Requirement ok={true} label={copy.operatorSession} />
            </div>
          </div>
        </aside>
      </div>

      <div className={clsx(cardClass, "overflow-hidden")}>
        <SectionHeader title={copy.recentReports} action={copy.backendOnly} />
        {recentReports.length === 0 ? (
          <EmptyState title={copy.noReports} detail={copy.noReportsDetail} />
        ) : (
          <div className="thin-scrollbar overflow-x-auto border-t border-slate-200">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-y border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">{copy.report}</th>
                  <th className="px-4 py-3">{copy.mode}</th>
                  <th className="px-4 py-3">{copy.risk}</th>
                  <th className="px-4 py-3">{copy.verdict}</th>
                  <th className="px-4 py-3">{copy.status}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentReports.slice(0, 5).map((report) => (
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
        )}
      </div>
    </section>
  );
}

function SelectControl({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-xs text-slate-600">
      {label}
      <select className={inputClass} value={value} autoComplete="off" onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function RuntimePill({ label, value, live }: { label: string; value: string; live: boolean }) {
  return (
    <span className={clsx("w-fit rounded-full px-2.5 py-1 text-xs font-semibold ring-1", live ? "bg-emerald-50 text-emerald-700 ring-emerald-100" : "bg-amber-50 text-amber-700 ring-amber-100")}>
      {label}: {value}
    </span>
  );
}

function StatusCard({ icon: Icon, label, value, detail }: { icon: typeof FileText; label: string; value: string; detail: string }) {
  return (
    <div className={clsx(cardClass, "p-4")}>
      <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
        <Icon aria-hidden className="h-4 w-4 text-blue-700" />
        {label}
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function Requirement({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="text-slate-700">{label}</span>
      <span className={clsx("rounded-full px-2 py-1 text-[11px] font-semibold", ok ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>{ok ? "ready" : "missing"}</span>
    </div>
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

function formatRuntimeLabel(label: WorkspaceAgentRunResult["label"], language: "en" | "zh") {
  if (label === "unavailable") return language === "zh" ? "不可用" : "Unavailable";
  return label;
}

const workspaceCopy = {
  en: {
    eyebrow: "Workspace",
    title: "Run Real Agent",
    description: "Connect a wallet, run OpenAI-compatible reasoning, collect live xAPI evidence, then save a backend report ready for user-wallet attestation.",
    runConfig: "Run configuration",
    runConfigDetail: "The backend requires AI_API_KEY and XAPI_KEY. Missing keys stop the run instead of creating mock evidence.",
    checking: "checking",
    realOnly: "live only",
    target: "Investigation target",
    targetPlaceholder: "ETH, 0x address, @KOL, DAO proposal",
    evidenceControls: "Evidence controls",
    window: "Evidence window",
    confidence: "Minimum confidence",
    toolScope: "Tool scope",
    realRunBlocked: "Real Agent run blocked",
    runSaved: "Real Agent run saved",
    runFailed: "Real Agent run failed",
    runtime: "Runtime",
    tools: "Tools",
    unavailable: "unavailable",
    aiPlanCreated: "AI plan created",
    running: "Running...",
    runAgent: "Run Agent",
    backendReports: "Backend reports",
    loadingReports: "loading backend store",
    persistedOnly: "persisted Agent output only",
    attestedReports: "Attested reports",
    userWalletProofs: "written by user wallet",
    requirements: "Runtime requirements",
    operatorSession: "Operator session",
    recentReports: "Recent reports",
    backendOnly: "backend only",
    noReports: "No real reports yet",
    noReportsDetail: "Run a real Agent first. The page does not show local ETH/ZEC demo records.",
    report: "Report",
    mode: "Mode",
    risk: "Risk",
    verdict: "Verdict",
    status: "Status"
  },
  zh: {
    eyebrow: "工作台",
    title: "运行真实 Agent",
    description: "连接钱包后，通过 OpenAI 兼容推理层规划任务，调用真实 xAPI 采集证据，并把后端报告交给用户钱包上链证明。",
    runConfig: "运行配置",
    runConfigDetail: "后端必须配置 AI_API_KEY 和 XAPI_KEY。缺少密钥会停止运行，不会创建 mock 证据。",
    checking: "检查中",
    realOnly: "仅真实数据",
    target: "分析目标",
    targetPlaceholder: "ETH、0x 地址、@KOL、DAO 提案",
    evidenceControls: "证据控制",
    window: "证据窗口",
    confidence: "最低置信度",
    toolScope: "工具范围",
    realRunBlocked: "真实 Agent 运行被阻断",
    runSaved: "真实 Agent 运行已保存",
    runFailed: "真实 Agent 运行失败",
    runtime: "运行态",
    tools: "工具",
    unavailable: "不可用",
    aiPlanCreated: "AI 计划已生成",
    running: "运行中...",
    runAgent: "运行 Agent",
    backendReports: "后端报告",
    loadingReports: "正在读取后端存储",
    persistedOnly: "仅持久化 Agent 输出",
    attestedReports: "已上链报告",
    userWalletProofs: "由用户钱包写入",
    requirements: "运行要求",
    operatorSession: "操作员会话",
    recentReports: "最近报告",
    backendOnly: "仅后端",
    noReports: "暂无真实报告",
    noReportsDetail: "请先运行真实 Agent。本页面不会展示本地 ETH/ZEC 演示记录。",
    report: "报告",
    mode: "模式",
    risk: "风险",
    verdict: "结论",
    status: "状态"
  }
} as const;
