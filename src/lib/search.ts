import type { Report, RunningTask, XApiTrace } from "./types";

export type SearchResultType = "Report" | "Task" | "Trace";

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  description: string;
  path: string;
}

export interface SearchableRecords {
  reports: Report[];
  tasks: RunningTask[];
  traces: XApiTrace[];
}

const includesQuery = (value: string, query: string) => value.toLowerCase().includes(query.toLowerCase());

export function searchChainPulse(query: string, records: SearchableRecords, limit = 6): SearchResult[] {
  const cleanQuery = query.trim();
  if (cleanQuery.length === 0) return [];

  const reportResults: SearchResult[] = records.reports
    .filter((report) => includesQuery(`${report.title} ${report.topic} ${report.summary} ${report.reportHash} ${report.evidenceHash}`, cleanQuery))
    .map((report) => ({
      id: report.id,
      type: "Report",
      title: report.title,
      description: report.summary,
      path: `/reports/${report.id}`
    }));

  const taskResults: SearchResult[] = records.tasks
    .filter((task) => includesQuery(`${task.topic} ${task.mode} ${task.status} ${task.currentStep}`, cleanQuery))
    .map((task) => ({
      id: task.id,
      type: "Task",
      title: `${task.topic} / ${task.mode}`,
      description: `${task.status} / ${task.currentStep}`,
      path: `/tasks?task=${task.id}`
    }));

  const traceResults: SearchResult[] = records.traces
    .filter((trace) => includesQuery(`${trace.action} ${trace.capability} ${trace.outputPreview} ${trace.inputHash} ${trace.outputHash}`, cleanQuery))
    .map((trace) => ({
      id: trace.id,
      type: "Trace",
      title: trace.source === "ai" ? `AI: ${trace.action}` : trace.action,
      description: trace.outputPreview,
      path: `/trace?trace=${trace.id}`
    }));

  return [...reportResults, ...taskResults, ...traceResults].sort((left, right) => resultPriority(left) - resultPriority(right)).slice(0, limit);
}

function resultPriority(result: SearchResult) {
  if (result.type === "Task") return 0;
  if (result.type === "Report") return 1;
  return 2;
}
