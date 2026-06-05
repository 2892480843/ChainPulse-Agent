import clsx from "clsx";
import { cardClass } from "./styles";

export function InfoPanel({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <div className={clsx(cardClass, "p-4")}>
      <h2 className="mb-3 text-sm font-semibold text-slate-950">{title}</h2>
      <dl className="space-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="text-slate-500">{label}</dt>
            <dd className="mono truncate text-right text-slate-900" spellCheck={false}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
