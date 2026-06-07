import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
  }),
  redirect: (url: string) => { routerPush(url); }
}));

afterEach(() => {
  pathname = "/workspace";
  searchParamsString = "";
  routerPush.mockReset();
  vi.restoreAllMocks();
  window.sessionStorage.clear();
  if (typeof window.localStorage.clear === "function") window.localStorage.clear();
  delete (window as Window & { ethereum?: unknown }).ethereum;
});

describe("ChainPulse dashboard", () => {
  beforeEach(() => {
    mockConnectedWallet();
  });

  async function renderConnected(ui = <DashboardApp />) {
    const view = render(ui);
    // Accept either language since the default changed to Chinese
    await screen.findByRole("button", { name: /Wallet connected|钱包已连接/i });
    return view;
  }

  it("renders every app route entry with the expected page title", async () => {
    const routes = [
      ["/workspace", WorkspaceRoute, "运行真实 Agent"],
      ["/tasks", TasksRoute, "智能体运行"],
      ["/reports", ReportsRoute, "报告中心"],
      ["/trace", TraceRoute, "AI / Tool Trace"],
      ["/attestation", AttestationRoute, "用户钱包上链证明"],
      ["/watchlist", WatchlistRoute, "监控列表"],
      ["/settings", SettingsRoute, "设置"]
    ] as const;

    for (const [routePath, RouteComponent, heading] of routes) {
      pathname = routePath;
      const view = await renderConnected(<RouteComponent />);
      expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
      view.unmount();
    }
  });

  it("renders desktop sidebar links with the current route highlighted", async () => {
    await renderConnected();

    expect(screen.getByRole("complementary", { name: "Primary navigation" })).toHaveClass("sticky", "top-0", "h-[100dvh]", "overflow-y-auto");
    expect(screen.getByRole("link", { name: "Workspace" })).toHaveAttribute("href", "/workspace");
    expect(screen.getByRole("link", { name: "Review Console" })).toHaveAttribute("href", "/demo");
    expect(screen.getByRole("link", { name: "Agent Runs" })).toHaveAttribute("href", "/tasks");
    expect(screen.getByRole("link", { name: "Reports" })).toHaveAttribute("href", "/reports");
    expect(screen.getByRole("link", { name: "Audit Trace" })).toHaveAttribute("href", "/trace");
    expect(screen.getByRole("link", { name: "Proofs" })).toHaveAttribute("href", "/attestation");
    expect(screen.getByRole("link", { name: "Watchlist" })).toHaveAttribute("href", "/watchlist");
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/settings");
    expect(screen.getByRole("link", { name: "Workspace" })).toHaveAttribute("aria-current", "page");
  });

  it("switches primary navigation between Chinese and English", async () => {
    const user = userEvent.setup();
    await renderConnected();

    // Default language is now Chinese
    expect(screen.getByRole("link", { name: "工作台" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "切换语言" }));

    expect(screen.getByRole("link", { name: "Workspace" })).toHaveAttribute("href", "/workspace");
    expect(screen.getByRole("button", { name: "Switch language" })).toHaveTextContent("中文");
  });

  it("renders the demo flow with the expected route CTAs", async () => {
    pathname = "/demo";
    await renderConnected();

    expect(screen.getByRole("heading", { name: "Operator Runbook" })).toBeInTheDocument();
    expect(screen.getByText("Proof Chain Summary")).toBeInTheDocument();
    expect(screen.getByText("Audit review checklist")).toBeInTheDocument();
    expect(screen.getByText("Release acceptance checklist")).toBeInTheDocument();
    expect(screen.getByText("Agent workflow")).toBeInTheDocument();
    expect(screen.getByText("xAPI integration")).toBeInTheDocument();
    expect(screen.getByText("Local hash verification")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open workspace/ })).toHaveAttribute("href", "/workspace");
    expect(screen.getByRole("link", { name: /Open tasks/ })).toHaveAttribute("href", "/tasks");
    expect(screen.getByRole("link", { name: /Open audit trace/ })).toHaveAttribute("href", "/trace?task=task_eth_risk_001");
    expect(screen.getByRole("link", { name: /Open ETH report/ })).toHaveAttribute("href", "/reports/rep_eth_001");
    expect(screen.getByRole("link", { name: /Open attestation/ })).toHaveAttribute("href", "/attestation");
    expect(screen.getByRole("button", { name: "Copy runbook links" })).toBeInTheDocument();
  });

  it("stores the workspace run context and navigates to running tasks", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline in test"));
    await renderConnected();

    expect(screen.getByText("Run configuration")).toBeInTheDocument();
    expect(screen.getByText("$ETH baseline")).toBeInTheDocument();
    expect(screen.getByText("Run Agent executes AI plan -> evidence tools -> AI report writer -> hash audit")).toBeInTheDocument();
    await user.clear(screen.getByLabelText("Investigation target"));
    await user.type(screen.getByLabelText("Investigation target"), "$ZEC");
    await user.selectOptions(screen.getByLabelText("Evidence window"), "7d");
    await user.click(screen.getByRole("button", { name: "Run Agent" }));

    expect((await screen.findAllByText("Fallback audit")).length).toBeGreaterThan(0);
    expect(routerPush).toHaveBeenCalledWith(expect.stringMatching(/^\/tasks\?task=cp-run-/));
    expect(window.sessionStorage.getItem("chainpulse:last-run")).toContain("$ZEC");
    expect(window.sessionStorage.getItem("chainpulse:last-run")).toContain("7d");
    expect(window.sessionStorage.getItem("chainpulse:last-run")).toContain("mock fallback");
    expect(window.sessionStorage.getItem("chainpulse:last-run-traces")).toContain("schema-first");
  });

  it("shows global search results and opens a report result", async () => {
    const user = userEvent.setup();
    await renderConnected();

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
    await renderConnected();

    await user.type(screen.getByLabelText("全局搜索"), "not-a-chainpulse-target");

    const searchResults = screen.getByRole("listbox");
    expect(within(searchResults).getByText("没有匹配结果")).toBeInTheDocument();
    expect(within(searchResults).queryByRole("option")).not.toBeInTheDocument();
  });

  it("limits global search results to six options", async () => {
    const user = userEvent.setup();
    await renderConnected();

    await user.type(screen.getByLabelText("全局搜索"), "a");

    expect(within(screen.getByRole("listbox")).getAllByRole("option").length).toBeLessThanOrEqual(6);
  });

  it("opens the highlighted global search result from the keyboard", async () => {
    const user = userEvent.setup();
    await renderConnected();

    const searchBox = screen.getByLabelText("全局搜索");
    await user.type(searchBox, "ETH");
    await user.keyboard("{ArrowDown}{Enter}");

    expect(routerPush).toHaveBeenCalledWith("/tasks?task=task_eth_risk_001");
  });

  it("filters reports by search, verdict, risk range, and date range", async () => {
    const user = userEvent.setup();
    pathname = "/reports";
    await renderConnected();

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
    await renderConnected();

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
    await renderConnected();

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
    await renderConnected();

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

  it("locks app operations until a wallet is connected", async () => {
    delete (window as Window & { ethereum?: unknown }).ethereum;
    pathname = "/attestation";
    render(<DashboardApp />);

    expect(screen.getByRole("heading", { name: "Connect your wallet first" })).toBeInTheDocument();
    expect(await screen.findByText("Browser wallet missing")).toBeInTheDocument();
    expect(screen.getByText("Connect wallet to unlock proof actions")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Connect wallet" }).length).toBeGreaterThan(0);
    expect(screen.queryByText("Receipt summary")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Report")).not.toBeInTheDocument();
  });

  it("filters attestation proof history by date, status, and query", async () => {
    const user = userEvent.setup();
    pathname = "/attestation";
    mockConnectedWallet();
    await renderConnected();

    expect(screen.getByRole("heading", { name: "Proof Receipts" })).toBeInTheDocument();
    expect(await screen.findByText("Receipt summary")).toBeInTheDocument();
    expect(screen.getByText("Wallet status")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Connected wallet" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Write with connected wallet" })).toBeDisabled();
    expect(screen.getByText("Why on-chain?")).toBeInTheDocument();
    expect(screen.getByText("Verify locally")).toBeInTheDocument();
    expect(screen.getByText("Proof review panel")).toBeInTheDocument();
    expect(await screen.findByText("Report Hash match")).toBeInTheDocument();
    expect(screen.getByText("Evidence Hash match")).toBeInTheDocument();
    expect(screen.getByText("Contract configured")).toBeInTheDocument();
    expect(screen.getByText("Wallet mode")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Today" }));
    expect(screen.getByText("Showing 2 of 4 proof records")).toBeInTheDocument();
    expect(screen.getAllByText("ETH Risk Baseline").length).toBeGreaterThan(0);
    expect(screen.getByText("ZEC Liquidity Caution")).toBeInTheDocument();
    expect(screen.queryByText("SOL Alpha Momentum")).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Proof status"), "Attested");
    expect(screen.getByText("Showing 1 of 4 proof records")).toBeInTheDocument();
    expect(screen.getAllByText("ETH Risk Baseline").length).toBeGreaterThan(0);
    expect(screen.queryByText("ZEC Liquidity Caution")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Custom" }));
    await user.clear(screen.getByLabelText("Start date"));
    await user.type(screen.getByLabelText("Start date"), "2026-06-03");
    await user.clear(screen.getByLabelText("End date"));
    await user.type(screen.getByLabelText("End date"), "2026-06-03");
    expect(screen.getByText("SOL Alpha Momentum")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Search proofs"), "SOL");
    expect(screen.getByText("Showing 1 of 4 proof records")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear dates" }));
    expect(screen.getByLabelText("Start date")).toHaveValue("");
    expect(screen.getByLabelText("End date")).toHaveValue("");
  });

  it("renders report detail and handles invalid report ids", async () => {
    pathname = "/reports/rep_eth_001";
    const view = await renderConnected(
      <AppShell>
        <ReportDetailPage reportId="rep_eth_001" />
      </AppShell>
    );

    expect(screen.getByRole("heading", { name: "ETH Risk Baseline" })).toBeInTheDocument();
    expect(screen.getByText("Risk Score")).toBeInTheDocument();
    expect(screen.getByText("Auditable report summary")).toBeInTheDocument();
    expect(screen.getByText("Sticky audit summary")).toBeInTheDocument();
    expect(screen.getByText("Verify evidence chain")).toBeInTheDocument();
    expect(screen.getByText("Verdict rationale")).toBeInTheDocument();
    expect(screen.getByText("Recent ETH discussion cluster")).toBeInTheDocument();
    expect(screen.getByText("Evidence -> Conclusion")).toBeInTheDocument();
    expect(screen.getByText("Source action")).toBeInTheDocument();
    expect(screen.getByText("Contribution")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View related Trace for Recent ETH discussion cluster/ })).toHaveAttribute("href", "/trace?trace=trace_001");
    expect(screen.getByText("User Query")).toBeInTheDocument();
    expect(screen.getByText("xAPI Actions")).toBeInTheDocument();
    expect(screen.getByText("On-chain Attestation")).toBeInTheDocument();
    expect(screen.getAllByText("Report Hash").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Open wallet attestation" })).toHaveAttribute("href", "/attestation?report=rep_eth_001");
    expect(screen.queryByText("Hash proof readiness")).not.toBeInTheDocument();
    view.unmount();

    await renderConnected(
      <AppShell>
        <ReportDetailPage reportId="missing_report" />
      </AppShell>
    );
    expect(screen.getByText("No report record found")).toBeInTheDocument();
  });

  it("changes xAPI trace details when selecting another trace", async () => {
    const user = userEvent.setup();
    pathname = "/trace";
    await renderConnected();

    expect(within(screen.getByTestId("trace-detail")).getByText("twitter.search_timeline")).toBeInTheDocument();
    expect(screen.getByText("schema-first call")).toBeInTheDocument();
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

    expect(await screen.findByText("Fallback audit")).toBeInTheDocument();
    expect(screen.getByText("no XAPI_KEY")).toBeInTheDocument();
  });

  it("opens trace and headers from URL query", async () => {
    pathname = "/trace";
    searchParamsString = "trace=trace_004&headers=open";
    await renderConnected();

    expect(within(screen.getByTestId("trace-detail")).getByText("twitter.tweet_detail")).toBeInTheDocument();
    expect(screen.getByText("schema fetch timeout")).toBeInTheDocument();
    expect(screen.getByText(/xapi-action/)).toBeInTheDocument();
  });

  it("filters traces from the task URL query on first render", async () => {
    pathname = "/trace";
    searchParamsString = "task=task_eth_risk_001";
    await renderConnected();

    expect(within(screen.getByTestId("trace-detail")).getByText("twitter.search_timeline")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /twitter.tweet_detail/ })).not.toBeInTheDocument();
  });

  it("syncs the trace headers toggle into the URL query", async () => {
    const user = userEvent.setup();
    pathname = "/trace";
    searchParamsString = "trace=trace_004";
    await renderConnected();

    await user.click(screen.getByRole("button", { name: /Headers/ }));

    expect(routerPush).toHaveBeenCalledWith("/trace?trace=trace_004&headers=open");
  });

  it("navigates from running task to trace and keeps logs marked for auto-scroll", async () => {
    const user = userEvent.setup();
    pathname = "/tasks";
    await renderConnected();

    await user.click(screen.getByRole("button", { name: "View Trace" }));
    expect(routerPush).toHaveBeenCalledWith("/trace?task=task_eth_risk_001");

    const logRegion = screen.getByTestId("task-log-region");
    expect(logRegion).toHaveAttribute("data-auto-scroll", "true");
    await user.click(screen.getByRole("button", { name: "Add log" }));
    expect(logRegion).toHaveAttribute("data-log-count", "6");
  });

  it("links workspace recent report titles to report detail pages", async () => {
    await renderConnected();

    expect(screen.getByRole("link", { name: /ETH Risk Baseline/ })).toHaveAttribute("href", "/reports/rep_eth_001");
  });

  it("toggles the settings API key visibility and shows save time", async () => {
    const user = userEvent.setup();
    pathname = "/settings";
    await renderConnected();

    const apiKeyInput = screen.getByLabelText("xAPI Key");
    expect(apiKeyInput).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "Show API Key" }));
    expect(apiKeyInput).toHaveAttribute("type", "text");
    await user.click(screen.getByRole("button", { name: "Save settings" }));
    expect(screen.getByText(/Saved at \d{2}:\d{2}:\d{2}/)).toBeInTheDocument();
  });

  function mockConnectedWallet() {
    Object.defineProperty(window, "ethereum", {
      configurable: true,
      value: {
        chainId: "0xaa36a7",
        selectedAddress: "0x0000000000000000000000000000000000000002",
        request: vi.fn(async ({ method }: { method: string }) => {
          if (method === "eth_accounts" || method === "eth_requestAccounts") return ["0x0000000000000000000000000000000000000002"];
          if (method === "eth_chainId") return "0xaa36a7";
          return null;
        }),
        on: vi.fn(),
        removeListener: vi.fn()
      }
    });
  }

  it("opens an operator session from settings without keeping the token visible", async () => {
    const user = userEvent.setup();
    pathname = "/settings";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes("/api/ai/health")) {
        return new Response(
          JSON.stringify({
            ok: true,
            data: {
              provider: "openai",
              model: "gpt-4.1-mini",
              baseUrl: "https://api.openai.com/v1",
              enabled: true,
              configured: false,
              mode: "disabled"
            }
          })
        );
      }
      if (url.includes("/api/operator/session") && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            ok: true,
            data: {
              configured: true,
              authenticated: true,
              mode: "authenticated"
            }
          })
        );
      }
      if (url.includes("/api/operator/session")) {
        return new Response(
          JSON.stringify({
            ok: true,
            data: {
              configured: true,
              authenticated: false,
              mode: "locked"
            }
          })
        );
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    await renderConnected();

    expect(await screen.findByText("Locked")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Operator token"), "test-operator-token");
    await user.click(screen.getByRole("button", { name: "Open operator session" }));

    expect(await screen.findByText("Authenticated")).toBeInTheDocument();
    expect(screen.getByLabelText("Operator token")).toHaveValue("");
    expect(screen.queryByDisplayValue("test-operator-token")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/operator/session",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin"
      })
    );
  });

  it("adds a watchlist target and highlights it", async () => {
    const user = userEvent.setup();
    pathname = "/watchlist";
    await renderConnected();

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
    await renderConnected();

    const curveRow = screen.getByTestId("watchlist-row-Curve");
    expect(curveRow).toHaveAttribute("data-highlighted", "true");

    await user.click(within(curveRow).getByRole("button", { name: "扫描" }));
    expect(routerPush).toHaveBeenCalledWith("/watchlist?target=wl_curve");
  });
});
