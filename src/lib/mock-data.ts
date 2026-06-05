import type { Report, RunningTask, WatchlistTarget, XApiTrace } from "./types";

export const reports: Report[] = [
  {
    id: "rep_eth_001",
    title: "ETH Risk Baseline",
    topic: "ETH",
    mode: "Risk Scan",
    summary: "ETH 近期讨论热度稳定，未发现明显社交操纵信号，链上与新闻侧证据一致。",
    riskScore: 32,
    alphaScore: 68,
    confidence: 0.74,
    verdict: "OBSERVE",
    status: "已上链",
    createdAt: "2026-06-05 09:42",
    reportHash: "0x9f3a7c18b4e21d8af901bc776d2aa83401be7e889edddc9b1b83a7a7ff13d901",
    evidenceHash: "0x64b1287be79e0f14a728487e9d34de8fd9170bb4a7fb713a1d88ec21b5bf219a",
    evidence: [
      {
        id: "ev_001",
        source: "xapi:twitter.search_timeline",
        title: "Recent ETH discussion cluster",
        summary: "多位用户讨论 ETH 生态更新，情绪偏中性。",
        weight: 0.25
      },
      {
        id: "ev_002",
        source: "xapi:crypto.token.price",
        title: "ETH price stability",
        summary: "24h 波动低于观察阈值，成交量未出现异常尖峰。",
        weight: 0.31
      }
    ],
    actions: ["继续观察 24h 社交热度变化", "若风险分高于 70，建议暂停自动交易或治理投票"]
  },
  {
    id: "rep_zec_002",
    title: "ZEC Liquidity Caution",
    topic: "ZEC",
    mode: "Risk Scan",
    summary: "ZEC 新闻热度上升，但社交传播集中于少数账号，建议提升证据权重审查。",
    riskScore: 62,
    alphaScore: 51,
    confidence: 0.67,
    verdict: "CAUTION",
    status: "未上链",
    createdAt: "2026-06-05 10:18",
    reportHash: "0x25bcdb319a7a8d116a43ad481d6e64cdabf8ccf118e01d222f07b76385bc4f53",
    evidenceHash: "0xb7850d7671218ecb02f175b558a3f62cd824b65fcf9e395904c456a359c29240",
    evidence: [
      {
        id: "ev_021",
        source: "xapi:news.search.latest",
        title: "ZEC liquidity desk update",
        summary: "多家媒体提及隐私币板块成交回暖。",
        weight: 0.34
      }
    ],
    actions: ["跟踪集中传播账号", "等待第二来源确认后再提高 Alpha 权重"]
  },
  {
    id: "rep_uni_003",
    title: "Uniswap Governance Due Diligence",
    topic: "Uniswap",
    mode: "DAO 尽调",
    summary: "治理提案讨论充分，反对意见集中在执行窗口与费用假设，整体建议观察。",
    riskScore: 41,
    alphaScore: 59,
    confidence: 0.79,
    verdict: "OBSERVE",
    status: "已完成",
    createdAt: "2026-06-04 17:06",
    reportHash: "0x4a8d462bb6c3ff35b2874df5b9556d9527ce804d8865c7810bbced2b10fc4627",
    evidenceHash: "0x6ad5a4b14440c982fa4b9630e10698ae621d2850d49ec736d5da41fbb04fbb92",
    evidence: [
      {
        id: "ev_041",
        source: "xapi:web.search.realtime",
        title: "Governance forum references",
        summary: "论坛与公开文档对提案目标描述一致。",
        weight: 0.42
      }
    ],
    actions: ["投票前复核费用模型", "把关键引用保存在 evidence packet"]
  },
  {
    id: "rep_sol_004",
    title: "SOL Alpha Momentum",
    topic: "SOL",
    mode: "Alpha Scan",
    summary: "SOL 生态开发者事件和新闻侧信号一致，Alpha 分高于近期均值。",
    riskScore: 28,
    alphaScore: 76,
    confidence: 0.72,
    verdict: "POSITIVE",
    status: "已上链",
    createdAt: "2026-06-03 13:44",
    reportHash: "0x820e943e19b7b66a37894b56ed91370f0de09cb127ceec4c9f7f84463ee19170",
    evidenceHash: "0xa713010f9ed8f23a985e9ee83132209ee2b1239a92c2a40e651ee70d9a988ace",
    evidence: [
      {
        id: "ev_061",
        source: "xapi:ai.text.summarize",
        title: "Ecosystem signal summary",
        summary: "多源摘要显示开发者活动和生态公告同步上升。",
        weight: 0.38
      }
    ],
    actions: ["保留观察仓位", "设置 48h 回撤告警"]
  }
];

export const runningTasks: RunningTask[] = [
  {
    id: "task_eth_risk_001",
    topic: "ETH",
    mode: "Risk Scan",
    status: "Running",
    startedAt: "2026-06-05 10:32",
    elapsed: "04m 18s",
    progress: 64,
    currentStep: "证据归一化",
    logs: [
      "[10:32:11] Intent Parser resolved topic=ETH mode=Risk Scan",
      "[10:32:38] xapi-to search returned 9 candidate actions",
      "[10:33:02] schema fetched for twitter.search_timeline",
      "[10:33:59] normalized 18 evidence items from Twitter, News, Web, Crypto",
      "[10:34:40] reasoning pass started with evidenceHash preview"
    ]
  },
  {
    id: "task_zec_risk_002",
    topic: "ZEC",
    mode: "Risk Scan",
    status: "Completed",
    startedAt: "2026-06-05 10:18",
    elapsed: "05m 03s",
    progress: 100,
    currentStep: "生成报告",
    logs: ["[10:23:04] report JSON generated", "[10:23:19] waiting for attestation action"]
  },
  {
    id: "task_curve_dao_003",
    topic: "Curve",
    mode: "DAO 尽调",
    status: "Failed",
    startedAt: "2026-06-05 09:55",
    elapsed: "01m 44s",
    progress: 38,
    currentStep: "读取 Schema",
    logs: ["[09:56:02] schema fetch retry exceeded", "[09:56:22] marked failed, fallback report disabled"]
  }
];

export const xapiTraces: XApiTrace[] = [
  {
    id: "trace_001",
    taskId: "task_eth_risk_001",
    action: "twitter.search_timeline",
    capability: "Twitter / X",
    schemaFetched: true,
    inputHash: "0xf1e84519dcab6ad928bf911c6eedf8c60dbf3a426ac07c3d91d2c4bcaa171449",
    outputHash: "0xa8c7a9db82f7de5cb618ea03ef4d4d809bf746e925ef64b4b501e7fe3e3e1b4d",
    outputPreview: "18 posts, neutral sentiment cluster, 2 KOL mentions",
    startedAt: "10:32:38.120",
    endedAt: "10:32:39.408",
    status: "success",
    latencyMs: 1288,
    method: "POST",
    headers: {
      "xapi-action": "twitter.search_timeline",
      "xapi-schema-version": "2026-05",
      "trace-id": "cp-trace-001"
    },
    input: {
      query: "$ETH OR Ethereum",
      limit: 30,
      since: "2026-06-04T00:00:00+08:00"
    },
    output: {
      posts: 18,
      sentiment: "neutral",
      suspiciousCluster: false,
      notableAccounts: ["@defi_mochi", "@MustStopMurad"]
    }
  },
  {
    id: "trace_002",
    taskId: "task_eth_risk_001",
    action: "web.search.realtime",
    capability: "Web",
    schemaFetched: true,
    inputHash: "0x42a5b61a9001937c3e2996ef721d0a26cd727b3318da04e11f04c7f206ae81af",
    outputHash: "0x4c3a3cf63e1173d501bdc89fc06627247a970353d0c4f84eea3bcb052ec61105",
    outputPreview: "7 realtime sources, 0 contradiction markers",
    startedAt: "10:32:40.010",
    endedAt: "10:32:41.622",
    status: "success",
    latencyMs: 1612,
    method: "POST",
    headers: {
      "xapi-action": "web.search.realtime",
      "cache-policy": "fresh",
      "trace-id": "cp-trace-002"
    },
    input: {
      query: "Ethereum risk news ETH ecosystem",
      freshness: "24h"
    },
    output: {
      sources: 7,
      contradictions: 0,
      topDomain: "ethereum.org"
    }
  },
  {
    id: "trace_003",
    taskId: "task_eth_risk_001",
    action: "crypto.token.price",
    capability: "Crypto",
    schemaFetched: true,
    inputHash: "0x0e178c34e8468a608f0625165e56d0f6ff41f7adc1f2f31d87281428a602e5bd",
    outputHash: "0xddc2c6b570d984f74059812c26b85199221a450d18170cfc2a27c65e09ebc102",
    outputPreview: "ETH 24h volatility 2.8%, volume stable",
    startedAt: "10:32:44.002",
    endedAt: "10:32:44.508",
    status: "running",
    latencyMs: 506,
    method: "GET",
    headers: {
      "xapi-action": "crypto.token.price",
      "trace-id": "cp-trace-003"
    },
    input: {
      symbol: "ETH",
      window: "24h"
    },
    output: {
      symbol: "ETH",
      volatility24h: 2.8,
      volumeState: "stable"
    }
  },
  {
    id: "trace_004",
    taskId: "task_curve_dao_003",
    action: "twitter.tweet_detail",
    capability: "Twitter / X",
    schemaFetched: false,
    inputHash: "0x357cdbf7398f5f4210db1d944064bd12820d824c48fcd7b4a1f99d5d817361ff",
    outputHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    outputPreview: "schema unavailable after retry",
    startedAt: "09:56:01.100",
    endedAt: "09:56:22.714",
    status: "failed",
    latencyMs: 21714,
    method: "POST",
    headers: {
      "xapi-action": "twitter.tweet_detail",
      "retry": "3",
      "trace-id": "cp-trace-004"
    },
    input: {
      tweetId: "mock_183901239"
    },
    output: {
      error: "schema fetch timeout"
    },
    error: "schema fetch timeout"
  }
];

export const watchlistTargets: WatchlistTarget[] = [
  {
    id: "wl_eth",
    name: "Ethereum",
    symbol: "ETH",
    category: "Token",
    alertState: "Normal",
    riskScore: 32,
    alphaScore: 68,
    lastScan: "8 min ago",
    signals24h: [22, 25, 28, 26, 31, 33, 32, 34, 36, 35]
  },
  {
    id: "wl_curve",
    name: "Curve",
    symbol: "CRV",
    category: "Protocol",
    alertState: "Warning",
    riskScore: 71,
    alphaScore: 44,
    lastScan: "21 min ago",
    signals24h: [31, 37, 39, 44, 49, 55, 58, 66, 69, 71]
  },
  {
    id: "wl_maker",
    name: "MakerDAO",
    symbol: "MKR",
    category: "DAO",
    alertState: "Normal",
    riskScore: 38,
    alphaScore: 61,
    lastScan: "36 min ago",
    signals24h: [42, 41, 43, 46, 45, 47, 49, 48, 50, 52]
  },
  {
    id: "wl_kol",
    name: "@defi_mochi",
    symbol: "KOL",
    category: "KOL",
    alertState: "Critical",
    riskScore: 84,
    alphaScore: 36,
    lastScan: "1h ago",
    signals24h: [21, 24, 31, 48, 62, 70, 74, 81, 83, 84]
  }
];

export const tokenPalette: Record<string, string> = {
  ETH: "from-blue-500 to-sky-300",
  ZEC: "from-amber-500 to-yellow-300",
  SOL: "from-emerald-500 to-cyan-400",
  AAVE: "from-violet-500 to-fuchsia-300",
  UNI: "from-pink-500 to-rose-300",
  LINK: "from-blue-600 to-indigo-300",
  MKR: "from-teal-500 to-emerald-300",
  CRV: "from-orange-500 to-red-300",
  KOL: "from-purple-500 to-indigo-300"
};

export const attestation = {
  reportHash: reports[0].reportHash,
  evidenceHash: reports[0].evidenceHash,
  txHash: "0x7ed7b3a66ea6d9429c87aaebed44f91417ed2f307f91b2201fdc7b3dc89cb724",
  walletAddress: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
  block: "9,284,116",
  timestamp: "2026-06-05 10:37:44 +08:00"
};
