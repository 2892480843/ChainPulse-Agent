import { XCircle } from "lucide-react";

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="grid place-items-center p-10 text-center">
      <XCircle aria-hidden className="h-8 w-8 text-slate-300" />
      <p className="mt-3 font-medium text-slate-800">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{detail}</p>
    </div>
  );
}
