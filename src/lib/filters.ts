import type { Report, ReportFilters, WatchlistFilters, WatchlistTarget } from "./types";

const includesText = (source: string, query: string) => source.toLowerCase().includes(query.trim().toLowerCase());

export function filterReports(items: Report[], filters: ReportFilters): Report[] {
  return items.filter((report) => {
    const queryMatch =
      filters.query.trim().length === 0 ||
      includesText(`${report.title} ${report.topic} ${report.summary}`, filters.query);
    const modeMatch = filters.mode === "All" || report.mode === filters.mode;
    const verdictMatch = filters.verdict === "All" || report.verdict === filters.verdict;
    const minRisk = clampRisk(filters.minRisk);
    const maxRisk = clampRisk(filters.maxRisk);
    const riskMatch = report.riskScore >= Math.min(minRisk, maxRisk) && report.riskScore <= Math.max(minRisk, maxRisk);
    const reportDate = report.createdAt.slice(0, 10);
    const startMatch = filters.startDate.length === 0 || reportDate >= filters.startDate;
    const endMatch = filters.endDate.length === 0 || reportDate <= filters.endDate;

    return queryMatch && modeMatch && verdictMatch && riskMatch && startMatch && endMatch;
  });
}

export function filterWatchlist(items: WatchlistTarget[], filters: WatchlistFilters): WatchlistTarget[] {
  const filtered = items.filter((target) => {
    const queryMatch =
      filters.query.trim().length === 0 ||
      includesText(`${target.name} ${target.symbol} ${target.category}`, filters.query);
    const categoryMatch = filters.category === "All" || target.category === filters.category;
    const alertMatch = filters.alertState === "All" || target.alertState === filters.alertState;

    return queryMatch && categoryMatch && alertMatch;
  });

  return [...filtered].sort((a, b) => {
    if (filters.sortBy === "alpha-desc") return b.alphaScore - a.alphaScore;
    if (filters.sortBy === "recent") return a.lastScan.localeCompare(b.lastScan);
    return b.riskScore - a.riskScore;
  });
}

export function clampRisk(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, value));
}
