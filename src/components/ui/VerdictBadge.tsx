"use client";

import { useContext } from "react";
import clsx from "clsx";
import { AppActionsContext } from "@/components/shell/AppContext";
import type { Verdict } from "@/lib/types";

const verdictConfig: Record<Verdict, { cls: string; en: string; zh: string }> = {
  POSITIVE: { cls: "bg-emerald-50 text-emerald-700 ring-emerald-100", en: "POSITIVE", zh: "看多" },
  OBSERVE: { cls: "bg-blue-50 text-blue-700 ring-blue-100", en: "OBSERVE", zh: "观察" },
  CAUTION: { cls: "bg-orange-50 text-orange-700 ring-orange-100", en: "CAUTION", zh: "谨慎" },
  NEGATIVE: { cls: "bg-red-50 text-red-700 ring-red-100", en: "NEGATIVE", zh: "看空" }
};

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const ctx = useContext(AppActionsContext);
  const language = ctx?.language ?? "en";
  const config = verdictConfig[verdict] ?? verdictConfig.OBSERVE;
  return (
    <span className={clsx("rounded-full px-2.5 py-1 text-xs font-semibold ring-1 transition-colors", config.cls)}>
      {language === "zh" ? config.zh : config.en}
    </span>
  );
}
