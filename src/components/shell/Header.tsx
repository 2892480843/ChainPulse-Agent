"use client";

import Link from "next/link";
import { Bell, Languages, Wallet } from "lucide-react";
import { GlobalSearch } from "./GlobalSearch";
import { useAppActions } from "./AppContext";
import { shortAddress } from "@/lib/adapters/wallet-client";

export function Header() {
  const { connectWallet, language, t, toggleLanguage, walletConnection, walletConnected } = useAppActions();
  const walletLabel = walletConnection.status === "connected" ? `${t("header.connectedWallet")} ${shortAddress(walletConnection.address)}` : t("header.connectWallet");

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 px-4 py-2.5 backdrop-blur sm:px-6 sm:py-3 lg:px-8">
      <div className="mx-auto flex max-w-[1400px] items-center gap-2 md:justify-between">
        <GlobalSearch />
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 md:inline-flex">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            {t("header.operational")}
          </span>
          <button className="inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100" type="button" aria-label={t("language.switch")} onClick={toggleLanguage} data-language={language}>
            <Languages aria-hidden className="h-4 w-4" />
            <span>{t("language.next")}</span>
          </button>
          <button
            className="inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-sm font-semibold text-blue-700 transition-colors duration-200 hover:border-blue-300 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
            type="button"
            aria-label={walletConnected ? t("header.connectedWallet") : t("header.connectWallet")}
            onClick={connectWallet}
          >
            <Wallet aria-hidden className="h-4 w-4" />
            <span className="hidden sm:inline">{walletLabel}</span>
          </button>
          <button className="hidden h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-colors duration-200 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 sm:inline-flex" type="button" aria-label={t("header.notifications")}>
            <Bell aria-hidden className="h-4 w-4" />
          </button>
          <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 xl:flex">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-blue-600 text-xs font-semibold text-white">W</span>
            <div>
              <p className="text-xs font-semibold text-slate-900">Web3 Researcher</p>
              <p className="text-[11px] text-slate-500">{t("header.operatorWorkspace")}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
