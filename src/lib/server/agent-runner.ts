import { createXApiService } from "@/lib/server/xapi-service";
import { createAiService } from "@/lib/server/ai-service";
import { hashJson } from "@/lib/server/xapi-trace";
import { getSchemaInputKeys } from "@/lib/server/xapi-normalize";
import { planAgentTools } from "@/lib/server/agent-planner";
import { writeAgentReportDraft } from "@/lib/server/report-writer";
import { updateRunningTaskProgress } from "@/lib/server/agent-store";
import { timelineSteps } from "@/lib/navigation";
import type { AgentAiAudit, AgentToolCallAudit, AiGenerateResult } from "@/lib/ai-types";
import type { StoredAgentRun } from "@/lib/agent-types";
import type { EvidenceItem, Report, RunningTask, SourceMode, WorkspaceRunContext, XApiTrace } from "@/lib/types";
import type { XApiActionSchema, XApiCallResult, XApiRouteMode, XApiServiceResult } from "@/lib/xapi-types";

const zeroHash = "0x0000000000000000000000000000000000000000000000000000000000000000";

export async function runPersistentWorkspaceAgent(context: WorkspaceRunContext): Promise<StoredAgentRun> {
  const taskId = context.taskId ?? createWorkspaceTaskId();
  const startedAt = Date.now();
  const service = createXApiService();
  const aiService = createAiService();
  const query = normalizeTopicQuery(context.topic);

  // Progress helper — fire-and-forget, never blocks the agent
  const progress = (step: string, pct: number) => {
    updateRunningTaskProgress(taskId, step, pct).catch(() => undefined);
  };

  progress("正在检查 xAPI 连接...", 10);
  const health = await service.healthCheck();
  progress("正在搜索可用工具...", 18);
  const search = await service.searchActions(query);
  progress("AI 正在规划分析方案...", 28);
  const planResult = await planAgentTools({
    context,
    candidates: search.data,
    aiService
  });
  const actions = planResult.plan.selectedTools;
  progress(`已确认 ${actions.length} 个数据源，开始采集...`, 38);
  const schemaResults: Array<XApiServiceResult<XApiActionSchema>> = [];
  const callResults: Array<XApiServiceResult<XApiCallResult>> = [];

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    const pct = Math.round(38 + ((i + 1) / actions.length) * 32);
    progress(`正在采集 ${action} 数据...`, pct);
    const schema = await service.getActionSchema(action);
    schemaResults.push(schema);
    const callInput = buildActionInput(context, action, schema.data);
    callResults.push(await service.callAction(action, callInput, taskId, { schemaFetched: true }));
  }
  progress("AI 正在分析证据并生成报告...", 75);

  const xapiTraces = [
    serviceResultToTrace(health, {
      taskId,
      fallbackAction: "xapi.health",
      fallbackCapability: "xAPI",
      method: "GET",
      schemaFetched: false
    }),
    serviceResultToTrace(search, {
      taskId,
      fallbackAction: "xapi.search",
      fallbackCapability: "xAPI",
      method: "GET",
      schemaFetched: false
    }),
    ...schemaResults.map((result) =>
      serviceResultToTrace(result, {
        taskId,
        fallbackAction: result.data?.action ?? "xapi.schema",
        fallbackCapability: result.data?.capability ?? "Schema Discovery",
        method: "GET",
        schemaFetched: true
      })
    ),
    ...callResults.map((result) =>
      serviceResultToTrace(result, {
        taskId,
        fallbackAction: result.data?.action ?? "xapi.call",
        fallbackCapability: result.data?.capability ?? "xAPI",
        method: "POST",
        schemaFetched: true
      })
    )
  ];
  const toolSourceMode = resolveXApiSourceMode([health.mode, search.mode, ...schemaResults.map((result) => result.mode), ...callResults.map((result) => result.mode)]);
  const evidence = normalizeEvidence(callResults, xapiTraces);
  progress("AI 正在生成最终报告...", 82);
  const reportDraftResult = await writeAgentReportDraft({
    context,
    evidence,
    traces: xapiTraces,
    sourceMode: toolSourceMode,
    plan: planResult.plan,
    aiService
  });
  const sourceMode = resolveRunSourceMode([toolSourceMode, aiModeToSourceMode(planResult.mode), aiModeToSourceMode(reportDraftResult.mode)]);
  const aiAudit = createAiAudit({
    planner: planResult.aiResult,
    writer: reportDraftResult.aiResult,
    plan: planResult.plan,
    actions,
    fallbackReason: [planResult.fallbackReason, reportDraftResult.fallbackReason].filter(Boolean).join(" / ") || undefined,
    toolCalls: createToolCallAudit(xapiTraces)
  });
  const aiTraces = [
    aiResultToTrace({
      result: planResult.aiResult,
      taskId,
      action: "ai.plan",
      capability: "AI Planner",
      outputPreview: `${planResult.mode}: ${planResult.plan.selectedTools.length} tools selected`,
      output: planResult.plan,
      fallbackReason: planResult.fallbackReason
    }),
    aiResultToTrace({
      result: reportDraftResult.aiResult,
      taskId,
      action: "ai.report",
      capability: "AI Report Writer",
      outputPreview: `${reportDraftResult.mode}: ${reportDraftResult.draft.verdict} risk ${reportDraftResult.draft.riskScore}`,
      output: reportDraftResult.draft,
      fallbackReason: reportDraftResult.fallbackReason
    })
  ];
  const traces = [...aiTraces, ...xapiTraces];
  const report = createReport({ context, taskId, sourceMode, evidence, traces, draft: reportDraftResult.draft, ai: aiAudit });
  const elapsed = Date.now() - startedAt;
  const logs = createRunLogs({ context, actions, sourceMode, aiAudit, evidenceCount: evidence.length, traceCount: traces.length });
  const task = createTask({ context, taskId, sourceMode, report, traces, logs, elapsed });
  const createdAt = new Date().toISOString();

  return {
    task,
    report,
    traces,
    context: {
      ...context,
      taskId,
      sourceMode,
      runtimeLabel: sourceMode === "live" ? "live xAPI" : sourceMode === "partial" ? "partial xAPI" : "unavailable",
      runtimeReason: sourceMode === "live" ? "connected" : sourceMode === "partial" ? "partial fallback" : health.mode === "unconfigured" ? "no XAPI_KEY" : "upstream failed",
      schemaFirst: true,
      traceIds: traces.map((trace) => trace.id),
      runtimeLogs: logs,
      reportId: report.id
    },
    sourceMode,
    ai: aiAudit,
    createdAt,
    updatedAt: createdAt
  };
}

function evidenceWindowToTimeRange(window: string): string {
  if (window === "7d") return "week";
  if (window === "30d") return "month";
  return "day";
}

function buildActionInput(context: WorkspaceRunContext, action: string, schema?: XApiActionSchema): Record<string, unknown> {
  const topic = normalizeTopicQuery(context.topic);
  const schemaKeys = getSchemaInputKeys(schema?.input);
  const timeRange = evidenceWindowToTimeRange(context.advancedFilters.evidenceWindow);

  if (action === "crypto.token.price") {
    return { token: topic.toUpperCase(), chain: "eth" };
  }

  if (action === "crypto.token.holders" || action === "crypto.token.metadata") {
    return { token: topic.toUpperCase(), chain: "eth" };
  }

  if (action.startsWith("crypto.") || schemaKeys.includes("token") || schemaKeys.includes("symbol")) {
    return { token: topic.toUpperCase(), chain: "eth" };
  }

  if (action === "twitter.search" || action === "twitter.search_timeline") {
    const twitterWindow = context.advancedFilters.evidenceWindow === "30d" ? "30d" : context.advancedFilters.evidenceWindow === "7d" ? "7d" : "24h";
    return { raw_query: `${topic} crypto ${twitterWindow}`, sort_by: "Latest" };
  }

  if (action === "web.search.realtime" || action === "web.search") {
    return { q: `${topic} ${context.mode} crypto`, timeRange };
  }

  if (action === "web.search.news") {
    return { q: `${topic} crypto news`, timeRange };
  }

  if (action === "ai.text.summarize") {
    return {
      text: `${topic} crypto market analysis for ${context.mode} - provide key insights about price, social sentiment, and risk factors`,
      model: "qwen/qwen3.6-flash",
      language: "en",
      style: "bullet_points",
      max_length: 150
    };
  }

  if (action === "ai.text.chat.fast") {
    return {
      messages: [
        { role: "system", content: "Reply in 2-3 sentences max." },
        { role: "user", content: `${topic} ${context.mode}: summarize key signals.` }
      ],
      model: "qwen/qwen3.6-flash",
      max_tokens: 120
    };
  }

  if (action.startsWith("ai.")) {
    return { text: `${topic} crypto ${context.mode} analysis`, model: "qwen/qwen3.6-flash" };
  }

  if (action === "news.search.latest") {
    return { q: `${topic} crypto`, timeRange: "day" };
  }

  if (schemaKeys.includes("q")) {
    return { q: `${topic} ${context.mode} crypto` };
  }

  if (schemaKeys.includes("query") || schemaKeys.includes("raw_query")) {
    return { query: `${topic} crypto ${context.mode}`, raw_query: `${topic} crypto` };
  }

  return { q: `${topic} ${context.mode} crypto` };
}

function serviceResultToTrace<T>(
  result: XApiServiceResult<T>,
  options: {
    taskId: string;
    fallbackAction: string;
    fallbackCapability: string;
    method: "GET" | "POST";
    schemaFetched: boolean;
  }
): XApiTrace {
  const trace = result.trace;
  const status = trace.status === "fallback" || result.mode !== "live" ? "fallback" : trace.status === "failed" ? "failed" : "success";
  const timestamp = formatTraceTime(trace.timestamp);
  const output = result.data && typeof result.data === "object" ? (result.data as Record<string, unknown>) : {};

  return {
    id: trace.id,
    taskId: trace.taskId ?? options.taskId,
    source: "xapi",
    action: trace.action || options.fallbackAction,
    capability: trace.capability || options.fallbackCapability,
    schemaFetched: options.schemaFetched,
    inputHash: trace.inputHash,
    outputHash: trace.outputHash ?? zeroHash,
    outputPreview: summarizeResult(result, options.fallbackCapability),
    startedAt: timestamp,
    endedAt: timestamp,
    status,
    latencyMs: trace.latencyMs,
    method: options.method,
    headers: {
      "trace-source": "xapi",
      "xapi-action": trace.action || options.fallbackAction,
      "xapi-runtime-mode": result.mode,
      "schema-first": options.schemaFetched ? "yes" : "not-required"
    },
    input: trace.input,
    output,
    error: result.error?.message ?? trace.error,
    sourceMode: toSourceMode(result.mode)
  };
}

function aiResultToTrace({
  result,
  taskId,
  action,
  capability,
  outputPreview,
  output,
  fallbackReason
}: {
  result: AiGenerateResult;
  taskId: string;
  action: string;
  capability: string;
  outputPreview: string;
  output: unknown;
  fallbackReason?: string;
}): XApiTrace {
  const timestamp = new Date().toLocaleTimeString("zh-CN", { hour12: false });
  const sourceMode = aiModeToSourceMode(result.mode);

  return {
    id: `cp-ai-${action.replace(/[^a-z0-9]+/gi, "-")}-${Date.now().toString(36)}`,
    taskId,
    source: "ai",
    action,
    capability,
    schemaFetched: false,
    inputHash: result.trace.promptHash,
    outputHash: result.trace.outputHash,
    outputPreview,
    startedAt: timestamp,
    endedAt: timestamp,
    status: result.ok ? "success" : "fallback",
    latencyMs: result.trace.latencyMs,
    method: "POST",
    headers: {
      "trace-source": "ai",
      "ai-provider": result.provider,
      "ai-model": result.model,
      "ai-runtime-mode": result.mode
    },
    input: {
      promptHash: result.trace.promptHash,
      model: result.model,
      provider: result.provider
    },
    output: toRecord(output),
    error: result.error?.message ?? fallbackReason,
    sourceMode,
    provider: result.provider,
    model: result.model,
    baseUrl: result.baseUrl,
    promptHash: result.trace.promptHash,
    reasoningSummary: summarizeReasoning(toRecord(output), fallbackReason)
  };
}

function normalizeEvidence(callResults: Array<XApiServiceResult<XApiCallResult>>, traces: XApiTrace[]): EvidenceItem[] {
  const callTraces = traces.filter((trace) => trace.source === "xapi" && trace.method === "POST" && !trace.action.startsWith("xapi."));
  const total = Math.max(1, callTraces.length);

  return callTraces.map((trace, index) => {
    const call = callResults[index];
    const output = call?.data?.output ?? trace.output;
    const confidence = inferEvidenceConfidence(trace, call);
    return compactObject({
      id: `ev_${trace.taskId}_${index + 1}`,
      source: `xapi:${trace.action}`,
      title: `${trace.capability} signal (${trace.action})`,
      summary: stripModePrefix(trace.outputPreview),
      weight: round(Math.max(0.12, confidence / total), 3),
      traceId: trace.id,
      sourceUrl: findStringValue(output, ["url", "link", "sourceUrl"]),
      sourceTimestamp: new Date().toISOString(),
      rawId: findStringValue(output, ["id", "rawId", "traceId"]) ?? trace.outputHash.slice(0, 18),
      confidence,
      sourceMode: trace.sourceMode ?? toSourceMode(call?.mode ?? "fallback")
    });
  });
}

function createReport({
  context,
  taskId,
  sourceMode,
  evidence,
  traces,
  draft,
  ai
}: {
  context: WorkspaceRunContext;
  taskId: string;
  sourceMode: SourceMode;
  evidence: EvidenceItem[];
  traces: XApiTrace[];
  draft: {
    title: string;
    summary: string;
    verdict: Report["verdict"];
    riskScore: number;
    alphaScore: number;
    confidence: number;
    rationale: string[];
    actions: string[];
  };
  ai: AgentAiAudit;
}): Report {
  const topic = normalizeTopicQuery(context.topic).toUpperCase();
  const reportBase: Report = {
    id: `rep_${slugify(topic)}_${Date.now().toString(36)}`,
    title: draft.title,
    topic,
    mode: context.mode,
    summary: draft.summary,
    riskScore: draft.riskScore,
    alphaScore: draft.alphaScore,
    confidence: draft.confidence,
    verdict: draft.verdict,
    status: pendingReportStatus(),
    createdAt: formatDateTime(new Date()),
    reportHash: zeroHash,
    evidenceHash: zeroHash,
    actions: draft.actions,
    rationale: draft.rationale,
    evidence,
    taskId,
    traceIds: traces.map((trace) => trace.id),
    sourceMode,
    ai
  };
  const evidenceHash = hashJson(toEvidencePacket(evidence));

  return {
    ...reportBase,
    evidenceHash,
    reportHash: hashJson(toReportHashPayload(reportBase))
  };
}

function createTask({
  context,
  taskId,
  sourceMode,
  report,
  traces,
  logs,
  elapsed
}: {
  context: WorkspaceRunContext;
  taskId: string;
  sourceMode: SourceMode;
  report: Report;
  traces: XApiTrace[];
  logs: string[];
  elapsed: number;
}): RunningTask {
  return {
    id: taskId,
    topic: normalizeTopicQuery(context.topic).toUpperCase(),
    mode: context.mode,
    status: "Completed",
    startedAt: report.createdAt,
    elapsed: formatElapsed(elapsed),
    progress: 100,
    currentStep: timelineSteps[timelineSteps.length - 1] ?? "Report generated",
    logs,
    completedAt: report.createdAt,
    reportId: report.id,
    traceIds: traces.map((trace) => trace.id),
    sourceMode
  };
}

function createAiAudit({
  planner,
  writer,
  plan,
  actions,
  fallbackReason,
  toolCalls
}: {
  planner: AiGenerateResult;
  writer: AiGenerateResult;
  plan: AgentAiAudit["plan"];
  actions: string[];
  fallbackReason?: string;
  toolCalls: AgentToolCallAudit[];
}): AgentAiAudit {
  const primary = writer.ok ? writer : planner;
  const promptHash = hashJson({
    planner: planner.trace.promptHash,
    writer: writer.trace.promptHash
  });
  const outputHash = hashJson({
    planner: planner.trace.outputHash,
    writer: writer.trace.outputHash,
    plan,
    actions
  });

  return {
    provider: primary.provider,
    model: primary.model,
    baseUrl: primary.baseUrl,
    promptHash,
    outputHash,
    mode: planner.ok && writer.ok ? "live" : planner.mode === "disabled" && writer.mode === "disabled" ? "disabled" : "fallback",
    plan,
    toolPlan: actions,
    toolCalls,
    reasoningSummary: [plan?.reason, plan?.evidenceStrategy].filter(Boolean).join(" "),
    fallbackReason
  };
}

function createToolCallAudit(traces: XApiTrace[]): AgentToolCallAudit[] {
  return traces
    .filter((trace) => trace.source === "xapi" && trace.method === "POST" && !trace.action.startsWith("xapi."))
    .map((trace) => ({
      source: "xapi",
      action: trace.action,
      mode: trace.sourceMode ?? "fallback",
      status: trace.status,
      inputHash: trace.inputHash,
      outputHash: trace.outputHash,
      latencyMs: trace.latencyMs
    }));
}

function createRunLogs({
  context,
  actions,
  sourceMode,
  aiAudit,
  evidenceCount,
  traceCount
}: {
  context: WorkspaceRunContext;
  actions: string[];
  sourceMode: SourceMode;
  aiAudit: AgentAiAudit;
  evidenceCount: number;
  traceCount: number;
}) {
  const timestamp = context.createdAt || new Date().toLocaleTimeString("zh-CN", { hour12: false });
  return [
    `[${timestamp}] Intent Parser resolved topic=${context.topic} mode=${context.mode}`,
    `[${timestamp}] AI planner mode=${aiAudit.mode} selected ${actions.length} tools: ${actions.join(", ")}`,
    `[${timestamp}] schema-first xAPI calls completed for every selected tool`,
    `[${timestamp}] normalized ${evidenceCount} evidence items from ${traceCount} trace records`,
    `[${timestamp}] AI report writer produced report audit promptHash=${aiAudit.promptHash}`,
    `[${timestamp}] report JSON generated with sourceMode=${sourceMode}`,
    `[${timestamp}] task/report/evidence/trace records persisted`
  ];
}

function summarizeResult<T>(result: XApiServiceResult<T>, fallbackCapability: string) {
  if (result.error?.message && result.mode !== "live") return `${result.mode}: ${result.error.message}`;
  if (isCallResult(result.data)) return `${result.mode}: ${result.data.outputPreview}`;
  if (isSchemaResult(result.data)) return `${result.mode}: schema-first ${Object.keys(result.data.input).length} input fields`;
  if (Array.isArray(result.data)) return `${result.mode}: ${result.data.length} action candidates`;
  if (!result.ok) return `${result.mode}: ${result.error?.message ?? "xAPI request failed"}`;
  return `${result.mode}: ${fallbackCapability} response captured`;
}

function resolveXApiSourceMode(modes: XApiRouteMode[]): SourceMode {
  const liveCount = modes.filter((mode) => mode === "live").length;
  if (liveCount === modes.length) return "live";
  if (liveCount > 0) return "partial";
  return "fallback";
}

function resolveRunSourceMode(modes: SourceMode[]): SourceMode {
  if (modes.every((mode) => mode === "live")) return "live";
  if (modes.some((mode) => mode === "live" || mode === "partial")) return "partial";
  return "fallback";
}

function aiModeToSourceMode(mode: "live" | "fallback" | "disabled"): SourceMode {
  if (mode === "live") return "live";
  return "fallback";
}

function toSourceMode(mode: XApiRouteMode): SourceMode {
  return mode === "live" ? "live" : "fallback";
}

function pendingReportStatus() {
  return "未上链" as Report["status"];
}

function toEvidencePacket(evidence: EvidenceItem[]) {
  const raw = evidence.map((item) => ({
    id: item.id,
    source: item.source,
    title: item.title,
    summary: item.summary,
    weight: item.weight,
    ...(item.traceId ? { traceId: item.traceId } : {}),
    ...(item.sourceUrl ? { sourceUrl: item.sourceUrl } : {}),
    ...(item.sourceTimestamp ? { sourceTimestamp: item.sourceTimestamp } : {}),
    ...(item.rawId ? { rawId: item.rawId } : {}),
    ...(typeof item.confidence === "number" ? { confidence: item.confidence } : {}),
    ...(item.sourceMode ? { sourceMode: item.sourceMode } : {})
  }));
  // Normalize through JSON to strip undefined values — must match client-side behaviour
  return JSON.parse(JSON.stringify(raw)) as typeof raw;
}

function toReportHashPayload(report: Report) {
  const { reportHash: _reportHash, evidenceHash: _evidenceHash, attestation: _att, ...payload } = report;
  // Normalize through JSON to remove undefined fields — must match client-side behaviour
  return JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;
}

function inferEvidenceConfidence(trace: XApiTrace, call?: XApiServiceResult<XApiCallResult>) {
  if (trace.status === "failed") return 0.35;
  if (trace.status === "fallback" || call?.mode !== "live") return 0.66;
  return 0.82;
}

function findStringValue(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (typeof record[key] === "string") return record[key] as string;
  }
  return undefined;
}

function compactObject<T extends Record<string, unknown>>(record: T): T {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined)) as T;
}

function isCallResult(value: unknown): value is XApiCallResult {
  return value !== null && typeof value === "object" && "outputPreview" in value;
}

function isSchemaResult(value: unknown): value is XApiActionSchema {
  return value !== null && typeof value === "object" && "input" in value && "action" in value;
}

function normalizeTopicQuery(topic: string) {
  return topic.trim().replace(/^\$/, "") || "ETH";
}

function createWorkspaceTaskId() {
  return `cp-run-${Date.now().toString(36)}`;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "target";
}

function formatTraceTime(timestamp?: string) {
  if (!timestamp) return new Date().toLocaleTimeString("zh-CN", { hour12: false });
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return date.toLocaleTimeString("zh-CN", { hour12: false });
}

function formatDateTime(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatElapsed(ms: number) {
  const seconds = Math.max(1, Math.round(ms / 1000));
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}m ${(seconds % 60).toString().padStart(2, "0")}s`;
}

function stripModePrefix(text: string): string {
  return text.replace(/^(live|fallback|partial|unconfigured):\s*/i, "");
}

function summarizeReasoning(output: Record<string, unknown>, fallbackReason?: string) {
  if (typeof output.reason === "string") return output.reason;
  if (typeof output.summary === "string") return output.summary;
  if (fallbackReason) return fallbackReason;
  return "AI reasoning trace captured for audit.";
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : { value };
}

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

function round(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
