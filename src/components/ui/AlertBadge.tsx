import clsx from "clsx";
import type { WatchlistTarget } from "@/lib/types";

export function AlertBadge({ state }: { state: WatchlistTarget["alertState"] }) {
  const cls =
    state === "Normal"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : state === "Warning"
        ? "bg-orange-50 text-orange-700 ring-orange-100"
        : "bg-red-50 text-red-700 ring-red-100";

  return <span className={clsx("rounded-full px-2.5 py-1 text-xs font-medium ring-1", cls)}>{state}</span>;
}
