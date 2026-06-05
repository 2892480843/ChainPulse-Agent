"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { AlertTriangle, CheckCircle2, Clock, Code2, Download, Network, Timer } from "lucide-react";
import { mockXApiClient } from "@/lib/adapters/xapi-client";
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
  const { copiedKey, copyText, downloadJson, notify } = useAppActions();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const queryState = readTraceQuery(queryString);
  const taskId = queryState.taskId;
  const initialTraceState = createTraceState(queryString);
  const [traceState, setTraceState] = useState<TraceState>(initialTraceState);
  let currentTraceState = traceState;

  if (traceState.sourceQueryString !== queryString) {
    currentTraceState = initialTraceState;
    setTraceState(initialTraceState);
  }

  useEffect(() => {
    let cancelled = false;
    mockXApiClient
      .getTrace(taskId ?? "__all__")
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

  const { traces, selectedTraceId, headersOpen } = currentTraceState;
  const selectedTrace = traces.find((trace) => trace.id === selectedTraceId) ?? traces[0];
  const successCount = traces.filter((trace) => trace.status === "success").length;
  const avgLatency = Math.round(traces.reduce((sum, trace) => sum + trace.latencyMs, 0) / traces.length);
  const uniqueCapabilities = useMemo(() => new Set(traces.map((trace) => trace.capability)).size, [traces]);

  return (
    <section className="space-y-5">
      <PageHeading eyebrow="xAPI audit" title="xAPI Trace" description="可视化展示 Agent 如何动态发现 action、读取 schema、执行调用并把 JSON 结果送入推理链。" />
      <div className="grid gap-4 md:grid-cols-5">
        <StatCard icon={Network} label="xAPI 调用总数" value={`${traces.length}`} detail="当前任务 trace" tone="blue" />
        <StatCard icon={CheckCircle2} label="成功率" value={`${Math.round((successCount / traces.length) * 100)}%`} detail={`${successCount} success`} tone="green" />
        <StatCard icon={Clock} label="平均延迟" value={`${avgLatency}ms`} detail="mock timing" tone="orange" />
        <StatCard icon={Timer} label="总耗时" value="25.1s" detail="含 retry" tone="blue" />
        <StatCard icon={Code2} label="唯一能力数" value={`${uniqueCapabilities}`} detail="Twitter / Web / Crypto" tone="green" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[390px_1fr]">
        <div className={clsx(cardClass, "overflow-hidden")}>
          <SectionHeader title="调用时间线" action="click to inspect" />
          <div className="thin-scrollbar max-h-[calc(100vh-260px)] divide-y divide-slate-100 overflow-y-auto">
            {traces.map((trace) => {
              const selected = selectedTraceId === trace.id;
              return (
                <button
                  key={trace.id}
                  type="button"
                  onClick={() => {
                    setTraceState((current) => ({ ...current, selectedTraceId: trace.id }));
                    router.push(buildTracePath({ taskId, traceId: trace.id, headersOpen }));
                  }}
                  className={clsx(
                    "w-full border-l-4 p-4 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 active:scale-[0.99]",
                    selected ? "border-blue-600 bg-blue-50 shadow-[inset_0_0_0_1px_rgba(37,99,235,0.12)]" : "border-transparent"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="mono text-xs font-semibold text-slate-900">{trace.action}</p>
                    <TraceBadge status={trace.status} />
                  </div>
                  <p className="mt-2 text-xs tabular-nums text-slate-500">
                    {trace.startedAt} / {trace.latencyMs}ms / schema {trace.schemaFetched ? "yes" : "no"}
                  </p>
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
                {selectedTrace.capability} / {selectedTrace.method} / task {selectedTrace.taskId}
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
                xAPI call failed
              </div>
              <p className="mt-2 mono" spellCheck={false}>
                {selectedTrace.error}
              </p>
            </div>
          ) : null}

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <CodeBlock title="Input JSON" value={selectedTrace.input} />
            <CodeBlock title="Output JSON" value={selectedTrace.output} />
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <HashRow label="Input Hash" value={selectedTrace.inputHash} onCopy={copyText} copiedKey={copiedKey} />
            <HashRow label="Output Hash" value={selectedTrace.outputHash} onCopy={copyText} copiedKey={copiedKey} />
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
                <pre className="mono mt-3 overflow-auto rounded-lg bg-slate-950 p-3 text-xs leading-5 text-slate-100" spellCheck={false}>
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

type TraceState = {
  sourceQueryString: string;
  traces: XApiTrace[];
  selectedTraceId: string;
  headersOpen: boolean;
};

function createTraceState(queryString: string): TraceState {
  const queryState = readTraceQuery(queryString);
  const traces = getInitialTraces(queryState.taskId);
  return {
    sourceQueryString: queryString,
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
