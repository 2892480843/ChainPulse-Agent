"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { AlertTriangle, CalendarClock, Check, Download, ExternalLink, FileCheck2, Filter, Landmark, PackageCheck, ShieldCheck, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  chainAttestationClient,
  getAttestationReadiness,
  mockAttestationClient,
  prepareChainAttestation,
  readBrowserAttestationConfig,
  readAttestationConfig,
  verifyProofBundle,
  type AttestationRecord,
  type PreparedChainAttestation,
  type ProofVerificationResult
} from "@/lib/adapters/attestation-client";
import { attestation, reports } from "@/lib/mock-data";
import type { Report } from "@/lib/types";
import { useAppActions } from "@/components/shell/AppShell";
import { CopyButton } from "@/components/ui/CopyButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { HashRow } from "@/components/ui/HashRow";
import { ModeBadge } from "@/components/ui/ModeBadge";
import { PageHeading } from "@/components/ui/PageHeading";
import { ProofChain } from "@/components/ui/ProofChain";
import { buttonClass, cardClass, inputClass, primaryButtonClass, selectedButtonClass } from "@/components/ui/styles";

const proofHistoryDatePresets = [
  { key: "all", label: "全部" },
  { key: "today", label: "今天" },
  { key: "7d", label: "近 7 天" },
  { key: "30d", label: "近 30 天" },
  { key: "custom", label: "自定义" }
] as const;

type ProofHistoryDatePreset = (typeof proofHistoryDatePresets)[number]["key"];
type ProofStatusFilter = "All" | "已上链" | "待证明";

interface ProofHistoryFilters {
  query: string;
  mode: "All" | Report["mode"];
  status: ProofStatusFilter;
  startDate: string;
  endDate: string;
}

const defaultProofHistoryFilters: ProofHistoryFilters = {
  query: "",
  mode: "All",
  status: "All",
  startDate: "",
  endDate: ""
};

export function AttestationPage() {
  const { copiedKey, copyText, downloadJson, notify } = useAppActions();
  const [record, setRecord] = useState<AttestationRecord>(attestation);
  const [localVerification, setLocalVerification] = useState<ProofVerificationResult | null>(null);
  const [historyFilters, setHistoryFilterState] = useState(defaultProofHistoryFilters);
  const [datePreset, setDatePreset] = useState<ProofHistoryDatePreset>("all");
  const [config, setConfig] = useState(() => readAttestationConfig());
  const [preparedAttestation, setPreparedAttestation] = useState<PreparedChainAttestation | null>(null);
  const readiness = useMemo(() => getAttestationReadiness(config), [config]);
  const filteredProofReports = useMemo(() => filterProofHistory(reports, historyFilters), [historyFilters]);
  const chainVerified = record.onChainVerification?.status === "confirmed";
  const steps = [
    "生成报告",
    "生成哈希",
    "SignalAttestation ABI",
    readiness.canWrite ? "钱包可签名" : "等待钱包/合约",
    readiness.canWrite ? "可提交交易" : "真实交易禁用",
    chainVerified ? "链上回读已验证" : record.txHash.startsWith("0x") ? "等待链上回读" : "等待确认"
  ];

  useEffect(() => {
    let cancelled = false;
    mockAttestationClient
      .getAttestation(reports[0].id)
      .then((result) => {
        if (!cancelled) setRecord(result);
      })
      .catch(() => notify("attestation mock adapter 读取失败"));
    verifyProofBundle(reports[0], reports[0].evidence, attestation).then((result) => {
      if (!cancelled) setLocalVerification(result);
    });
    window.setTimeout(() => {
      if (!cancelled) setConfig(readBrowserAttestationConfig());
    }, 0);
    return () => {
      cancelled = true;
    };
  }, [notify]);

  useEffect(() => {
    let cancelled = false;
    prepareChainAttestation(reports[0], reports[0].evidence, config)
      .then((result) => {
        if (!cancelled) setPreparedAttestation(result);
      })
      .catch(() => {
        if (!cancelled) setPreparedAttestation(null);
      });
    return () => {
      cancelled = true;
    };
  }, [config]);

  function openExplorer() {
    if (!config.explorerBaseUrl) {
      notify("Explorer 未配置");
      return;
    }
    window.open(record.explorerTxUrl ?? `${config.explorerBaseUrl}/tx/${record.txHash}`, "_blank", "noopener,noreferrer");
    notify("已打开 explorer 链接");
  }

  async function attestOnChain() {
    const ethereum = (window as Window & { ethereum?: { request(args: { method: string; params?: unknown[] }): Promise<unknown> } }).ethereum;
    if (!ethereum) {
      notify("浏览器钱包不可用");
      return;
    }

    try {
      const accounts = (await ethereum.request({ method: "eth_requestAccounts" })) as string[];
      const walletAddress = accounts[0];
      if (!walletAddress) {
        notify("钱包未返回地址");
        return;
      }
      const nextRecord = await chainAttestationClient.attestReport(reports[0].id, walletAddress);
      setRecord(nextRecord);
      notify(nextRecord.onChainVerification?.status === "confirmed" ? "链上写入与回读验证通过" : "真实链上交易已提交，回读验证未完全匹配");
    } catch (error) {
      notify(error instanceof Error ? error.message : "真实链上交易提交失败");
    }
  }

  function setHistoryFilters(nextFilters: ProofHistoryFilters | ((currentFilters: ProofHistoryFilters) => ProofHistoryFilters), nextDatePreset = datePreset) {
    setHistoryFilterState((currentFilters) => (typeof nextFilters === "function" ? nextFilters(currentFilters) : nextFilters));
    setDatePreset(nextDatePreset);
  }

  function updateDatePreset(nextDatePreset: ProofHistoryDatePreset) {
    if (nextDatePreset === "custom") {
      setHistoryFilters((currentFilters) => currentFilters, "custom");
      return;
    }

    setHistoryFilters((currentFilters) => ({ ...currentFilters, ...getProofDateRangeForPreset(nextDatePreset) }), nextDatePreset);
  }

  function updateCustomDate(key: "startDate" | "endDate", value: string) {
    setHistoryFilters((currentFilters) => ({ ...currentFilters, [key]: value }), "custom");
  }

  function clearCustomDateRange() {
    setHistoryFilters((currentFilters) => ({ ...currentFilters, startDate: "", endDate: "" }), "custom");
  }

  return (
    <section className="space-y-5">
      <PageHeading eyebrow="On-chain proof" title="Proof Receipt / 链上证明凭证" description="把报告哈希、证据哈希和交易哈希压缩成一张可复核凭证。链上只保存摘要，不把报告正文伪装成已上链。" />

      <div className="grid gap-3 md:grid-cols-3">
        <ReadinessCard label="Live ready" active={readiness.state === "live ready"} detail={readiness.state === "live ready" ? "contract + explorer + wallet ready" : "requires contract, explorer, and browser wallet"} />
        <ReadinessCard label="Mock fallback" active={readiness.state === "mock fallback" || readiness.state === "not configured"} detail="local receipt remains explicit and reviewable" />
        <ReadinessCard label="Not configured" active={readiness.state === "not configured"} detail="no contract address means no fake on-chain write" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className={clsx(cardClass, "p-4 sm:p-5")}>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                  <FileCheck2 aria-hidden className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">凭证摘要</h2>
                  <p className="mt-1 text-xs text-slate-500">ETH Risk Baseline / {readiness.state === "live ready" ? "live-ready chain adapter" : "mock fallback receipt"}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className={buttonClass} type="button" onClick={openExplorer} disabled={!config.explorerConfigured || !record.txHash.startsWith("0x")}>
                <ExternalLink aria-hidden className="h-4 w-4" />
                Open Explorer Tx
              </button>
              <button className={primaryButtonClass} type="button" onClick={attestOnChain} disabled={!readiness.canWrite} title={readiness.canWrite ? "Open wallet transaction" : `Missing: ${readiness.missing.join(", ")}`}>
                <Wallet aria-hidden className="h-4 w-4" />
                Write real attestation
              </button>
              <button className={primaryButtonClass} type="button" onClick={() => downloadJson("attestation-receipt.json", record)}>
                <Download aria-hidden className="h-4 w-4" />
                Download Receipt JSON
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <HashRow label="Report Hash" value={record.reportHash} onCopy={copyText} copiedKey={copiedKey} />
            <HashRow label="Evidence Hash" value={record.evidenceHash} onCopy={copyText} copiedKey={copiedKey} />
            <HashRow label="Tx Hash" value={record.txHash} onCopy={copyText} copiedKey={copiedKey} />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <ReceiptFact icon={Landmark} label="Block" value={record.block} />
            <ReceiptFact icon={CalendarClock} label="Timestamp" value={record.timestamp} />
            <ReceiptFact icon={Wallet} label="Wallet" value={record.walletAddress} />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-7">
            <LocalVerifyFact label="Report Hash match" passed={Boolean(localVerification?.reportHashMatch)} value={localVerification ? (localVerification.reportHashMatch ? "match" : "mismatch") : "checking"} />
            <LocalVerifyFact label="Evidence Hash match" passed={Boolean(localVerification?.evidenceHashMatch)} value={localVerification ? (localVerification.evidenceHashMatch ? "match" : "mismatch") : "checking"} />
            <LocalVerifyFact label="Explorer configured" passed={config.explorerConfigured} value={config.explorerConfigured ? "configured" : "missing"} />
            <LocalVerifyFact label="Contract configured" passed={config.contractConfigured} value={config.contractConfigured ? "configured" : "missing"} />
            <LocalVerifyFact label="Wallet mode" passed={config.walletMode === "browser wallet detected"} value={config.walletMode} />
            <LocalVerifyFact label="ABI" passed value="SignalAttestation" />
            <LocalVerifyFact label="Calldata" passed={Boolean(preparedAttestation)} value={preparedAttestation ? shortValue(preparedAttestation.data) : "waiting"} />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <LocalVerifyFact label="Receipt + event" passed={Boolean(record.onChainVerification?.eventMatched)} value={record.onChainVerification ? (record.onChainVerification.eventMatched ? "matched" : "mismatch") : "waiting"} />
            <LocalVerifyFact label="Storage readback" passed={chainVerified} value={record.onChainVerification?.status ?? "waiting"} />
            <LocalVerifyFact label="On-chain reportId" passed={Boolean(record.reportId)} value={record.reportId ?? "waiting"} />
          </div>

          {!readiness.canWrite ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle aria-hidden className="h-4 w-4" />
                真实写链已禁用
              </div>
              <p className="mt-1 text-xs leading-5">缺少 {readiness.missing.join(", ") || "required chain readiness"}。当前只展示明确标注的 mock fallback，不伪造 live transaction。</p>
            </div>
          ) : null}

          <div className="mt-4 grid gap-2 md:grid-cols-5">
            {steps.map((step) => (
              <div key={step} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-white">
                    <Check aria-hidden className="h-3 w-3" />
                  </span>
                  <span className="text-xs font-medium text-slate-800">{step}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-950">Sepolia contract payload</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">完整 ABI 写入 report/evidence hash、topic、riskScore、alphaScore、verdict 和 metadataURI。</p>
              </div>
              <span className="w-fit rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">attest(bytes32,bytes32,string,uint8,uint8,string,string)</span>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              <PayloadFact label="Contract" value={preparedAttestation?.to ?? config.contractAddress ?? "missing"} />
              <PayloadFact label="Chain" value={preparedAttestation?.chainId ? `Sepolia ${preparedAttestation.chainId}` : "Sepolia 11155111"} />
              <PayloadFact label="Metadata URI" value={preparedAttestation?.metadataURI ?? "waiting"} />
              <PayloadFact label="Calldata" value={preparedAttestation?.data ? shortValue(preparedAttestation.data) : "waiting"} />
            </div>
          </div>
        </div>

        <aside className="grid gap-4">
          <ProofExplainer
            title="Why on-chain?"
            detail="证明报告与证据包在这个时间点已经存在，且后续没有被静默改写。DAO 或投研团队可以复核同一份哈希记录。"
            bullets={["timestamp proof", "tamper evidence", "shared review record"]}
          />
          <div className={clsx(cardClass, "p-4")}>
            <h2 className="text-sm font-semibold text-slate-950">Verify locally</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">重新计算 report JSON 与 evidence packet 的哈希，再与凭证里的 Report Hash 和 Evidence Hash 对比。</p>
            <div className="mt-3 grid gap-2">
              <ProofCheckLine label="Report JSON" passed={Boolean(localVerification?.reportHashMatch)} />
              <ProofCheckLine label="Evidence packet" passed={Boolean(localVerification?.evidenceHashMatch)} />
            </div>
            <button
              className={clsx(buttonClass, "mt-3")}
              type="button"
              onClick={() =>
                downloadJson("chainpulse-proof-bundle.json", {
                  report: reports[0],
                  evidence: reports[0].evidence,
                  reportHash: record.reportHash,
                  evidenceHash: record.evidenceHash,
                  txHash: record.txHash,
                  onChainVerification: record.onChainVerification ?? null,
                  localVerification,
                  preparedAttestation: preparedAttestation
                    ? {
                        to: preparedAttestation.to,
                        chainId: preparedAttestation.chainId,
                        metadataURI: preparedAttestation.metadataURI,
                        functionSignature: preparedAttestation.functionSignature,
                        calldata: preparedAttestation.data,
                        explorerAddressUrl: preparedAttestation.explorerAddressUrl
                      }
                    : null,
                  chainConfig: {
                    chainId: config.chainId,
                    contractAddress: config.contractAddress,
                    explorerBaseUrl: config.explorerBaseUrl,
                    readiness: readiness.state,
                    sourceVerification: "run npm run sepolia:verify with ETHERSCAN_API_KEY"
                  }
                })
              }
            >
              <Download aria-hidden className="h-4 w-4" />
              Download Proof Bundle
            </button>
          </div>
          <div className={clsx(cardClass, "p-4")}>
            <h2 className="text-sm font-semibold text-slate-950">Judge proof panel</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">10 秒检查口径：原始 report JSON 和 evidence packet 可下载；页面本地复算 SHA-256；链上只写哈希；无合约或钱包时按钮禁用并说明缺什么。</p>
            <div className="mt-3 grid gap-2 text-xs text-slate-600">
              <span>1. Hashes are recomputed locally, not typed by hand.</span>
              <span>2. Evidence links back to xAPI trace actions.</span>
              <span>3. Live write path is disabled until real config exists.</span>
            </div>
          </div>
        </aside>
      </div>

      <ProofChain
        topic={reports[0].topic}
        mode={reports[0].mode}
        actions={reports[0].evidence.map((item) => item.source.replace("xapi:", ""))}
        evidenceCount={reports[0].evidence.length}
        reportHash={record.reportHash}
        evidenceHash={record.evidenceHash}
        txHash={record.txHash}
        attested
        compact
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className={clsx(cardClass, "p-4")}>
          <div className="flex items-center gap-2">
            <PackageCheck aria-hidden className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-950">证据包概览</h2>
          </div>
          <div className="mt-3 grid gap-3">
            {reports[0].evidence.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900">{item.title}</p>
                  <span className="mono rounded-full bg-white px-2 py-1 text-[11px] text-slate-500 ring-1 ring-slate-200">{item.source}</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-600">{item.summary}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={clsx(cardClass, "overflow-hidden")}>
          <div className="border-b border-slate-200 bg-white p-4">
            <div className="flex items-start gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                <Filter aria-hidden className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-slate-950">证明历史</h2>
                <p className="mt-0.5 text-xs text-slate-500">按模式、状态、日期和关键词查看证明记录。</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-12">
              <label className="grid gap-1 lg:col-span-4">
                <span className="text-xs font-medium text-slate-600">搜索证明</span>
                <input
                  type="search"
                  name="proof-search"
                  className={inputClass}
                  value={historyFilters.query}
                  onChange={(event) => setHistoryFilters((currentFilters) => ({ ...currentFilters, query: event.target.value }))}
                  placeholder="Title, topic, hash..."
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>

              <label className="grid gap-1 lg:col-span-3">
                <span className="text-xs font-medium text-slate-600">模式</span>
                <select name="proof-mode" className={inputClass} value={historyFilters.mode} autoComplete="off" onChange={(event) => setHistoryFilters((currentFilters) => ({ ...currentFilters, mode: event.target.value as ProofHistoryFilters["mode"] }))}>
                  <option>All</option>
                  <option>Alpha Scan</option>
                  <option>Risk Scan</option>
                  <option>DAO 尽调</option>
                </select>
              </label>
              <label className="grid gap-1 lg:col-span-3">
                <span className="text-xs font-medium text-slate-600">证明状态</span>
                <select name="proof-status" className={inputClass} value={historyFilters.status} autoComplete="off" onChange={(event) => setHistoryFilters((currentFilters) => ({ ...currentFilters, status: event.target.value as ProofStatusFilter }))}>
                  <option>All</option>
                  <option>已上链</option>
                  <option>待证明</option>
                </select>
              </label>

              <fieldset className="grid gap-2 lg:col-span-12">
                <legend className="text-xs font-medium text-slate-600">证明日期范围</legend>
                <div className="flex flex-wrap items-center gap-2">
                  {proofHistoryDatePresets.map((option) => (
                    <button
                      key={option.key}
                      className={clsx(
                        "inline-flex h-9 items-center justify-center rounded-lg border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 active:scale-[0.98]",
                        datePreset === option.key ? selectedButtonClass : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50"
                      )}
                      type="button"
                      aria-pressed={datePreset === option.key}
                      onClick={() => updateDatePreset(option.key)}
                    >
                      {option.label}
                    </button>
                  ))}
                  {datePreset !== "custom" ? <span className="text-xs text-slate-500">{formatProofDateRangeHint(historyFilters)}</span> : null}
                </div>
                {datePreset === "custom" ? (
                  <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
                    <label className="grid gap-1">
                      <span className="text-xs font-medium text-slate-600">开始日期</span>
                      <input className={inputClass} name="proof-start-date" type="date" value={historyFilters.startDate} autoComplete="off" onChange={(event) => updateCustomDate("startDate", event.target.value)} />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs font-medium text-slate-600">结束日期</span>
                      <input className={inputClass} name="proof-end-date" type="date" value={historyFilters.endDate} autoComplete="off" onChange={(event) => updateCustomDate("endDate", event.target.value)} />
                    </label>
                    <button className={buttonClass} type="button" onClick={clearCustomDateRange}>
                      清空日期
                    </button>
                  </div>
                ) : null}
              </fieldset>

              <span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 lg:col-span-12">
                Showing {filteredProofReports.length} of {reports.length} proof records
              </span>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredProofReports.map((report) => (
              <ProofHistoryRow key={report.id} report={report} txHash={record.txHash} copiedKey={copiedKey} copyText={copyText} />
            ))}
          </div>
          {filteredProofReports.length === 0 ? <EmptyState title="没有匹配证明" detail="调整关键词、日期、模式或证明状态后重试。" /> : null}
        </div>
      </div>
    </section>
  );
}

function ReceiptFact({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <Icon aria-hidden className="h-4 w-4 text-slate-400" />
        {label}
      </div>
      <p className="mono mt-2 min-w-0 truncate text-sm text-slate-900" spellCheck={false}>
        {value}
      </p>
    </div>
  );
}

function PayloadFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2">
      <p className="text-[11px] font-semibold uppercase text-slate-500">{label}</p>
      <p className="mono mt-1 truncate text-xs text-slate-800" spellCheck={false}>
        {value}
      </p>
    </div>
  );
}

function ReadinessCard({ label, active, detail }: { label: string; active: boolean; detail: string }) {
  return (
    <div className={clsx("rounded-lg border p-3", active ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white")}>
      <p className={clsx("text-sm font-semibold", active ? "text-emerald-800" : "text-slate-900")}>{label}</p>
      <p className="mt-1 text-xs leading-5 text-slate-600">{detail}</p>
    </div>
  );
}

function LocalVerifyFact({ label, value, passed }: { label: string; value: string; passed: boolean }) {
  return (
    <div className={clsx("rounded-lg border p-3", passed ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50")}>
      <p className={clsx("text-xs font-semibold uppercase", passed ? "text-emerald-700" : "text-amber-700")}>{label}</p>
      <p className="mt-2 text-xs font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function ProofCheckLine({ label, passed }: { label: string; passed: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <span className={clsx("rounded-full px-2 py-1 text-[11px] font-semibold ring-1", passed ? "bg-emerald-50 text-emerald-700 ring-emerald-100" : "bg-amber-50 text-amber-700 ring-amber-100")}>{passed ? "match" : "checking"}</span>
    </div>
  );
}

function ProofExplainer({ title, detail, bullets }: { title: string; detail: string; bullets: string[] }) {
  return (
    <div className={clsx(cardClass, "p-4")}>
      <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {bullets.map((item) => (
          <span key={item} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function ProofHistoryRow({
  report,
  txHash,
  copiedKey,
  copyText
}: {
  report: Report;
  txHash: string;
  copiedKey: string;
  copyText: (text: string, label: string) => Promise<void>;
}) {
  const proofStatus = getProofStatus(report);
  const txValue = proofStatus === "已上链" ? txHash : "pending";

  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900">{report.title}</p>
          <p className="mt-1 text-xs text-slate-500">
            {report.topic} / {report.createdAt}
          </p>
        </div>
        <ProofStatusBadge status={proofStatus} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <ModeBadge mode={report.mode} />
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">Risk {report.riskScore}</span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">Alpha {report.alphaScore}</span>
      </div>

      <div className="mt-3 grid gap-2">
        <ProofHashLine label={`${report.title} Report Hash`} value={report.reportHash} copiedKey={copiedKey} copyText={copyText} />
        <ProofHashLine label={`${report.title} Evidence Hash`} value={report.evidenceHash} copiedKey={copiedKey} copyText={copyText} />
        <ProofHashLine label={`${report.title} Tx Hash`} value={txValue} copiedKey={copiedKey} copyText={copyText} disabled={txValue === "pending"} />
      </div>
    </div>
  );
}

function ProofHashLine({
  label,
  value,
  copiedKey,
  copyText,
  disabled = false
}: {
  label: string;
  value: string;
  copiedKey: string;
  copyText: (text: string, label: string) => Promise<void>;
  disabled?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2">
      <p className="mono min-w-0 truncate text-xs text-slate-500" spellCheck={false}>
        {shortValue(value)}
      </p>
      <CopyButton label={label} copied={copiedKey === label} onClick={() => copyText(value, label)} disabled={disabled} />
    </div>
  );
}

function ProofStatusBadge({ status }: { status: Exclude<ProofStatusFilter, "All"> }) {
  const attested = status === "已上链";

  return (
    <span className={clsx("inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1", attested ? "bg-emerald-50 text-emerald-700 ring-emerald-100" : "bg-orange-50 text-orange-700 ring-orange-100")}>
      {attested ? <ShieldCheck aria-hidden className="h-3.5 w-3.5" /> : <AlertTriangle aria-hidden className="h-3.5 w-3.5" />}
      {status}
    </span>
  );
}

function filterProofHistory(items: Report[], filters: ProofHistoryFilters) {
  const query = filters.query.trim().toLowerCase();

  return items.filter((report) => {
    const reportDate = report.createdAt.slice(0, 10);
    const proofStatus = getProofStatus(report);
    const matchesQuery = query
      ? [report.title, report.topic, report.summary, report.reportHash, report.evidenceHash].some((value) => value.toLowerCase().includes(query))
      : true;
    const matchesMode = filters.mode === "All" || report.mode === filters.mode;
    const matchesStatus = filters.status === "All" || proofStatus === filters.status;
    const matchesStart = !filters.startDate || reportDate >= filters.startDate;
    const matchesEnd = !filters.endDate || reportDate <= filters.endDate;

    return matchesQuery && matchesMode && matchesStatus && matchesStart && matchesEnd;
  });
}

function getProofStatus(report: Report): Exclude<ProofStatusFilter, "All"> {
  return report.status === "已上链" ? "已上链" : "待证明";
}

function getProofDateRangeForPreset(preset: Exclude<ProofHistoryDatePreset, "custom">): Pick<ProofHistoryFilters, "startDate" | "endDate"> {
  if (preset === "all") return { startDate: "", endDate: "" };

  const anchorDate = getLatestReportDate(reports);
  if (preset === "today") return { startDate: anchorDate, endDate: anchorDate };

  return {
    startDate: shiftDate(anchorDate, preset === "7d" ? -6 : -29),
    endDate: anchorDate
  };
}

function formatProofDateRangeHint(filters: ProofHistoryFilters) {
  if (!filters.startDate && !filters.endDate) return "当前显示全部日期";
  return `当前范围：${filters.startDate || "不限"} 至 ${filters.endDate || "不限"}`;
}

function getLatestReportDate(items: Report[]) {
  return items.reduce((latest, report) => {
    const reportDate = report.createdAt.slice(0, 10);
    return reportDate > latest ? reportDate : latest;
  }, items[0]?.createdAt.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
}

function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function shortValue(value: string) {
  if (value === "pending") return value;
  return `${value.slice(0, 10)}...${value.slice(-8)}`;
}
