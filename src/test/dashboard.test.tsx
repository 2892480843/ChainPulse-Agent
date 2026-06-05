import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import DashboardApp from "@/components/DashboardApp";

describe("ChainPulse dashboard", () => {
  it("switches all seven app shell pages and keeps the active sidebar item highlighted", async () => {
    const user = userEvent.setup();
    render(<DashboardApp />);

    const pages = [
      ["工作台", "智能分析工作台"],
      ["运行中的任务", "运行中的任务"],
      ["报告中心", "报告中心"],
      ["xAPI Trace", "xAPI Trace"],
      ["链上证明", "链上证明"],
      ["Watchlist", "Watchlist"],
      ["设置", "设置"]
    ];

    for (const [navLabel, heading] of pages) {
      await user.click(screen.getByRole("button", { name: navLabel }));
      expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: navLabel })).toHaveAttribute("aria-current", "page");
    }
  });

  it("filters reports and copies trace hashes with visible feedback", async () => {
    const user = userEvent.setup();
    render(<DashboardApp />);

    await user.click(screen.getByRole("button", { name: "报告中心" }));
    await user.type(screen.getByLabelText("搜索报告"), "ZEC");
    expect(screen.getByText("ZEC Liquidity Caution")).toBeInTheDocument();
    expect(screen.queryByText("ETH Risk Baseline")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "xAPI Trace" }));
    await user.click(within(screen.getByTestId("trace-detail")).getByRole("button", { name: /复制 Output Hash/ }));
    expect(screen.getByText("已复制")).toBeInTheDocument();
  });
});
