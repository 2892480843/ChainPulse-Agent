import { InboxIcon } from "lucide-react";

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="grid place-items-center p-12 text-center animate-fade-in">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-slate-100 text-slate-400">
        <InboxIcon aria-hidden className="h-7 w-7" />
      </span>
      <p className="mt-4 font-semibold text-slate-700">{title}</p>
      <p className="mt-1.5 max-w-xs text-sm leading-6 text-slate-500">{detail}</p>
    </div>
  );
}
