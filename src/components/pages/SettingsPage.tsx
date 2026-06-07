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
  const { copiedKey, copyText, language, notify } = useAppActions();
  const copy = settingsCopy[language];
  const [apiVisible, setApiVisible] = useState(false);
  const [savedAt, setSavedAt] = useState("");
  const [chainConfig, setChainConfig] = useState(() => readAttestationConfig());
  const [aiHealth, setAiHealth] = useState<AiHealthStatus | null>(null);
  const [operatorSession, setOperatorSession] = useState<OperatorSessionStatus | null>(null);
  const [operatorToken, setOperatorToken] = useState("");
  const [operatorBusy, setOperatorBusy] = useState(false);
  const [operatorError, setOperatorError] = useState("");
  const apiKey = language === "zh" ? "XAPI_KEY 仅服务端可见" : "XAPI_KEY is server-side only";
  const contractValue = chainConfig.contractAddress ?? copy.notConfigured;
  const explorerValue = chainConfig.explorerBaseUrl ?? copy.notConfigured;
  const environmentValue = chainConfig.contractConfigured ? "Sepolia" : copy.fallback;
  const environmentDetail = chainConfig.contractConfigured ? copy.liveContractConfigured : copy.chainWritesDisabled;
  const operatorStatusMap2 = {
    authenticated: { label: copy.authenticated, className: "bg-emerald-100 text-emerald-700" },
    locked: { label: copy.locked, className: "bg-red-100 text-red-700" },
    unconfigured: { label: copy.unconfigured, className: "bg-amber-100 text-amber-700" }
  };
  const operatorStatus = operatorSession ? operatorStatusMap2[operatorSession.mode] : { label: copy.checking, className: "bg-slate-100 text-slate-600" };
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
    notify(copy.saveSettings);
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
      notify(session.mode === "unconfigured" ? copy.operatorUnconfigured : copy.openSession);
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
      notify(session.mode === "unconfigured" ? copy.operatorUnconfigured : copy.closeSession);
      await refreshAiHealth();
    } catch {
      setOperatorError(copy.operatorUnconfigured);
      notify(copy.closeSession + " failed");
    } finally {
      setOperatorBusy(false);
    }
  }

  return (
    <section className="space-y-5">
      <PageHeading
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="grid gap-5">
          <SettingsCard title={copy.account} icon={User}>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label={copy.displayName} name="display-name" defaultValue="Web3 Researcher" />
              <Field label={copy.workspace} name="workspace-name" defaultValue="ChainPulse Operations" />
            </div>
          </SettingsCard>

          <SettingsCard title={copy.apiSecrets} icon={KeyRound}>
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
                  <button className={buttonClass} type="button" onClick={() => setApiVisible((value) => !value)} aria-label={apiVisible ? copy.hideKey : copy.showKey}>
                    {apiVisible ? <EyeOff aria-hidden className="h-4 w-4" /> : <Eye aria-hidden className="h-4 w-4" />}
                  </button>
                  <button className={buttonClass} type="button" onClick={() => copyText(apiKey, "API Key")} aria-label={copy.copyKey}>
                    {copiedKey === "API Key" ? <Check aria-hidden className="h-4 w-4" /> : null}
                    {copy.copy}
                  </button>
                </div>
              </div>
              <Toggle label={copy.serverSideOnly} name="server-side-only" defaultChecked />
            </div>
          </SettingsCard>

          <SettingsCard title={copy.aiProvider} icon={Code2}>
            <div className="grid gap-3 md:grid-cols-3">
              <SelectField label={copy.reasoningModel} name="reasoning-model" options={uniqueOptions([aiHealth?.model ?? "gpt-4.1-mini", "gpt-4.1-mini", "openai-compatible"])} />
              <SelectField label={copy.evidenceThreshold} name="evidence-threshold" options={["0.65", "0.75", "0.85"]} />
              <SelectField label={copy.reportLanguage} name="report-language" options={["English", "Chinese", "Bilingual"]} />
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <Field label={copy.aiProviderLabel} name="ai-provider" defaultValue={aiHealth?.provider ?? copy.checking} />
              <Field label={copy.aiBaseUrl} name="ai-base-url" defaultValue={aiHealth?.baseUrl ?? copy.serverSideOnly} />
              <Field label={copy.aiStatus} name="ai-status" defaultValue={aiHealth ? `${aiHealth.mode} / configured=${aiHealth.configured}` : copy.checking} />
            </div>
          </SettingsCard>

          <SettingsCard title={copy.sepoliaAttestation} icon={Wallet}>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label={copy.network} name="network" defaultValue={chainConfig.chainId ? `Sepolia ${chainConfig.chainId}` : "Sepolia 11155111"} />
              <Field label={copy.attestationContract} name="attestation-contract" defaultValue={contractValue} />
              <Field label={copy.explorer} name="explorer-base-url" defaultValue={explorerValue} />
              <Field label={copy.walletMode} name="wallet-mode" defaultValue={chainConfig.walletMode} />
            </div>
          </SettingsCard>

          <SettingsCard title={copy.notifications} icon={Bell}>
            <div className="grid gap-3 md:grid-cols-2">
              <Toggle label={copy.highRiskAlert} name="high-risk-alert" defaultChecked />
              <Toggle label={copy.onChainAlert} name="attestation-alert" defaultChecked />
              <Toggle label={copy.dailySummary} name="daily-summary" />
              <Toggle label={copy.xapiFailureAlert} name="xapi-failure-alert" defaultChecked />
            </div>
          </SettingsCard>

          <SettingsCard title={copy.accessSession} icon={Shield}>
            <div className="grid gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{copy.operatorSession}</p>
                  <p className="text-xs text-slate-500">{copy.guardedRoutes}</p>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${operatorStatus.className}`}>
                  {operatorStatus.label}
                </span>
              </div>

              {operatorConfigured ? (
                <form className="grid gap-3 md:grid-cols-[1fr_auto]" onSubmit={handleOpenOperatorSession}>
                  <label className="grid gap-1">
                    <span className="text-xs font-medium text-slate-600">{copy.operatorToken}</span>
                    <input
                      className={inputClass}
                      type="password"
                      value={operatorToken}
                      onChange={(event) => setOperatorToken(event.target.value)}
                      placeholder={operatorAuthenticated ? copy.sessionActive : copy.enterToken}
                      autoComplete="current-password"
                      spellCheck={false}
                      disabled={operatorBusy || operatorAuthenticated}
                    />
                  </label>
                  <button className={primaryButtonClass} type="submit" disabled={operatorBusy || operatorAuthenticated}>
                    <LockKeyhole aria-hidden className="h-4 w-4" />
                    {operatorBusy ? copy.opening : copy.openSession}
                  </button>
                </form>
              ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{copy.operatorUnconfigured}</div>
              )}

              {operatorError ? <p className="text-sm font-medium text-red-700">{operatorError}</p> : null}

              <div className="flex flex-wrap items-center gap-2">
                <button className={primaryButtonClass} type="button" onClick={saveSettings}>
                  {savedAt ? <Check aria-hidden className="h-4 w-4" /> : null}
                  {copy.saveSettings}
                </button>
                <button className={buttonClass} type="button" onClick={handleCloseOperatorSession} disabled={operatorBusy || !operatorConfigured}>
                  <LogOut aria-hidden className="h-4 w-4" />
                  {copy.closeSession}
                </button>
                {savedAt ? <span className="text-sm font-medium text-emerald-700">{copy.savedAt} {savedAt}</span> : null}
              </div>
            </div>
          </SettingsCard>
        </div>

        <aside className="space-y-4">
          <StatCard icon={ShieldCheck} label={copy.environment} value={environmentValue} detail={environmentDetail} tone={chainConfig.contractConfigured ? "green" : "orange"} />
          <InfoPanel
            title={copy.runtimeOverview}
            rows={[
              ["xAPI", copy.serverSideRoute],
              ["AI", aiHealth ? `${aiHealth.provider} / ${aiHealth.model} / ${aiHealth.mode}` : copy.checking],
              [copy.walletMode, chainConfig.walletMode],
              [copy.attestationContract, chainConfig.contractConfigured ? contractValue : copy.notConfigured],
              [copy.explorer, chainConfig.explorerConfigured ? explorerValue : copy.notConfigured]
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

const settingsCopy = {
  en: {
    eyebrow: "Configuration",
    title: "Settings",
    description: "Review API, AI provider, Sepolia attestation, notification, and access settings. Secrets stay on the server.",
    account: "Account",
    displayName: "Display name",
    workspace: "Workspace",
    apiSecrets: "API and secrets",
    hideKey: "Hide API Key",
    showKey: "Show API Key",
    copyKey: "Copy API Key",
    copy: "copy",
    serverSideOnly: "Server-side only",
    aiProvider: "AI provider",
    reasoningModel: "Reasoning model",
    evidenceThreshold: "Evidence threshold",
    reportLanguage: "Report language",
    aiProviderLabel: "AI Provider",
    aiBaseUrl: "AI Base URL",
    aiStatus: "AI Status",
    sepoliaAttestation: "Sepolia attestation",
    network: "Network",
    attestationContract: "Attestation contract",
    explorer: "Explorer",
    walletMode: "Wallet mode",
    notifications: "Notifications",
    highRiskAlert: "High-risk report alert",
    onChainAlert: "On-chain confirmation alert",
    dailySummary: "Daily scan summary",
    xapiFailureAlert: "xAPI failure alert",
    accessSession: "Access and session",
    operatorSession: "Operator session",
    guardedRoutes: "Guarded API routes use an HttpOnly cookie.",
    operatorToken: "Operator token",
    sessionActive: "Session active",
    enterToken: "Enter token",
    opening: "Opening...",
    openSession: "Open operator session",
    operatorUnconfigured: "AGENT_OPERATOR_TOKEN is not configured; guarded routes are open.",
    saveSettings: "Save settings",
    closeSession: "Close session",
    savedAt: "Saved at",
    environment: "Environment",
    runtimeOverview: "Runtime overview",
    serverSideRoute: "server-side route",
    checking: "checking",
    notConfigured: "not configured",
    fallback: "Fallback",
    liveContractConfigured: "live contract configured",
    chainWritesDisabled: "chain writes disabled until contract config exists",
    authenticated: "Authenticated",
    locked: "Locked",
    unconfigured: "Unconfigured"
  },
  zh: {
    eyebrow: "配置",
    title: "设置",
    description: "查看 API、AI 提供商、Sepolia 证明、通知和访问设置。密钥始终保存在服务端。",
    account: "账号",
    displayName: "显示名称",
    workspace: "工作区",
    apiSecrets: "API 与密钥",
    hideKey: "隐藏 API Key",
    showKey: "显示 API Key",
    copyKey: "复制 API Key",
    copy: "复制",
    serverSideOnly: "仅服务端",
    aiProvider: "AI 提供商",
    reasoningModel: "推理模型",
    evidenceThreshold: "证据阈值",
    reportLanguage: "报告语言",
    aiProviderLabel: "AI 提供商",
    aiBaseUrl: "AI 基础 URL",
    aiStatus: "AI 状态",
    sepoliaAttestation: "Sepolia 链上证明",
    network: "网络",
    attestationContract: "证明合约",
    explorer: "区块浏览器",
    walletMode: "钱包模式",
    notifications: "通知",
    highRiskAlert: "高风险报告提醒",
    onChainAlert: "链上确认提醒",
    dailySummary: "每日扫描摘要",
    xapiFailureAlert: "xAPI 失败提醒",
    accessSession: "访问与会话",
    operatorSession: "操作员会话",
    guardedRoutes: "受保护的 API 路由使用 HttpOnly Cookie。",
    operatorToken: "操作员令牌",
    sessionActive: "会话已激活",
    enterToken: "输入令牌",
    opening: "正在开启...",
    openSession: "开启操作员会话",
    operatorUnconfigured: "AGENT_OPERATOR_TOKEN 未配置，受保护路由在当前环境中已开放。",
    saveSettings: "保存设置",
    closeSession: "关闭会话",
    savedAt: "已保存于",
    environment: "环境",
    runtimeOverview: "运行时概览",
    serverSideRoute: "服务端路由",
    checking: "检查中",
    notConfigured: "未配置",
    fallback: "降级模式",
    liveContractConfigured: "实时合约已配置",
    chainWritesDisabled: "合约未配置，链上写入已禁用",
    authenticated: "已认证",
    locked: "已锁定",
    unconfigured: "未配置"
  }
} as const;
