"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ArrowLeft, CheckCircle2, Download, ExternalLink, ShieldAlert, ShieldCheck, Vote, Wallet } from "lucide-react";
import { fetchStoredReportRun } from "@/lib/adapters/agent-data-client";
import { readAttestationConfig, verifyProofBundle, type ProofVerificationResult } from "@/lib/adapters/attestation-client";
import { useAppActions } from "@/components/shell/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { HashRow } from "@/components/ui/HashRow";
import { ModeBadge } from "@/components/ui/ModeBadge";
import { PageHeading } from "@/components/ui/PageHeading";
import { ProofChain } from "@/components/ui/ProofChain";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TokenIcon } from "@/components/ui/TokenIcon";
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import { buttonClass, cardClass, primaryButtonClass } from "@/components/ui/styles";
import type { EvidenceItem, Report, XApiTrace } from "@/lib/types";

export function ReportDetailPage({ reportId }: { reportId: string }) {
  const { copiedKey, copyText, downloadJson, language, t } = useAppActions();
  const copy = detailCopy[language];
  const [report, setReport] = useState<Report | null>(null);
  const [tracePool, setTracePool] = useState<XApiTrace[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [verification, setVerification] = useState<ProofVerificationResult | null>(null);
  const attestationConfig = readAttestationConfig();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    setReport(null);
    setTracePool([]);
    fetchStoredReportRun(reportId)
      .then((run) => {
        if (!cancelled && run) {
          setReport(run.report);
          setTracePool(run.traces);
        } else if (!cancelled) {
          setReport(null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : copy.loadFailed);
          setReport(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [copy.loadFailed, reportId]);

  useEffect(() => {
    let cancelled = false;
    setVerification(null);
    if (!report) {
      return () => {
        cancelled = true;
      };
    }

    verifyProofBundle(report, report.evidence, {
      reportHash: report.reportHash,
      evidenceHash: report.evidenceHash
    }).then((result) => {
      if (!cancelled) setVerification(result);
    });

    return () => {
      cancelled = true;
    };
  }, [report]);

  if (loading) {
    return (
      <section className="space-y-5">
        <PageHeading eyebrow={copy.eyebrow} title={copy.loadingTitle} description={copy.loadingDetail} />
        <div className={cardClass}>
          <EmptyState title={copy.loadingTitle} detail={copy.loadingDetail} />
        </div>
      </section>
    );
  }

  if (!report) {
    return (
      <section className="space-y-5">
        <PageHeading eyebrow={copy.eyebrow} title={copy.notFoundTitle} description={copy.notFoundDescription} />
        {loadError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-800">
            <p className="font-semibold">{copy.loadFailed}</p>
            <p className="mono mt-1 text-xs">{loadError}</p>
          </div>
        ) : null}
        <div className={cardClass}>
          <EmptyState title={copy.emptyTitle} detail={copy.emptyDetail} />
        </div>
        <Link className={buttonClass} href="/reports">
          <ArrowLeft aria-hidden className="h-4 w-4" />
          {copy.backToReports}
        </Link>
      </section>
    );
  }

  const attestationRecord = report.attestation;
  const attestationTxHash = attestationRecord?.txHash;
  const isAttested = Boolean(attestationTxHash?.startsWith("0x"));
  const explorerTxUrl = attestationRecord?.explorerTxUrl ?? (attestationConfig.explorerBaseUrl && attestationTxHash ? `${attestationConfig.explorerBaseUrl}/tx/${attestationTxHash}` : undefined);
  const relatedTraces = report.evidence.map((item) => findRelatedTrace(item, tracePool));
  const linkedEvidenceCount = relatedTraces.filter(Boolean).length;
  const traceHashesPresent = relatedTraces.filter(Boolean).every((trace) => Boolean(trace?.inputHash && trace?.outputHash));
  const verdictRationale = buildVerdictRationale(report, copy);
  const categorizedActions = categorizeActions(report.actions, copy);

  return (
    <section className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <PageHeading eyebrow={copy.eyebrow} title={report.title} description={report.summary} />
        <Link className={buttonClass} href="/reports">
          <ArrowLeft aria-hidden className="h-4 w-4" />
          {copy.backToReports}
        </Link>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <div className={clsx(cardClass, "overflow-hidden")}>
            <div className="border-b border-slate-200 bg-white p-4 sm:p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <TokenIcon symbol={report.topic} />
                    <div>
                      <h2 className="text-sm font-semibold text-slate-950">{copy.summaryTitle}</h2>
                      <p className="mt-1 text-xs text-slate-500">
                        {report.topic} / {report.createdAt}
                      </p>
                    </div>
                    <ModeBadge mode={report.mode} />
                    <StatusBadge status={report.status} />
                  </div>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{report.summary}</p>
                </div>
                <VerdictBadge verdict={report.verdict} />
              </div>
            </div>

            <div className="grid gap-0 divide-y divide-slate-200 md:grid-cols-5 md:divide-x md:divide-y-0">
              <AuditMetric label={copy.verdict} value={localizeVerdict(report.verdict, copy)} detail={copy.finalDecision} />
              <AuditMetric label={copy.riskScore} value={`${report.riskScore}`} detail={report.riskScore >= 60 ? copy.riskElevated : copy.riskNormal} meter={report.riskScore} />
              <AuditMetric label={copy.alphaScore} value={`${report.alphaScore}`} detail={copy.alphaDetail} meter={report.alphaScore} />
              <AuditMetric label={copy.confidence} value={`${Math.round(report.confidence * 100)}%`} detail={`${report.evidence.length} ${copy.evidenceItems}`} />
              <AuditMetric label={copy.attestation} value={isAttested ? copy.confirmed : copy.draft} detail={isAttested ? copy.hashOnChain : copy.readyToAnchor} />
            </div>
          </div>

          <div className={clsx(cardClass, "p-4 sm:p-5")}>
            <h2 className="text-sm font-semibold text-slate-950">{copy.rationale}</h2>
            <ul className="mt-3 grid gap-2">
              {verdictRationale.map((item) => (
                <li key={item} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700">
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <ProofChain
            topic={report.topic}
            mode={report.mode}
            actions={relatedTraces.map((trace) => trace?.action).filter(Boolean) as string[]}
            evidenceCount={report.evidence.length}
            reportHash={report.reportHash}
            evidenceHash={report.evidenceHash}
            txHash={attestationTxHash}
            attested={isAttested}
          />

          <div className={clsx(cardClass, "p-4 sm:p-5")}>
            <h2 className="text-sm font-semibold text-slate-950">{copy.verifyChain}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{copy.verifyDetail}</p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <VerifyStatus label={copy.traceLinks} value={`${linkedEvidenceCount}/${report.evidence.length}`} passed={linkedEvidenceCount === report.evidence.length} />
              <VerifyStatus label={copy.hashPresent} value={traceHashesPresent ? copy.present : copy.missing} passed={traceHashesPresent} />
              <VerifyStatus
                label={copy.recomputable}
                value={verification ? (verification.reportHashMatch && verification.evidenceHashMatch ? copy.match : copy.mismatch) : copy.checking}
                passed={Boolean(verification?.reportHashMatch && verification.evidenceHashMatch)}
              />
            </div>
          </div>

          <div className={clsx(cardClass, "p-4 sm:p-5")}>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-sm font-semibold text-slate-950">{copy.evidenceToConclusion}</h2>
              <span className="w-fit rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                {linkedEvidenceCount}/{report.evidence.length} {copy.traceLinked}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold uppercase text-slate-500">
              <span>{copy.sourceAction}</span>
              <span>{copy.evidenceWeight}</span>
              <span>{copy.contribution}</span>
              <span>{copy.traceLink}</span>
            </div>
            <div className="mt-3 grid gap-3 animate-stagger">
              {report.evidence.map((item, index) => {
                const relatedTrace = relatedTraces[index];
                return (
                  <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 transition-all duration-200 hover:border-blue-200 hover:shadow-sm">
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-slate-900">{item.title}</p>
                          <span className="mono rounded-full bg-white px-2 py-1 text-xs text-slate-500 ring-1 ring-slate-200">{item.source.replace("xapi:", "")}</span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{item.summary}</p>
                        <div className="mt-3 grid gap-2 text-xs text-slate-600 md:grid-cols-3">
                          <EvidenceMeta label={copy.metaSource} value={item.source.replace("xapi:", "")} />
                          <EvidenceMeta label={copy.metaWeight} value={`${Math.round(item.weight * 100)}%`} />
                          <EvidenceMeta label={copy.metaContribution} value={buildEvidenceContribution(report, item, copy)} />
                          {item.traceId ? <EvidenceMeta label="traceId" value={item.traceId} /> : null}
                          {typeof item.confidence === "number" ? <EvidenceMeta label={copy.metaConfidence} value={`${Math.round(item.confidence * 100)}%`} /> : null}
                          {item.rawId ? <EvidenceMeta label="rawId" value={item.rawId} /> : null}
                        </div>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white p-3">
                        <p className="text-xs font-semibold uppercase text-slate-500">{copy.conclusionWeight}</p>
                        <p className="mt-2 text-xl font-semibold tabular-nums text-slate-950">{Math.round(item.weight * 100)}%</p>
                        <p className="mt-1 text-xs text-slate-500">{copy.supports} {localizeVerdict(report.verdict, copy)}</p>
                      </div>
                    </div>
                    {relatedTrace ? (
                      <Link className={clsx(buttonClass, "mt-3")} href={`/trace?trace=${relatedTrace.id}`} aria-label={`View related Trace for ${item.title}`}>
                        <ExternalLink aria-hidden className="h-4 w-4" />
                        {copy.viewTrace}
                      </Link>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className={clsx(cardClass, "p-4 sm:p-5")}>
            <h2 className="text-sm font-semibold text-slate-950">{copy.actions}</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {categorizedActions.map((group, index) => {
                const Icon = group.icon;
                return (
                <div key={group.label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-slate-700 ring-1 ring-slate-200">
                      <Icon aria-hidden className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-[11px] font-semibold uppercase text-slate-500">{copy.action} {index + 1}</p>
                      <h3 className="text-sm font-semibold text-slate-950">{group.label}</h3>
                    </div>
                  </div>
                  <ul className="mt-2 space-y-2">
                    {group.items.map((action) => (
                      <li key={action} className="text-sm leading-6 text-slate-700">
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              );
              })}
            </div>
          </div>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-5 xl:self-start">
          <div className={clsx(cardClass, "p-4")}>
            <div className="flex items-center gap-2">
              <ShieldCheck aria-hidden className="h-4 w-4 text-emerald-700" />
              <h2 className="text-sm font-semibold text-slate-950">{copy.auditSummary}</h2>
            </div>
            <div className="mt-3 space-y-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-500">{copy.proofStatus}</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">{isAttested ? copy.confirmedReceipt : copy.walletAttestDraft}</p>
              </div>
              <HashRow label="Report Hash" value={report.reportHash} onCopy={copyText} copiedKey={copiedKey} />
              <HashRow label="Evidence Hash" value={report.evidenceHash} onCopy={copyText} copiedKey={copiedKey} />
              {report.ai ? (
                <div className="rounded-lg border border-violet-200 bg-violet-50 p-3">
                  <p className="text-xs font-medium text-violet-700">{copy.aiGrounded}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">{report.ai.provider} / {report.ai.model} / {report.ai.mode}</p>
                  <p className="mono mt-1 truncate text-xs text-violet-700">{report.ai.baseUrl}</p>
                </div>
              ) : null}
              {report.ai ? <HashRow label="AI Prompt Hash" value={report.ai.promptHash} onCopy={copyText} copiedKey={copiedKey} /> : null}
              {report.ai ? <HashRow label="AI Output Hash" value={report.ai.outputHash} onCopy={copyText} copiedKey={copiedKey} /> : null}
              {isAttested && attestationTxHash ? <HashRow label="Tx Hash" value={attestationTxHash} onCopy={copyText} copiedKey={copiedKey} /> : null}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-500">{copy.evidenceLinkState}</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">
                  {linkedEvidenceCount}/{report.evidence.length} {copy.evidenceCardsLinked}
                </p>
              </div>
              {isAttested && explorerTxUrl ? (
                <a className={buttonClass} href={explorerTxUrl} target="_blank" rel="noreferrer">
                  <ExternalLink aria-hidden className="h-4 w-4" />
                  {copy.openExplorer}
                </a>
              ) : isAttested ? (
                <button className={buttonClass} type="button" disabled title="NEXT_PUBLIC_EXPLORER_BASE_URL is not configured">
                  <ExternalLink aria-hidden className="h-4 w-4" />
                  {copy.explorerNotConfigured}
                </button>
              ) : (
                <Link className={primaryButtonClass} href={`/attestation?report=${encodeURIComponent(report.id)}`}>
                  <Wallet aria-hidden className="h-4 w-4" />
                  {t("report.openWalletAttestation")}
                </Link>
              )}
              <button className={buttonClass} type="button" onClick={() => downloadJson(`${report.topic.toLowerCase()}-report-detail.json`, report)}>
                <Download aria-hidden className="h-4 w-4" />
                {copy.downloadReport}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function VerifyStatus({ label, value, passed }: { label: string; value: string; passed: boolean }) {
  return (
    <div className={clsx("rounded-lg border p-3", passed ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50")}>
      <p className={clsx("text-xs font-semibold uppercase", passed ? "text-emerald-700" : "text-amber-700")}>{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function EvidenceMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
      <p className="text-[11px] font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-slate-800">{value}</p>
    </div>
  );
}

function findRelatedTrace(item: EvidenceItem, traces: XApiTrace[]) {
  if (item.traceId) {
    const matchedTrace = traces.find((trace) => trace.id === item.traceId);
    if (matchedTrace) return matchedTrace;
  }
  const action = item.source.replace("xapi:", "");
  return traces.find((trace) => trace.action === action);
}

type DetailCopy = (typeof detailCopy)[keyof typeof detailCopy];

function buildVerdictRationale(report: Report, copy: DetailCopy) {
  if (report.rationale?.length) return report.rationale;

  const rationale = [
    copy.rationaleFallback(report.verdict, report.riskScore, Math.round(report.confidence * 100)),
    copy.evidenceFallback(report.evidence.length, Math.max(...report.evidence.map((item) => Math.round(item.weight * 100))))
  ];

  if (report.verdict === "CAUTION" || report.riskScore >= 60) {
    rationale.push(copy.elevatedRiskFallback);
  } else if (report.verdict === "POSITIVE") {
    rationale.push(copy.positiveFallback);
  } else {
    rationale.push(copy.observeFallback);
  }

  return rationale;
}

function categorizeActions(actions: string[], copy: DetailCopy) {
  const [first, second, ...rest] = actions;
  return [
    { label: copy.observe, icon: CheckCircle2, items: [first ?? copy.defaultObserveAction] },
    { label: copy.riskControl, icon: ShieldAlert, items: [second ?? copy.defaultRiskAction] },
    { label: copy.governance, icon: Vote, items: rest.length > 0 ? rest : [copy.defaultGovernanceAction] }
  ];
}

function buildEvidenceContribution(report: Report, item: EvidenceItem, copy: DetailCopy) {
  if (report.verdict === "CAUTION" || report.verdict === "NEGATIVE") return copy.raisesRisk(report.verdict);
  if (report.verdict === "POSITIVE") return copy.supportsAlpha;
  return copy.supportsObserve;
}

function localizeVerdict(verdict: string, copy: DetailCopy) {
  if ("metaSource" in copy && copy.metaSource === "来源") {
    const map: Record<string, string> = { POSITIVE: "看多", OBSERVE: "观察", CAUTION: "谨慎", NEGATIVE: "看空" };
    return map[verdict] ?? verdict;
  }
  return verdict;
}

function AuditMetric({ label, value, detail, meter }: { label: string; value: string; detail: string; meter?: number }) {
  return (
    <div className="bg-slate-50 p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold tabular-nums text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
      {typeof meter === "number" ? (
        <div className="mt-3">
          <ScoreBar value={meter} />
        </div>
      ) : null}
    </div>
  );
}

const detailCopy = {
  en: {
    eyebrow: "Report detail",
    loadingTitle: "Loading report",
    loadingDetail: "Reading the backend-persisted Agent run.",
    notFoundTitle: "Report not found",
    notFoundDescription: "This route does not match a persisted Agent report.",
    loadFailed: "Report load failed",
    emptyTitle: "No report record found",
    emptyDetail: "Return to Reports and open an available backend Agent report.",
    backToReports: "Back to Reports",
    summaryTitle: "Auditable report summary",
    verdict: "Verdict",
    finalDecision: "final decision",
    riskScore: "Risk Score",
    riskElevated: "risk elevated",
    riskNormal: "below caution line",
    alphaScore: "Alpha Score",
    alphaDetail: "opportunity signal",
    confidence: "Confidence",
    evidenceItems: "evidence items",
    attestation: "Attestation",
    confirmed: "Confirmed",
    draft: "Draft",
    hashOnChain: "hash on-chain",
    readyToAnchor: "ready to anchor",
    rationale: "AI rationale",
    verifyChain: "Verify evidence chain",
    verifyDetail: "Review the report, evidence, and tool traces together. Evidence links back to Trace, Trace keeps hashes, and report/evidence hashes can be recomputed locally.",
    traceLinks: "Evidence links to Trace",
    hashPresent: "Input/output hash present",
    recomputable: "Report/evidence hash recomputable",
    present: "present",
    missing: "missing",
    match: "match",
    mismatch: "mismatch",
    checking: "checking",
    evidenceToConclusion: "Evidence to conclusion",
    traceLinked: "Trace linked",
    sourceAction: "Source action",
    evidenceWeight: "Evidence weight",
    contribution: "Contribution",
    traceLink: "Trace link",
    conclusionWeight: "Conclusion weight",
    supports: "supports",
    viewTrace: "View related Trace",
    actions: "Actions",
    action: "Action",
    auditSummary: "Audit summary",
    proofStatus: "Proof status",
    confirmedReceipt: "Confirmed by stored attestation receipt",
    walletAttestDraft: "Draft, connect wallet to attest",
    aiGrounded: "AI-generated + evidence-grounded",
    evidenceLinkState: "Evidence link state",
    evidenceCardsLinked: "evidence cards linked to Trace",
    openExplorer: "Open Explorer Tx",
    explorerNotConfigured: "Explorer not configured",
    downloadReport: "Download Report JSON",
    observe: "Observe",
    riskControl: "Risk Control",
    governance: "DAO Governance",
    defaultObserveAction: "Monitor evidence freshness over the next evidence window.",
    defaultRiskAction: "Pause automated execution if risk score crosses the configured threshold.",
    defaultGovernanceAction: "Attach the evidence packet before any governance review.",
    rationaleFallback: (verdict: string, risk: number, confidence: number) => `Verdict ${verdict} follows a risk score of ${risk} and confidence of ${confidence}%.`,
    evidenceFallback: (count: number, weight: number) => `${count} evidence items support the report, with strongest weight at ${weight}%.`,
    elevatedRiskFallback: "Risk remains elevated because at least one source needs stronger cross-checking before automated action.",
    positiveFallback: "Alpha score is stronger than risk score, so the recommendation keeps exposure while watching reversal signals.",
    observeFallback: "Evidence is consistent enough to observe, but not strong enough to trigger an aggressive action.",
    raisesRisk: (verdict: string) => `raises ${verdict.toLowerCase()} confidence`,
    supportsAlpha: "supports alpha momentum",
    supportsObserve: "keeps observe verdict grounded",
    metaSource: "source",
    metaWeight: "weight",
    metaContribution: "contribution",
    metaConfidence: "confidence"
  },
  zh: {
    eyebrow: "报告详情",
    loadingTitle: "正在加载报告",
    loadingDetail: "正在读取后端持久化的 Agent 运行记录。",
    notFoundTitle: "未找到报告",
    notFoundDescription: "当前路由没有匹配到后端持久化的 Agent 报告。",
    loadFailed: "报告加载失败",
    emptyTitle: "没有报告记录",
    emptyDetail: "请返回报告中心，打开一个后端真实 Agent 报告。",
    backToReports: "返回报告",
    summaryTitle: "可审计报告摘要",
    verdict: "结论",
    finalDecision: "最终判断",
    riskScore: "风险分",
    riskElevated: "风险偏高",
    riskNormal: "低于警戒线",
    alphaScore: "Alpha 分",
    alphaDetail: "机会信号",
    confidence: "置信度",
    evidenceItems: "条证据",
    attestation: "链上证明",
    confirmed: "已确认",
    draft: "草稿",
    hashOnChain: "哈希已上链",
    readyToAnchor: "可上链证明",
    rationale: "AI 推理依据",
    verifyChain: "校验证据链",
    verifyDetail: "把报告、证据和工具 Trace 放在一起核验：证据关联 Trace，Trace 保存输入/输出哈希，报告和证据哈希可本地复算。",
    traceLinks: "证据关联 Trace",
    hashPresent: "输入/输出哈希存在",
    recomputable: "报告/证据哈希可复算",
    present: "存在",
    missing: "缺失",
    match: "匹配",
    mismatch: "不匹配",
    checking: "检查中",
    evidenceToConclusion: "证据到结论",
    traceLinked: "条 Trace 已关联",
    sourceAction: "来源动作",
    evidenceWeight: "证据权重",
    contribution: "贡献",
    traceLink: "Trace 链接",
    conclusionWeight: "结论权重",
    supports: "支持",
    viewTrace: "查看关联 Trace",
    actions: "建议动作",
    action: "动作",
    auditSummary: "审计摘要",
    proofStatus: "证明状态",
    confirmedReceipt: "已由后端保存的链上回执确认",
    walletAttestDraft: "草稿，连接钱包后可上链",
    aiGrounded: "AI 生成 + 证据支撑",
    evidenceLinkState: "证据关联状态",
    evidenceCardsLinked: "张证据卡已关联 Trace",
    openExplorer: "打开浏览器交易",
    explorerNotConfigured: "未配置区块浏览器",
    downloadReport: "下载报告 JSON",
    observe: "观察",
    riskControl: "风险控制",
    governance: "DAO 治理",
    defaultObserveAction: "在下一个证据窗口继续监控证据新鲜度。",
    defaultRiskAction: "当风险分超过阈值时暂停自动执行。",
    defaultGovernanceAction: "治理评审前附上完整证据包。",
    rationaleFallback: (verdict: string, risk: number, confidence: number) => `结论 ${verdict} 来自风险分 ${risk} 和 ${confidence}% 置信度。`,
    evidenceFallback: (count: number, weight: number) => `${count} 条证据支撑报告，最高证据权重为 ${weight}%。`,
    elevatedRiskFallback: "至少一个来源仍需要更强交叉验证，因此风险保持偏高。",
    positiveFallback: "Alpha 分强于风险分，因此建议保持观察敞口并跟踪反转信号。",
    observeFallback: "证据一致性足以支撑观察，但不足以触发激进动作。",
    raisesRisk: (verdict: string) => `提高 ${verdict} 置信度`,
    supportsAlpha: "支撑 Alpha 动量",
    supportsObserve: "支撑观察结论",
    metaSource: "来源",
    metaWeight: "权重",
    metaContribution: "贡献",
    metaConfidence: "置信度"
  }
} as const;
