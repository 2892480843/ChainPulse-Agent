import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import { cardClass } from "./styles";

export function SettingsCard({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className={clsx(cardClass, "p-4 sm:p-5")}>
      <div className="mb-4 flex items-center gap-2">
        <Icon aria-hidden className="h-4 w-4 text-blue-600" />
        <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
      </div>
      {children}
    </div>
  );
}
