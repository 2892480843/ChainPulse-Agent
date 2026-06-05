export function SectionHeader({ title, action }: { title: string; action?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
      <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
      {action ? <span className="text-xs text-slate-500">{action}</span> : null}
    </div>
  );
}
