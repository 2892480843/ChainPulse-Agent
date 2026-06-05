import { describe, expect, it } from "vitest";
import { filterReports, filterWatchlist } from "@/lib/filters";
import { reports, watchlistTargets } from "@/lib/mock-data";

describe("local mock data filters", () => {
  it("filters reports by query, mode, verdict, and risk range", () => {
    const result = filterReports(reports, {
      query: "eth",
      mode: "Risk Scan",
      verdict: "OBSERVE",
      status: "All",
      minRisk: 20,
      maxRisk: 45,
      startDate: "2026-06-05",
      endDate: "2026-06-05"
    });

    expect(result).toHaveLength(1);
    expect(result[0].topic).toBe("ETH");
  });

  it("excludes reports outside the selected date range", () => {
    const result = filterReports(reports, {
      query: "",
      mode: "All",
      verdict: "All",
      status: "All",
      minRisk: 0,
      maxRisk: 100,
      startDate: "2026-06-04",
      endDate: "2026-06-04"
    });

    expect(result.map((report) => report.topic)).toEqual(["Uniswap"]);
  });

  it("filters reports by attestation status", () => {
    const result = filterReports(reports, {
      query: "",
      mode: "All",
      verdict: "All",
      status: "未上链",
      minRisk: 0,
      maxRisk: 100,
      startDate: "",
      endDate: ""
    });

    expect(result.map((report) => report.topic)).toEqual(["ZEC"]);
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
