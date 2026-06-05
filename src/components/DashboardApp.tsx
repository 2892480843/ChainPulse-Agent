"use client";

import {
  Activity,
  AlertTriangle,
  Bell,
  Check,
  CheckCircle2,
  Clock,
  Code2,
  Copy,
  Database,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Gauge,
  KeyRound,
  LayoutDashboard,
  Link2,
  Loader2,
  LogOut,
  Network,
  Play,
  Plus,
  Radio,
  RefreshCcw,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  Timer,
  User,
  Wallet,
  X,
  XCircle
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { attestation, reports, runningTasks, tokenPalette, watchlistTargets, xapiTraces } from "@/lib/mock-data";
import { filterReports, filterWatchlist } from "@/lib/filters";
import type { PageKey, Report, ReportFilters, ScanMode, TraceStatus, WatchlistFilters, WatchlistTarget } from "@/lib/types";

const navItems: Array<{ key: PageKey; label: string; icon: LucideIcon }> = [
  { key: "workspace", label: "工作台", icon: LayoutDashboard },
  { key: "tasks", label: "运行中的任务", icon: Activity },
  { key: "reports", label: "报告中心", icon: FileText },
  { key: "trace", label: "xAPI Trace", icon: Network },
  { key: "attestation", label: "链上证明", icon: ShieldCheck },
  { key: "watchlist", label: "Watchlist", icon: Eye },
  { key: "settings", label: "设置", icon: Settings }
];

const timelineSteps = ["任务解析", "xAPI 搜索", "读取 Schema", "数据采集", "证据归一化", "推理与打分", "生成报告"];

const modeOptions: Array<{ mode: ScanMode; title: string; description: string }> = [
  { mode: "Alpha Scan", title: "Alpha Scan", description: "追踪新闻、社交和价格侧的机会信号。" },
  { mode: "Risk Scan", title: "Risk Scan", description: "识别操纵传播、异常波动和证据冲突。" },
  { mode: "DAO 尽调", title: "DAO 尽调", description: "为治理提案生成可复查的投票前报告。" }
];

const cardClass = "rounded-lg border border-slate-200 bg-white shadow-sm";
const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";
const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-blue-100 active:scale-[0.98] disabled:opacity-50";
const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 active:scale-[0.98] disabled:opacity-60";

export default function DashboardApp() {
  const [activePage, setActivePage] = useState<PageKey>("workspace");
  const [toast, setToast] = useState("");
  const [copiedKey, setCopiedKey] = useState("");
  const [globalQuery, setGlobalQuery] = useState("");
  const [workspaceInput, setWorkspaceInput] = useState("$ETH");
  const [selectedMode, setSelectedMode] = useState<ScanMode>("Risk Scan");
  const [isRunning, setIsRunning] = useState(false);
  const [taskLogs, setTaskLogs] = useState(runningTasks[0].logs);
  const [autoScroll, setAutoScroll] = useState(true);
  const [reportFilters, setReportFilters] = useState<ReportFilters>({
    query: "",
    mode: "All",
    verdict: "All",
    minRisk: 0,
    maxRisk: 100
  });
  const [selectedTraceId, setSelectedTraceId] = useState(xapiTraces[0].id);
  const [watchFilters, setWatchFilters] = useState<WatchlistFilters>({
    query: "",
    category: "All",
    alertState: "All",
    sortBy: "risk-desc"
  });
  const [watchItems, setWatchItems] = useState(watchlistTargets);
  const [showAddWatch, setShowAddWatch] = useState(false);
  const [apiVisible, setApiVisible] = useState(false);
  const [savedSettings, setSavedSettings] = useState(false);

  const filteredReports = useMemo(() => filterReports(reports, reportFilters), [reportFilters]);
  const filteredWatchlist = useMemo(() => filterWatchlist(watchItems, watchFilters), [watchFilters, watchItems]);
  const selectedTrace = xapiTraces.find((trace) => trace.id === selectedTraceId) ?? xapiTraces[0];

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }

  async function copyText(text: string, label: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      // Clipboard is unavailable in some preview and test contexts; feedback still confirms intent.
    }
    setCopiedKey(label);
    notify("已复制");
    window.setTimeout(() => setCopiedKey(""), 1600);
  }

  function downloadJson(filename: string, data: unknown) {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
      notify("已下载 mock JSON");
    } catch {
      notify("已生成 mock JSON");
    }
  }

  function runAgent() {
    setIsRunning(true);
    notify("任务已创建");
    window.setTimeout(() => {
      setTaskLogs((current) => [
        ...current,
        `[${new Date().toLocaleTimeString("zh-CN", { hour12: false })}] queued mock run for ${workspaceInput || "ETH"}`
      ]);
      setIsRunning(false);
      setActivePage("tasks");
    }, 700);
  }

  function addMockWatchTarget(name: string) {
    const cleanName = name.trim() || "AAVE";
    const nextTarget: WatchlistTarget = {
      id: `wl_${cleanName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Date.now()}`,
      name: cleanName,
      symbol: cleanName.startsWith("@") ? "KOL" : cleanName.slice(0, 4).toUpperCase(),
      category: cleanName.startsWith("@") ? "KOL" : "Token",
      alertState: "Normal",
      riskScore: 35,
      alphaScore: 57,
      lastScan: "just now",
      signals24h: [24, 25, 27, 28, 31, 33, 35, 36, 35, 37]
    };
    setWatchItems((current) => [nextTarget, ...current]);
    setShowAddWatch(false);
    notify("监控目标已添加");
  }

  const page = (() => {
    switch (activePage) {
      case "tasks":
        return (
          <RunningTasksPage
            logs={taskLogs}
            autoScroll={autoScroll}
            onAppendLog={() => {
              setTaskLogs((current) => [...current, `[${new Date().toLocaleTimeString("zh-CN", { hour12: false })}] mock evidence item appended`]);
              notify("已追加 mock 日志");
            }}
            onToggleScroll={() => {
              setAutoScroll((value) => !value);
              notify(autoScroll ? "已关闭自动滚动" : "已开启自动滚动");
            }}
            onFeedback={notify}
          />
        );
      case "reports":
        return (
          <ReportCenterPage
            filters={reportFilters}
            filteredReports={filteredReports}
            onFiltersChange={setReportFilters}
            onDownload={(report) => downloadJson(`${report.topic.toLowerCase()}-report.json`, report)}
            onExportAll={() => downloadJson("chainpulse-reports.json", filteredReports)}
            onFeedback={notify}
          />
        );
      case "trace":
        return (
          <TracePage
            selectedTrace={selectedTrace}
            selectedTraceId={selectedTraceId}
            onSelectTrace={setSelectedTraceId}
            onCopy={copyText}
            copiedKey={copiedKey}
            onExport={() => downloadJson("xapi-trace.json", xapiTraces)}
          />
        );
      case "attestation":
        return <AttestationPage onCopy={copyText} copiedKey={copiedKey} onDownload={() => downloadJson("attestation-credential.json", attestation)} onFeedback={notify} />;
      case "watchlist":
        return (
          <WatchlistPage
            filters={watchFilters}
            items={filteredWatchlist}
            showAdd={showAddWatch}
            onFiltersChange={setWatchFilters}
            onAddClick={() => setShowAddWatch(true)}
            onCloseAdd={() => setShowAddWatch(false)}
            onAddTarget={addMockWatchTarget}
            onFeedback={notify}
          />
        );
      case "settings":
        return (
          <SettingsPage
            apiVisible={apiVisible}
            savedSettings={savedSettings}
            onToggleApi={() => setApiVisible((value) => !value)}
            onCopy={copyText}
            copiedKey={copiedKey}
            onSave={() => {
              setSavedSettings(true);
              notify("设置已保存");
            }}
            onFeedback={notify}
          />
        );
      default:
        return (
          <WorkspacePage
            value={workspaceInput}
            selectedMode={selectedMode}
            isRunning={isRunning}
            onValueChange={setWorkspaceInput}
            onModeChange={setSelectedMode}
            onRunAgent={runAgent}
            onQuickCase={(value) => {
              setWorkspaceInput(value);
              notify("已填充快速案例");
            }}
          />
        );
    }
  })();

  return (
    <div className="grid min-h-[100dvh] grid-cols-1 bg-slate-100 text-slate-950 lg:grid-cols-[280px_1fr]">
      <Sidebar activePage={activePage} onPageChange={setActivePage} />
      <div className="flex min-w-0 flex-col">
        <Header value={globalQuery} onChange={setGlobalQuery} />
        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1400px] animate-panel">{page}</div>
        </main>
        <Footer />
      </div>
      {toast ? <Toast message={toast} /> : null}
    </div>
  );
}

function Sidebar({ activePage, onPageChange }: { activePage: PageKey; onPageChange: (page: PageKey) => void }) {
  return (
    <aside className="border-b border-slate-200 bg-white/95 px-4 py-4 lg:min-h-[100dvh] lg:border-b-0 lg:border-r">
      <div className="flex items-center gap-3">
        <LogoMark />
        <div>
          <p className="text-sm font-semibold text-slate-950">ChainPulse Agent</p>
          <p className="text-xs text-slate-500">xAPI intelligence console</p>
        </div>
      </div>

      <nav className="thin-scrollbar mt-5 flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activePage === item.key;
          return (
            <button
              key={item.key}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => onPageChange(item.key)}
              className={clsx(
                "inline-flex min-w-max items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-4 focus:ring-blue-100 active:scale-[0.98] lg:w-full",
                active ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
              )}
            >
              <Icon aria-hidden className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <QuotaCard label="xAPI quota" value="72%" detail="14,280 / 20,000 calls" tone="blue" />
        <QuotaCard label="Agent runs" value="18/25" detail="7 runs available today" tone="green" />
      </div>

      <div className="mt-5 hidden border-t border-slate-200 pt-4 text-xs text-slate-500 lg:block">
        <a className="mr-3 hover:text-slate-800" href="#docs">
          Docs
        </a>
        <a className="mr-3 hover:text-slate-800" href="#status">
          xAPI status
        </a>
        <a className="hover:text-slate-800" href="#privacy">
          Privacy
        </a>
      </div>
    </aside>
  );
}

function Header({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <header className="border-b border-slate-200 bg-white/90 px-4 py-3 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <label className="relative min-w-0 flex-1 md:max-w-xl">
          <span className="sr-only">全局搜索</span>
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
            placeholder="搜索任务、报告、地址 / KOL..."
          />
        </label>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            系统状态：正常
          </span>
          <button className={buttonClass} type="button" aria-label="通知">
            <Bell aria-hidden className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-blue-600 text-xs font-semibold text-white">W</span>
            <div className="hidden sm:block">
              <p className="text-xs font-semibold text-slate-900">Web3 Researcher</p>
              <p className="text-[11px] text-slate-500">demo workspace</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function WorkspacePage({
  value,
  selectedMode,
  isRunning,
  onValueChange,
  onModeChange,
  onRunAgent,
  onQuickCase
}: {
  value: string;
  selectedMode: ScanMode;
  isRunning: boolean;
  onValueChange: (value: string) => void;
  onModeChange: (mode: ScanMode) => void;
  onRunAgent: () => void;
  onQuickCase: (value: string) => void;
}) {
  return (
    <section className="space-y-5">
      <PageHeading
        eyebrow="Workspace"
        title="智能分析工作台"
        description="输入 Token、合约地址、项目名、KOL 或关键词，让 Agent 用 xAPI 完成证据发现、交叉验证、评分和链上证明准备。"
      />
      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <div className={clsx(cardClass, "p-4 sm:p-5")}>
          <div className="grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">分析对象</span>
              <input className={inputClass} value={value} onChange={(event) => onValueChange(event.target.value)} placeholder="ETH、0x..., @KOL、DAO proposal..." />
            </label>
            <div className="grid gap-3 md:grid-cols-3">
              {modeOptions.map((option) => (
                <button
                  key={option.mode}
                  type="button"
                  onClick={() => onModeChange(option.mode)}
                  className={clsx(
                    "rounded-lg border p-4 text-left transition focus:outline-none focus:ring-4 focus:ring-blue-100 active:scale-[0.98]",
                    selectedMode === option.mode ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"
                  )}
                >
                  <p className="text-sm font-semibold text-slate-950">{option.title}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{option.description}</p>
                </button>
              ))}
            </div>
            <details className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                <SlidersHorizontal aria-hidden className="h-4 w-4" />
                高级筛选
              </summary>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <label className="grid gap-1 text-xs text-slate-600">
                  Evidence window
                  <select className={inputClass} defaultValue="24h">
                    <option>24h</option>
                    <option>7d</option>
                    <option>30d</option>
                  </select>
                </label>
                <label className="grid gap-1 text-xs text-slate-600">
                  Minimum confidence
                  <select className={inputClass} defaultValue="0.65">
                    <option>0.65</option>
                    <option>0.75</option>
                    <option>0.85</option>
                  </select>
                </label>
                <label className="grid gap-1 text-xs text-slate-600">
                  xAPI classes
                  <select className={inputClass} defaultValue="Twitter + Web + News + Crypto">
                    <option>Twitter + Web + News + Crypto</option>
                    <option>Web + News + AI</option>
                    <option>Crypto + AI</option>
                  </select>
                </label>
              </div>
            </details>
            <div className="flex flex-wrap gap-2">
              <button className={primaryButtonClass} type="button" onClick={onRunAgent} disabled={isRunning}>
                {isRunning ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Play aria-hidden className="h-4 w-4" />}
                Run Agent
              </button>
              {["$ETH", "$ZEC", "Uniswap DAO proposal", "@defi_mochi"].map((sample) => (
                <button key={sample} type="button" className={buttonClass} onClick={() => onQuickCase(sample)}>
                  {sample}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <StatCard icon={Gauge} label="今日风险均值" value="41" detail="低于 7d 均值 8 点" tone="green" />
          <StatCard icon={Network} label="xAPI 调用" value="184" detail="成功率 96.7%" tone="blue" />
          <StatCard icon={ShieldCheck} label="链上证明" value="12" detail="已确认 11 条" tone="orange" />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className={clsx(cardClass, "overflow-hidden")}>
          <SectionHeader title="最近报告" action="mock data" />
          <div className="thin-scrollbar overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-y border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Report</th>
                  <th className="px-4 py-3">Mode</th>
                  <th className="px-4 py-3">Risk</th>
                  <th className="px-4 py-3">Verdict</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reports.slice(0, 3).map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <TokenIcon symbol={report.topic} />
                        <div>
                          <p className="font-medium text-slate-900">{report.title}</p>
                          <p className="text-xs text-slate-500">{report.createdAt}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <ModeBadge mode={report.mode} />
                    </td>
                    <td className="px-4 py-3">
                      <ScoreBar value={report.riskScore} />
                    </td>
                    <td className="px-4 py-3">
                      <VerdictBadge verdict={report.verdict} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={report.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className={clsx(cardClass, "p-4")}>
          <h2 className="text-sm font-semibold text-slate-950">快速案例</h2>
          <div className="mt-3 grid gap-2">
            {[
              ["ETH 风险基线", "$ETH", "稳定资产热度 + 链上证明"],
              ["ZEC 流动性提醒", "$ZEC", "隐私币新闻与社交集中度"],
              ["DAO 投票尽调", "Uniswap DAO proposal", "治理提案证据包"]
            ].map(([label, query, detail]) => (
              <button key={label} className="rounded-lg border border-slate-200 p-3 text-left transition hover:border-blue-200 hover:bg-blue-50 active:scale-[0.98]" type="button" onClick={() => onQuickCase(query)}>
                <p className="text-sm font-medium text-slate-900">{label}</p>
                <p className="mt-1 text-xs text-slate-500">{detail}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function RunningTasksPage({
  logs,
  autoScroll,
  onAppendLog,
  onToggleScroll,
  onFeedback
}: {
  logs: string[];
  autoScroll: boolean;
  onAppendLog: () => void;
  onToggleScroll: () => void;
  onFeedback: (message: string) => void;
}) {
  const currentTask = runningTasks[0];

  return (
    <section className="space-y-5">
      <PageHeading eyebrow="Agent Runtime" title="运行中的任务" description="展示 Agent 从任务解析、xAPI action 发现、Schema 读取到证据归一化和报告生成的执行过程。" />
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className={clsx(cardClass, "p-4 sm:p-5")}>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <TokenIcon symbol={currentTask.topic} />
                <h2 className="text-lg font-semibold text-slate-950">{currentTask.topic} / Risk Scan</h2>
                <StatusBadge status={currentTask.status} />
              </div>
              <p className="mt-2 text-sm text-slate-500">开始时间 {currentTask.startedAt}，已运行 {currentTask.elapsed}</p>
            </div>
            <div className="flex gap-2">
              <button className={buttonClass} type="button" onClick={() => onFeedback("取消请求已发送")}>
                <X aria-hidden className="h-4 w-4" />
                取消任务
              </button>
              <button className={buttonClass} type="button" onClick={() => onFeedback("已重新排队运行")}>
                <RefreshCcw aria-hidden className="h-4 w-4" />
                重新运行
              </button>
            </div>
          </div>
          <div className="mt-5">
            <ProgressBar value={currentTask.progress} label={`${currentTask.progress}%`} />
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-7">
            {timelineSteps.map((step, index) => {
              const isDone = index < timelineSteps.indexOf(currentTask.currentStep);
              const isActive = step === currentTask.currentStep;
              return (
                <div key={step} className="relative rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <span
                    className={clsx(
                      "pulse-dot relative inline-flex h-3 w-3 rounded-full before:absolute before:inset-0 before:rounded-full after:absolute after:inset-0 after:rounded-full",
                      isActive ? "bg-blue-600 after:bg-blue-600" : isDone ? "bg-emerald-500" : "bg-slate-300"
                    )}
                  />
                  <p className={clsx("mt-2 text-xs font-medium", isActive ? "text-blue-700" : "text-slate-700")}>{step}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-950">实时执行日志</h3>
              <div className="flex gap-2">
                <button className={buttonClass} type="button" onClick={onAppendLog}>
                  <Plus aria-hidden className="h-4 w-4" />
                  追加日志
                </button>
                <button className={buttonClass} type="button" onClick={onToggleScroll}>
                  <Radio aria-hidden className="h-4 w-4" />
                  {autoScroll ? "自动滚动开" : "自动滚动关"}
                </button>
              </div>
            </div>
            <div className="thin-scrollbar max-h-64 overflow-auto rounded-lg bg-slate-950 p-4 text-xs leading-6 text-slate-100">
              {logs.map((line) => (
                <p key={line} className="mono">
                  {line}
                </p>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <StatCard icon={Timer} label="当前耗时" value={currentTask.elapsed} detail="目标小于 6 分钟" tone="blue" />
          <StatCard icon={Database} label="Evidence items" value="18" detail="4 类 xAPI 来源" tone="green" />
          <div className={clsx(cardClass, "overflow-hidden")}>
            <SectionHeader title="其他任务" action="3 tasks" />
            <div className="divide-y divide-slate-100">
              {runningTasks.slice(1).map((task) => (
                <div key={task.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-900">{task.topic}</p>
                    <StatusBadge status={task.status} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{task.mode} / {task.elapsed}</p>
                  <div className="mt-3">
                    <ProgressBar value={task.progress} label={`${task.progress}%`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ReportCenterPage({
  filters,
  filteredReports,
  onFiltersChange,
  onDownload,
  onExportAll,
  onFeedback
}: {
  filters: ReportFilters;
  filteredReports: Report[];
  onFiltersChange: (filters: ReportFilters) => void;
  onDownload: (report: Report) => void;
  onExportAll: () => void;
  onFeedback: (message: string) => void;
}) {
  return (
    <section className="space-y-5">
      <PageHeading eyebrow="Reports" title="报告中心" description="按模式、风险分、结论和关键词筛选本地 mock 报告，导出结构化 JSON 用于路演演示。" />
      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className={clsx(cardClass, "overflow-hidden")}>
          <div className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-6">
            <label className="grid gap-1 md:col-span-2">
              <span className="text-xs font-medium text-slate-600">搜索报告</span>
              <input id="report-search" className={inputClass} value={filters.query} onChange={(event) => onFiltersChange({ ...filters, query: event.target.value })} />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-slate-600">模式</span>
              <select className={inputClass} value={filters.mode} onChange={(event) => onFiltersChange({ ...filters, mode: event.target.value as ReportFilters["mode"] })}>
                <option>All</option>
                <option>Alpha Scan</option>
                <option>Risk Scan</option>
                <option>DAO 尽调</option>
              </select>
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-slate-600">结论</span>
              <select className={inputClass} value={filters.verdict} onChange={(event) => onFiltersChange({ ...filters, verdict: event.target.value as ReportFilters["verdict"] })}>
                <option>All</option>
                <option>POSITIVE</option>
                <option>OBSERVE</option>
                <option>CAUTION</option>
                <option>NEGATIVE</option>
              </select>
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-slate-600">最低风险分</span>
              <input className={inputClass} type="number" value={filters.minRisk} onChange={(event) => onFiltersChange({ ...filters, minRisk: Number(event.target.value) })} />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-slate-600">最高风险分</span>
              <input className={inputClass} type="number" value={filters.maxRisk} onChange={(event) => onFiltersChange({ ...filters, maxRisk: Number(event.target.value) })} />
            </label>
            <div className="flex flex-wrap items-end gap-2 md:col-span-6">
              <button className={buttonClass} type="button" onClick={() => onFiltersChange({ query: "", mode: "All", verdict: "All", minRisk: 0, maxRisk: 100 })}>
                重置
              </button>
              <button className={primaryButtonClass} type="button" onClick={onExportAll}>
                <Download aria-hidden className="h-4 w-4" />
                导出报告
              </button>
            </div>
          </div>
          <div className="thin-scrollbar overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Report</th>
                  <th className="px-4 py-3">Mode</th>
                  <th className="px-4 py-3">Risk</th>
                  <th className="px-4 py-3">Alpha</th>
                  <th className="px-4 py-3">Verdict</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <TokenIcon symbol={report.topic} />
                        <div>
                          <p className="font-medium text-slate-900">{report.title}</p>
                          <p className="text-xs text-slate-500">{report.summary}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <ModeBadge mode={report.mode} />
                    </td>
                    <td className="px-4 py-3">
                      <ScoreBar value={report.riskScore} />
                    </td>
                    <td className="px-4 py-3">{report.alphaScore}</td>
                    <td className="px-4 py-3">
                      <VerdictBadge verdict={report.verdict} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button className={buttonClass} type="button" aria-label={`查看 ${report.title}`} onClick={() => onFeedback("已打开报告预览")}>
                          <Eye aria-hidden className="h-4 w-4" />
                        </button>
                        <button className={buttonClass} type="button" aria-label={`下载 ${report.title}`} onClick={() => onDownload(report)}>
                          <Download aria-hidden className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredReports.length === 0 ? <EmptyState title="没有匹配报告" detail="调整关键词或风险分范围后重试。" /> : null}
          </div>
        </div>

        <aside className="space-y-4">
          <StatCard icon={FileText} label="报告总数" value={`${reports.length}`} detail="本地 mock 数据" tone="blue" />
          <DistributionCard title="结论分布" rows={[["POSITIVE", 1], ["OBSERVE", 2], ["CAUTION", 1], ["NEGATIVE", 0]]} />
          <DistributionCard title="模式分布" rows={[["Risk Scan", 2], ["Alpha Scan", 1], ["DAO 尽调", 1]]} />
          <div className={clsx(cardClass, "p-4 text-sm text-slate-600")}>
            <h2 className="mb-2 font-semibold text-slate-950">数据说明</h2>
            <p>所有报告、Hash、证据和链上字段均为 mock，用于表达 Agent workflow 与 xAPI Trace，不包含真实 API Key。</p>
          </div>
        </aside>
      </div>
    </section>
  );
}

function TracePage({
  selectedTrace,
  selectedTraceId,
  onSelectTrace,
  onCopy,
  copiedKey,
  onExport
}: {
  selectedTrace: (typeof xapiTraces)[number];
  selectedTraceId: string;
  onSelectTrace: (id: string) => void;
  onCopy: (text: string, label: string) => void;
  copiedKey: string;
  onExport: () => void;
}) {
  const successCount = xapiTraces.filter((trace) => trace.status === "success").length;
  const avgLatency = Math.round(xapiTraces.reduce((sum, trace) => sum + trace.latencyMs, 0) / xapiTraces.length);
  const uniqueCapabilities = new Set(xapiTraces.map((trace) => trace.capability)).size;

  return (
    <section className="space-y-5">
      <PageHeading eyebrow="xAPI audit" title="xAPI Trace" description="可视化展示 Agent 如何动态发现 action、读取 schema、执行调用并把 JSON 结果送入推理链。" />
      <div className="grid gap-4 md:grid-cols-5">
        <StatCard icon={Network} label="xAPI 调用总数" value={`${xapiTraces.length}`} detail="当前任务 trace" tone="blue" />
        <StatCard icon={CheckCircle2} label="成功率" value={`${Math.round((successCount / xapiTraces.length) * 100)}%`} detail={`${successCount} success`} tone="green" />
        <StatCard icon={Clock} label="平均延迟" value={`${avgLatency}ms`} detail="mock timing" tone="orange" />
        <StatCard icon={Timer} label="总耗时" value="25.1s" detail="含 retry" tone="blue" />
        <StatCard icon={Code2} label="唯一能力数" value={`${uniqueCapabilities}`} detail="Twitter / Web / Crypto" tone="green" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[390px_1fr]">
        <div className={clsx(cardClass, "overflow-hidden")}>
          <SectionHeader title="调用时间线" action="click to inspect" />
          <div className="divide-y divide-slate-100">
            {xapiTraces.map((trace) => (
              <button
                key={trace.id}
                type="button"
                onClick={() => onSelectTrace(trace.id)}
                className={clsx(
                  "w-full p-4 text-left transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-100 active:scale-[0.99]",
                  selectedTraceId === trace.id && "bg-blue-50"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="mono text-xs font-semibold text-slate-900">{trace.action}</p>
                  <TraceBadge status={trace.status} />
                </div>
                <p className="mt-2 text-xs text-slate-500">{trace.startedAt} / {trace.latencyMs}ms / schema {trace.schemaFetched ? "yes" : "no"}</p>
                <p className="mt-2 text-sm text-slate-700">{trace.outputPreview}</p>
              </button>
            ))}
          </div>
        </div>

        <div className={clsx(cardClass, "p-4 sm:p-5")} data-testid="trace-detail">
          <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="mono text-lg font-semibold text-slate-950">{selectedTrace.action}</h2>
              <p className="mt-1 text-sm text-slate-500">{selectedTrace.capability} / {selectedTrace.method} / task {selectedTrace.taskId}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className={buttonClass} type="button" onClick={() => onExport()}>
                <Download aria-hidden className="h-4 w-4" />
                导出 JSON
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <CodeBlock title="Input JSON" value={selectedTrace.input} />
            <CodeBlock title="Output JSON" value={selectedTrace.output} />
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <HashRow label="Input Hash" value={selectedTrace.inputHash} onCopy={onCopy} copiedKey={copiedKey} />
            <HashRow label="Output Hash" value={selectedTrace.outputHash} onCopy={onCopy} copiedKey={copiedKey} />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-950">Timing</h3>
              <dl className="grid gap-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Started</dt>
                  <dd className="mono text-slate-900">{selectedTrace.startedAt}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Ended</dt>
                  <dd className="mono text-slate-900">{selectedTrace.endedAt}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Latency</dt>
                  <dd className="mono text-slate-900">{selectedTrace.latencyMs}ms</dd>
                </div>
              </dl>
            </div>
            <details className="rounded-lg border border-slate-200 p-4" open>
              <summary className="cursor-pointer text-sm font-semibold text-slate-950">Headers</summary>
              <pre className="mono mt-3 overflow-auto rounded-lg bg-slate-950 p-3 text-xs leading-5 text-slate-100">{JSON.stringify(selectedTrace.headers, null, 2)}</pre>
            </details>
          </div>
        </div>
      </div>
    </section>
  );
}

function AttestationPage({
  onCopy,
  copiedKey,
  onDownload,
  onFeedback
}: {
  onCopy: (text: string, label: string) => void;
  copiedKey: string;
  onDownload: () => void;
  onFeedback: (message: string) => void;
}) {
  const steps = ["生成报告", "生成哈希", "钱包签名", "提交交易", "链上确认"];

  return (
    <section className="space-y-5">
      <PageHeading eyebrow="On-chain proof" title="链上证明" description="展示报告哈希、证据哈希、交易哈希与证明流程。链上保存摘要，不把大段报告正文伪装为已上链。" />
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className={clsx(cardClass, "p-4 sm:p-5")}>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">ETH Risk Baseline Attestation</h2>
              <p className="mt-1 text-sm text-slate-500">已上链确认 / mock Sepolia explorer</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className={buttonClass}
                type="button"
                onClick={() => {
                  window.open(`https://sepolia.etherscan.io/tx/${attestation.txHash}`, "_blank", "noopener,noreferrer");
                  onFeedback("已打开 mock explorer 链接");
                }}
              >
                <ExternalLink aria-hidden className="h-4 w-4" />
                查看区块浏览器
              </button>
              <button className={primaryButtonClass} type="button" onClick={onDownload}>
                <Download aria-hidden className="h-4 w-4" />
                下载证明凭证
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <HashRow label="Report Hash" value={attestation.reportHash} onCopy={onCopy} copiedKey={copiedKey} />
            <HashRow label="Evidence Hash" value={attestation.evidenceHash} onCopy={onCopy} copiedKey={copiedKey} />
            <HashRow label="Tx Hash" value={attestation.txHash} onCopy={onCopy} copiedKey={copiedKey} />
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-5">
            {steps.map((step, index) => (
              <div key={step} className="rounded-lg border border-slate-200 bg-slate-50 p-3" style={{ animationDelay: `${index * 90}ms` }}>
                <div className="flex items-center gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500 text-xs font-semibold text-white">
                    <Check aria-hidden className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-xs font-medium text-slate-800">{step}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <InfoPanel title="证明详情" rows={[["Wallet Address", attestation.walletAddress], ["Block", attestation.block], ["Timestamp", attestation.timestamp]]} />
            <InfoPanel title="关联报告" rows={[["Report", reports[0].title], ["Verdict", reports[0].verdict], ["Confidence", `${reports[0].confidence}`]]} />
          </div>
        </div>

        <aside className="space-y-4">
          <div className={clsx(cardClass, "p-4")}>
            <h2 className="text-sm font-semibold text-slate-950">证据包概览</h2>
            <div className="mt-3 space-y-3">
              {reports[0].evidence.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 p-3">
                  <p className="text-sm font-medium text-slate-900">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.source}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-600">{item.summary}</p>
                </div>
              ))}
            </div>
          </div>
          <div className={clsx(cardClass, "overflow-hidden")}>
            <SectionHeader title="证明历史" action="3 records" />
            <div className="divide-y divide-slate-100">
              {reports.filter((report) => report.status === "已上链").map((report) => (
                <div key={report.id} className="p-4">
                  <p className="font-medium text-slate-900">{report.title}</p>
                  <p className="mono mt-1 truncate text-xs text-slate-500">{report.reportHash}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function WatchlistPage({
  filters,
  items,
  showAdd,
  onFiltersChange,
  onAddClick,
  onCloseAdd,
  onAddTarget,
  onFeedback
}: {
  filters: WatchlistFilters;
  items: WatchlistTarget[];
  showAdd: boolean;
  onFiltersChange: (filters: WatchlistFilters) => void;
  onAddClick: () => void;
  onCloseAdd: () => void;
  onAddTarget: (name: string) => void;
  onFeedback: (message: string) => void;
}) {
  const [draftTarget, setDraftTarget] = useState("AAVE");

  return (
    <section className="space-y-5">
      <PageHeading eyebrow="Monitoring" title="Watchlist" description="管理 Token、Protocol、DAO 与 KOL 监控目标，观察 24h 信号变化和最近告警。" />
      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className={clsx(cardClass, "overflow-hidden")}>
          <div className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-5">
            <label className="grid gap-1 md:col-span-2">
              <span className="text-xs font-medium text-slate-600">搜索</span>
              <input className={inputClass} value={filters.query} onChange={(event) => onFiltersChange({ ...filters, query: event.target.value })} />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-slate-600">类别</span>
              <select className={inputClass} value={filters.category} onChange={(event) => onFiltersChange({ ...filters, category: event.target.value as WatchlistFilters["category"] })}>
                <option>All</option>
                <option>Token</option>
                <option>Protocol</option>
                <option>KOL</option>
                <option>DAO</option>
              </select>
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-slate-600">告警状态</span>
              <select className={inputClass} value={filters.alertState} onChange={(event) => onFiltersChange({ ...filters, alertState: event.target.value as WatchlistFilters["alertState"] })}>
                <option>All</option>
                <option>Normal</option>
                <option>Warning</option>
                <option>Critical</option>
              </select>
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-slate-600">排序</span>
              <select className={inputClass} value={filters.sortBy} onChange={(event) => onFiltersChange({ ...filters, sortBy: event.target.value as WatchlistFilters["sortBy"] })}>
                <option value="risk-desc">风险优先</option>
                <option value="alpha-desc">Alpha 优先</option>
                <option value="recent">最近扫描</option>
              </select>
            </label>
            <div className="flex flex-wrap items-end gap-2 md:col-span-5">
              <button className={primaryButtonClass} type="button" onClick={onAddClick}>
                <Plus aria-hidden className="h-4 w-4" />
                添加监控目标
              </button>
              <button className={buttonClass} type="button" onClick={() => onFeedback("告警设置已打开")}>
                <Bell aria-hidden className="h-4 w-4" />
                告警设置
              </button>
            </div>
          </div>

          {showAdd ? (
            <div className="border-b border-blue-100 bg-blue-50 p-4">
              <form
                className="flex flex-col gap-3 sm:flex-row sm:items-end"
                onSubmit={(event) => {
                  event.preventDefault();
                  onAddTarget(draftTarget);
                }}
              >
                <label className="grid flex-1 gap-1">
                  <span className="text-xs font-medium text-blue-900">新监控目标</span>
                  <input className={inputClass} value={draftTarget} onChange={(event) => setDraftTarget(event.target.value)} />
                </label>
                <button className={primaryButtonClass} type="submit">
                  添加
                </button>
                <button className={buttonClass} type="button" onClick={onCloseAdd}>
                  取消
                </button>
              </form>
            </div>
          ) : null}

          <div className="thin-scrollbar overflow-x-auto">
            <table className="w-full min-w-[840px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Target</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Alert</th>
                  <th className="px-4 py-3">Risk</th>
                  <th className="px-4 py-3">24h Signals</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <TokenIcon symbol={item.symbol} />
                        <div>
                          <p className="font-medium text-slate-900">{item.name}</p>
                          <p className="text-xs text-slate-500">{item.lastScan}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{item.category}</td>
                    <td className="px-4 py-3">
                      <AlertBadge state={item.alertState} />
                    </td>
                    <td className="px-4 py-3">
                      <ScoreBar value={item.riskScore} />
                    </td>
                    <td className="px-4 py-3">
                      <Sparkline values={item.signals24h} />
                    </td>
                    <td className="px-4 py-3">
                      <button className={buttonClass} type="button" onClick={() => onFeedback("已触发一次 mock 扫描")}>
                        <RefreshCcw aria-hidden className="h-4 w-4" />
                        扫描
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="space-y-4">
          <StatCard icon={Eye} label="监控目标" value={`${items.length}`} detail="当前筛选结果" tone="blue" />
          <StatCard icon={AlertTriangle} label="最近告警" value="3" detail="1 Critical / 2 Warning" tone="orange" />
          <div className={clsx(cardClass, "p-4")}>
            <h2 className="text-sm font-semibold text-slate-950">扫描任务计划</h2>
            <div className="mt-3 space-y-3 text-sm">
              <ScheduleRow title="Risk Scan" value="每 6 小时" />
              <ScheduleRow title="Alpha Scan" value="每日 09:00" />
              <ScheduleRow title="DAO 尽调" value="手动触发" />
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function SettingsPage({
  apiVisible,
  savedSettings,
  onToggleApi,
  onCopy,
  copiedKey,
  onSave,
  onFeedback
}: {
  apiVisible: boolean;
  savedSettings: boolean;
  onToggleApi: () => void;
  onCopy: (text: string, label: string) => void;
  copiedKey: string;
  onSave: () => void;
  onFeedback: (message: string) => void;
}) {
  const apiKey = "xapi_demo_8f32b9c4e1_mock_only";

  return (
    <section className="space-y-5">
      <PageHeading eyebrow="Configuration" title="设置" description="编辑账户、API、模型、链上网络、通知和安全配置。当前为本地 mock，不暴露真实 XAPI_KEY。" />
      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="grid gap-5">
          <SettingsCard title="账户信息" icon={User}>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Display name" defaultValue="Web3 Researcher" />
              <Field label="Workspace" defaultValue="ETH Beijing Demo" />
            </div>
          </SettingsCard>
          <SettingsCard title="API 与密钥" icon={KeyRound}>
            <div className="grid gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">xAPI Key</label>
                <div className="flex gap-2">
                  <input className={inputClass} readOnly value={apiVisible ? apiKey : "••••••••••••••••••••••••"} />
                  <button className={buttonClass} type="button" onClick={onToggleApi} aria-label={apiVisible ? "隐藏 API Key" : "显示 API Key"}>
                    {apiVisible ? <EyeOff aria-hidden className="h-4 w-4" /> : <Eye aria-hidden className="h-4 w-4" />}
                  </button>
                  <button className={buttonClass} type="button" onClick={() => onCopy(apiKey, "API Key")} aria-label="复制 API Key">
                    {copiedKey === "API Key" ? <Check aria-hidden className="h-4 w-4" /> : <Copy aria-hidden className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Toggle label="Server-side only" defaultChecked />
            </div>
          </SettingsCard>
          <SettingsCard title="模型设置" icon={Code2}>
            <div className="grid gap-3 md:grid-cols-3">
              <SelectField label="Reasoning model" options={["gpt-5-mini", "gpt-5", "local mock"]} />
              <SelectField label="Evidence threshold" options={["0.65", "0.75", "0.85"]} />
              <SelectField label="Report language" options={["中文", "English", "双语"]} />
            </div>
          </SettingsCard>
          <SettingsCard title="链上网络配置" icon={Wallet}>
            <div className="grid gap-3 md:grid-cols-2">
              <SelectField label="Network" options={["Sepolia", "Base Sepolia", "Local Anvil"]} />
              <Field label="Attestation contract" defaultValue="0xA11e5t...C0de" />
            </div>
          </SettingsCard>
          <SettingsCard title="通知设置" icon={Bell}>
            <div className="grid gap-3 md:grid-cols-2">
              <Toggle label="高风险报告提醒" defaultChecked />
              <Toggle label="链上确认提醒" defaultChecked />
              <Toggle label="每日扫描摘要" />
              <Toggle label="xAPI 调用失败提醒" defaultChecked />
            </div>
          </SettingsCard>
          <SettingsCard title="安全与权限" icon={Shield}>
            <div className="flex flex-wrap gap-2">
              <button className={primaryButtonClass} type="button" onClick={onSave}>
                {savedSettings ? <Check aria-hidden className="h-4 w-4" /> : null}
                保存设置
              </button>
              <button className={buttonClass} type="button" onClick={() => onFeedback("已显示 Log Out 确认（mock）")}>
                <LogOut aria-hidden className="h-4 w-4" />
                Log Out
              </button>
            </div>
          </SettingsCard>
        </div>

        <aside className="space-y-4">
          <StatCard icon={ShieldCheck} label="当前环境" value="Demo" detail="mock / fallback" tone="blue" />
          <InfoPanel title="环境概览" rows={[["xAPI", "server-side mock"], ["Wallet", "not connected"], ["Contract", "placeholder adapter"], ["Storage", "local state"]]} />
        </aside>
      </div>
    </section>
  );
}

function PageHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-blue-600">{eyebrow}</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950 md:text-3xl">{title}</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function SectionHeader({ title, action }: { title: string; action?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
      <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
      {action ? <span className="text-xs text-slate-500">{action}</span> : null}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, detail, tone }: { icon: LucideIcon; label: string; value: string; detail: string; tone: "blue" | "green" | "orange" }) {
  const color = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    orange: "bg-orange-50 text-orange-700"
  }[tone];

  return (
    <div className={clsx(cardClass, "p-4")}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{detail}</p>
        </div>
        <span className={clsx("grid h-10 w-10 place-items-center rounded-lg", color)}>
          <Icon aria-hidden className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

function QuotaCard({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: "blue" | "green" }) {
  const progress = value.includes("%") ? Number(value.replace("%", "")) : 72;
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-600">{label}</p>
        <p className={clsx("text-xs font-semibold", tone === "blue" ? "text-blue-700" : "text-emerald-700")}>{value}</p>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div className={clsx("h-full rounded-full", tone === "blue" ? "bg-blue-500" : "bg-emerald-500")} style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-2 text-[11px] text-slate-500">{detail}</p>
    </div>
  );
}

function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
        <span>Progress</span>
        <span>{label}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div className="progress-fill h-full rounded-full bg-blue-600" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function ScoreBar({ value }: { value: number }) {
  const color = value >= 70 ? "bg-red-500" : value >= 50 ? "bg-orange-500" : "bg-emerald-500";
  return (
    <div className="min-w-28">
      <div className="mb-1 flex justify-between text-xs text-slate-500">
        <span>{value}</span>
        <span>/100</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div className={clsx("h-full rounded-full", color)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function TokenIcon({ symbol }: { symbol: string }) {
  const normalized = symbol === "Uniswap" ? "UNI" : symbol === "MakerDAO" ? "MKR" : symbol === "Curve" ? "CRV" : symbol.replace("$", "").slice(0, 4).toUpperCase();
  const gradient = tokenPalette[normalized] ?? "from-slate-500 to-slate-300";
  return <span className={clsx("grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br text-[11px] font-semibold text-white shadow-sm", gradient)}>{normalized.slice(0, 3)}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "Running"
      ? "bg-blue-50 text-blue-700 ring-blue-100"
      : status === "Completed" || status === "已完成" || status === "已上链"
        ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
        : status === "未上链"
          ? "bg-orange-50 text-orange-700 ring-orange-100"
          : "bg-red-50 text-red-700 ring-red-100";
  return <span className={clsx("inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1", cls)}>{status}</span>;
}

function TraceBadge({ status }: { status: TraceStatus }) {
  const map = {
    success: ["success", "bg-emerald-50 text-emerald-700 ring-emerald-100"],
    failed: ["failed", "bg-red-50 text-red-700 ring-red-100"],
    running: ["running", "bg-blue-50 text-blue-700 ring-blue-100"]
  } as const;
  return <span className={clsx("rounded-full px-2.5 py-1 text-xs font-medium ring-1", map[status][1])}>{map[status][0]}</span>;
}

function VerdictBadge({ verdict }: { verdict: string }) {
  const cls =
    verdict === "POSITIVE"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : verdict === "OBSERVE"
        ? "bg-blue-50 text-blue-700 ring-blue-100"
        : verdict === "CAUTION"
          ? "bg-orange-50 text-orange-700 ring-orange-100"
          : "bg-red-50 text-red-700 ring-red-100";
  return <span className={clsx("rounded-full px-2.5 py-1 text-xs font-medium ring-1", cls)}>{verdict}</span>;
}

function AlertBadge({ state }: { state: WatchlistTarget["alertState"] }) {
  const cls =
    state === "Normal"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : state === "Warning"
        ? "bg-orange-50 text-orange-700 ring-orange-100"
        : "bg-red-50 text-red-700 ring-red-100";
  return <span className={clsx("rounded-full px-2.5 py-1 text-xs font-medium ring-1", cls)}>{state}</span>;
}

function ModeBadge({ mode }: { mode: ScanMode }) {
  const cls = mode === "DAO 尽调" ? "bg-purple-50 text-purple-700 ring-purple-100" : mode === "Risk Scan" ? "bg-orange-50 text-orange-700 ring-orange-100" : "bg-blue-50 text-blue-700 ring-blue-100";
  return <span className={clsx("rounded-full px-2.5 py-1 text-xs font-medium ring-1", cls)}>{mode}</span>;
}

function CodeBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-950">
        <Code2 aria-hidden className="h-4 w-4 text-slate-400" />
        {title}
      </div>
      <pre className="mono thin-scrollbar max-h-72 overflow-auto rounded-lg bg-slate-950 p-4 text-xs leading-5 text-slate-100">{JSON.stringify(value, null, 2)}</pre>
    </div>
  );
}

function HashRow({ label, value, onCopy, copiedKey }: { label: string; value: string; onCopy: (text: string, label: string) => void; copiedKey: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <button className={buttonClass} type="button" aria-label={`复制 ${label}`} onClick={() => onCopy(value, label)}>
          {copiedKey === label ? <Check aria-hidden className="h-4 w-4" /> : <Copy aria-hidden className="h-4 w-4" />}
          <span className="hidden sm:inline">{copiedKey === label ? "copied" : "copy"}</span>
        </button>
      </div>
      <p className="mono break-all text-xs text-slate-700">{value}</p>
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(max - min, 1);
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 112 + 4;
      const y = 34 - ((value - min) / range) * 26;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg className="h-10 w-32" viewBox="0 0 120 40" role="img" aria-label="24h signal sparkline">
      <polyline className="sparkline-path" points={points} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DistributionCard({ title, rows }: { title: string; rows: Array<[string, number]> }) {
  const total = Math.max(rows.reduce((sum, [, value]) => sum + value, 0), 1);
  return (
    <div className={clsx(cardClass, "p-4")}>
      <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
      <div className="mt-3 space-y-3">
        {rows.map(([label, value]) => (
          <div key={label}>
            <div className="mb-1 flex justify-between text-xs text-slate-500">
              <span>{label}</span>
              <span>{value}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-blue-500" style={{ width: `${(value / total) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoPanel({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <div className={clsx(cardClass, "p-4")}>
      <h2 className="mb-3 text-sm font-semibold text-slate-950">{title}</h2>
      <dl className="space-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="text-slate-500">{label}</dt>
            <dd className="mono truncate text-right text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ScheduleRow({ title, value }: { title: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
      <span className="text-slate-700">{title}</span>
      <span className="text-xs font-medium text-slate-500">{value}</span>
    </div>
  );
}

function SettingsCard({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className={clsx(cardClass, "p-4 sm:p-5")}>
      <div className="mb-4 flex items-center gap-2">
        <Icon aria-hidden className="h-4 w-4 text-blue-600" />
        <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Field({ label, defaultValue }: { label: string; defaultValue: string }) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <input className={inputClass} defaultValue={defaultValue} />
    </label>
  );
}

function SelectField({ label, options }: { label: string; options: string[] }) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <select className={inputClass} defaultValue={options[0]}>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function Toggle({ label, defaultChecked = false }: { label: string; defaultChecked?: boolean }) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <button type="button" className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-left transition hover:bg-slate-50 active:scale-[0.99]" onClick={() => setChecked((value) => !value)}>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <span className={clsx("relative h-6 w-11 rounded-full transition", checked ? "bg-blue-600" : "bg-slate-300")}>
        <span className={clsx("absolute top-1 h-4 w-4 rounded-full bg-white transition", checked ? "left-6" : "left-1")} />
      </span>
    </button>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="grid place-items-center p-10 text-center">
      <XCircle aria-hidden className="h-8 w-8 text-slate-300" />
      <p className="mt-3 font-medium text-slate-800">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{detail}</p>
    </div>
  );
}

function Toast({ message }: { message: string }) {
  return (
    <div role="status" className="fixed bottom-5 right-5 z-50 rounded-lg border border-slate-200 bg-slate-950 px-4 py-3 text-sm font-medium text-white shadow-lg">
      {message}
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-2">
        <span>ChainPulse Agent Demo / mock xAPI and attestation data</span>
        <span className="mono">reportHash + evidenceHash only</span>
      </div>
    </footer>
  );
}

function LogoMark() {
  return (
    <span className="grid h-10 w-10 place-items-center rounded-lg border border-blue-100 bg-blue-50">
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
        <path d="M3 12h3l2-6 4 12 3-9 2 3h4" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="19" cy="12" r="2" fill="#10b981" />
      </svg>
    </span>
  );
}
