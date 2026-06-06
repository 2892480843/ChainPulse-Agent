"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Bell, Check, Code2, Eye, EyeOff, KeyRound, LockKeyhole, LogOut, Shield, ShieldCheck, User, Wallet } from "lucide-react";
import { fetchAiHealth } from "@/lib/adapters/ai-client";
import { readAttestationConfig, readBrowserAttestationConfig } from "@/lib/adapters/attestation-client";
import { closeOperatorSession, fetchOperatorSession, openOperatorSession, type OperatorSessionStatus } from "@/lib/adapters/operator-session-client";
import type { AiHealthStatus } from "@/lib/ai-types";
import { useAppActions } from "@/components/shell/AppShell";
import { Field, SelectField } from "@/components/ui/FormFields";
import { InfoPanel } from "@/components/ui/InfoPanel";
import { PageHeading } from "@/components/ui/PageHeading";
import { SettingsCard } from "@/components/ui/SettingsCard";
import { StatCard } from "@/components/ui/StatCard";
import { Toggle } from "@/components/ui/Toggle";
import { buttonClass, inputClass, primaryButtonClass } from "@/components/ui/styles";

export function SettingsPage() {
  const { copiedKey, copyText, notify } = useAppActions();
  const [apiVisible, setApiVisible] = useState(false);
  const [savedAt, setSavedAt] = useState("");
  const [chainConfig, setChainConfig] = useState(() => readAttestationConfig());
  const [aiHealth, setAiHealth] = useState<AiHealthStatus | null>(null);
  const [operatorSession, setOperatorSession] = useState<OperatorSessionStatus | null>(null);
  const [operatorToken, setOperatorToken] = useState("");
  const [operatorBusy, setOperatorBusy] = useState(false);
  const [operatorError, setOperatorError] = useState("");
  const apiKey = "XAPI_KEY is server-side only";
  const contractValue = chainConfig.contractAddress ?? "not configured";
  const explorerValue = chainConfig.explorerBaseUrl ?? "not configured";
  const environmentValue = chainConfig.contractConfigured ? "Sepolia" : "Fallback";
  const environmentDetail = chainConfig.contractConfigured ? "live contract configured" : "chain writes disabled until contract config exists";
  const operatorStatus = operatorSession ? operatorStatusMap[operatorSession.mode] : operatorCheckingStatus;
  const operatorConfigured = operatorSession?.configured ?? true;
  const operatorAuthenticated = operatorSession?.authenticated ?? false;

  useEffect(() => {
    let cancelled = false;
    window.setTimeout(() => {
      if (!cancelled) setChainConfig(readBrowserAttestationConfig());
    }, 0);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchAiHealth()
      .then((health) => {
        if (!cancelled) setAiHealth(health);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchOperatorSession()
      .then((session) => {
        if (!cancelled) setOperatorSession(session);
      })
      .catch(() => {
        if (!cancelled) {
          setOperatorSession({
            configured: true,
            authenticated: false,
            mode: "locked"
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function saveSettings() {
    const timestamp = new Date().toLocaleTimeString("zh-CN", { hour12: false });
    setSavedAt(timestamp);
    notify("Settings saved");
  }

  async function refreshAiHealth() {
    try {
      setAiHealth(await fetchAiHealth());
    } catch {
      setAiHealth(null);
    }
  }

  async function handleOpenOperatorSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = operatorToken.trim();
    if (!token && operatorConfigured) {
      setOperatorError("Enter the operator token.");
      return;
    }

    setOperatorBusy(true);
    setOperatorError("");
    try {
      const session = await openOperatorSession(token);
      setOperatorSession(session);
      setOperatorToken("");
      notify(session.mode === "unconfigured" ? "Operator guard is unconfigured" : "Operator session opened");
      await refreshAiHealth();
    } catch {
      setOperatorError("Invalid operator token.");
      notify("Operator session failed");
    } finally {
      setOperatorBusy(false);
    }
  }

  async function handleCloseOperatorSession() {
    setOperatorBusy(true);
    setOperatorError("");
    try {
      const session = await closeOperatorSession();
      setOperatorSession(session);
      setOperatorToken("");
      notify(session.mode === "unconfigured" ? "Operator guard is unconfigured" : "Operator session closed");
      await refreshAiHealth();
    } catch {
      setOperatorError("Could not close the operator session.");
      notify("Operator session update failed");
    } finally {
      setOperatorBusy(false);
    }
  }

  return (
    <section className="space-y-5">
      <PageHeading
        eyebrow="Configuration"
        title="Settings"
        description="Review account, server-side API, AI provider, Sepolia attestation, notification, and access settings. Secrets stay on the server and are never exposed to the browser."
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="grid gap-5">
          <SettingsCard title="Account" icon={User}>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Display name" name="display-name" defaultValue="Web3 Researcher" />
              <Field label="Workspace" name="workspace-name" defaultValue="ChainPulse Operations" />
            </div>
          </SettingsCard>

          <SettingsCard title="API and secrets" icon={KeyRound}>
            <div className="grid gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="xapi-key">
                  xAPI Key
                </label>
                <div className="flex gap-2">
                  <input
                    id="xapi-key"
                    className={inputClass}
                    name="xapi-key"
                    readOnly
                    type={apiVisible ? "text" : "password"}
                    value={apiKey}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button className={buttonClass} type="button" onClick={() => setApiVisible((value) => !value)} aria-label={apiVisible ? "Hide API Key" : "Show API Key"}>
                    {apiVisible ? <EyeOff aria-hidden className="h-4 w-4" /> : <Eye aria-hidden className="h-4 w-4" />}
                  </button>
                  <button className={buttonClass} type="button" onClick={() => copyText(apiKey, "API Key")} aria-label="Copy API Key">
                    {copiedKey === "API Key" ? <Check aria-hidden className="h-4 w-4" /> : null}
                    copy
                  </button>
                </div>
              </div>
              <Toggle label="Server-side only" name="server-side-only" defaultChecked />
            </div>
          </SettingsCard>

          <SettingsCard title="AI provider" icon={Code2}>
            <div className="grid gap-3 md:grid-cols-3">
              <SelectField label="Reasoning model" name="reasoning-model" options={uniqueOptions([aiHealth?.model ?? "gpt-4.1-mini", "gpt-4.1-mini", "openai-compatible"])} />
              <SelectField label="Evidence threshold" name="evidence-threshold" options={["0.65", "0.75", "0.85"]} />
              <SelectField label="Report language" name="report-language" options={["English", "Chinese", "Bilingual"]} />
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <Field label="AI Provider" name="ai-provider" defaultValue={aiHealth?.provider ?? "checking"} />
              <Field label="AI Base URL" name="ai-base-url" defaultValue={aiHealth?.baseUrl ?? "server-side only"} />
              <Field label="AI Status" name="ai-status" defaultValue={aiHealth ? `${aiHealth.mode} / configured=${aiHealth.configured}` : "checking"} />
            </div>
          </SettingsCard>

          <SettingsCard title="Sepolia attestation" icon={Wallet}>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Network" name="network" defaultValue={chainConfig.chainId ? `Sepolia ${chainConfig.chainId}` : "Sepolia 11155111"} />
              <Field label="Attestation contract" name="attestation-contract" defaultValue={contractValue} />
              <Field label="Explorer" name="explorer-base-url" defaultValue={explorerValue} />
              <Field label="Wallet mode" name="wallet-mode" defaultValue={chainConfig.walletMode} />
            </div>
          </SettingsCard>

          <SettingsCard title="Notifications" icon={Bell}>
            <div className="grid gap-3 md:grid-cols-2">
              <Toggle label="High-risk report alert" name="high-risk-alert" defaultChecked />
              <Toggle label="On-chain confirmation alert" name="attestation-alert" defaultChecked />
              <Toggle label="Daily scan summary" name="daily-summary" />
              <Toggle label="xAPI failure alert" name="xapi-failure-alert" defaultChecked />
            </div>
          </SettingsCard>

          <SettingsCard title="Access and session" icon={Shield}>
            <div className="grid gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Operator session</p>
                  <p className="text-xs text-slate-500">Guarded API routes use an HttpOnly cookie.</p>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${operatorStatus.className}`}>
                  {operatorStatus.label}
                </span>
              </div>

              {operatorConfigured ? (
                <form className="grid gap-3 md:grid-cols-[1fr_auto]" onSubmit={handleOpenOperatorSession}>
                  <label className="grid gap-1">
                    <span className="text-xs font-medium text-slate-600">Operator token</span>
                    <input
                      className={inputClass}
                      type="password"
                      value={operatorToken}
                      onChange={(event) => setOperatorToken(event.target.value)}
                      placeholder={operatorAuthenticated ? "Session active" : "Enter token"}
                      autoComplete="current-password"
                      spellCheck={false}
                      disabled={operatorBusy || operatorAuthenticated}
                    />
                  </label>
                  <button className={primaryButtonClass} type="submit" disabled={operatorBusy || operatorAuthenticated}>
                    <LockKeyhole aria-hidden className="h-4 w-4" />
                    {operatorBusy ? "Opening..." : "Open operator session"}
                  </button>
                </form>
              ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">AGENT_OPERATOR_TOKEN is not configured; guarded routes are open in this environment.</div>
              )}

              {operatorError ? <p className="text-sm font-medium text-red-700">{operatorError}</p> : null}

              <div className="flex flex-wrap items-center gap-2">
                <button className={primaryButtonClass} type="button" onClick={saveSettings}>
                  {savedAt ? <Check aria-hidden className="h-4 w-4" /> : null}
                  Save settings
                </button>
                <button className={buttonClass} type="button" onClick={handleCloseOperatorSession} disabled={operatorBusy || !operatorConfigured}>
                  <LogOut aria-hidden className="h-4 w-4" />
                  Close session
                </button>
                {savedAt ? <span className="text-sm font-medium text-emerald-700">Saved at {savedAt}</span> : null}
              </div>
            </div>
          </SettingsCard>
        </div>

        <aside className="space-y-4">
          <StatCard icon={ShieldCheck} label="Environment" value={environmentValue} detail={environmentDetail} tone={chainConfig.contractConfigured ? "green" : "orange"} />
          <InfoPanel
            title="Runtime overview"
            rows={[
              ["xAPI", "server-side route"],
              ["AI", aiHealth ? `${aiHealth.provider} / ${aiHealth.model} / ${aiHealth.mode}` : "checking"],
              ["Wallet", chainConfig.walletMode],
              ["Contract", chainConfig.contractConfigured ? contractValue : "not configured"],
              ["Explorer", chainConfig.explorerConfigured ? explorerValue : "not configured"]
            ]}
          />
        </aside>
      </div>
    </section>
  );
}

function uniqueOptions(options: string[]) {
  return Array.from(new Set(options));
}

const operatorCheckingStatus = {
  label: "Checking",
  className: "bg-slate-100 text-slate-600"
};

const operatorStatusMap = {
  authenticated: {
    label: "Authenticated",
    className: "bg-emerald-100 text-emerald-700"
  },
  locked: {
    label: "Locked",
    className: "bg-red-100 text-red-700"
  },
  unconfigured: {
    label: "Unconfigured",
    className: "bg-amber-100 text-amber-700"
  }
} satisfies Record<OperatorSessionStatus["mode"], typeof operatorCheckingStatus>;
