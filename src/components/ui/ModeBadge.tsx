"use client";

import { useContext } from "react";
import clsx from "clsx";
import { AppActionsContext } from "@/components/shell/AppContext";
import type { ScanMode } from "@/lib/types";

const modeConfig: Record<ScanMode, { cls: string; en: string; zh: string }> = {
  "Risk Scan": { cls: "bg-orange-50 text-orange-700 ring-orange-100", en: "Risk Scan", zh: "风险扫描" },
  "Alpha Scan": { cls: "bg-blue-50 text-blue-700 ring-blue-100", en: "Alpha Scan", zh: "Alpha 扫描" },
  "DAO 尽调": { cls: "bg-purple-50 text-purple-700 ring-purple-100", en: "DAO Due Diligence", zh: "DAO 尽调" }
};

export function ModeBadge({ mode }: { mode: ScanMode }) {
  const ctx = useContext(AppActionsContext);
  const language = ctx?.language ?? "en";
  const config = modeConfig[mode] ?? modeConfig["Risk Scan"];
  return (
    <span className={clsx("inline-flex items-center justify-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold leading-none ring-1 transition-colors", config.cls)}>
      {language === "zh" ? config.zh : config.en}
    </span>
  );
}
