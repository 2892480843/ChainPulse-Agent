"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ShieldCheck, Wallet } from "lucide-react";
import { AppActionsContext, type AppActions } from "./AppContext";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { OnboardingGuide } from "./OnboardingGuide";
import { Sidebar } from "./Sidebar";
import { PageHeading } from "@/components/ui/PageHeading";
import { Toast } from "@/components/ui/Toast";
import { cardClass, primaryButtonClass } from "@/components/ui/styles";
import { getBrowserWallet, parseHexChainId, readCachedWalletConnection, readWalletConnection, shortAddress, type WalletConnection } from "@/lib/adapters/wallet-client";
import { defaultLanguage, parseLanguage, translate, type AppLanguage, type I18nKey } from "@/lib/i18n";

export { useAppActions } from "./AppContext";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState("");
  const [copiedKey, setCopiedKey] = useState("");
  const [language, setLanguageState] = useState<AppLanguage>(defaultLanguage);
  const [walletConnection, setWalletConnection] = useState<WalletConnection>({ status: "checking" });
  const walletConnected = walletConnection.status === "connected";

  useEffect(() => {
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  }, [language]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setLanguageState(parseLanguage(readLocalStorage("chainpulse:language")));
      setWalletConnection(readCachedWalletConnection());
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }, []);

  const setLanguage = useCallback((nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage);
    document.documentElement.lang = nextLanguage === "zh" ? "zh-CN" : "en";
    writeLocalStorage("chainpulse:language", nextLanguage);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === "en" ? "zh" : "en");
  }, [language, setLanguage]);

  const t = useCallback((key: I18nKey) => translate(language, key), [language]);

  const refreshWalletConnection = useCallback(async (requestAccounts: boolean) => {
    const connection = await readWalletConnection(requestAccounts);
    setWalletConnection(connection);
    return connection;
  }, []);

  useEffect(() => {
    let cancelled = false;
    readWalletConnection(false).then((connection) => {
      if (!cancelled) setWalletConnection(connection);
    });

    const ethereum = getBrowserWallet();
    if (!ethereum) {
      return () => {
        cancelled = true;
      };
    }

    const handleAccountsChanged = (accounts: unknown) => {
      const nextAccounts = Array.isArray(accounts) ? accounts.map(String) : [];
      const address = nextAccounts[0];
      setWalletConnection((current) => (address ? { status: "connected", address, chainId: current.chainId } : { status: "disconnected", chainId: current.chainId }));
    };
    const handleChainChanged = (chainId: unknown) => {
      const parsedChainId = typeof chainId === "string" ? parseHexChainId(chainId) : undefined;
      setWalletConnection((current) => {
        if (current.status === "connected") return { ...current, chainId: parsedChainId };
        return { status: "disconnected", chainId: parsedChainId };
      });
    };

    ethereum.on?.("accountsChanged", handleAccountsChanged);
    ethereum.on?.("chainChanged", handleChainChanged);

    return () => {
      cancelled = true;
      ethereum.removeListener?.("accountsChanged", handleAccountsChanged);
      ethereum.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [refreshWalletConnection]);

  const connectWallet = useCallback(async () => {
    const connection = await refreshWalletConnection(true);
    if (connection.status === "connected") {
      notify(`${t("walletGate.connected")}: ${shortAddress(connection.address)}`);
    } else {
      notify(connection.error ?? t("walletGate.disconnected"));
    }
    return connection;
  }, [notify, refreshWalletConnection, t]);

  const copyText = useCallback(async (text: string, label: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      // Clipboard may be unavailable in preview and test contexts.
    }
    setCopiedKey(label);
    notify("Copied");
    window.setTimeout(() => setCopiedKey(""), 1600);
  }, [notify]);

  const downloadJson = useCallback((filename: string, data: unknown) => {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
      notify("JSON exported");
    } catch {
      notify("JSON export prepared");
    }
  }, [notify]);

  const actions = useMemo<AppActions>(
    () => ({ copiedKey, notify, copyText, downloadJson, language, setLanguage, toggleLanguage, t, walletConnection, walletConnected, connectWallet }),
    [connectWallet, copiedKey, copyText, downloadJson, language, notify, setLanguage, t, toggleLanguage, walletConnected, walletConnection]
  );
  const shouldGateMainContent = !walletConnected;

  return (
    <AppActionsContext.Provider value={actions}>
      <a className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-blue-700 focus:shadow" href="#main-content">
        {t("shell.skip")}
      </a>
      <div className="min-h-[100dvh] bg-[#f7f9fc] text-slate-950 lg:grid lg:grid-cols-[280px_1fr]">
        <Sidebar />
        <div className="flex min-w-0 flex-col">
          <Header />
          <main id="main-content" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8" tabIndex={-1}>
            <div className="mx-auto max-w-[1400px] animate-panel">
              {shouldGateMainContent ? <WalletFirstGate connection={walletConnection} connectWallet={connectWallet} t={t} /> : children}
            </div>
          </main>
          <Footer />
        </div>
        {toast ? <Toast message={toast} /> : null}
        <OnboardingGuide />
      </div>
    </AppActionsContext.Provider>
  );
}

function WalletFirstGate({
  connection,
  connectWallet,
  t
}: {
  connection: WalletConnection;
  connectWallet: () => Promise<WalletConnection>;
  t: (key: I18nKey) => string;
}) {
  const statusLabel = getWalletStatusLabel(connection, t);

  return (
    <section className="space-y-5">
      <PageHeading eyebrow={t("walletGate.eyebrow")} title={t("walletGate.title")} description={t("walletGate.description")} />

      <div className={`${cardClass} overflow-hidden`}>
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                <Wallet aria-hidden className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-slate-950">{t("attestation.walletGateTitle")}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{t("walletGate.detail")}</p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button className={primaryButtonClass} type="button" onClick={connectWallet}>
                <Wallet aria-hidden className="h-4 w-4" />
                {t("walletGate.connect")}
              </button>
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">{statusLabel}</span>
            </div>
          </div>

          <div className="border-t border-slate-200 bg-slate-50 p-5 lg:border-l lg:border-t-0">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                <ShieldCheck aria-hidden className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-950">{t("walletGate.proofTitle")}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{t("walletGate.proofDetail")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function getWalletStatusLabel(connection: WalletConnection, t: (key: I18nKey) => string) {
  if (connection.status === "connected") return `${t("walletGate.connected")} ${shortAddress(connection.address)}${connection.chainId ? ` / ${connection.chainId}` : ""}`;
  if (connection.status === "disconnected") return connection.chainId ? `${t("walletGate.disconnected")} / ${connection.chainId}` : t("walletGate.disconnected");
  if (connection.status === "checking") return t("walletGate.detected");
  return t("walletGate.missing");
}

function readLocalStorage(key: string) {
  if (typeof window === "undefined") return null;
  try {
    const storage = window.localStorage;
    return typeof storage?.getItem === "function" ? storage.getItem(key) : null;
  } catch {
    return null;
  }
}

function writeLocalStorage(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    const storage = window.localStorage;
    if (typeof storage?.setItem === "function") storage.setItem(key, value);
  } catch {
    // Local storage can be unavailable in embedded preview and test contexts.
  }
}
