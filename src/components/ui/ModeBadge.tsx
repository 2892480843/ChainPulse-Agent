import clsx from "clsx";
import type { ScanMode } from "@/lib/types";

export function ModeBadge({ mode }: { mode: ScanMode }) {
  const cls =
    mode === "DAO 尽调"
      ? "bg-purple-50 text-purple-700 ring-purple-100"
      : mode === "Risk Scan"
        ? "bg-orange-50 text-orange-700 ring-orange-100"
        : "bg-blue-50 text-blue-700 ring-blue-100";

  return <span className={clsx("rounded-full px-2.5 py-1 text-xs font-medium ring-1", cls)}>{mode}</span>;
}
