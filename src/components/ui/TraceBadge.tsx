"use client";

import { useContext } from "react";
import clsx from "clsx";
import { AppActionsContext } from "@/components/shell/AppContext";
import type { TraceStatus } from "@/lib/types";

const traceConfig: Record<TraceStatus, { cls: string; en: string; zh: string }> = {
  success: { cls: "bg-emerald-50 text-emerald-700 ring-emerald-100", en: "success", zh: "成功" },
  failed: { cls: "bg-red-50 text-red-700 ring-red-100", en: "failed", zh: "失败" },
  running: { cls: "bg-blue-50 text-blue-700 ring-blue-100", en: "running", zh: "运行中" },
  fallback: { cls: "bg-amber-50 text-amber-700 ring-amber-100", en: "fallback", zh: "降级" }
};

export function TraceBadge({ status }: { status: TraceStatus }) {
  const ctx = useContext(AppActionsContext);
  const language = ctx?.language ?? "en";
  const config = traceConfig[status] ?? traceConfig.fallback;
  return (
    <span className={clsx("rounded-full px-2.5 py-1 text-xs font-semibold ring-1 transition-colors", config.cls)}>
      {language === "zh" ? config.zh : config.en}
    </span>
  );
}
