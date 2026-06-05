import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import AttestationRoute from "@/app/attestation/page";
import DemoRoute from "@/app/demo/page";
import ReportsRoute from "@/app/reports/page";
import SettingsRoute from "@/app/settings/page";
import TasksRoute from "@/app/tasks/page";
import TraceRoute from "@/app/trace/page";
import WatchlistRoute from "@/app/watchlist/page";
import WorkspaceRoute from "@/app/workspace/page";
import DashboardApp from "@/components/DashboardApp";
import { AppShell } from "@/components/shell/AppShell";
import { ReportDetailPage } from "@/components/pages/ReportDetailPage";
import { xapiTraces } from "@/lib/mock-data";

const routerPush = vi.fn();
let pathname = "/workspace";
let searchParamsString = "";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams(searchParamsString),
  useRouter: () => ({
    push: routerPush,
    replace: routerPush
  })
}));

afterEach(() => {
  pathname = "/workspace";
  searchParamsString = "";
  routerPush.mockReset();
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe("ChainPulse dashboard", () => {
  it("renders every app route entry with the expected page title", () => {
    const routes = [
      ["/workspace", WorkspaceRoute, "智能分析工作台"],
      ["/demo", DemoRoute, "路演导演台"],
      ["/tasks", TasksRoute, "运行中的任务"],
      ["/reports", ReportsRoute, "报告中心"],
      ["/trace", TraceRoute, "xAPI Trace"],
      ["/attestation", AttestationRoute, "Proof Receipt / 链上证明凭证"],
      ["/watchlist", WatchlistRoute, "Watchlist"],
      ["/settings", SettingsRoute, "设置"]
    ] as const;

    for (const [routePath, RouteComponent, heading] of routes) {
      pathname = routePath;
      const view = render(<RouteComponent />);
      expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
      view.unmount();
    }
  });

  it("renders desktop sidebar links with the current route highlighted", () => {
    render(<DashboardApp />);

    expect(screen.getByRole("complementary", { name: "主导航侧栏" })).toHaveClass("sticky", "top-0", "h-[100dvh]", "overflow-y-auto");
    expect(screen.getByRole("link", { name: "工作台" })).toHaveAttribute("href", "/workspace");
    expect(screen.getByRole("link", { name: "评委演示" })).toHaveAttribute("href", "/demo");
    expect(screen.getByRole("link", { name: "运行中的任务" })).toHaveAttribute("href", "/tasks");
    expect(screen.getByRole("link", { name: "报告中心" })).toHaveAttribute("href", "/reports");
    expect(screen.getByRole("link", { name: "xAPI Trace" })).toHaveAttribute("href", "/trace");
    expect(screen.getByRole("link", { name: "链上证明" })).toHaveAttribute("href", "/attestation");
    expect(screen.getByRole("link", { name: "Watchlist" })).toHaveAttribute("href", "/watchlist");
    expect(screen.getByRole("link", { name: "设置" })).toHaveAttribute("href", "/settings");
    expect(screen.getByRole("link", { name: "工作台" })).toHaveAttribute("aria-current", "page");
  });

  it("renders the demo flow with the expected route CTAs", () => {
    pathname = "/demo";
    render(<DashboardApp />);

    expect(screen.getByRole("heading", { name: "路演导演台" })).toBeInTheDocument();
    expect(screen.getByText("Proof Chain 摘要")).toBeInTheDocument();
    expect(screen.getByText("评委观察清单")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open workspace/ })).toHaveAttribute("href", "/workspace");
    expect(screen.getByRole("link", { name: /Open tasks/ })).toHaveAttribute("href", "/tasks");
    expect(screen.getByRole("link", { name: /Open xAPI trace/ })).toHaveAttribute("href", "/trace?task=task_eth_risk_001");
    expect(screen.getByRole("link", { name: /Open ETH report/ })).toHaveAttribute("href", "/reports/rep_eth_001");
    expect(screen.getByRole("link", { name: /Open attestation/ })).toHaveAttribute("href", "/attestation");
    expect(screen.getByRole("button", { name: "Copy demo links" })).toBeInTheDocument();
  });

  it("stores the workspace run context and navigates to running tasks", async () => {
    const user = userEvent.setup();
    render(<DashboardApp />);

    expect(screen.getByText("任务配置面板")).toBeInTheDocument();
    expect(screen.getByText("$ETH 推荐演示路径")).toBeInTheDocument();
    await user.clear(screen.getByLabelText("分析对象"));
    await user.type(screen.getByLabelText("分析对象"), "$ZEC");
    await user.selectOptions(screen.getByLabelText("Evidence window"), "7d");
    await user.click(screen.getByRole("button", { name: "Run Agent" }));

    expect(routerPush).toHaveBeenCalledWith("/tasks");
    expect(window.sessionStorage.getItem("chainpulse:last-run")).toContain("$ZEC");
    expect(window.sessionStorage.getItem("chainpulse:last-run")).toContain("7d");
  });

  it("shows global search results and opens a report result", async () => {
    const user = userEvent.setup();
    render(<DashboardApp />);

    await user.type(screen.getByLabelText("全局搜索"), "ETH");

    const searchResults = screen.getByRole("listbox");
    expect(within(searchResults).getByText("Reports")).toBeInTheDocument();
    expect(within(searchResults).getByText("Tasks")).toBeInTheDocument();
    expect(within(searchResults).getByText("xAPI Trace")).toBeInTheDocument();
    expect(within(searchResults).getByText("Watchlist")).toBeInTheDocument();
    expect(within(searchResults).getAllByText("ETH", { selector: "mark" }).length).toBeGreaterThan(0);

    await user.click(within(searchResults).getByRole("option", { name: "Report ETH Risk Baseline ETH 近期讨论热度稳定，未发现明显社交操纵信号，链上与新闻侧证据一致。 /reports/rep_eth_001" }));
    expect(routerPush).toHaveBeenCalledWith("/reports/rep_eth_001");
    expect(screen.getByLabelText("全局搜索")).toHaveValue("");
  });

  it("shows a global search empty state when no result matches", async () => {
    const user = userEvent.setup();
    render(<DashboardApp />);

    await user.type(screen.getByLabelText("全局搜索"), "not-a-chainpulse-target");

    const searchResults = screen.getByRole("listbox");
    expect(within(searchResults).getByText("没有匹配结果")).toBeInTheDocument();
    expect(within(searchResults).queryByRole("option")).not.toBeInTheDocument();
  });

  it("limits global search results to six options", async () => {
    const user = userEvent.setup();
    render(<DashboardApp />);

    await user.type(screen.getByLabelText("全局搜索"), "a");

    expect(within(screen.getByRole("listbox")).getAllByRole("option").length).toBeLessThanOrEqual(6);
  });

  it("opens the highlighted global search result from the keyboard", async () => {
    const user = userEvent.setup();
    render(<DashboardApp />);

    const searchBox = screen.getByLabelText("全局搜索");
    await user.type(searchBox, "ETH");
    await user.keyboard("{ArrowDown}{Enter}");

    expect(routerPush).toHaveBeenCalledWith("/tasks?task=task_eth_risk_001");
  });

  it("filters reports by search, verdict, risk range, and date range", async () => {
    const user = userEvent.setup();
    pathname = "/reports";
    render(<DashboardApp />);

    await user.type(screen.getByLabelText("搜索报告"), "ZEC");
    await user.selectOptions(screen.getByLabelText("结论"), "CAUTION");
    await user.clear(screen.getByLabelText("最低风险分"));
    await user.type(screen.getByLabelText("最低风险分"), "60");
    await user.click(screen.getByRole("button", { name: "自定义" }));
    await user.clear(screen.getByLabelText("开始日期"));
    await user.type(screen.getByLabelText("开始日期"), "2026-06-05");
    expect(screen.getByText("ZEC Liquidity Caution")).toBeInTheDocument();
    expect(screen.queryByText("ETH Risk Baseline")).not.toBeInTheDocument();
  });

  it("supports report date range presets and a clearable custom range", async () => {
    const user = userEvent.setup();
    pathname = "/reports";
    render(<DashboardApp />);

    await user.click(screen.getByRole("button", { name: "今天" }));
    expect(screen.getByText("Showing 2 of 4 reports")).toBeInTheDocument();
    expect(screen.getAllByText("ETH Risk Baseline").length).toBeGreaterThan(0);
    expect(screen.queryByText("Uniswap Governance Due Diligence")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "近 7 天" }));
    expect(screen.getByText("Showing 4 of 4 reports")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "自定义" }));
    await user.clear(screen.getByLabelText("开始日期"));
    await user.type(screen.getByLabelText("开始日期"), "2026-06-04");
    await user.clear(screen.getByLabelText("结束日期"));
    await user.type(screen.getByLabelText("结束日期"), "2026-06-04");

    expect(screen.getByText("Showing 1 of 4 reports")).toBeInTheDocument();
    expect(screen.getByText("Uniswap Governance Due Diligence")).toBeInTheDocument();
    expect(screen.queryByText("ETH Risk Baseline")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "清空日期" }));
    expect(screen.getByText("Showing 4 of 4 reports")).toBeInTheDocument();
    expect(screen.getByLabelText("开始日期")).toHaveValue("");
    expect(screen.getByLabelText("结束日期")).toHaveValue("");
  });

  it("hydrates report filters from URL query and clears them on reset", async () => {
    const user = userEvent.setup();
    pathname = "/reports";
    searchParamsString = "query=ZEC&verdict=CAUTION&minRisk=60";
    render(<DashboardApp />);

    expect(screen.getByLabelText("搜索报告")).toHaveValue("ZEC");
    expect(screen.getByLabelText("结论")).toHaveValue("CAUTION");
    expect(screen.getByLabelText("最低风险分")).toHaveValue(60);
    expect(screen.getByText("ZEC Liquidity Caution")).toBeInTheDocument();
    expect(screen.queryByText("ETH Risk Baseline")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "重置" }));
    expect(routerPush).toHaveBeenCalledWith("/reports");
    expect(screen.getByLabelText("搜索报告")).toHaveValue("");
  });

  it("shows refined report center scan context and audit affordances", async () => {
    const user = userEvent.setup();
    pathname = "/reports";
    searchParamsString = "query=ZEC&verdict=CAUTION&minRisk=60";
    render(<DashboardApp />);

    expect(screen.getByText("Showing 1 of 4 reports")).toBeInTheDocument();
    expect(screen.getByText("Active filters")).toBeInTheDocument();
    expect(screen.getByText("Query: ZEC")).toBeInTheDocument();
    expect(screen.getByText("Verdict: CAUTION")).toBeInTheDocument();
    expect(screen.getByText("Risk: 60-100")).toBeInTheDocument();
    expect(screen.getByText("Evidence")).toBeInTheDocument();
    expect(screen.getByText("Audit trail")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "打开 ZEC Liquidity Caution" })).toHaveAttribute("href", "/reports/rep_zec_002");
    expect(screen.getByText("1 item / top 34%")).toBeInTheDocument();
    expect(screen.getByText("hash ready")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Needs attestation" }));
    expect(routerPush).toHaveBeenCalledWith("/reports?status=%E6%9C%AA%E4%B8%8A%E9%93%BE");
  });

  it("filters attestation proof history by date, status, and query", async () => {
    const user = userEvent.setup();
    pathname = "/attestation";
    render(<DashboardApp />);

    expect(screen.getByRole("heading", { name: "Proof Receipt / 链上证明凭证" })).toBeInTheDocument();
    expect(screen.getByText("凭证摘要")).toBeInTheDocument();
    expect(screen.getByText("Why on-chain?")).toBeInTheDocument();
    expect(screen.getByText("Verify locally")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "今天" }));
    expect(screen.getByText("Showing 2 of 4 proof records")).toBeInTheDocument();
    expect(screen.getAllByText("ETH Risk Baseline").length).toBeGreaterThan(0);
    expect(screen.getByText("ZEC Liquidity Caution")).toBeInTheDocument();
    expect(screen.queryByText("SOL Alpha Momentum")).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("证明状态"), "已上链");
    expect(screen.getByText("Showing 1 of 4 proof records")).toBeInTheDocument();
    expect(screen.getAllByText("ETH Risk Baseline").length).toBeGreaterThan(0);
    expect(screen.queryByText("ZEC Liquidity Caution")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "自定义" }));
    await user.clear(screen.getByLabelText("开始日期"));
    await user.type(screen.getByLabelText("开始日期"), "2026-06-03");
    await user.clear(screen.getByLabelText("结束日期"));
    await user.type(screen.getByLabelText("结束日期"), "2026-06-03");
    expect(screen.getByText("SOL Alpha Momentum")).toBeInTheDocument();

    await user.type(screen.getByLabelText("搜索证明"), "SOL");
    expect(screen.getByText("Showing 1 of 4 proof records")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "清空日期" }));
    expect(screen.getByLabelText("开始日期")).toHaveValue("");
    expect(screen.getByLabelText("结束日期")).toHaveValue("");
  });

  it("renders report detail and handles invalid report ids", () => {
    pathname = "/reports/rep_eth_001";
    const view = render(
      <AppShell>
        <ReportDetailPage reportId="rep_eth_001" />
      </AppShell>
    );

    expect(screen.getByRole("heading", { name: "ETH Risk Baseline" })).toBeInTheDocument();
    expect(screen.getByText("Risk Score")).toBeInTheDocument();
    expect(screen.getByText("可审计报告摘要")).toBeInTheDocument();
    expect(screen.getByText("Sticky audit summary")).toBeInTheDocument();
    expect(screen.getByText("Verdict rationale")).toBeInTheDocument();
    expect(screen.getByText("Recent ETH discussion cluster")).toBeInTheDocument();
    expect(screen.getByText("Evidence -> Conclusion")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View related Trace for Recent ETH discussion cluster/ })).toHaveAttribute("href", "/trace?trace=trace_001");
    expect(screen.getByText("User Query")).toBeInTheDocument();
    expect(screen.getByText("xAPI Actions")).toBeInTheDocument();
    expect(screen.getByText("On-chain Attestation")).toBeInTheDocument();
    expect(screen.getAllByText("Report Hash").length).toBeGreaterThan(0);
    expect(screen.queryByText("Hash proof readiness")).not.toBeInTheDocument();
    view.unmount();

    render(
      <AppShell>
        <ReportDetailPage reportId="missing_report" />
      </AppShell>
    );
    expect(screen.getByText("未找到报告")).toBeInTheDocument();
  });

  it("changes xAPI trace details when selecting another trace", async () => {
    const user = userEvent.setup();
    pathname = "/trace";
    render(<DashboardApp />);

    expect(within(screen.getByTestId("trace-detail")).getByText("twitter.search_timeline")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /twitter.tweet_detail/ }));
    expect(within(screen.getByTestId("trace-detail")).getByText("twitter.tweet_detail")).toBeInTheDocument();
    expect(screen.getByText("schema fetch timeout")).toBeInTheDocument();
  });

  it("shows fallback xAPI runtime status on the trace page", async () => {
    pathname = "/trace";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          mode: "unconfigured",
          data: xapiTraces,
          trace: {
            id: "trace_test_fallback",
            action: "xapi.trace",
            capability: "xAPI",
            status: "fallback",
            input: {},
            inputHash: "0xinput",
            outputHash: "0xoutput",
            latencyMs: 1,
            timestamp: "2026-06-06T00:00:00.000Z",
            error: "no XAPI_KEY configured"
          }
        })
      )
    );

    render(<DashboardApp />);

    expect(await screen.findByText("mock fallback")).toBeInTheDocument();
    expect(screen.getByText("no XAPI_KEY")).toBeInTheDocument();
  });

  it("opens trace and headers from URL query", () => {
    pathname = "/trace";
    searchParamsString = "trace=trace_004&headers=open";
    render(<DashboardApp />);

    expect(within(screen.getByTestId("trace-detail")).getByText("twitter.tweet_detail")).toBeInTheDocument();
    expect(screen.getByText("schema fetch timeout")).toBeInTheDocument();
    expect(screen.getByText(/xapi-action/)).toBeInTheDocument();
  });

  it("filters traces from the task URL query on first render", () => {
    pathname = "/trace";
    searchParamsString = "task=task_eth_risk_001";
    render(<DashboardApp />);

    expect(within(screen.getByTestId("trace-detail")).getByText("twitter.search_timeline")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /twitter.tweet_detail/ })).not.toBeInTheDocument();
  });

  it("syncs the trace headers toggle into the URL query", async () => {
    const user = userEvent.setup();
    pathname = "/trace";
    searchParamsString = "trace=trace_004";
    render(<DashboardApp />);

    await user.click(screen.getByRole("button", { name: /Headers/ }));

    expect(routerPush).toHaveBeenCalledWith("/trace?trace=trace_004&headers=open");
  });

  it("navigates from running task to trace and keeps logs marked for auto-scroll", async () => {
    const user = userEvent.setup();
    pathname = "/tasks";
    render(<DashboardApp />);

    await user.click(screen.getByRole("button", { name: "查看 Trace" }));
    expect(routerPush).toHaveBeenCalledWith("/trace?task=task_eth_risk_001");

    const logRegion = screen.getByTestId("task-log-region");
    expect(logRegion).toHaveAttribute("data-auto-scroll", "true");
    await user.click(screen.getByRole("button", { name: "追加日志" }));
    expect(logRegion).toHaveAttribute("data-log-count", "6");
  });

  it("links workspace recent report titles to report detail pages", () => {
    render(<DashboardApp />);

    expect(screen.getByRole("link", { name: /ETH Risk Baseline/ })).toHaveAttribute("href", "/reports/rep_eth_001");
  });

  it("toggles the settings API key visibility and shows save time", async () => {
    const user = userEvent.setup();
    pathname = "/settings";
    render(<DashboardApp />);

    const apiKeyInput = screen.getByLabelText("xAPI Key");
    expect(apiKeyInput).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "显示 API Key" }));
    expect(apiKeyInput).toHaveAttribute("type", "text");
    await user.click(screen.getByRole("button", { name: "保存设置" }));
    expect(screen.getByText(/已保存 \d{2}:\d{2}:\d{2}/)).toBeInTheDocument();
  });

  it("adds a watchlist target and highlights it", async () => {
    const user = userEvent.setup();
    pathname = "/watchlist";
    render(<DashboardApp />);

    await user.click(screen.getByRole("button", { name: "添加监控目标" }));
    await user.clear(screen.getByLabelText("新监控目标"));
    await user.type(screen.getByLabelText("新监控目标"), "LINK");
    await user.click(screen.getByRole("button", { name: "添加" }));
    expect(screen.getByText("LINK")).toBeInTheDocument();
    expect(screen.getByTestId("watchlist-row-LINK")).toHaveAttribute("data-highlighted", "true");
  });

  it("hydrates a highlighted watchlist target from URL query and syncs scans", async () => {
    const user = userEvent.setup();
    pathname = "/watchlist";
    searchParamsString = "target=wl_curve";
    render(<DashboardApp />);

    const curveRow = screen.getByTestId("watchlist-row-Curve");
    expect(curveRow).toHaveAttribute("data-highlighted", "true");

    await user.click(within(curveRow).getByRole("button", { name: "扫描" }));
    expect(routerPush).toHaveBeenCalledWith("/watchlist?target=wl_curve");
  });
});
