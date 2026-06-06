"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ArrowLeft, CheckCircle2, Download, ExternalLink, ShieldAlert, ShieldCheck, Vote } from "lucide-react";
import { readAttestationConfig, verifyProofBundle, type ProofVerificationResult } from "@/lib/adapters/attestation-client";
import { attestation, reports, xapiTraces } from "@/lib/mock-data";
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

export function ReportDetailPage({ reportId }: { reportId: string }) {
  const { copiedKey, copyText, downloadJson, notify } = useAppActions();
  const report = reports.find((item) => item.id === reportId);
  const [verification, setVerification] = useState<ProofVerificationResult | null>(null);
  const attestationConfig = readAttestationConfig();

  useEffect(() => {
    let cancelled = false;
    if (!report) return;

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

  if (!report) {
    return (
      <section className="space-y-5">
        <PageHeading eyebrow="Report detail" title="报告详情" description="当前路由没有匹配到本地 mock 报告。" />
        <div className={cardClass}>
          <EmptyState title="未找到报告" detail="请返回报告中心，从列表进入可用的 mock 报告详情。" />
        </div>
        <Link className={buttonClass} href="/reports">
          <ArrowLeft aria-hidden className="h-4 w-4" />
          返回报告中心
        </Link>
      </section>
    );
  }

  const isAttested = report.status === "已上链";
  const relatedTraces = report.evidence.map((item) => findRelatedTrace(item.source));
  const linkedEvidenceCount = relatedTraces.filter(Boolean).length;
  const traceHashesPresent = relatedTraces.filter(Boolean).every((trace) => Boolean(trace?.inputHash && trace?.outputHash));
  const verdictRationale = buildVerdictRationale(report);
  const categorizedActions = categorizeActions(report.actions);

  return (
    <section className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <PageHeading eyebrow="Report detail" title={report.title} description={report.summary} />
        <Link className={buttonClass} href="/reports">
          <ArrowLeft aria-hidden className="h-4 w-4" />
          返回报告中心
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
                      <h2 className="text-sm font-semibold text-slate-950">可审计报告摘要</h2>
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
              <AuditMetric label="Verdict" value={report.verdict} detail="final decision" />
              <AuditMetric label="Risk Score" value={`${report.riskScore}`} detail={report.riskScore >= 60 ? "risk elevated" : "below caution line"} meter={report.riskScore} />
              <AuditMetric label="Alpha Score" value={`${report.alphaScore}`} detail="opportunity signal" meter={report.alphaScore} />
              <AuditMetric label="Confidence" value={`${Math.round(report.confidence * 100)}%`} detail={`${report.evidence.length} evidence items`} />
              <AuditMetric label="Attestation" value={isAttested ? "Confirmed" : "Draft"} detail={isAttested ? "hash on-chain" : "ready to anchor"} />
            </div>
          </div>

          <div className={clsx(cardClass, "p-4 sm:p-5")}>
            <h2 className="text-sm font-semibold text-slate-950">Verdict rationale</h2>
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
            txHash={isAttested ? attestation.txHash : undefined}
            attested={isAttested}
          />

          <div className={clsx(cardClass, "p-4 sm:p-5")}>
            <h2 className="text-sm font-semibold text-slate-950">Verify evidence chain</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">把报告、证据和 xAPI Trace 三段串起来复核：证据能回到 Trace，Trace 保留 input/output hash，报告与证据哈希可本地复算。</p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <VerifyStatus label="Evidence links to Trace" value={`${linkedEvidenceCount}/${report.evidence.length}`} passed={linkedEvidenceCount === report.evidence.length} />
              <VerifyStatus label="Input/output hash present" value={traceHashesPresent ? "present" : "missing"} passed={traceHashesPresent} />
              <VerifyStatus
                label="Report/evidence hash recomputable"
                value={verification ? (verification.reportHashMatch && verification.evidenceHashMatch ? "match" : "mismatch") : "checking"}
                passed={Boolean(verification?.reportHashMatch && verification.evidenceHashMatch)}
              />
            </div>
          </div>

          <div className={clsx(cardClass, "p-4 sm:p-5")}>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-sm font-semibold text-slate-950">{"Evidence -> Conclusion"}</h2>
              <span className="w-fit rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                {linkedEvidenceCount}/{report.evidence.length} Trace linked
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold uppercase text-slate-500">
              <span>Source action</span>
              <span>Evidence weight</span>
              <span>Contribution</span>
              <span>Trace link</span>
            </div>
            <div className="mt-3 grid gap-3">
              {report.evidence.map((item, index) => {
                const relatedTrace = relatedTraces[index];
                return (
                  <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-slate-900">{item.title}</p>
                          <span className="mono rounded-full bg-white px-2 py-1 text-xs text-slate-500 ring-1 ring-slate-200">{item.source.replace("xapi:", "")}</span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{item.summary}</p>
                        <div className="mt-3 grid gap-2 text-xs text-slate-600 md:grid-cols-3">
                          <EvidenceMeta label="source" value={item.source.replace("xapi:", "")} />
                          <EvidenceMeta label="weight" value={`${Math.round(item.weight * 100)}%`} />
                          <EvidenceMeta label="contribution" value={buildEvidenceContribution(report, item)} />
                        </div>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white p-3">
                        <p className="text-xs font-semibold uppercase text-slate-500">Conclusion weight</p>
                        <p className="mt-2 text-xl font-semibold tabular-nums text-slate-950">{Math.round(item.weight * 100)}%</p>
                        <p className="mt-1 text-xs text-slate-500">supports {report.verdict}</p>
                      </div>
                    </div>
                    {relatedTrace ? (
                      <Link className={clsx(buttonClass, "mt-3")} href={`/trace?trace=${relatedTrace.id}`} aria-label={`View related Trace for ${item.title}`}>
                        <ExternalLink aria-hidden className="h-4 w-4" />
                        View related Trace
                      </Link>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className={clsx(cardClass, "p-4 sm:p-5")}>
            <h2 className="text-sm font-semibold text-slate-950">Actions</h2>
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
                      <p className="text-[11px] font-semibold uppercase text-slate-500">Action {index + 1}</p>
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
              <h2 className="text-sm font-semibold text-slate-950">Sticky audit summary</h2>
            </div>
            <div className="mt-3 space-y-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-500">链上状态</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">{isAttested ? (attestationConfig.contractConfigured ? "Confirmed on configured chain" : "Mock fallback receipt, contract not configured") : "Draft, ready for attestation"}</p>
              </div>
              <HashRow label="Report Hash" value={report.reportHash} onCopy={copyText} copiedKey={copiedKey} />
              <HashRow label="Evidence Hash" value={report.evidenceHash} onCopy={copyText} copiedKey={copiedKey} />
              {isAttested ? <HashRow label="Tx Hash" value={attestation.txHash} onCopy={copyText} copiedKey={copiedKey} /> : null}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-500">证据链接状态</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">
                  {linkedEvidenceCount}/{report.evidence.length} evidence cards linked to Trace
                </p>
              </div>
              {isAttested && attestationConfig.explorerBaseUrl ? (
                <a className={buttonClass} href={`${attestationConfig.explorerBaseUrl}/tx/${attestation.txHash}`} target="_blank" rel="noreferrer">
                  <ExternalLink aria-hidden className="h-4 w-4" />
                  Open Explorer Tx
                </a>
              ) : isAttested ? (
                <button className={buttonClass} type="button" disabled title="NEXT_PUBLIC_EXPLORER_BASE_URL is not configured">
                  <ExternalLink aria-hidden className="h-4 w-4" />
                  Explorer not configured
                </button>
              ) : (
                <button className={primaryButtonClass} type="button" onClick={() => notify("Attestation draft 已排队，真实写链请先配置合约和钱包")}>
                  Prepare attestation
                </button>
              )}
              <button className={buttonClass} type="button" onClick={() => downloadJson(`${report.topic.toLowerCase()}-report-detail.json`, report)}>
                <Download aria-hidden className="h-4 w-4" />
                Download Report JSON
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

function findRelatedTrace(source: string) {
  const action = source.replace("xapi:", "");
  return xapiTraces.find((trace) => trace.action === action);
}

function buildVerdictRationale(report: (typeof reports)[number]) {
  const rationale = [
    `Verdict ${report.verdict} follows a risk score of ${report.riskScore} and confidence of ${Math.round(report.confidence * 100)}%.`,
    `${report.evidence.length} evidence items support the report, with strongest weight at ${Math.max(...report.evidence.map((item) => Math.round(item.weight * 100)))}%.`
  ];

  if (report.verdict === "CAUTION" || report.riskScore >= 60) {
    rationale.push("Risk remains elevated because at least one source needs stronger cross-checking before automated action.");
  } else if (report.verdict === "POSITIVE") {
    rationale.push("Alpha score is stronger than risk score, so the recommendation keeps exposure while watching reversal signals.");
  } else {
    rationale.push("Evidence is consistent enough to observe, but not strong enough to trigger an aggressive action.");
  }

  return rationale;
}

function categorizeActions(actions: string[]) {
  const [first, second, ...rest] = actions;
  return [
    { label: "Observe", icon: CheckCircle2, items: [first ?? "Monitor evidence freshness over the next 24 hours."] },
    { label: "Risk Control", icon: ShieldAlert, items: [second ?? "Pause automated execution if risk score crosses the configured threshold."] },
    { label: "DAO Governance", icon: Vote, items: rest.length > 0 ? rest : ["Attach the evidence packet before any governance review."] }
  ];
}

function buildEvidenceContribution(report: (typeof reports)[number], item: (typeof reports)[number]["evidence"][number]) {
  if (report.verdict === "CAUTION" || report.verdict === "NEGATIVE") return `raises ${report.verdict.toLowerCase()} confidence`;
  if (report.verdict === "POSITIVE") return "supports alpha momentum";
  return "keeps observe verdict grounded";
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
