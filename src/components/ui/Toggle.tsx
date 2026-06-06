"use client";

import { useState } from "react";
import clsx from "clsx";

export function Toggle({ label, defaultChecked = false, name }: { label: string; defaultChecked?: boolean; name: string }) {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      name={name}
      className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 active:scale-[0.99]"
      onClick={() => setChecked((value) => !value)}
    >
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <span className={clsx("relative h-6 w-11 rounded-full transition-colors", checked ? "bg-blue-600" : "bg-slate-300")}>
        <span className={clsx("absolute top-1 h-4 w-4 rounded-full bg-white transition-transform", checked ? "translate-x-6" : "translate-x-1")} />
      </span>
    </button>
  );
}
