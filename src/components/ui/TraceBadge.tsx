import clsx from "clsx";
import type { TraceStatus } from "@/lib/types";

export function TraceBadge({ status }: { status: TraceStatus }) {
  const map = {
    success: ["success", "bg-emerald-50 text-emerald-700 ring-emerald-100"],
    failed: ["failed", "bg-red-50 text-red-700 ring-red-100"],
    running: ["running", "bg-blue-50 text-blue-700 ring-blue-100"],
    fallback: ["fallback", "bg-amber-50 text-amber-700 ring-amber-100"]
  } as const;

  return <span className={clsx("rounded-full px-2.5 py-1 text-xs font-medium ring-1", map[status][1])}>{map[status][0]}</span>;
}
