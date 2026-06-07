"use client";

import { useContext } from "react";
import clsx from "clsx";
import { AppActionsContext } from "@/components/shell/AppContext";

const statusConfig: Record<string, { cls: string; en: string; zh: string }> = {
  Running: { cls: "bg-blue-50 text-blue-700 ring-blue-100", en: "Running", zh: "运行中" },
  Completed: { cls: "bg-emerald-50 text-emerald-700 ring-emerald-100", en: "Completed", zh: "已完成" },
  已完成: { cls: "bg-emerald-50 text-emerald-700 ring-emerald-100", en: "Completed", zh: "已完成" },
  已上链: { cls: "bg-emerald-50 text-emerald-700 ring-emerald-100", en: "Attested", zh: "已上链 ✓" },
  未上链: { cls: "bg-orange-50 text-orange-700 ring-orange-100", en: "Pending proof", zh: "待上链" },
  Cancelled: { cls: "bg-slate-100 text-slate-600 ring-slate-200", en: "Cancelled", zh: "已取消" },
  Failed: { cls: "bg-red-50 text-red-700 ring-red-100", en: "Failed", zh: "失败" }
};

export function StatusBadge({ status }: { status: string }) {
  const ctx = useContext(AppActionsContext);
  const language = ctx?.language ?? "en";
  const config = statusConfig[status];
  if (!config) {
    return <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">{status}</span>;
  }
  return (
    <span className={clsx("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 transition-colors", config.cls)}>
      {language === "zh" ? config.zh : config.en}
    </span>
  );
}
