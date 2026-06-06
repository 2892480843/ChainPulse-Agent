"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { AlertTriangle, CheckCircle2, Clock, Code2, Download, Network, Timer } from "lucide-react";
import { fetchStoredTraces } from "@/lib/adapters/agent-data-client";
import { getXApiRuntimeSnapshot, mockXApiClient, readWorkspaceRunTraces, type XApiRuntimeSnapshot } from "@/lib/adapters/xapi-client";
import { xapiTraces } from "@/lib/mock-data";
import type { XApiTrace } from "@/lib/types";
import { useAppActions } from "@/components/shell/AppShell";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { HashRow } from "@/components/ui/HashRow";
import { PageHeading } from "@/components/ui/PageHeading";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatCard } from "@/components/ui/StatCard";
import { TraceBadge } from "@/components/ui/TraceBadge";
import { buttonClass, cardClass } from "@/components/ui/styles";

export function TracePage() {
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();

  return <TraceContent key={queryString} queryString={queryString} />;
}

function TraceContent({ queryString }: { queryString: string }) {
  const { copiedKey, copyText, downloadJson, notify } = useAppActions();
  const router = useRouter();
  const queryState = useMemo(() => readTraceQuery(queryString), [queryString]);
  const taskId = queryState.taskId;
  const [traceState, setTraceState] = useState<TraceState>(() => createTraceState(queryString));
  const [runtimeSnapshot, setRuntimeSnapshot] = useState<XApiRuntimeSnapshot>({
    label: "mock fallback",
    reason: "checking xAPI"
  });

  useEffect(() => {
    let cancelled = false;
    getXApiRuntimeSnapshot().then((result) => {
      if (!cancelled) setRuntimeSnapshot(result);
    });
    const storedTraces = readWorkspaceRunTraces(taskId);
    if (storedTraces.length > 0) {
      return () => {
        cancelled = true;
      };
    }

    fetchStoredTraces(taskId)
      .then((result) => {
        if (cancelled || result.length === 0) return mockXApiClient.getTrace(taskId ?? "__all__");
        return result;
      })
      .catch(() => mockXApiClient.getTrace(taskId ?? "__all__"))
      .then((result) => {
        if (!cancelled) {
          setTraceState((current) => ({
            ...current,
            traces: result,
            selectedTraceId: result.some((trace) => trace.id === current.selectedTraceId) ? current.selectedTraceId : result[0].id
          }));
        }
      })
      .catch(() => notify("xAPI trace mock adapter 读取失败"));
    return () => {
      cancelled = true;
    };
  }, [notify, taskId]);

  const { traces, selectedTraceId, headersOpen } = traceState;
  const selectedTrace = traces.find((trace) => trace.id === selectedTraceId) ?? traces[0];
  const successCount = traces.filter((trace) => trace.status === "success").length;
  const avgLatency = Math.round(traces.reduce((sum, trace) => sum + trace.latencyMs, 0) / traces.length);
  const uniqueCapabilities = useMemo(() => new Set(traces.map((trace) => trace.capability)).size, [traces]);

  return (
    <section className="space-y-5">
      <PageHeading eyebrow="xAPI audit" title="xAPI Trace" description="可视化展示 Agent 如何动态发现 action、读取 schema、执行调用并把 JSON 结果送入推理链。" />
      <RuntimeStatusBanner snapshot={runtimeSnapshot} />
      <div className="grid gap-4 md:grid-cols-5">
        <StatCard icon={Network} label="xAPI 调用总数" value={`${traces.length}`} detail="当前任务 trace" tone="blue" />
        <StatCard icon={CheckCircle2} label="成功率" value={`${Math.round((successCount / traces.length) * 100)}%`} detail={`${successCount} success`} tone="green" />
        <StatCard icon={Clock} label="平均延迟" value={`${avgLatency}ms`} detail="mock timing" tone="orange" />
        <StatCard icon={Timer} label="总耗时" value="25.1s" detail="含 retry" tone="blue" />
        <StatCard icon={Code2} label="唯一能力数" value={`${uniqueCapabilities}`} detail="Twitter / Web / Crypto" tone="green" />
      </div>

      {traces.some((trace) => trace.status === "failed") ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle aria-hidden className="h-4 w-4" />
            <h2>失败 trace 风险提示</h2>
          </div>
          <p className="mt-1 leading-6 text-red-700">失败调用会阻断自动报告生成；演示时可点开 failed trace，说明 schema retry、error output 与 hash 占位如何被保留给审计。</p>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[390px_1fr]">
        <div className={clsx(cardClass, "overflow-hidden")}>
          <SectionHeader title="调用时间线" action="click to inspect" />
          <div className="thin-scrollbar max-h-[calc(100vh-260px)] divide-y divide-slate-100 overflow-y-auto">
            {traces.map((trace) => {
              const selected = selectedTraceId === trace.id;
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
                    "w-full border-l-4 p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 active:scale-[0.99]",
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
                    {trace.startedAt} / {trace.latencyMs}ms / schema {trace.schemaFetched ? "yes" : "no"}
                  </p>
                  <span className={clsx("mt-2 inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ring-1", trace.source === "ai" ? "bg-violet-50 text-violet-700 ring-violet-100" : "bg-blue-50 text-blue-700 ring-blue-100")}>{trace.source === "ai" ? "AI reasoning" : trace.schemaFetched ? "schema-first" : "tool trace"}</span>
                  <p className="mt-2 text-sm text-slate-700">{trace.outputPreview}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className={clsx(cardClass, "p-4 sm:p-5")} data-testid="trace-detail">
          <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="mono text-lg font-semibold text-slate-950">{selectedTrace.action}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {selectedTrace.source === "ai" ? "AI reasoning" : selectedTrace.capability} / {selectedTrace.method} / task {selectedTrace.taskId}
              </p>
            </div>
            <button className={buttonClass} type="button" onClick={() => downloadJson("xapi-trace.json", traces)}>
              <Download aria-hidden className="h-4 w-4" />
              导出 JSON
            </button>
          </div>

          {selectedTrace.error ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle aria-hidden className="h-4 w-4" />
                {selectedTrace.source === "ai" ? "AI reasoning fallback / audit hold" : "xAPI call failed / audit hold"}
              </div>
              <p className="mt-2 leading-6">该调用没有进入推理链，保留错误输出和零值 output hash 方便人工复核。</p>
              <p className="mono mt-2" spellCheck={false}>
                {selectedTrace.error}
              </p>
            </div>
          ) : null}

          <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">{selectedTrace.source === "ai" ? "AI reasoning" : "schema-first call"}</span>
              <span className="font-semibold">{selectedTrace.source === "ai" ? `${selectedTrace.provider ?? "AI"} / ${selectedTrace.model ?? "model"} / ${selectedTrace.sourceMode ?? "fallback"}` : selectedTrace.schemaFetched ? "Schema discovery was completed before this call." : "Schema discovery missing or failed."}</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-blue-800">评委可复核 action contract、input hash 和 output hash，确认外部证据不是页面截图。</p>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <CodeBlock title="Input JSON" value={selectedTrace.input} />
            <CodeBlock title="Output JSON" value={selectedTrace.output} />
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <HashRow label="Input Hash" value={selectedTrace.inputHash} onCopy={copyText} copiedKey={copiedKey} />
            <HashRow label="Output Hash" value={selectedTrace.outputHash} onCopy={copyText} copiedKey={copiedKey} />
            {selectedTrace.promptHash ? <HashRow label="Prompt Hash" value={selectedTrace.promptHash} onCopy={copyText} copiedKey={copiedKey} /> : null}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-950">Timing</h3>
              <dl className="grid gap-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Started</dt>
                  <dd className="mono tabular-nums text-slate-900">{selectedTrace.startedAt}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Ended</dt>
                  <dd className="mono tabular-nums text-slate-900">{selectedTrace.endedAt}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Latency</dt>
                  <dd className="mono tabular-nums text-slate-900">{selectedTrace.latencyMs}ms</dd>
                </div>
              </dl>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <button
                className="flex w-full items-center justify-between text-left text-sm font-semibold text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
                type="button"
                aria-expanded={headersOpen}
                onClick={() => {
                  const nextHeadersOpen = !headersOpen;
                  setTraceState((current) => ({ ...current, headersOpen: nextHeadersOpen }));
                  router.push(buildTracePath({ taskId, traceId: selectedTrace.id, headersOpen: nextHeadersOpen }));
                }}
              >
                Headers
                <span className="text-xs text-slate-500">{headersOpen ? "收起" : "展开"}</span>
              </button>
              {headersOpen ? (
                <pre className="mono thin-scrollbar mt-3 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-700" spellCheck={false}>
                  {JSON.stringify(selectedTrace.headers, null, 2)}
                </pre>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function getTraceTone(status: XApiTrace["status"]) {
  if (status === "failed") {
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
  if (status === "fallback") {
    return {
      border: "border-amber-400",
      selected: "border-amber-500 bg-amber-50 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.16)]",
      iconBg: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
      icon: AlertTriangle
    };
  }
  return {
    border: "border-emerald-400",
    selected: "border-emerald-500 bg-emerald-50 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.14)]",
    iconBg: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
    icon: CheckCircle2
  };
}

function RuntimeStatusBanner({ snapshot }: { snapshot: XApiRuntimeSnapshot }) {
  const isLive = snapshot.label === "live xAPI";
  const detail =
    snapshot.response?.error?.message ??
    {
      connected: "服务端代理已连接真实 xAPI",
      "no XAPI_KEY": "未配置服务端密钥，当前使用本地 mock trace 保持演示可用",
      "upstream failed": "上游调用失败，当前使用 mock fallback 响应",
      "checking xAPI": "正在检查服务端 xAPI 代理"
    }[snapshot.reason as Exclude<XApiRuntimeSnapshot["reason"], "partial fallback">] ?? "partial fallback: mixed live/fallback xAPI evidence, inspect each Trace sourceMode";

  return (
    <div className={clsx("flex flex-col gap-2 rounded-lg border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between", isLive ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800")}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={clsx("rounded-full px-2.5 py-1 text-xs font-semibold ring-1", isLive ? "bg-white text-emerald-700 ring-emerald-100" : "bg-white text-amber-700 ring-amber-100")}>{snapshot.label}</span>
        <span className="font-semibold">{snapshot.reason}</span>
      </div>
      <p className="text-xs leading-5 sm:text-right">{detail}</p>
    </div>
  );
}

type TraceState = {
  traces: XApiTrace[];
  selectedTraceId: string;
  headersOpen: boolean;
};

function createTraceState(queryString: string): TraceState {
  const queryState = readTraceQuery(queryString);
  const traces = getInitialTraces(queryState.taskId);
  return {
    traces,
    selectedTraceId: queryState.traceId ?? traces[0].id,
    headersOpen: queryState.headersOpen
  };
}

function readTraceQuery(queryString: string) {
  const params = new URLSearchParams(queryString);
  return {
    taskId: params.get("task"),
    traceId: params.get("trace"),
    headersOpen: params.get("headers") === "open"
  };
}

function getInitialTraces(taskId: string | null): XApiTrace[] {
  const storedTraces = readWorkspaceRunTraces(taskId);
  if (storedTraces.length > 0) return storedTraces;
  if (!taskId) return xapiTraces;
  const filtered = xapiTraces.filter((trace) => trace.taskId === taskId);
  return filtered.length > 0 ? filtered : xapiTraces;
}

function buildTracePath({ taskId, traceId, headersOpen }: { taskId: string | null; traceId: string; headersOpen: boolean }) {
  const params = new URLSearchParams();
  if (taskId) params.set("task", taskId);
  params.set("trace", traceId);
  if (headersOpen) params.set("headers", "open");
  return `/trace?${params.toString()}`;
}
