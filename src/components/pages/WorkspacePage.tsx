"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Gauge, Loader2, Network, Play, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { reports } from "@/lib/mock-data";
import { defaultWorkspaceAdvancedFilters, modeOptions } from "@/lib/navigation";
import type { ScanMode, WorkspaceAdvancedFilters, WorkspaceRunContext } from "@/lib/types";
import { useAppActions } from "@/components/shell/AppShell";
import { ModeBadge } from "@/components/ui/ModeBadge";
import { PageHeading } from "@/components/ui/PageHeading";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TokenIcon } from "@/components/ui/TokenIcon";
import { buttonClass, cardClass, inputClass, primaryButtonClass } from "@/components/ui/styles";

const storageKey = "chainpulse:last-run";

export function WorkspacePage() {
  const router = useRouter();
  const { notify } = useAppActions();
  const [workspaceInput, setWorkspaceInput] = useState("$ETH");
  const [selectedMode, setSelectedMode] = useState<ScanMode>("Risk Scan");
  const [isRunning, setIsRunning] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<WorkspaceAdvancedFilters>(defaultWorkspaceAdvancedFilters);

  function updateAdvancedFilter<Key extends keyof WorkspaceAdvancedFilters>(key: Key, value: WorkspaceAdvancedFilters[Key]) {
    setAdvancedFilters((current) => ({ ...current, [key]: value }));
  }

  function runAgent() {
    setIsRunning(true);
    const context: WorkspaceRunContext = {
      topic: workspaceInput || "ETH",
      mode: selectedMode,
      advancedFilters,
      createdAt: new Date().toLocaleTimeString("zh-CN", { hour12: false })
    };
    window.sessionStorage.setItem(storageKey, JSON.stringify(context));
    notify("任务已创建");
    router.push("/tasks");
  }

  function fillQuickCase(value: string) {
    setWorkspaceInput(value);
    notify("已填充快速案例");
  }

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
              <input
                className={inputClass}
                name="workspace-target"
                value={workspaceInput}
                onChange={(event) => setWorkspaceInput(event.target.value)}
                placeholder="ETH、0x…、@KOL、DAO proposal…"
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <div className="grid gap-3 md:grid-cols-3">
              {modeOptions.map((option) => (
                <button
                  key={option.mode}
                  type="button"
                  onClick={() => setSelectedMode(option.mode)}
                  className={clsx(
                    "rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 active:scale-[0.98]",
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
                  <select
                    className={inputClass}
                    name="evidence-window"
                    value={advancedFilters.evidenceWindow}
                    autoComplete="off"
                    onChange={(event) => updateAdvancedFilter("evidenceWindow", event.target.value as WorkspaceAdvancedFilters["evidenceWindow"])}
                  >
                    <option>24h</option>
                    <option>7d</option>
                    <option>30d</option>
                  </select>
                </label>
                <label className="grid gap-1 text-xs text-slate-600">
                  Minimum confidence
                  <select
                    className={inputClass}
                    name="minimum-confidence"
                    value={advancedFilters.minimumConfidence}
                    autoComplete="off"
                    onChange={(event) => updateAdvancedFilter("minimumConfidence", event.target.value as WorkspaceAdvancedFilters["minimumConfidence"])}
                  >
                    <option>0.65</option>
                    <option>0.75</option>
                    <option>0.85</option>
                  </select>
                </label>
                <label className="grid gap-1 text-xs text-slate-600">
                  xAPI classes
                  <select
                    className={inputClass}
                    name="xapi-classes"
                    value={advancedFilters.xapiClasses}
                    autoComplete="off"
                    onChange={(event) => updateAdvancedFilter("xapiClasses", event.target.value as WorkspaceAdvancedFilters["xapiClasses"])}
                  >
                    <option>Twitter + Web + News + Crypto</option>
                    <option>Web + News + AI</option>
                    <option>Crypto + AI</option>
                  </select>
                </label>
              </div>
            </details>
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
              当前 mock run：{workspaceInput || "ETH"} / {selectedMode} / {advancedFilters.evidenceWindow} / confidence {advancedFilters.minimumConfidence}
            </div>
            <div className="flex flex-wrap gap-2">
              <button className={primaryButtonClass} type="button" onClick={runAgent} disabled={isRunning}>
                {isRunning ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Play aria-hidden className="h-4 w-4" />}
                Run Agent
              </button>
              {["$ETH", "$ZEC", "Uniswap DAO proposal", "@defi_mochi"].map((sample) => (
                <button key={sample} type="button" className={buttonClass} onClick={() => fillQuickCase(sample)}>
                  {sample}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-1">
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
                    <td className="px-4 py-3">{report.verdict}</td>
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
              <button key={label} className="rounded-lg border border-slate-200 p-3 text-left transition-colors hover:border-blue-200 hover:bg-blue-50 active:scale-[0.98]" type="button" onClick={() => fillQuickCase(query)}>
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
