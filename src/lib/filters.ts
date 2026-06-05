import type { Report, ReportFilters, WatchlistFilters, WatchlistTarget } from "./types";

const includesText = (source: string, query: string) => source.toLowerCase().includes(query.trim().toLowerCase());

export function filterReports(items: Report[], filters: ReportFilters): Report[] {
  return items.filter((report) => {
    const queryMatch =
      filters.query.trim().length === 0 ||
      includesText(`${report.title} ${report.topic} ${report.summary}`, filters.query);
    const modeMatch = filters.mode === "All" || report.mode === filters.mode;
    const verdictMatch = filters.verdict === "All" || report.verdict === filters.verdict;
    const riskMatch = report.riskScore >= filters.minRisk && report.riskScore <= filters.maxRisk;

    return queryMatch && modeMatch && verdictMatch && riskMatch;
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
