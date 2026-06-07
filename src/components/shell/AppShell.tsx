"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppActionsContext, type AppActions } from "./AppContext";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { OnboardingGuide } from "./OnboardingGuide";
import { Sidebar } from "./Sidebar";
import { Toast } from "@/components/ui/Toast";
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
              {children}
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
