import clsx from "clsx";

export function ScoreBar({ value }: { value: number }) {
  const color = value >= 70 ? "bg-red-500" : value >= 50 ? "bg-orange-400" : "bg-emerald-500";
  const textColor = value >= 70 ? "text-red-600 font-bold" : value >= 50 ? "text-orange-600 font-semibold" : "text-emerald-700 font-semibold";

  return (
    <div className="min-w-[96px]">
      <div className="mb-1 flex justify-between text-xs">
        <span className={clsx("tabular-nums", textColor)}>{value}</span>
        <span className="text-slate-400">/100</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className={clsx("h-full rounded-full progress-fill", color)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
