export function SectionHeader({ title, action }: { title: string; action?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200/80 bg-slate-50/60 px-4 py-3">
      <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
      {action ? <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200">{action}</span> : null}
    </div>
  );
}
