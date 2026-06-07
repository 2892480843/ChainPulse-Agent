import type { AgentCollectionResponse, AgentEntityResponse, StoredAgentRun } from "@/lib/agent-types";
import type { Report, ReportAttestation, RunningTask, XApiTrace } from "@/lib/types";

export async function fetchStoredReports() {
  const response = await fetchCollection<Report>("/api/reports");
  return response.data;
}

export async function fetchStoredReportRun(reportId: string) {
  const response = await fetchEntity<StoredAgentRun>(`/api/reports/${encodeURIComponent(reportId)}`);
  return response.data ?? null;
}

export async function fetchStoredTasks() {
  const response = await fetchCollection<RunningTask>("/api/tasks");
  return response.data;
}

export async function fetchStoredTaskRun(taskId: string) {
  const response = await fetchEntity<StoredAgentRun>(`/api/tasks/${encodeURIComponent(taskId)}`);
  return response.data ?? null;
}

export async function fetchStoredTraces(taskId?: string | null) {
  const suffix = taskId ? `?task=${encodeURIComponent(taskId)}` : "";
  const response = await fetchCollection<XApiTrace>(`/api/traces${suffix}`);
  return response.data;
}

export async function saveReportAttestationRecord(reportId: string, attestation: ReportAttestation) {
  const response = await fetchEntity<Report>(`/api/reports/${encodeURIComponent(reportId)}/attestation`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(attestation)
  });
  return response.data ?? null;
}

export function mergeReportsWithMock(storedReports: Report[]) {
  return storedReports;
}

export function mergeTasksWithMock(storedTasks: RunningTask[]) {
  return storedTasks;
}

export function mergeTracesWithMock(storedTraces: XApiTrace[]) {
  return storedTraces;
}

async function fetchCollection<T>(url: string): Promise<AgentCollectionResponse<T>> {
  const response = await fetch(url, { cache: "no-store", credentials: "same-origin" });
  if (!response.ok) throw new Error(`request failed: ${response.status}`);
  const body = (await response.json()) as AgentCollectionResponse<T>;
  if (!body.ok || !Array.isArray(body.data)) throw new Error("invalid collection response");
  return body;
}

async function fetchEntity<T>(url: string, init?: RequestInit): Promise<AgentEntityResponse<T>> {
  const response = await fetch(url, { ...init, cache: "no-store", credentials: "same-origin" });
  if (!response.ok) throw new Error(`request failed: ${response.status}`);
  const body = (await response.json()) as AgentEntityResponse<T>;
  if (!body.ok) throw new Error(body.error?.message ?? "invalid entity response");
  return body;
}
