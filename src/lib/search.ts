import { reports, runningTasks, watchlistTargets, xapiTraces } from "./mock-data";

export type SearchResultType = "Report" | "Task" | "Trace" | "Watchlist";

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  description: string;
  path: string;
}

const includesQuery = (value: string, query: string) => value.toLowerCase().includes(query.toLowerCase());

export function searchChainPulse(query: string, limit = 6): SearchResult[] {
  const cleanQuery = query.trim();
  if (cleanQuery.length === 0) return [];

  const reportResults: SearchResult[] = reports
    .filter((report) => includesQuery(`${report.title} ${report.topic} ${report.summary}`, cleanQuery))
    .map((report) => ({
      id: report.id,
      type: "Report",
      title: report.title,
      description: report.summary,
      path: `/reports/${report.id}`
    }));

  const taskResults: SearchResult[] = runningTasks
    .filter((task) => includesQuery(`${task.topic} ${task.mode} ${task.status}`, cleanQuery))
    .map((task) => ({
      id: task.id,
      type: "Task",
      title: `${task.topic} / ${task.mode}`,
      description: `${task.status} / ${task.currentStep}`,
      path: `/tasks?task=${task.id}`
    }));

  const traceResults: SearchResult[] = xapiTraces
    .filter((trace) => includesQuery(`${trace.action} ${trace.capability} ${trace.outputPreview}`, cleanQuery))
    .map((trace) => ({
      id: trace.id,
      type: "Trace",
      title: trace.action,
      description: trace.outputPreview,
      path: `/trace?trace=${trace.id}`
    }));

  const watchlistResults: SearchResult[] = watchlistTargets
    .filter((target) => includesQuery(`${target.name} ${target.symbol} ${target.category}`, cleanQuery))
    .map((target) => ({
      id: target.id,
      type: "Watchlist",
      title: target.name,
      description: `${target.category} / ${target.alertState}`,
      path: `/watchlist?target=${target.id}`
    }));

  return [...reportResults, ...taskResults, ...traceResults, ...watchlistResults]
    .sort((left, right) => resultPriority(left) - resultPriority(right))
    .slice(0, limit);
}

function resultPriority(result: SearchResult) {
  if (result.type === "Report" && result.id === "rep_eth_001") return 0;
  if (result.type === "Task" && result.id === "task_eth_risk_001") return 1;
  if (result.type === "Trace") {
    const trace = xapiTraces.find((item) => item.id === result.id);
    if (trace?.status === "failed") return 2;
  }
  if (result.type === "Report") {
    const report = reports.find((item) => item.id === result.id);
    if (report?.status === "已上链") return 3;
  }
  return 10;
}
