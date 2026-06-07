"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { Brain, CheckCircle2, ChevronRight, Link2, ShieldCheck, X, Zap } from "lucide-react";
import { useAppActions } from "./AppContext";

const STORAGE_KEY = "chainpulse:onboarding-dismissed";

interface Step {
  icon: typeof Brain;
  color: string;
  iconBg: string;
  titleEn: string;
  titleZh: string;
  descEn: string;
  descZh: string;
}

const steps: Step[] = [
  {
    icon: Brain,
    color: "from-blue-500 to-indigo-600",
    iconBg: "bg-blue-50 text-blue-600",
    titleEn: "Run the Agent",
    titleZh: "运行 Agent",
    descEn: "Enter a token, DAO or keyword. The Agent uses xAPI via MCP to collect real Twitter, news, web and crypto data.",
    descZh: "输入代币、DAO 或关键词，Agent 通过 MCP 协议调用 xAPI 实时采集 Twitter、新闻、Web 和链上数据。"
  },
  {
    icon: Zap,
    color: "from-amber-500 to-orange-600",
    iconBg: "bg-amber-50 text-amber-600",
    titleEn: "Review Report & Traces",
    titleZh: "查看报告与 Trace",
    descEn: "See the AI-generated risk/alpha report with full evidence chain. The Trace page shows every xAPI call in detail.",
    descZh: "查看 AI 生成的风险/Alpha 报告及完整证据链。Trace 页面展示每一次 xAPI MCP 调用的输入、输出和哈希。"
  },
  {
    icon: ShieldCheck,
    color: "from-emerald-500 to-teal-600",
    iconBg: "bg-emerald-50 text-emerald-600",
    titleEn: "Attest on Sepolia",
    titleZh: "Sepolia 链上证明",
    descEn: "Connect MetaMask, write report and evidence hashes to the SignalAttestation contract. The proof is permanently on-chain.",
    descZh: "连接 MetaMask，把报告哈希和证据哈希写入 SignalAttestation 合约，形成不可篡改的链上审计记录。"
  },
  {
    icon: Link2,
    color: "from-purple-500 to-violet-600",
    iconBg: "bg-purple-50 text-purple-600",
    titleEn: "Verify Anytime",
    titleZh: "随时可验证",
    descEn: "The report and evidence hashes can be locally recomputed. Anyone can verify the report was not tampered with after attestation.",
    descZh: "报告和证据哈希可本地复算。任何人都能验证链上证明时刻的报告未被篡改，AI 决策全程可审计。"
  }
];

export function OnboardingGuide() {
  const { language } = useAppActions();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const isZh = language === "zh";

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (!dismissed) {
        const id = window.setTimeout(() => setVisible(true), 800);
        return () => window.clearTimeout(id);
      }
    } catch {
      // localStorage not available (test environment)
    }
  }, []);

  function dismiss(dontShowAgain = true) {
    setVisible(false);
    if (dontShowAgain) {
      try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
    }
  }

  function next() {
    if (step < steps.length - 1) {
      setStep((s) => s + 1);
    } else {
      dismiss(true);
    }
  }

  if (!visible) return null;

  const currentStep = steps[step];
  const Icon = currentStep.icon;
  const isLast = step === steps.length - 1;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm"
        onClick={() => dismiss(false)}
        aria-hidden
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isZh ? "新手引导" : "Getting started guide"}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="animate-guide w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
          {/* Header gradient bar */}
          <div className={clsx("h-1.5 w-full rounded-t-2xl bg-gradient-to-r", currentStep.color)} />

          <div className="p-6">
            {/* Close */}
            <div className="flex items-start justify-between gap-3">
              <div className={clsx("grid h-12 w-12 place-items-center rounded-xl ring-1 ring-slate-100", currentStep.iconBg)}>
                <Icon aria-hidden className="h-6 w-6" />
              </div>
              <button
                type="button"
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                onClick={() => dismiss(false)}
                aria-label={isZh ? "关闭" : "Close"}
              >
                <X aria-hidden className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="mt-4 animate-step-in">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {isZh ? `步骤 ${step + 1} / ${steps.length}` : `Step ${step + 1} of ${steps.length}`}
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-950">
                {isZh ? currentStep.titleZh : currentStep.titleEn}
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {isZh ? currentStep.descZh : currentStep.descEn}
              </p>
            </div>

            {/* Step dots */}
            <div className="mt-6 flex items-center justify-between">
              <div className="flex gap-1.5">
                {steps.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setStep(i)}
                    className={clsx("h-2 rounded-full transition-all duration-200", i === step ? "w-6 bg-blue-600" : "w-2 bg-slate-200 hover:bg-slate-300")}
                    aria-label={`${isZh ? "步骤" : "Step"} ${i + 1}`}
                  />
                ))}
              </div>

              <div className="flex gap-2">
                {step > 0 && (
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    onClick={() => setStep((s) => s - 1)}
                  >
                    {isZh ? "上一步" : "Back"}
                  </button>
                )}
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
                  onClick={next}
                >
                  {isLast ? (
                    <>
                      <CheckCircle2 aria-hidden className="h-4 w-4" />
                      {isZh ? "开始使用" : "Get started"}
                    </>
                  ) : (
                    <>
                      {isZh ? "下一步" : "Next"}
                      <ChevronRight aria-hidden className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Skip */}
            <button
              type="button"
              className="mt-4 w-full text-center text-xs text-slate-400 hover:text-slate-600"
              onClick={() => dismiss(true)}
            >
              {isZh ? "不再显示" : "Don't show this again"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
