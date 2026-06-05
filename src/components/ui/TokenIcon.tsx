import clsx from "clsx";
import { tokenPalette } from "@/lib/mock-data";

export function TokenIcon({ symbol }: { symbol: string }) {
  const normalized = symbol === "Uniswap" ? "UNI" : symbol === "MakerDAO" ? "MKR" : symbol === "Curve" ? "CRV" : symbol.replace("$", "").slice(0, 4).toUpperCase();
  const gradient = tokenPalette[normalized] ?? "from-slate-500 to-slate-300";

  return <span className={clsx("grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br text-[11px] font-semibold text-white shadow-sm", gradient)}>{normalized.slice(0, 3)}</span>;
}
