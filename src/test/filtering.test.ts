import { describe, expect, it } from "vitest";
import { filterReports, filterWatchlist } from "@/lib/filters";
import { reports, watchlistTargets } from "@/lib/mock-data";

describe("local mock data filters", () => {
  it("filters reports by query, mode, verdict, and risk range", () => {
    const result = filterReports(reports, {
      query: "eth",
      mode: "Risk Scan",
      verdict: "OBSERVE",
      minRisk: 20,
      maxRisk: 45
    });

    expect(result).toHaveLength(1);
    expect(result[0].topic).toBe("ETH");
  });

  it("filters watchlist targets by query, category, and alert state", () => {
    const result = filterWatchlist(watchlistTargets, {
      query: "curve",
      category: "Protocol",
      alertState: "Warning",
      sortBy: "risk-desc"
    });

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Curve");
  });
});
