"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { AlertTriangle, CheckCircle2, Download, ExternalLink, FileCheck2, Loader2, Wallet } from "lucide-react";
import {
  attestReportOnChain,
  getAttestationReadiness,
  prepareChainAttestation,
  readBrowserAttestationConfig,
  readAttestationConfig,
  verifyProofBundle,
  type AttestationRecord,
  type PreparedChainAttestation,
  type ProofVerificationResult
} from "@/lib/adapters/attestation-client";
import { fetchStoredReports, saveReportAttestationRecord } from "@/lib/adapters/agent-data-client";
import { shortAddress, type WalletConnection } from "@/lib/adapters/wallet-client";
import type { Report, ReportAttestation } from "@/lib/types";
import { useAppActions } from "@/components/shell/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { HashRow } from "@/components/ui/HashRow";
import { ModeBadge } from "@/components/ui/ModeBadge";
import { PageHeading } from "@/components/ui/PageHeading";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TokenIcon } from "@/components/ui/TokenIcon";
import { buttonClass, cardClass, inputClass, primaryButtonClass } from "@/components/ui/styles";

type AttestationPhase = "idle" | "submitting" | "saving" | "saved" | "failed";
type BackendSyncState = "pending" | "synced" | "failed";

export function AttestationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { connectWallet, copiedKey, copyText, downloadJson, language, notify, walletConnected, walletConnection } = useAppActions();
  const copy = attestationCopy[language];
  const [reportItems, setReportItems] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [record, setRecord] = useState<AttestationRecord | null>(null);
  const [localVerification, setLocalVerification] = useState<ProofVerificationResult | null>(null);
  const [config, setConfig] = useState(() => readAttestationConfig());
  const [preparedAttestation, setPreparedAttestation] = useState<PreparedChainAttestation | null>(null);
  const [attestationPhase, setAttestationPhase] = useState<AttestationPhase>("idle");
  const [backendSyncState, setBackendSyncState] = useState<BackendSyncState>("pending");

  const readiness = useMemo(() => getAttestationReadiness(config), [config]);
  const selectedReportId = searchParams.get("report");
  const selectedReport = useMemo(() => reportItems.find((report) => report.id === selectedReportId) ?? reportItems[0] ?? null, [reportItems, selectedReportId]);
  const isAttesting = attestationPhase === "submitting" || attestationPhase === "saving";
  const canWriteWithWallet = Boolean(selectedReport) && readiness.canWrite && walletConnected && !isAttesting;
  const walletStatusLabel = getWalletStatusLabel(walletConnection, copy);
  const selectedAttestation = selectedReport?.attestation ? recordFromReport(selectedReport) : null;
  const activeRecord = record ?? selectedAttestation;
  const chainVerified = activeRecord?.onChainVerification?.status === "confirmed" || selectedReport?.attestation?.onChainStatus === "confirmed";

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    fetchStoredReports()
      .then((items) => {
        if (!cancelled) setReportItems(items);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setReportItems([]);
          setLoadError(error instanceof Error ? error.message : copy.loadFailed);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [copy.loadFailed]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setConfig(readBrowserAttestationConfig());
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [walletConnection.chainId, walletConnection.status]);

  useEffect(() => {
    let cancelled = false;
    setPreparedAttestation(null);
    setLocalVerification(null);
    setRecord(selectedReport ? recordFromReport(selectedReport) : null);
    setBackendSyncState(selectedReport?.attestation ? "synced" : "pending");

    if (!selectedReport) return () => {
      cancelled = true;
    };

    verifyProofBundle(selectedReport, selectedReport.evidence, {
      reportHash: selectedReport.attestation?.reportHash ?? selectedReport.reportHash,
      evidenceHash: selectedReport.attestation?.evidenceHash ?? selectedReport.evidenceHash
    }).then((result) => {
      if (!cancelled) setLocalVerification(result);
    });

    prepareChainAttestation(selectedReport, selectedReport.evidence, config)
      .then((result) => {
        if (!cancelled) setPreparedAttestation(result);
      })
      .catch(() => {
        if (!cancelled) setPreparedAttestation(null);
      });

    return () => {
      cancelled = true;
    };
  }, [config, selectedReport]);

  function changeReport(reportId: string) {
    router.push(`/attestation?report=${encodeURIComponent(reportId)}`);
  }

  function openExplorer() {
    if (!activeRecord?.txHash?.startsWith("0x") || !config.explorerBaseUrl) {
      notify(copy.explorerMissing);
      return;
    }
    window.open(activeRecord.explorerTxUrl ?? `${config.explorerBaseUrl}/tx/${activeRecord.txHash}`, "_blank", "noopener,noreferrer");
  }

  async function attestOnChain() {
    if (!selectedReport) return;
    const activeWallet = walletConnection.status === "connected" ? walletConnection : await connectWallet();
    if (activeWallet.status !== "connected") return;

    try {
      setAttestationPhase("submitting");
      setBackendSyncState("pending");
      const nextRecord = await attestReportOnChain(selectedReport, activeWallet.address);
      setRecord(nextRecord);
      setAttestationPhase("saving");

      const savedReport = await saveReportAttestationRecord(selectedReport.id, toReportAttestation(nextRecord));
      if (savedReport) {
        setReportItems((currentItems) => currentItems.map((report) => (report.id === savedReport.id ? savedReport : report)));
        setBackendSyncState("synced");
      } else {
        setBackendSyncState("failed");
      }
      setAttestationPhase("saved");
      notify(nextRecord.onChainVerification?.status === "confirmed" ? copy.writeVerified : copy.writeSubmitted);
    } catch (error) {
      setAttestationPhase("failed");
      setBackendSyncState("failed");
      notify(error instanceof Error ? error.message : copy.writeFailed);
    }
  }

  if (loading) {
    return (
      <section className="space-y-5">
        <PageHeading eyebrow={copy.eyebrow} title={copy.title} description={copy.description} />
        <div className={cardClass}>
          <EmptyState title={copy.loading} detail={copy.loadingDetail} />
        </div>
      </section>
    );
  }

  if (!selectedReport) {
    return (
      <section className="space-y-5">
        <PageHeading eyebrow={copy.eyebrow} title={copy.title} description={copy.description} />
        {loadError ? <Notice tone="red" title={copy.loadFailed} detail={loadError} /> : null}
        <div className={cardClass}>
          <EmptyState title={copy.noReports} detail={copy.noReportsDetail} />
        </div>
        <Link className={primaryButtonClass} href="/workspace">
          {copy.goWorkspace}
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <PageHeading eyebrow={copy.eyebrow} title={copy.title} description={copy.description} />

      <div className="grid gap-3 md:grid-cols-3">
        <RuntimeStatus label={copy.walletStatus} value={walletStatusLabel} tone={walletConnected ? "green" : "orange"} />
        <RuntimeStatus label={copy.contractStatus} value={readiness.state} tone={readiness.state === "live ready" ? "green" : readiness.state === "not configured" ? "red" : "orange"} />
        <RuntimeStatus label={copy.backendStatus} value={backendSyncState} tone={backendSyncState === "synced" ? "green" : backendSyncState === "failed" ? "red" : "orange"} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className={clsx(cardClass, "p-4 sm:p-5")}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-start gap-3">
                <TokenIcon symbol={selectedReport.topic} />
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-slate-950">{selectedReport.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{selectedReport.summary}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <ModeBadge mode={selectedReport.mode} />
                    <StatusBadge status={selectedReport.status} />
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {selectedReport.sourceMode ?? "live"}
                    </span>
                  </div>
                </div>
              </div>

              <label className="mt-4 grid max-w-xl gap-1 text-xs font-medium text-slate-600">
                {copy.report}
                <select className={inputClass} value={selectedReport.id} onChange={(event) => changeReport(event.target.value)}>
                  {reportItems.map((report) => (
                    <option key={report.id} value={report.id}>
                      {report.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <button className={buttonClass} type="button" onClick={connectWallet} disabled={isAttesting}>
                <Wallet aria-hidden className="h-4 w-4" />
                {walletConnected ? copy.walletConnected : copy.connectWallet}
              </button>
              <button className={primaryButtonClass} type="button" onClick={attestOnChain} disabled={!canWriteWithWallet} title={canWriteWithWallet ? copy.openWalletTx : `${copy.missing}: ${readiness.missing.join(", ") || copy.walletRequired}`}>
                {isAttesting ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Wallet aria-hidden className="h-4 w-4" />}
                {isAttesting ? copy.writing : copy.write}
              </button>
            </div>
          </div>

          {!readiness.canWrite ? (
            <Notice tone="orange" title={copy.realDisabled} detail={`${copy.realDisabledDetail} ${copy.missing}: ${readiness.missing.join(", ") || copy.requiredChain}.`} />
          ) : null}

          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            <HashRow label="Report Hash" value={selectedReport.reportHash} onCopy={copyText} copiedKey={copiedKey} />
            <HashRow label="Evidence Hash" value={selectedReport.evidenceHash} onCopy={copyText} copiedKey={copiedKey} />
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <VerifyFact label={copy.hashCheck} value={localVerification ? (localVerification.reportHashMatch && localVerification.evidenceHashMatch ? copy.match : copy.mismatch) : copy.checking} passed={Boolean(localVerification?.reportHashMatch && localVerification.evidenceHashMatch)} />
            <VerifyFact label={copy.payload} value={preparedAttestation ? shortValue(preparedAttestation.data) : copy.waiting} passed={Boolean(preparedAttestation)} />
            <VerifyFact label={copy.readback} value={activeRecord?.onChainVerification?.status ?? (activeRecord ? copy.pending : copy.notSubmitted)} passed={Boolean(chainVerified)} />
          </div>

          {activeRecord ? (
            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck2 aria-hidden className="h-4 w-4 text-emerald-700" />
                  <h3 className="text-sm font-semibold text-slate-950">{copy.savedReceipt}</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className={buttonClass} type="button" onClick={openExplorer} disabled={!activeRecord.txHash.startsWith("0x") || !config.explorerConfigured}>
                    <ExternalLink aria-hidden className="h-4 w-4" />
                    {copy.openExplorer}
                  </button>
                  <button className={buttonClass} type="button" onClick={() => downloadJson("attestation-receipt.json", activeRecord)}>
                    <Download aria-hidden className="h-4 w-4" />
                    {copy.downloadReceipt}
                  </button>
                </div>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <HashRow label="Tx Hash" value={activeRecord.txHash} onCopy={copyText} copiedKey={copiedKey} />
                <ReceiptFact label={copy.wallet} value={activeRecord.walletAddress} />
                <ReceiptFact label={copy.block} value={activeRecord.block} />
                <ReceiptFact label={copy.reportId} value={activeRecord.reportId ?? copy.pending} />
              </div>
            </div>
          ) : null}
        </div>

        <aside className="space-y-4">
          <div className={clsx(cardClass, "p-4")}>
            <h2 className="text-sm font-semibold text-slate-950">{copy.flowTitle}</h2>
            <div className="mt-3 grid gap-2 text-sm">
              <FlowStep done label={copy.flowReport} />
              <FlowStep done={Boolean(localVerification?.reportHashMatch && localVerification.evidenceHashMatch)} label={copy.flowHash} />
              <FlowStep done={readiness.canWrite} label={copy.flowContract} />
              <FlowStep done={walletConnected} label={copy.flowWallet} />
              <FlowStep done={Boolean(chainVerified)} label={copy.flowReadback} />
            </div>
          </div>

          <div className={clsx(cardClass, "p-4")}>
            <h2 className="text-sm font-semibold text-slate-950">{copy.auditTitle}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{copy.auditDetail}</p>
            <button className={buttonClass} type="button" onClick={() => downloadJson(`${selectedReport.id}-proof-bundle.json`, createProofBundle(selectedReport, activeRecord, preparedAttestation, config))}>
              <Download aria-hidden className="h-4 w-4" />
              {copy.downloadBundle}
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}

function RuntimeStatus({ label, value, tone }: { label: string; value: string; tone: "green" | "orange" | "red" }) {
  const toneClass = {
    green: "border-emerald-200 bg-emerald-50 text-emerald-800",
    orange: "border-amber-200 bg-amber-50 text-amber-800",
    red: "border-red-200 bg-red-50 text-red-800"
  }[tone];

  return (
    <div className={clsx("min-w-0 rounded-lg border px-3 py-2", toneClass)}>
      <p className="text-[11px] font-semibold uppercase opacity-80">{label}</p>
      <p className="mt-1 truncate text-xs font-semibold">{value}</p>
    </div>
  );
}

function Notice({ tone, title, detail }: { tone: "orange" | "red"; title: string; detail: string }) {
  const toneClass = tone === "red" ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-800";

  return (
    <div className={clsx("mt-4 rounded-lg border px-3 py-3 text-sm", toneClass)}>
      <div className="flex items-center gap-2 font-semibold">
        <AlertTriangle aria-hidden className="h-4 w-4" />
        {title}
      </div>
      <p className="mt-1 text-xs leading-5">{detail}</p>
    </div>
  );
}

function VerifyFact({ label, value, passed }: { label: string; value: string; passed: boolean }) {
  return (
    <div className={clsx("min-w-0 rounded-lg border p-3", passed ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50")}>
      <p className={clsx("text-xs font-semibold uppercase", passed ? "text-emerald-700" : "text-amber-700")}>{label}</p>
      <p className="mono mt-2 truncate text-xs font-semibold text-slate-950" spellCheck={false}>
        {value}
      </p>
    </div>
  );
}

function ReceiptFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mono mt-2 truncate text-sm text-slate-900" spellCheck={false}>
        {value}
      </p>
    </div>
  );
}

function FlowStep({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <span className={clsx("grid h-5 w-5 place-items-center rounded-full", done ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500")}>
        <CheckCircle2 aria-hidden className="h-3.5 w-3.5" />
      </span>
      <span className="text-slate-700">{label}</span>
    </div>
  );
}

function recordFromReport(report: Report): AttestationRecord | null {
  if (!report.attestation) return null;
  return {
    reportHash: report.attestation.reportHash,
    evidenceHash: report.attestation.evidenceHash,
    txHash: report.attestation.txHash,
    walletAddress: report.attestation.walletAddress,
    block: report.attestation.block,
    timestamp: report.attestation.timestamp,
    chainId: report.attestation.chainId,
    contractAddress: report.attestation.contractAddress as AttestationRecord["contractAddress"],
    reportId: report.attestation.reportId,
    metadataURI: report.attestation.metadataURI,
    explorerTxUrl: report.attestation.explorerTxUrl,
    onChainVerification: report.attestation.onChainStatus
      ? {
          status: report.attestation.onChainStatus === "confirmed" ? "confirmed" : "mismatch",
          reportId: report.attestation.reportId ?? "unknown",
          blockNumber: report.attestation.block,
          eventMatched: report.attestation.onChainStatus === "confirmed",
          checkedAt: report.attestation.timestamp,
          fieldMatches: {
            reportHash: true,
            evidenceHash: true,
            topic: true,
            riskScore: true,
            alphaScore: true,
            verdict: true,
            metadataURI: true
          }
        }
      : undefined
  };
}

function toReportAttestation(record: AttestationRecord): ReportAttestation {
  return {
    reportHash: record.reportHash,
    evidenceHash: record.evidenceHash,
    txHash: record.txHash,
    walletAddress: record.walletAddress,
    block: record.block,
    timestamp: record.timestamp,
    chainId: record.chainId,
    contractAddress: record.contractAddress,
    reportId: record.reportId,
    metadataURI: record.metadataURI,
    explorerTxUrl: record.explorerTxUrl,
    onChainStatus: record.onChainVerification?.status ?? (record.txHash.startsWith("0x") ? "pending" : undefined)
  };
}

function createProofBundle(report: Report, record: AttestationRecord | null, prepared: PreparedChainAttestation | null, config: ReturnType<typeof readAttestationConfig>) {
  return {
    report,
    attestation: record,
    chain: {
      chainId: config.chainId,
      contractAddress: config.contractAddress,
      explorerBaseUrl: config.explorerBaseUrl,
      calldata: prepared?.data,
      functionSignature: prepared?.functionSignature
    }
  };
}

type AttestationCopy = (typeof attestationCopy)[keyof typeof attestationCopy];

function getWalletStatusLabel(connection: WalletConnection, copy: AttestationCopy) {
  if (connection.status === "connected") return `${copy.walletConnected} ${shortAddress(connection.address)}${connection.chainId ? ` / ${connection.chainId}` : ""}`;
  if (connection.status === "disconnected") return connection.chainId ? `${copy.walletDisconnected} / ${connection.chainId}` : copy.walletDisconnected;
  if (connection.status === "checking") return copy.walletChecking;
  return copy.walletMissing;
}

function shortValue(value: string) {
  return value.length > 22 ? `${value.slice(0, 10)}...${value.slice(-8)}` : value;
}

const attestationCopy = {
  en: {
    eyebrow: "On-chain proof",
    title: "User Wallet Attestation",
    description: "Select a backend Agent report, sign the Sepolia transaction with the connected user wallet, read the event/storage back, and persist the receipt.",
    loading: "Loading reports",
    loadingDetail: "Reading backend-persisted Agent reports.",
    loadFailed: "Report load failed",
    noReports: "No real reports yet",
    noReportsDetail: "Run a real Agent first. This page does not show demo receipts or fake ETH records.",
    goWorkspace: "Run Agent",
    walletStatus: "Wallet",
    contractStatus: "Sepolia contract",
    backendStatus: "Backend receipt",
    report: "Report",
    walletConnected: "Wallet connected",
    walletDisconnected: "Wallet not connected",
    walletChecking: "Checking wallet",
    walletMissing: "Browser wallet missing",
    connectWallet: "Connect wallet",
    walletRequired: "Connect wallet first",
    openWalletTx: "Open wallet transaction",
    write: "Write on-chain",
    writing: "Writing...",
    missing: "Missing",
    requiredChain: "required chain config",
    realDisabled: "Real chain write unavailable",
    realDisabledDetail: "No fallback receipt is generated. Configure the missing values before writing to Sepolia.",
    hashCheck: "Hash verification",
    payload: "Contract payload",
    readback: "Chain readback",
    match: "match",
    mismatch: "mismatch",
    checking: "checking",
    waiting: "waiting",
    pending: "pending",
    notSubmitted: "not submitted",
    savedReceipt: "Stored attestation receipt",
    explorerMissing: "Explorer URL or tx hash is missing",
    openExplorer: "Open Explorer",
    downloadReceipt: "Download Receipt",
    wallet: "Wallet",
    block: "Block",
    reportId: "Report ID",
    flowTitle: "Proof flow",
    flowReport: "Backend report selected",
    flowHash: "Hashes recomputed",
    flowContract: "Contract ready",
    flowWallet: "User wallet connected",
    flowReadback: "Event and storage verified",
    auditTitle: "Audit bundle",
    auditDetail: "The bundle contains the report, receipt, chain config, and calldata. It never fabricates a transaction hash.",
    downloadBundle: "Download Proof Bundle",
    writeVerified: "On-chain write and readback verified",
    writeSubmitted: "Transaction submitted; readback needs review",
    writeFailed: "On-chain attestation failed"
  },
  zh: {
    eyebrow: "链上证明",
    title: "用户钱包上链证明",
    description: "选择后端 Agent 报告，用已连接的用户钱包签名 Sepolia 交易，回读事件和存储后把回执写回后端。",
    loading: "正在加载报告",
    loadingDetail: "正在读取后端持久化 Agent 报告。",
    loadFailed: "报告加载失败",
    noReports: "暂无真实报告",
    noReportsDetail: "请先运行真实 Agent。本页面不会展示演示回执或假的 ETH 记录。",
    goWorkspace: "运行 Agent",
    walletStatus: "钱包",
    contractStatus: "Sepolia 合约",
    backendStatus: "后端回执",
    report: "报告",
    walletConnected: "钱包已连接",
    walletDisconnected: "钱包未连接",
    walletChecking: "正在检查钱包",
    walletMissing: "未检测到浏览器钱包",
    connectWallet: "连接钱包",
    walletRequired: "请先连接钱包",
    openWalletTx: "打开钱包交易",
    write: "写入链上",
    writing: "写入中...",
    missing: "缺少",
    requiredChain: "必要链路配置",
    realDisabled: "真实上链不可用",
    realDisabledDetail: "不会生成 fallback 回执。请先配置缺失项，再写入 Sepolia。",
    hashCheck: "哈希校验",
    payload: "合约调用数据",
    readback: "链上回读",
    match: "匹配",
    mismatch: "不匹配",
    checking: "检查中",
    waiting: "等待中",
    pending: "待确认",
    notSubmitted: "未提交",
    savedReceipt: "已保存证明回执",
    explorerMissing: "缺少浏览器地址或交易哈希",
    openExplorer: "打开浏览器",
    downloadReceipt: "下载回执",
    wallet: "钱包",
    block: "区块",
    reportId: "报告 ID",
    flowTitle: "证明流程",
    flowReport: "已选择后端报告",
    flowHash: "已复算哈希",
    flowContract: "合约已就绪",
    flowWallet: "用户钱包已连接",
    flowReadback: "事件和存储已验证",
    auditTitle: "审计包",
    auditDetail: "审计包包含报告、回执、链配置和 calldata，不会伪造交易哈希。",
    downloadBundle: "下载证明包",
    writeVerified: "链上写入和回读已验证",
    writeSubmitted: "交易已提交，回读需要复核",
    writeFailed: "链上证明失败"
  }
} as const;
