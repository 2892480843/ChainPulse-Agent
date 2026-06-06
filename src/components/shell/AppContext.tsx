"use client";

import { createContext, useContext } from "react";
import type { AppLanguage, I18nKey } from "@/lib/i18n";
import type { WalletConnection } from "@/lib/adapters/wallet-client";

export interface AppActions {
  copiedKey: string;
  notify: (message: string) => void;
  copyText: (text: string, label: string) => Promise<void>;
  downloadJson: (filename: string, data: unknown) => void;
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  toggleLanguage: () => void;
  t: (key: I18nKey) => string;
  walletConnection: WalletConnection;
  walletConnected: boolean;
  connectWallet: () => Promise<WalletConnection>;
}

export const AppActionsContext = createContext<AppActions | null>(null);

export function useAppActions() {
  const context = useContext(AppActionsContext);
  if (!context) {
    throw new Error("useAppActions must be used inside AppShell");
  }
  return context;
}
