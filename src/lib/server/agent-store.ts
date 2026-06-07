import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import type { StoredAgentRun } from "@/lib/agent-types";
import type { Report, ReportAttestation, RunningTask, XApiTrace } from "@/lib/types";

interface AgentStoreSnapshot {
  version: 1;
  runs: StoredAgentRun[];
  tasks: RunningTask[];
  reports: Report[];
  traces: XApiTrace[];
}

const emptySnapshot: AgentStoreSnapshot = {
  version: 1,
  runs: [],
  tasks: [],
  reports: [],
  traces: []
};
const defaultStoreDir = ".chainpulse";
const defaultStorePath = ".chainpulse/store.json";
let storePathOverride: string | null = null;
let writeQueue: Promise<unknown> = Promise.resolve();

export function setAgentStorePathForTest(filePath: string | null) {
  if (process.env.NODE_ENV !== "test" && process.env.VITEST !== "true") {
    throw new Error("setAgentStorePathForTest can only be used in tests");
  }
  storePathOverride = filePath;
}

export async function saveRunningTaskPlaceholder(taskId: string, context: { topic: string; mode: string; createdAt: string }) {
  const now = new Date().toISOString();
  const writeTask = writeQueue.then(async () => {
    const snapshot = await readAgentStore();
    const placeholder: RunningTask = {
      id: taskId,
      topic: context.topic.toUpperCase().replace(/^\$/, ""),
      mode: context.mode as RunningTask["mode"],
      status: "Running",
      startedAt: context.createdAt || new Date().toLocaleTimeString("zh-CN", { hour12: false }),
      elapsed: "00m 00s",
      progress: 5,
      currentStep: "初始化 Agent...",
      logs: [`[${context.createdAt}] 正在启动 ChainPulse Agent...`]
    };
    const nextSnapshot: AgentStoreSnapshot = {
      version: 1,
      runs: snapshot.runs,
      tasks: upsertById(snapshot.tasks, placeholder, (item) => item.id),
      reports: snapshot.reports,
      traces: snapshot.traces
    };
    await writeAgentStore(nextSnapshot);
  });
  writeQueue = writeTask.catch(() => undefined);
  return writeTask;
}

export async function updateRunningTaskProgress(taskId: string, currentStep: string, progress: number) {
  const writeTask = writeQueue.then(async () => {
    const snapshot = await readAgentStore();
    const nextTasks = snapshot.tasks.map((task) =>
      task.id === taskId && task.status === "Running"
        ? { ...task, currentStep, progress }
        : task
    );
    if (nextTasks === snapshot.tasks) return; // no change
    await writeAgentStore({ ...snapshot, tasks: nextTasks });
  });
  writeQueue = writeTask.catch(() => undefined);
  return writeTask;
}

export async function saveAgentRun(run: StoredAgentRun) {
  const writeTask = writeQueue.then(async () => {
    const snapshot = await readAgentStore();
    const nextSnapshot: AgentStoreSnapshot = {
      version: 1,
      runs: upsertById(snapshot.runs, run, (item) => item.task.id),
      tasks: upsertById(snapshot.tasks, run.task, (item) => item.id),
      reports: upsertById(snapshot.reports, run.report, (item) => item.id),
      traces: upsertManyById(snapshot.traces.filter((trace) => trace.taskId !== run.task.id), run.traces, (item) => item.id)
    };

    await writeAgentStore(nextSnapshot);
    return run;
  });

  writeQueue = writeTask.catch(() => undefined);
  return writeTask;
}

export async function saveReportAttestation(reportId: string, attestation: ReportAttestation) {
  const writeTask = writeQueue.then(async () => {
    const snapshot = await readAgentStore();
    const nextReports = snapshot.reports.map((report) => (report.id === reportId ? markReportAttested(report, attestation) : report));
    const nextRuns = snapshot.runs.map((run) =>
      run.report.id === reportId
        ? {
            ...run,
            report: markReportAttested(run.report, attestation),
            updatedAt: new Date().toISOString()
          }
        : run
    );
    const nextSnapshot: AgentStoreSnapshot = {
      version: 1,
      runs: nextRuns,
      tasks: snapshot.tasks,
      reports: nextReports,
      traces: snapshot.traces
    };

    await writeAgentStore(nextSnapshot);
    return nextReports.find((report) => report.id === reportId) ?? nextRuns.find((run) => run.report.id === reportId)?.report ?? null;
  });

  writeQueue = writeTask.catch(() => undefined);
  return writeTask;
}

export async function listStoredRuns() {
  const snapshot = await readAgentStore();
  return sortByCreatedAt(snapshot.runs, (run) => run.createdAt);
}

export async function listStoredTasks() {
  const snapshot = await readAgentStore();
  return sortByCreatedAt(snapshot.tasks, (task) => task.startedAt);
}

export async function getStoredTaskRun(taskId: string) {
  const snapshot = await readAgentStore();
  // First check full runs (has report, traces, etc.)
  const fullRun = snapshot.runs.find((run) => run.task.id === taskId);
  if (fullRun) return fullRun;
  // Fall back to task-only placeholder (Running state)
  const placeholderTask = snapshot.tasks.find((task) => task.id === taskId);
  if (placeholderTask) {
    return {
      task: placeholderTask,
      report: null as never,
      traces: [],
      context: null as never,
      sourceMode: "fallback" as const,
      ai: null as never,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
  return undefined;
}

export async function listStoredReports() {
  const snapshot = await readAgentStore();
  return sortByCreatedAt(snapshot.reports, (report) => report.createdAt);
}

export async function getStoredReportRun(reportId: string) {
  const snapshot = await readAgentStore();
  return snapshot.runs.find((run) => run.report.id === reportId);
}

export async function listStoredTraces(taskId?: string | null) {
  const snapshot = await readAgentStore();
  const traces = taskId ? snapshot.traces.filter((trace) => trace.taskId === taskId) : snapshot.traces;
  return sortByCreatedAt(traces, (trace) => trace.startedAt);
}

async function readAgentStore(): Promise<AgentStoreSnapshot> {
  const filePath = getStorePath();

  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<AgentStoreSnapshot>;
    return {
      version: 1,
      runs: Array.isArray(parsed.runs) ? parsed.runs : [],
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      reports: Array.isArray(parsed.reports) ? parsed.reports : [],
      traces: Array.isArray(parsed.traces) ? parsed.traces : []
    };
  } catch (error) {
    if (isFileNotFound(error)) return emptySnapshot;
    throw error;
  }
}

async function writeAgentStore(snapshot: AgentStoreSnapshot) {
  const filePath = getStorePath();
  const tempFilePath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await mkdir(getStoreDir(filePath), { recursive: true });
  try {
    await writeFile(tempFilePath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
    await rename(tempFilePath, filePath);
  } catch (error) {
    await rm(tempFilePath, { force: true });
    throw error;
  }
}

function getStorePath() {
  return storePathOverride || defaultStorePath;
}

function getStoreDir(filePath: string) {
  if (filePath === defaultStorePath) return defaultStoreDir;
  const normalized = filePath.replace(/\\/g, "/");
  const separatorIndex = normalized.lastIndexOf("/");
  return separatorIndex === -1 ? "." : filePath.slice(0, separatorIndex);
}

function upsertById<T>(items: T[], item: T, getId: (item: T) => string) {
  return upsertManyById(items, [item], getId);
}

function upsertManyById<T>(items: T[], nextItems: T[], getId: (item: T) => string) {
  const byId = new Map<string, T>();
  for (const item of items) byId.set(getId(item), item);
  for (const item of nextItems) byId.set(getId(item), item);
  return [...byId.values()];
}

function sortByCreatedAt<T>(items: T[], getCreatedAt: (item: T) => string) {
  return [...items].sort((left, right) => getCreatedAt(right).localeCompare(getCreatedAt(left)));
}

function markReportAttested(report: Report, attestation: ReportAttestation): Report {
  return {
    ...report,
    status: "已上链" as Report["status"],
    reportHash: attestation.reportHash || report.reportHash,
    evidenceHash: attestation.evidenceHash || report.evidenceHash,
    attestation
  };
}

function isFileNotFound(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "ENOENT";
}
