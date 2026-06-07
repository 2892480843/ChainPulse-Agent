"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { FileText, Network, ShieldCheck, Timer } from "lucide-react";
import { fetchStoredTaskRun, fetchStoredTasks } from "@/lib/adapters/agent-data-client";
import { workspaceRunStorageKeys } from "@/lib/adapters/xapi-client";
import { timelineSteps } from "@/lib/navigation";
import type { RunningTask, WorkspaceRunContext } from "@/lib/types";
import { useAppActions } from "@/components/shell/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { InfoPanel } from "@/components/ui/InfoPanel";
import { PageHeading } from "@/components/ui/PageHeading";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TokenIcon } from "@/components/ui/TokenIcon";
import { buttonClass, cardClass, primaryButtonClass } from "@/components/ui/styles";

export function RunningTasksPage() {
  const { language, notify } = useAppActions();
  const copy = taskCopy[language];
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskIdParam = searchParams.get("task");
  const [latestRun] = useState<WorkspaceRunContext | null>(() => readStoredRun());
  const [currentTask, setCurrentTask] = useState<RunningTask | null>(null);
  const [taskList, setTaskList] = useState<RunningTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const logRegionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    async function loadTasks() {
      const [items, selectedRun] = await Promise.all([
        fetchStoredTasks(),
        taskIdParam ? fetchStoredTaskRun(taskIdParam).catch(() => null) : Promise.resolve(null)
      ]);
      if (cancelled) return;
      setTaskList(items);
      const selectedTask = selectedRun?.task ?? items.find((task) => task.id === taskIdParam) ?? items[0] ?? null;
      setCurrentTask(selectedTask);
      setLoading(false);
    }

    loadTasks().catch((err: unknown) => {
      if (cancelled) return;
      // Don't show error if we're waiting for a running task
      if (!taskIdParam) {
        setError(err instanceof Error ? err.message : copy.loadFailed);
        notify(copy.loadFailed);
      }
      setTaskList([]);
      setCurrentTask(null);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [copy.loadFailed, notify, taskIdParam]);

  // Poll for task updates — handles both "Running" tasks and tasks not yet saved
  useEffect(() => {
    if (!taskIdParam) return;
    // Only poll if task is running or not yet found
    const shouldPoll = !currentTask || currentTask.status === "Running";
    if (!shouldPoll) return;

    let cancelled = false;

    const pollId = window.setInterval(async () => {
      try {
        const run = await fetchStoredTaskRun(taskIdParam).catch(() => null);
        if (cancelled) return;
        if (!run) return; // task not saved yet, keep polling

        // Update current task
        setCurrentTask(run.task);
        setTaskList((prev) => {
          const exists = prev.some((t) => t.id === run.task.id);
          return exists ? prev.map((t) => t.id === run.task.id ? run.task : t) : [run.task, ...prev];
        });

        // Stop polling when completed
        if (run.task.status !== "Running") {
          window.clearInterval(pollId);
        }
      } catch {
        // ignore poll errors
      }
    }, 2500);

    return () => {
      cancelled = true;
      window.clearInterval(pollId);
    };
  }, [currentTask?.status, currentTask?.id, taskIdParam]);

  useEffect(() => {
    if (!logRegionRef.current) return;
    logRegionRef.current.scrollTop = logRegionRef.current.scrollHeight;
  }, [currentTask?.id]);

  const logs = currentTask?.logs ?? [];
  const selectedTraceCount = currentTask?.traceIds?.length ?? 0;
  const otherTasks = useMemo(() => taskList.filter((task) => task.id !== currentTask?.id).slice(0, 5), [currentTask?.id, taskList]);

  function openReportDraft() {
    if (!currentTask?.reportId) {
      notify(copy.noReport);
      return;
    }
    router.push(`/reports/${currentTask.reportId}`);
  }

  return (
    <section className="space-y-5">
      <PageHeading eyebrow={copy.eyebrow} title={copy.title} description={copy.description} />

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p className="font-semibold">{copy.loadFailed}</p>
          <p className="mono mt-2 text-xs">{error}</p>
        </div>
      ) : null}

      {loading ? (
        <div className={clsx(cardClass, "p-4 sm:p-5")}>
          <div className="flex items-start gap-3">
            <div className="skeleton h-10 w-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-3 pt-1">
              <div className="skeleton h-4 w-2/5 rounded" />
              <div className="skeleton h-3 w-1/3 rounded" />
              <div className="skeleton h-2 w-full rounded mt-4" />
              <div className="grid grid-cols-3 gap-3 mt-4">
                {[1,2,3].map(i => <div key={i} className="skeleton h-14 rounded-lg" />)}
              </div>
            </div>
          </div>
        </div>
      ) : !currentTask && taskIdParam ? (
        /* Task not yet in store — agent just started, show a waiting indicator */
        <div className={clsx(cardClass, "p-8")}>
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="relative flex h-14 w-14 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-40" />
              <span className="relative grid h-14 w-14 place-items-center rounded-full bg-blue-50 text-blue-600">
                <svg className="h-7 w-7 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </span>
            </div>
            <div>
              <p className="text-base font-semibold text-slate-950">
                {language === "zh" ? "Agent 正在启动分析..." : "Agent is starting analysis..."}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {language === "zh" ? "正在通过 xAPI MCP 采集数据，请稍候" : "Collecting data via xAPI MCP, please wait"}
              </p>
            </div>
          </div>
        </div>
      ) : !currentTask ? (
        <div className={cardClass}>
          <EmptyState title={copy.emptyTitle} detail={copy.emptyDetail} />
          <div className="flex justify-center pb-8">
            <button className={primaryButtonClass} type="button" onClick={() => router.push("/workspace")}>
              {copy.goWorkspace}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          {currentTask.status === "Running" && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              <div className="flex items-center gap-2.5 font-semibold">
                <span className="flex h-2 w-2">
                  <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-600" />
                </span>
                {language === "zh" ? "Agent 正在分析中，请稍候..." : "Agent analysis in progress, please wait..."}
              </div>
              <p className="mt-1 text-xs opacity-80">{currentTask.currentStep}</p>
            </div>
          )}
          <div className={clsx(cardClass, "p-4 sm:p-5")}>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <TokenIcon symbol={currentTask.topic} />
                  <h2 className="text-lg font-semibold text-slate-950">
                    {currentTask.topic} / {currentTask.mode}
                  </h2>
                  <StatusBadge status={currentTask.status} />
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  {copy.started} {currentTask.startedAt}; {copy.elapsed} {currentTask.elapsed}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className={buttonClass} type="button" onClick={() => router.push(`/trace?task=${currentTask.id}`)}>
                  <Network aria-hidden className="h-4 w-4" />
                  {copy.viewTrace}
                </button>
                <button className={buttonClass} type="button" onClick={openReportDraft} disabled={!currentTask.reportId}>
                  <FileText aria-hidden className="h-4 w-4" />
                  {copy.viewReport}
                </button>
                <button className={buttonClass} type="button" onClick={() => router.push(`/attestation?report=${currentTask.reportId ?? ""}`)} disabled={!currentTask.reportId}>
                  <ShieldCheck aria-hidden className="h-4 w-4" />
                  {copy.attest}
                </button>
              </div>
            </div>

            <div className="mt-5">
              <ProgressBar value={currentTask.progress} label={`${currentTask.progress}%`} />
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-7">
              {timelineSteps.map((step, index) => {
                const activeIndex = Math.max(0, timelineSteps.indexOf(currentTask.currentStep));
                const isDone = index < activeIndex || currentTask.status === "Completed";
                const isActive = step === currentTask.currentStep && currentTask.status !== "Completed";
                return (
                  <div key={step} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <span className={clsx("inline-flex h-3 w-3 rounded-full", isActive ? "bg-blue-600" : isDone ? "bg-emerald-500" : "bg-slate-300")} />
                    <p className={clsx("mt-2 text-xs font-medium", isActive ? "text-blue-700" : "text-slate-700")}>{step}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-6">
              <h3 className="mb-2 text-sm font-semibold text-slate-950">{copy.logs}</h3>
              <div ref={logRegionRef} data-testid="task-log-region" data-log-count={logs.length} className="thin-scrollbar max-h-72 overflow-auto rounded-lg bg-slate-950 p-4 text-xs leading-6 text-slate-100">
                {logs.length === 0 ? (
                  <p className="mono text-slate-400">{copy.noLogs}</p>
                ) : (
                  logs.map((line) => (
                    <p key={line} className="mono">
                      {line}
                    </p>
                  ))
                )}
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <Metric icon={Timer} label={copy.elapsed} value={currentTask.elapsed} detail={copy.persistedRun} />
            <Metric icon={Network} label="Trace" value={`${selectedTraceCount}`} detail={copy.traceRecords} />
            {latestRun ? (
              <InfoPanel
                title={copy.latestSession}
                rows={[
                  [copy.input, latestRun.topic],
                  [copy.mode, latestRun.mode],
                  [copy.window, latestRun.advancedFilters.evidenceWindow],
                  [copy.confidence, latestRun.advancedFilters.minimumConfidence]
                ]}
              />
            ) : null}
            <div className={clsx(cardClass, "overflow-hidden")}>
              <SectionHeader title={copy.otherRuns} action={`${taskList.length}`} />
              {otherTasks.length === 0 ? (
                <EmptyState title={copy.noOtherRuns} detail={copy.noOtherRunsDetail} />
              ) : (
                <div className="divide-y divide-slate-100">
                  {otherTasks.map((task) => (
                    <button key={task.id} className="w-full cursor-pointer p-4 text-left hover:bg-slate-50" type="button" onClick={() => router.push(`/tasks?task=${task.id}`)}>
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-slate-900">{task.topic}</p>
                        <StatusBadge status={task.status} />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {task.mode} / {task.elapsed}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof Timer; label: string; value: string; detail: string }) {
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

function readStoredRun(): WorkspaceRunContext | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(workspaceRunStorageKeys.context);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as WorkspaceRunContext;
  } catch {
    return null;
  }
}

const taskCopy = {
  en: {
    eyebrow: "Agent Runtime",
    title: "Agent Runs",
    description: "Inspect backend-persisted Agent tasks. This page does not create demo tasks or synthetic logs.",
    loading: "Loading Agent runs",
    loadingDetail: "Reading persisted tasks from the backend store.",
    emptyTitle: "No real Agent runs yet",
    emptyDetail: "Run a real Agent from Workspace first. Missing runtime keys will be reported there instead of creating fake tasks.",
    goWorkspace: "Go to Workspace",
    loadFailed: "Task load failed",
    started: "Started",
    elapsed: "Elapsed",
    viewTrace: "View Trace",
    viewReport: "View Report",
    attest: "Attest",
    noReport: "No report is linked to this task",
    logs: "Execution log",
    noLogs: "No backend logs stored for this task.",
    persistedRun: "persisted backend run",
    traceRecords: "persisted trace records",
    latestSession: "Latest session",
    input: "Input",
    mode: "Mode",
    window: "Window",
    confidence: "Confidence",
    otherRuns: "Other runs",
    noOtherRuns: "No other runs",
    noOtherRunsDetail: "Only the selected backend task is available."
  },
  zh: {
    eyebrow: "Agent 运行",
    title: "智能体运行",
    description: "查看后端持久化的 Agent 任务。本页面不会创建演示任务或合成日志。",
    loading: "正在加载 Agent 运行",
    loadingDetail: "正在从后端存储读取任务。",
    emptyTitle: "暂无真实 Agent 运行",
    emptyDetail: "请先在工作台运行真实 Agent。运行密钥缺失时会在那里显示配置错误，不会创建假任务。",
    goWorkspace: "返回工作台",
    loadFailed: "任务加载失败",
    started: "开始",
    elapsed: "耗时",
    viewTrace: "查看 Trace",
    viewReport: "查看报告",
    attest: "上链证明",
    noReport: "该任务未关联报告",
    logs: "执行日志",
    noLogs: "该任务没有后端日志。",
    persistedRun: "后端持久化运行",
    traceRecords: "持久化 Trace 记录",
    latestSession: "最近会话",
    input: "输入",
    mode: "模式",
    window: "窗口",
    confidence: "置信度",
    otherRuns: "其他运行",
    noOtherRuns: "没有其他运行",
    noOtherRunsDetail: "当前只有选中的后端任务。"
  }
} as const;
