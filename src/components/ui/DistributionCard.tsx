import clsx from "clsx";
import { cardClass } from "./styles";

export function DistributionCard({ title, rows }: { title: string; rows: Array<[string, number]> }) {
  const total = Math.max(rows.reduce((sum, [, value]) => sum + value, 0), 1);

  return (
    <div className={clsx(cardClass, "p-4")}>
      <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
      <div className="mt-3 space-y-3">
        {rows.map(([label, value]) => (
          <div key={label}>
            <div className="mb-1 flex justify-between text-xs text-slate-500">
              <span>{label}</span>
              <span>{value}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-blue-500" style={{ width: `${(value / total) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
