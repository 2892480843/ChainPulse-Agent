"use client";

import clsx from "clsx";
import { FileJson, Fingerprint, Network, PackageCheck, Search, ShieldCheck } from "lucide-react";
import { useAppActions } from "@/components/shell/AppShell";
import { cardClass } from "./styles";

export interface ProofChainProps {
  topic: string;
  mode: string;
  actions: string[];
  evidenceCount: number;
  reportHash: string;
  evidenceHash: string;
  txHash?: string;
  attested: boolean;
  compact?: boolean;
}

export function ProofChain({
  topic,
  mode,
  actions,
  evidenceCount,
  reportHash,
  evidenceHash,
  txHash,
  attested,
  compact = false
}: ProofChainProps) {
  let language: "en" | "zh" = "en";
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const ctx = useAppActions();
    language = ctx.language;
  } catch {
    // outside AppShell
  }

  const isZh = language === "zh";
  const nodes = [
    {
      label: isZh ? "用户查询" : "User Query",
      detail: `${topic} / ${mode}`,
      status: isZh ? "意图解析" : "intent parsed",
      icon: Search
    },
    {
      label: "xAPI Actions",
      detail: actions.length > 0 ? actions.slice(0, 2).join(", ") : (isZh ? "已发现动作" : "actions discovered"),
      status: isZh ? `${actions.length} 个动作` : `${actions.length} actions`,
      icon: Network
    },
    {
      label: isZh ? "证据包" : "Evidence Packet",
      detail: isZh ? "规范化证据" : "normalized evidence",
      status: isZh ? `${evidenceCount} 条证据` : `${evidenceCount} evidence items`,
      icon: PackageCheck
    },
    {
      label: "Report JSON",
      detail: isZh ? "风险、Alpha、推理" : "risk, alpha, rationale",
      status: isZh ? "报告已生成" : "report generated",
      icon: FileJson
    },
    {
      label: isZh ? "报告哈希 / 证据哈希" : "Report Hash / Evidence Hash",
      detail: `${shortHash(reportHash)} / ${shortHash(evidenceHash)}`,
      status: reportHash && evidenceHash ? (isZh ? "哈希就绪" : "hash ready") : (isZh ? "哈希等待中" : "hash pending"),
      icon: Fingerprint
    },
    {
      label: isZh ? "链上证明" : "On-chain Attestation",
      detail: txHash ? shortHash(txHash) : (isZh ? "等待交易" : "waiting for tx"),
      status: attested ? (isZh ? "已确认" : "tx confirmed") : (isZh ? "未上链" : "not attested"),
      icon: ShieldCheck
    }
  ];

  return (
    <div className={clsx(cardClass, compact ? "p-3 sm:p-4" : "p-4 sm:p-5")}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">
            {compact ? (isZh ? "证明链摘要" : "Proof Chain Summary") : (isZh ? "证明链" : "Proof Chain")}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {isZh ? "用户意图 → xAPI 证据 → 报告哈希 → 链上证明。" : "User intent → xAPI evidence → report hashes → on-chain proof."}
          </p>
        </div>
        <span className={clsx("rounded-full px-2.5 py-1 text-xs font-semibold", attested ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100" : "bg-amber-50 text-amber-700 ring-1 ring-amber-100")}>
          {attested ? (isZh ? "已上链" : "Attested") : (isZh ? "草稿" : "Draft")}
        </span>
      </div>
      <div className="relative mt-5 pb-1">
        <div className="absolute left-[8%] right-[8%] top-5 hidden h-px bg-slate-200 xl:block" aria-hidden />
        <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {nodes.map((node, index) => {
            const Icon = node.icon;
            return (
              <li key={node.label} className="relative grid grid-cols-[44px_1fr] gap-3 rounded-lg border border-slate-200 bg-white p-3 xl:grid-cols-1 xl:border-0 xl:bg-transparent xl:p-0 xl:text-center">
                <span
                  className={clsx(
                    "relative z-10 grid h-10 w-10 place-items-center rounded-full border bg-white shadow-sm xl:mx-auto",
                    index === nodes.length - 1 && attested ? "border-emerald-200 text-emerald-700 ring-4 ring-emerald-50" : "border-slate-200 text-blue-700 ring-4 ring-slate-50"
                  )}
                >
                  <Icon aria-hidden className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-950">{node.label}</p>
                  <p className="mt-1 text-[11px] font-semibold uppercase text-slate-500">{node.status}</p>
                  <p className="mono mt-1 truncate text-xs text-slate-500" spellCheck={false}>
                    {node.detail}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function shortHash(value?: string) {
  if (!value) return "pending";
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}
