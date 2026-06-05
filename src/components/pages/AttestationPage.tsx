"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { Check, Download, ExternalLink } from "lucide-react";
import { mockAttestationClient, type AttestationRecord } from "@/lib/adapters/attestation-client";
import { attestation, reports } from "@/lib/mock-data";
import { useAppActions } from "@/components/shell/AppShell";
import { CopyButton } from "@/components/ui/CopyButton";
import { HashRow } from "@/components/ui/HashRow";
import { InfoPanel } from "@/components/ui/InfoPanel";
import { PageHeading } from "@/components/ui/PageHeading";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { buttonClass, cardClass, primaryButtonClass } from "@/components/ui/styles";

const explorerBaseUrl = process.env.NEXT_PUBLIC_EXPLORER_BASE_URL || "https://sepolia.etherscan.io";

export function AttestationPage() {
  const { copiedKey, copyText, downloadJson, notify } = useAppActions();
  const [record, setRecord] = useState<AttestationRecord>(attestation);
  const steps = ["生成报告", "生成哈希", "钱包签名", "提交交易", "链上确认"];

  useEffect(() => {
    let cancelled = false;
    mockAttestationClient
      .getAttestation(reports[0].id)
      .then((result) => {
        if (!cancelled) setRecord(result);
      })
      .catch(() => notify("attestation mock adapter 读取失败"));
    return () => {
      cancelled = true;
    };
  }, [notify]);

  function openExplorer() {
    window.open(`${explorerBaseUrl.replace(/\/$/, "")}/tx/${record.txHash}`, "_blank", "noopener,noreferrer");
    notify("已打开 explorer 链接");
  }

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
              <button className={buttonClass} type="button" onClick={openExplorer}>
                <ExternalLink aria-hidden className="h-4 w-4" />
                查看区块浏览器
              </button>
              <button className={primaryButtonClass} type="button" onClick={() => downloadJson("attestation-credential.json", record)}>
                <Download aria-hidden className="h-4 w-4" />
                下载证明凭证
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <HashRow label="Report Hash" value={record.reportHash} onCopy={copyText} copiedKey={copiedKey} />
            <HashRow label="Evidence Hash" value={record.evidenceHash} onCopy={copyText} copiedKey={copiedKey} />
            <HashRow label="Tx Hash" value={record.txHash} onCopy={copyText} copiedKey={copiedKey} />
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
            <InfoPanel title="证明详情" rows={[["Wallet Address", record.walletAddress], ["Block", record.block], ["Timestamp", record.timestamp]]} />
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
              {reports
                .filter((report) => report.status === "已上链")
                .map((report) => (
                  <div key={report.id} className="p-4">
                    <p className="font-medium text-slate-900">{report.title}</p>
                    <div className="mt-2 grid gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="mono truncate text-xs text-slate-500" spellCheck={false}>
                          {report.reportHash}
                        </p>
                        <CopyButton label={`${report.title} Report Hash`} copied={copiedKey === `${report.title} Report Hash`} onClick={() => copyText(report.reportHash, `${report.title} Report Hash`)} />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="mono truncate text-xs text-slate-500" spellCheck={false}>
                          {record.txHash}
                        </p>
                        <CopyButton label={`${report.title} Tx Hash`} copied={copiedKey === `${report.title} Tx Hash`} onClick={() => copyText(record.txHash, `${report.title} Tx Hash`)} />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
