"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { AlertTriangle, CheckCircle2, Download, Network, Timer } from "lucide-react";
import { fetchStoredTraces } from "@/lib/adapters/agent-data-client";
import { getXApiRuntimeSnapshot, readWorkspaceRunTraces, type XApiRuntimeSnapshot } from "@/lib/adapters/xapi-client";
import type { XApiTrace } from "@/lib/types";
import { useAppActions } from "@/components/shell/AppShell";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { EmptyState } from "@/components/ui/EmptyState";
import { HashRow } from "@/components/ui/HashRow";
import { PageHeading } from "@/components/ui/PageHeading";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { TraceBadge } from "@/components/ui/TraceBadge";
import { buttonClass, cardClass } from "@/components/ui/styles";

type TraceState = {
  traces: XApiTrace[];
  selectedTraceId: string | null;
  headersOpen: boolean;
  loading: boolean;
  error: string;
};

const emptyTraceState: TraceState = {
  traces: [],
  selectedTraceId: null,
  headersOpen: false,
  loading: true,
  error: ""
};

export function TracePage() {
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();

  return <TraceContent key={queryString} queryString={queryString} />;
}

function TraceContent({ queryString }: { queryString: string }) {
  const { copiedKey, copyText, downloadJson, language, notify } = useAppActions();
  const router = useRouter();
  const queryState = useMemo(() => readTraceQuery(queryString), [queryString]);
  const taskId = queryState.taskId;
  const copy = traceCopy[language];
  const [traceState, setTraceState] = useState<TraceState>(() => ({
    ...emptyTraceState,
    headersOpen: queryState.headersOpen,
    selectedTraceId: queryState.traceId
  }));
  const [runtimeSnapshot, setRuntimeSnapshot] = useState<XApiRuntimeSnapshot>({
    label: "unavailable",
    reason: "checking xAPI"
  });

  useEffect(() => {
    let cancelled = false;

    getXApiRuntimeSnapshot().then((result) => {
      if (!cancelled) setRuntimeSnapshot(result);
    });

    const sessionTraces = readWorkspaceRunTraces(taskId);
    if (sessionTraces.length > 0) {
      setTraceState((current) => ({
        ...current,
        traces: sessionTraces,
        selectedTraceId: resolveSelectedTraceId(sessionTraces, queryState.traceId),
        loading: false,
        error: ""
      }));
      return () => {
        cancelled = true;
      };
    }

    setTraceState((current) => ({ ...current, loading: true, error: "" }));
    fetchStoredTraces(taskId)
      .then((result) => {
        if (cancelled) return;
        setTraceState((current) => ({
          ...current,
          traces: result,
          selectedTraceId: resolveSelectedTraceId(result, current.selectedTraceId ?? queryState.traceId),
          loading: false,
          error: ""
        }));
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setTraceState((current) => ({
          ...current,
          traces: [],
          selectedTraceId: null,
          loading: false,
          error: error instanceof Error ? error.message : copy.loadFailed
        }));
        notify(copy.loadFailed);
      });

    return () => {
      cancelled = true;
    };
  }, [copy.loadFailed, notify, queryState.traceId, taskId]);

  const { traces, selectedTraceId, headersOpen, loading, error } = traceState;
  const selectedTrace = traces.find((trace) => trace.id === selectedTraceId) ?? traces[0] ?? null;
  const successCount = traces.filter((trace) => trace.status === "success").length;
  const failedCount = traces.filter((trace) => trace.status === "failed" || trace.status === "fallback").length;
  const avgLatency = traces.length > 0 ? Math.round(traces.reduce((sum, trace) => sum + trace.latencyMs, 0) / traces.length) : 0;
  const uniqueCapabilities = useMemo(() => new Set(traces.map((trace) => trace.capability)).size, [traces]);

  return (
    <section className="space-y-5">
      <PageHeading eyebrow={copy.eyebrow} title={copy.title} description={copy.description} />
      <RuntimeStatusBanner snapshot={runtimeSnapshot} language={language} />

      <div className={clsx(cardClass, "grid gap-0 overflow-hidden md:grid-cols-4")}>
        <Metric label={copy.traceCount} value={`${traces.length}`} detail={copy.realBackendOnly} />
        <Metric label={copy.success} value={`${successCount}`} detail={copy.successDetail} />
        <Metric label={copy.failed} value={`${failedCount}`} detail={copy.failedDetail} />
        <Metric label={copy.latency} value={`${avgLatency}ms`} detail={`${uniqueCapabilities} ${copy.capabilities}`} />
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle aria-hidden className="h-4 w-4" />
            {copy.loadFailed}
          </div>
          <p className="mt-1 leading-6 text-red-700">{error}</p>
        </div>
      ) : null}

      {traces.some((trace) => trace.status === "failed" || trace.status === "fallback") ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle aria-hidden className="h-4 w-4" />
            {copy.failedReviewTitle}
          </div>
          <p className="mt-1 leading-6 text-red-700">{copy.failedReviewDetail}</p>
        </div>
      ) : null}

      {loading ? (
        <div className={cardClass}>
          <EmptyState title={copy.loading} detail={copy.loadingDetail} />
        </div>
      ) : traces.length === 0 ? (
        <div className={cardClass}>
          <EmptyState title={copy.emptyTitle} detail={copy.emptyDetail} />
        </div>
      ) : selectedTrace ? (
        <div className="grid gap-5 xl:grid-cols-[390px_1fr]">
          <div className={clsx(cardClass, "overflow-hidden")}>
            <SectionHeader title={copy.timeline} action={copy.timelineAction} />
            <div className="thin-scrollbar max-h-[calc(100vh-260px)] divide-y divide-slate-100 overflow-y-auto">
              {traces.map((trace) => {
                const selected = selectedTrace.id === trace.id;
                const tone = getTraceTone(trace.status);
                const StatusIcon = tone.icon;
                return (
                  <button
                    key={trace.id}
                    type="button"
                    onClick={() => {
                      setTraceState((current) => ({ ...current, selectedTraceId: trace.id }));
                      router.push(buildTracePath({ taskId, traceId: trace.id, headersOpen }));
                    }}
                    className={clsx(
                      "w-full cursor-pointer border-l-4 p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 active:scale-[0.99]",
                      selected ? tone.selected : `${tone.border} hover:bg-slate-50`
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={clsx("grid h-7 w-7 shrink-0 place-items-center rounded-lg", tone.iconBg)}>
                          <StatusIcon aria-hidden className="h-4 w-4" />
                        </span>
                        <p className="mono truncate text-xs font-semibold text-slate-900">{trace.action}</p>
                      </div>
                      <TraceBadge status={trace.status} />
                    </div>
                    <p className="mt-2 text-xs tabular-nums text-slate-500">
                      {trace.startedAt} / {trace.latencyMs}ms / {trace.source ?? "xapi"}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm text-slate-700">{trace.outputPreview}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={clsx(cardClass, "p-4 sm:p-5")} data-testid="trace-detail">
            <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <h2 className="mono truncate text-lg font-semibold text-slate-950">{selectedTrace.action}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedTrace.source === "ai" ? copy.aiReasoning : selectedTrace.capability} / {selectedTrace.method} / task {selectedTrace.taskId}
                </p>
              </div>
              <button className={buttonClass} type="button" onClick={() => downloadJson("chainpulse-traces.json", traces)}>
                <Download aria-hidden className="h-4 w-4" />
                {copy.exportJson}
              </button>
            </div>

            {selectedTrace.error ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle aria-hidden className="h-4 w-4" />
                  {selectedTrace.source === "ai" ? copy.aiFailed : copy.toolFailed}
                </div>
                <p className="mono mt-2" spellCheck={false}>
                  {selectedTrace.error}
                </p>
              </div>
            ) : null}

            <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
                  {selectedTrace.source === "ai" ? copy.aiReasoning : copy.evidenceCall}
                </span>
                <span className="font-semibold">
                  {selectedTrace.source === "ai"
                    ? `${selectedTrace.provider ?? "AI"} / ${selectedTrace.model ?? "model"} / ${selectedTrace.sourceMode ?? "live"}`
                    : selectedTrace.schemaFetched
                      ? copy.schemaCompleted
                      : copy.schemaMissing}
                </span>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <CodeBlock title={copy.inputJson} value={selectedTrace.input} />
              <CodeBlock title={copy.outputJson} value={selectedTrace.output} />
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <HashRow label={copy.inputHash} value={selectedTrace.inputHash} onCopy={copyText} copiedKey={copiedKey} />
              <HashRow label={copy.outputHash} value={selectedTrace.outputHash} onCopy={copyText} copiedKey={copiedKey} />
              {selectedTrace.promptHash ? <HashRow label={copy.promptHash} value={selectedTrace.promptHash} onCopy={copyText} copiedKey={copiedKey} /> : null}
            </div>

            <div className="mt-4 rounded-lg border border-slate-200 p-4">
              <button
                className="flex w-full cursor-pointer items-center justify-between text-left text-sm font-semibold text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
                type="button"
                aria-expanded={headersOpen}
                onClick={() => {
                  const nextHeadersOpen = !headersOpen;
                  setTraceState((current) => ({ ...current, headersOpen: nextHeadersOpen }));
                  router.push(buildTracePath({ taskId, traceId: selectedTrace.id, headersOpen: nextHeadersOpen }));
                }}
              >
                {copy.headers}
                <span className="text-xs text-slate-500">{headersOpen ? copy.hide : copy.show}</span>
              </button>
              {headersOpen ? (
                <pre className="mono thin-scrollbar mt-3 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-700" spellCheck={false}>
                  {JSON.stringify(selectedTrace.headers, null, 2)}
                </pre>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="border-b border-slate-200 bg-slate-50 p-4 md:border-b-0 md:border-r last:md:border-r-0">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function getTraceTone(status: XApiTrace["status"]) {
  if (status === "failed" || status === "fallback") {
    return {
      border: "border-red-400",
      selected: "border-red-500 bg-red-50 shadow-[inset_0_0_0_1px_rgba(239,68,68,0.16)]",
      iconBg: "bg-red-50 text-red-700 ring-1 ring-red-100",
      icon: AlertTriangle
    };
  }
  if (status === "running") {
    return {
      border: "border-blue-400",
      selected: "border-blue-600 bg-blue-50 shadow-[inset_0_0_0_1px_rgba(37,99,235,0.14)]",
      iconBg: "bg-blue-50 text-blue-700 ring-1 ring-blue-100",
      icon: Timer
    };
  }
  return {
    border: "border-emerald-400",
    selected: "border-emerald-500 bg-emerald-50 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.14)]",
    iconBg: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
    icon: CheckCircle2
  };
}

function RuntimeStatusBanner({ snapshot, language }: { snapshot: XApiRuntimeSnapshot; language: "en" | "zh" }) {
  const copy = traceCopy[language];
  const isLive = snapshot.label === "live xAPI";
  const detail =
    snapshot.response?.error?.message ??
    {
      connected: copy.runtimeConnected,
      "no XAPI_KEY": copy.runtimeMissingKey,
      "upstream failed": copy.runtimeFailed,
      "checking xAPI": copy.runtimeChecking
    }[snapshot.reason as Exclude<XApiRuntimeSnapshot["reason"], "partial fallback">] ??
    copy.runtimePartial;

  return (
    <div className={clsx("flex flex-col gap-2 rounded-lg border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between", isLive ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800")}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={clsx("rounded-full px-2.5 py-1 text-xs font-semibold ring-1", isLive ? "bg-white text-emerald-700 ring-emerald-100" : "bg-white text-amber-700 ring-amber-100")}>
          {language === "zh" ? localizeSnapshotLabel(snapshot.label) : snapshot.label}
        </span>
        <span className="font-semibold">{language === "zh" ? localizeSnapshotReason(snapshot.reason) : snapshot.reason}</span>
      </div>
      <p className="text-xs leading-5 sm:text-right">{detail}</p>
    </div>
  );
}

function localizeSnapshotLabel(label: string) {
  if (label === "live xAPI") return "xAPI 实时";
  if (label === "partial xAPI") return "xAPI 部分";
  return "xAPI 不可用";
}

function localizeSnapshotReason(reason: string) {
  if (reason === "connected") return "已连接";
  if (reason === "no XAPI_KEY") return "缺少密钥";
  if (reason === "upstream failed") return "上游失败";
  if (reason === "partial fallback") return "部分降级";
  if (reason === "checking xAPI") return "检查中";
  return reason;
}

function readTraceQuery(queryString: string) {
  const params = new URLSearchParams(queryString);
  return {
    taskId: params.get("task"),
    traceId: params.get("trace"),
    headersOpen: params.get("headers") === "open"
  };
}

function resolveSelectedTraceId(traces: XApiTrace[], traceId?: string | null) {
  if (traceId && traces.some((trace) => trace.id === traceId)) return traceId;
  return traces[0]?.id ?? null;
}

function buildTracePath({ taskId, traceId, headersOpen }: { taskId: string | null; traceId: string; headersOpen: boolean }) {
  const params = new URLSearchParams();
  if (taskId) params.set("task", taskId);
  params.set("trace", traceId);
  if (headersOpen) params.set("headers", "open");
  return `/trace?${params.toString()}`;
}

const traceCopy = {
  en: {
    eyebrow: "Agent audit",
    title: "AI / Tool Trace",
    description: "Review persisted AI reasoning and evidence-tool calls from real Agent runs. No local mock traces are shown.",
    traceCount: "Trace count",
    realBackendOnly: "backend records only",
    success: "Success",
    successDetail: "live calls",
    failed: "Failed",
    failedDetail: "needs review",
    latency: "Average latency",
    capabilities: "capabilities",
    loadFailed: "Trace load failed",
    failedReviewTitle: "Failed trace review",
    failedReviewDetail: "Failed calls affect report quality. Open each failed trace to review schema retry, error output, and retained hash placeholders.",
    loading: "Loading traces",
    loadingDetail: "Reading persisted Agent traces from the backend.",
    emptyTitle: "No real traces yet",
    emptyDetail: "Run a real Agent from Workspace first. Missing AI_API_KEY or XAPI_KEY will produce an explicit configuration error instead of mock traces.",
    timeline: "Trace timeline",
    timelineAction: "click to inspect",
    aiReasoning: "AI reasoning",
    exportJson: "Export JSON",
    aiFailed: "AI reasoning failed",
    toolFailed: "Evidence tool failed",
    evidenceCall: "Evidence call",
    schemaCompleted: "Schema discovery completed before this call.",
    schemaMissing: "Schema discovery missing or failed.",
    inputJson: "Input JSON",
    outputJson: "Output JSON",
    inputHash: "Input Hash",
    outputHash: "Output Hash",
    promptHash: "Prompt Hash",
    headers: "Headers",
    show: "Show",
    hide: "Hide",
    runtimeConnected: "Server-side xAPI proxy is connected to live tools.",
    runtimeMissingKey: "XAPI_KEY is missing. Real evidence collection is unavailable.",
    runtimeFailed: "xAPI upstream failed. The app will not fabricate replacement evidence.",
    runtimeChecking: "Checking the server-side xAPI proxy.",
    runtimePartial: "Mixed live and failed evidence, inspect each Trace sourceMode."
  },
  zh: {
    eyebrow: "Agent 审计",
    title: "AI / 工具 Trace",
    description: "查看真实 Agent 运行保存下来的 AI 推理和证据工具调用。这里不会展示本地 mock Trace。",
    traceCount: "Trace 数量",
    realBackendOnly: "仅后端记录",
    success: "成功",
    successDetail: "真实调用",
    failed: "失败",
    failedDetail: "需要审查",
    latency: "平均延迟",
    capabilities: "类能力",
    loadFailed: "Trace 加载失败",
    failedReviewTitle: "失败 Trace 审查",
    failedReviewDetail: "失败调用会影响报告质量。请打开失败 Trace 查看 schema 重试、错误输出和保留的 hash 占位。",
    loading: "正在加载 Trace",
    loadingDetail: "正在从后端读取持久化 Agent Trace。",
    emptyTitle: "暂无真实 Trace",
    emptyDetail: "请先在工作台运行真实 Agent。缺少 AI_API_KEY 或 XAPI_KEY 时会显示明确配置错误，不会生成 mock Trace。",
    timeline: "Trace 时间线",
    timelineAction: "点击查看",
    aiReasoning: "AI 推理",
    exportJson: "导出 JSON",
    aiFailed: "AI 推理失败",
    toolFailed: "证据工具失败",
    evidenceCall: "证据调用",
    schemaCompleted: "调用前已完成 Schema 发现。",
    schemaMissing: "Schema 发现缺失或失败。",
    inputJson: "输入 JSON",
    outputJson: "输出 JSON",
    inputHash: "输入 Hash",
    outputHash: "输出 Hash",
    promptHash: "Prompt Hash",
    headers: "Headers",
    show: "展开",
    hide: "收起",
    runtimeConnected: "服务端 xAPI 代理已连接真实工具。",
    runtimeMissingKey: "缺少 XAPI_KEY，无法进行真实证据采集。",
    runtimeFailed: "xAPI 上游失败，应用不会伪造替代证据。",
    runtimeChecking: "正在检查服务端 xAPI 代理。",
    runtimePartial: "证据中混有真实与失败调用，请逐条检查 Trace sourceMode。"
  }
} as const;
