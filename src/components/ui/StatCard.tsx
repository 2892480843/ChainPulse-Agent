import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import { cardClass } from "./styles";

export function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  tone
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  tone: "blue" | "green" | "orange";
}) {
  const color = {
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    orange: "bg-amber-50 text-amber-700 ring-amber-100"
  }[tone];

  return (
    <div className={clsx(cardClass, "p-4")}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{detail}</p>
        </div>
        <span className={clsx("grid h-10 w-10 place-items-center rounded-lg ring-1", color)}>
          <Icon aria-hidden className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}
