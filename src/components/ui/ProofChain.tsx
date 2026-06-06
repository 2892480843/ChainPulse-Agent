import clsx from "clsx";
import { FileJson, Fingerprint, Network, PackageCheck, Search, ShieldCheck } from "lucide-react";
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
  const nodes = [
    {
      label: "User Query",
      detail: `${topic} / ${mode}`,
      status: "intent parsed",
      icon: Search
    },
    {
      label: "xAPI Actions",
      detail: actions.length > 0 ? actions.slice(0, 2).join(", ") : "actions discovered",
      status: `${actions.length} actions`,
      icon: Network
    },
    {
      label: "Evidence Packet",
      detail: "normalized evidence",
      status: `${evidenceCount} evidence items`,
      icon: PackageCheck
    },
    {
      label: "Report JSON",
      detail: "risk, alpha, rationale",
      status: "report generated",
      icon: FileJson
    },
    {
      label: "Report Hash / Evidence Hash",
      detail: `${shortHash(reportHash)} / ${shortHash(evidenceHash)}`,
      status: reportHash && evidenceHash ? "hash ready" : "hash pending",
      icon: Fingerprint
    },
    {
      label: "On-chain Attestation",
      detail: txHash ? shortHash(txHash) : "waiting for tx",
      status: attested ? "tx confirmed" : "not attested",
      icon: ShieldCheck
    }
  ];

  return (
    <div className={clsx(cardClass, compact ? "p-3 sm:p-4" : "p-4 sm:p-5")}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">{compact ? "Proof Chain Summary" : "Proof Chain"}</h2>
          <p className="mt-1 text-xs text-slate-500">{"User intent -> xAPI evidence -> report hashes -> on-chain proof."}</p>
        </div>
        <span className={clsx("rounded-full px-2.5 py-1 text-xs font-semibold", attested ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100" : "bg-amber-50 text-amber-700 ring-1 ring-amber-100")}>
          {attested ? "Attested" : "Draft"}
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
