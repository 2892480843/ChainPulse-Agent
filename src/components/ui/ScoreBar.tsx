import clsx from "clsx";

export function ScoreBar({ value }: { value: number }) {
  const color = value >= 70 ? "bg-red-500" : value >= 50 ? "bg-orange-500" : "bg-emerald-500";

  return (
    <div className="min-w-28">
      <div className="mb-1 flex justify-between text-xs text-slate-500">
        <span>{value}</span>
        <span>/100</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div className={clsx("h-full rounded-full", color)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
