import { CopyButton } from "./CopyButton";

export function HashRow({
  label,
  value,
  onCopy,
  copiedKey
}: {
  label: string;
  value: string;
  onCopy: (text: string, label: string) => void;
  copiedKey: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <CopyButton label={label} copied={copiedKey === label} onClick={() => onCopy(value, label)} />
      </div>
      <p className="mono break-all text-xs text-slate-700" spellCheck={false}>
        {value}
      </p>
    </div>
  );
}
