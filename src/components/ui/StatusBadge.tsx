import clsx from "clsx";

export function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "Running"
      ? "bg-blue-50 text-blue-700 ring-blue-100"
      : status === "Completed" || status === "已完成" || status === "已上链"
        ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
        : status === "未上链"
          ? "bg-orange-50 text-orange-700 ring-orange-100"
          : status === "Cancelled"
            ? "bg-slate-100 text-slate-600 ring-slate-200"
            : "bg-red-50 text-red-700 ring-red-100";

  return <span className={clsx("inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1", cls)}>{status}</span>;
}
