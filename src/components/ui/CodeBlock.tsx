import { Code2 } from "lucide-react";

export function CodeBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-950">
        <Code2 aria-hidden className="h-4 w-4 text-slate-400" />
        {title}
      </div>
      <pre className="mono thin-scrollbar max-h-72 overflow-auto rounded-lg bg-slate-950 p-4 text-xs leading-5 text-slate-100" spellCheck={false}>
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
