import clsx from "clsx";

export function TokenIcon({ symbol }: { symbol: string }) {
  const normalized = symbol === "Uniswap" ? "UNI" : symbol === "MakerDAO" ? "MKR" : symbol === "Curve" ? "CRV" : symbol.replace("$", "").slice(0, 4).toUpperCase();
  const gradient = tokenPalette[normalized] ?? fallbackPalette[hashSymbol(normalized) % fallbackPalette.length];

  return <span className={clsx("grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br text-[11px] font-semibold text-white shadow-sm", gradient)}>{normalized.slice(0, 3)}</span>;
}

const tokenPalette: Record<string, string> = {
  ETH: "from-blue-600 to-cyan-400",
  BTC: "from-orange-500 to-yellow-300",
  SOL: "from-emerald-500 to-violet-500",
  ZEC: "from-amber-600 to-yellow-300",
  AAVE: "from-purple-500 to-cyan-400",
  UNI: "from-pink-500 to-fuchsia-400",
  MKR: "from-teal-600 to-emerald-300",
  CRV: "from-red-500 to-blue-500"
};

const fallbackPalette = [
  "from-slate-700 to-slate-400",
  "from-blue-700 to-emerald-400",
  "from-rose-600 to-orange-400",
  "from-violet-600 to-sky-400",
  "from-teal-700 to-lime-400"
];

function hashSymbol(value: string) {
  return [...value].reduce((sum, char) => sum + char.charCodeAt(0), 0);
}
