"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { Database, FileText, Network, Plus, Radio, RefreshCcw, ShieldCheck, Timer, X } from "lucide-react";
import { workspaceRunStorageKeys } from "@/lib/adapters/xapi-client";
import { reports, runningTasks } from "@/lib/mock-data";
import { timelineSteps } from "@/lib/navigation";
import type { RunningTask, WorkspaceRunContext } from "@/lib/types";
import { useAppActions } from "@/components/shell/AppShell";
import { InfoPanel } from "@/components/ui/InfoPanel";
import { PageHeading } from "@/components/ui/PageHeading";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TokenIcon } from "@/components/ui/TokenIcon";
import { buttonClass, cardClass, selectedButtonClass } from "@/components/ui/styles";

const timelineMeaning: Record<string, string> = {
  "任务解析": "Turns a human target into structured Agent intent.",
  "xAPI 搜索": "Discovers which external actions can provide evidence.",
  "读取 Schema": "Locks the tool contract before any call is made.",
  "数据采集": "Collects multi-source records for comparison.",
  "证据归一化": "Converts raw outputs into a shared evidence packet.",
  "推理与打分": "Connects evidence to risk, alpha, and confidence.",
  "生成报告": "Creates a reviewable decision record for hashing."
};

export function RunningTasksPage() {
  const { notify } = useAppActions();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [latestRun] = useState<WorkspaceRunContext | null>(() => readStoredRun());
  const [currentTask, setCurrentTask] = useState<RunningTask>(() => createInitialTask(latestRun, searchParams.get("task")));
  const [logs, setLogs] = useState<string[]>(() => createInitialLogs(latestRun));
  const [autoScroll, setAutoScroll] = useState(true);
  const logRegionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!autoScroll || !logRegionRef.current) return;
    logRegionRef.current.scrollTop = logRegionRef.current.scrollHeight;
  }, [autoScroll, logs]);

  function appendLog(message: string) {
    const timestamp = new Date().toLocaleTimeString("zh-CN", { hour12: false });
    setLogs((current) => [...current, `[${timestamp}] ${message}`]);
  }

  function cancelTask() {
    setCurrentTask((task) => ({ ...task, status: "Cancelled", currentStep: "任务解析" }));
    appendLog("task cancelled by operator");
    notify("任务已取消");
  }

  function rerunTask() {
    setCurrentTask((task) => ({
      ...task,
      status: "Running",
      progress: 12,
      elapsed: "00m 05s",
      currentStep: "xAPI 搜索"
    }));
    const timestamp = new Date().toLocaleTimeString("zh-CN", { hour12: false });
    setLogs([
      `[${timestamp}] rerun requested for ${currentTask.topic}`,
      `[${timestamp}] mode=${currentTask.mode}`,
      `[${timestamp}] mock progress reset to running`
    ]);
    notify("已重新排队运行");
  }

  function openReportDraft() {
    const matchedReport = reports.find((report) => report.topic.toLowerCase() === currentTask.topic.replace("$", "").toLowerCase());
    if (matchedReport) {
      router.push(`/reports/${matchedReport.id}`);
      return;
    }
    notify("当前任务暂无报告草稿");
  }

  return (
    <section className="space-y-5">
      <PageHeading eyebrow="Agent Runtime" title="运行中的任务" description="展示 Agent 从任务解析、xAPI action 发现、Schema 读取到证据归一化和报告生成的执行过程。" />
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
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
              <p className="mt-2 text-sm text-slate-500">开始时间 {currentTask.startedAt}，已运行 {currentTask.elapsed}</p>
            </div>
            <div className="flex gap-2">
              <button className={buttonClass} type="button" onClick={() => router.push(`/trace?task=${currentTask.id}`)}>
                <Network aria-hidden className="h-4 w-4" />
                查看 Trace
              </button>
              <button className={buttonClass} type="button" onClick={openReportDraft}>
                <FileText aria-hidden className="h-4 w-4" />
                查看报告草稿
              </button>
              <button className={buttonClass} type="button" onClick={cancelTask}>
                <X aria-hidden className="h-4 w-4" />
                取消任务
              </button>
              <button className={buttonClass} type="button" onClick={rerunTask}>
                <RefreshCcw aria-hidden className="h-4 w-4" />
                重新运行
              </button>
            </div>
          </div>
          <div className="mt-5">
            <ProgressBar value={currentTask.progress} label={`${currentTask.progress}%`} />
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-7">
            {timelineSteps.map((step, index) => {
              const isDone = index < timelineSteps.indexOf(currentTask.currentStep);
              const isActive = step === currentTask.currentStep;
              return (
                <div key={step} className="relative rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <span
                    className={clsx(
                      "pulse-dot relative inline-flex h-3 w-3 rounded-full before:absolute before:inset-0 before:rounded-full after:absolute after:inset-0 after:rounded-full",
                      isActive ? "bg-blue-600 after:bg-blue-600" : isDone ? "bg-emerald-500" : "bg-slate-300"
                    )}
                  />
                  <p className={clsx("mt-2 text-xs font-medium", isActive ? "text-blue-700" : "text-slate-700")}>{step}</p>
                  <p className="mt-2 text-[11px] leading-4 text-slate-500">{timelineMeaning[step]}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-950">实时执行日志</h3>
              <div className="flex gap-2">
                <button className={buttonClass} type="button" onClick={() => appendLog("mock evidence item appended")}>
                  <Plus aria-hidden className="h-4 w-4" />
                  追加日志
                </button>
                <button
                  className={clsx(buttonClass, autoScroll && selectedButtonClass)}
                  type="button"
                  aria-pressed={autoScroll}
                  onClick={() => {
                    setAutoScroll((value) => !value);
                    notify(autoScroll ? "已关闭自动滚动" : "已开启自动滚动");
                  }}
                >
                  <Radio aria-hidden className="h-4 w-4" />
                  {autoScroll ? "自动滚动开" : "自动滚动关"}
                </button>
              </div>
            </div>
            <div
              ref={logRegionRef}
              data-testid="task-log-region"
              data-auto-scroll={autoScroll}
              data-log-count={logs.length}
              className="thin-scrollbar max-h-64 overflow-auto rounded-lg bg-slate-950 p-4 text-xs leading-6 text-slate-100"
            >
              {logs.map((line) => (
                <p key={line} className="mono">
                  {line}
                </p>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <StatCard icon={Timer} label="当前耗时" value={currentTask.elapsed} detail="目标小于 6 分钟" tone="blue" />
          <StatCard icon={Database} label="Evidence items" value="18" detail="4 类 xAPI 来源" tone="green" />
          <div className={clsx(cardClass, "p-4")}>
            <h2 className="text-sm font-semibold text-slate-950">Next step</h2>
            <div className="mt-3 grid gap-2">
              <button className={buttonClass} type="button" onClick={() => router.push(`/trace?task=${currentTask.id}`)}>
                <Network aria-hidden className="h-4 w-4" />
                Inspect xAPI Trace
              </button>
              <button className={buttonClass} type="button" onClick={openReportDraft}>
                <FileText aria-hidden className="h-4 w-4" />
                Open Report Draft
              </button>
              <button className={buttonClass} type="button" onClick={() => router.push("/attestation")}>
                <ShieldCheck aria-hidden className="h-4 w-4" />
                Prepare Attestation
              </button>
            </div>
          </div>
          {latestRun ? (
            <InfoPanel
              title="当前任务概览"
              rows={[
                ["Input", latestRun.topic],
                ["Mode", latestRun.mode],
                ["Window", latestRun.advancedFilters.evidenceWindow],
                ["Confidence", latestRun.advancedFilters.minimumConfidence]
              ]}
            />
          ) : null}
          <div className={clsx(cardClass, "overflow-hidden")}>
            <SectionHeader title="其他任务" action="3 tasks" />
            <div className="divide-y divide-slate-100">
              {runningTasks.slice(1).map((task) => (
                <div key={task.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-900">{task.topic}</p>
                    <StatusBadge status={task.status} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {task.mode} / {task.elapsed}
                  </p>
                  <div className="mt-3">
                    <ProgressBar value={task.progress} label={`${task.progress}%`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
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

function createInitialTask(latestRun: WorkspaceRunContext | null, taskId: string | null): RunningTask {
  const queriedTask = runningTasks.find((task) => task.id === taskId);
  if (queriedTask) return queriedTask;
  if (!latestRun) return runningTasks[0];

  return {
    ...runningTasks[0],
    id: latestRun.taskId ?? runningTasks[0].id,
    topic: latestRun.topic,
    mode: latestRun.mode,
    status: "Running",
    progress: latestRun.schemaFirst ? 44 : 18,
    currentStep: latestRun.schemaFirst ? "数据采集" : "xAPI 搜索",
    startedAt: `2026-06-05 ${latestRun.createdAt}`,
    elapsed: "00m 12s"
  };
}

function createInitialLogs(latestRun: WorkspaceRunContext | null): string[] {
  if (!latestRun) return runningTasks[0].logs;
  if (latestRun.runtimeLogs?.length) return latestRun.runtimeLogs;

  return [
    `[${latestRun.createdAt}] Intent Parser resolved topic=${latestRun.topic} mode=${latestRun.mode}`,
    `[${latestRun.createdAt}] Advanced filters window=${latestRun.advancedFilters.evidenceWindow} confidence=${latestRun.advancedFilters.minimumConfidence} classes=${latestRun.advancedFilters.xapiClasses}`,
    `[${latestRun.createdAt}] mock run queued from Workspace`
  ];
}
