import { Code2 } from "lucide-react";

export function CodeBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-950">
        <Code2 aria-hidden className="h-4 w-4 text-slate-500" />
        {title}
      </div>
      <pre className="mono thin-scrollbar max-h-72 overflow-auto bg-slate-50 p-4 text-xs leading-5 text-slate-700" spellCheck={false}>
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
