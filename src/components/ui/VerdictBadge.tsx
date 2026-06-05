import clsx from "clsx";
import type { Verdict } from "@/lib/types";

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const cls =
    verdict === "POSITIVE"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : verdict === "OBSERVE"
        ? "bg-blue-50 text-blue-700 ring-blue-100"
        : verdict === "CAUTION"
          ? "bg-orange-50 text-orange-700 ring-orange-100"
          : "bg-red-50 text-red-700 ring-red-100";

  return <span className={clsx("rounded-full px-2.5 py-1 text-xs font-medium ring-1", cls)}>{verdict}</span>;
}
