"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { Toast } from "@/components/ui/Toast";

interface AppActions {
  copiedKey: string;
  notify: (message: string) => void;
  copyText: (text: string, label: string) => Promise<void>;
  downloadJson: (filename: string, data: unknown) => void;
}

const AppActionsContext = createContext<AppActions | null>(null);

export function useAppActions() {
  const context = useContext(AppActionsContext);
  if (!context) {
    throw new Error("useAppActions must be used inside AppShell");
  }
  return context;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState("");
  const [copiedKey, setCopiedKey] = useState("");

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }, []);

  const copyText = useCallback(async (text: string, label: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      // Clipboard may be unavailable in preview and test contexts.
    }
    setCopiedKey(label);
    notify("已复制");
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
      notify("已下载 mock JSON");
    } catch {
      notify("已生成 mock JSON");
    }
  }, [notify]);

  const actions = useMemo<AppActions>(() => ({ copiedKey, notify, copyText, downloadJson }), [copiedKey, copyText, downloadJson, notify]);

  return (
    <AppActionsContext.Provider value={actions}>
      <a className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-blue-700 focus:shadow" href="#main-content">
        跳到主内容
      </a>
      <div className="grid min-h-[100dvh] grid-cols-[280px_1fr] bg-slate-100 text-slate-950">
        <Sidebar />
        <div className="flex min-w-0 flex-col">
          <Header />
          <main id="main-content" className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8" tabIndex={-1}>
            <div className="mx-auto max-w-[1400px] animate-panel">{children}</div>
          </main>
          <Footer />
        </div>
        {toast ? <Toast message={toast} /> : null}
      </div>
    </AppActionsContext.Provider>
  );
}
