"use client";

import { useState } from "react";
import { Bell, Check, Code2, Eye, EyeOff, KeyRound, LogOut, Shield, ShieldCheck, User, Wallet } from "lucide-react";
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
  const apiKey = "xapi_demo_8f32b9c4e1_mock_only";

  function saveSettings() {
    const timestamp = new Date().toLocaleTimeString("zh-CN", { hour12: false });
    setSavedAt(timestamp);
    notify("设置已保存");
  }

  return (
    <section className="space-y-5">
      <PageHeading eyebrow="Configuration" title="设置" description="编辑账户、API、模型、链上网络、通知和安全配置。当前为本地 mock，不暴露真实 XAPI_KEY。" />
      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="grid gap-5">
          <SettingsCard title="账户信息" icon={User}>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Display name" name="display-name" defaultValue="Web3 Researcher" />
              <Field label="Workspace" name="workspace-name" defaultValue="ETH Beijing Demo" />
            </div>
          </SettingsCard>
          <SettingsCard title="API 与密钥" icon={KeyRound}>
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
                  <button className={buttonClass} type="button" onClick={() => setApiVisible((value) => !value)} aria-label={apiVisible ? "隐藏 API Key" : "显示 API Key"}>
                    {apiVisible ? <EyeOff aria-hidden className="h-4 w-4" /> : <Eye aria-hidden className="h-4 w-4" />}
                  </button>
                  <button className={buttonClass} type="button" onClick={() => copyText(apiKey, "API Key")} aria-label="复制 API Key">
                    {copiedKey === "API Key" ? <Check aria-hidden className="h-4 w-4" /> : null}
                    copy
                  </button>
                </div>
              </div>
              <Toggle label="Server-side only" name="server-side-only" defaultChecked />
            </div>
          </SettingsCard>
          <SettingsCard title="模型设置" icon={Code2}>
            <div className="grid gap-3 md:grid-cols-3">
              <SelectField label="Reasoning model" name="reasoning-model" options={["gpt-5-mini", "gpt-5", "local mock"]} />
              <SelectField label="Evidence threshold" name="evidence-threshold" options={["0.65", "0.75", "0.85"]} />
              <SelectField label="Report language" name="report-language" options={["中文", "English", "双语"]} />
            </div>
          </SettingsCard>
          <SettingsCard title="链上网络配置" icon={Wallet}>
            <div className="grid gap-3 md:grid-cols-2">
              <SelectField label="Network" name="network" options={["Sepolia", "Base Sepolia", "Local Anvil"]} />
              <Field label="Attestation contract" name="attestation-contract" defaultValue="0xA11e5t…C0de" />
            </div>
          </SettingsCard>
          <SettingsCard title="通知设置" icon={Bell}>
            <div className="grid gap-3 md:grid-cols-2">
              <Toggle label="高风险报告提醒" name="high-risk-alert" defaultChecked />
              <Toggle label="链上确认提醒" name="attestation-alert" defaultChecked />
              <Toggle label="每日扫描摘要" name="daily-summary" />
              <Toggle label="xAPI 调用失败提醒" name="xapi-failure-alert" defaultChecked />
            </div>
          </SettingsCard>
          <SettingsCard title="安全与权限" icon={Shield}>
            <div className="flex flex-wrap items-center gap-2">
              <button className={primaryButtonClass} type="button" onClick={saveSettings}>
                {savedAt ? <Check aria-hidden className="h-4 w-4" /> : null}
                保存设置
              </button>
              <button className={buttonClass} type="button" onClick={() => notify("已显示 Log Out 确认（mock）")}>
                <LogOut aria-hidden className="h-4 w-4" />
                Log Out
              </button>
              {savedAt ? <span className="text-sm font-medium text-emerald-700">已保存 {savedAt}</span> : null}
            </div>
          </SettingsCard>
        </div>

        <aside className="space-y-4">
          <StatCard icon={ShieldCheck} label="当前环境" value="Demo" detail="mock / fallback" tone="blue" />
          <InfoPanel title="环境概览" rows={[["xAPI", "server-side mock"], ["Wallet", "not connected"], ["Contract", "placeholder adapter"], ["Storage", "local state"]]} />
        </aside>
      </div>
    </section>
  );
}
