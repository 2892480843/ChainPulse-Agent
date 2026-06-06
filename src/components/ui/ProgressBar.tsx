export function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
        <span>Progress</span>
        <span>{label}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div className="progress-fill h-full rounded-full bg-blue-600" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
