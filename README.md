# ChainPulse Agent Web Demo

ChainPulse Agent 是一个 Web3 智能分析控制台 Demo，用于路演展示 Agent 如何从 xAPI 发现 action、读取 schema、采集证据、生成报告，并把报告哈希与证据哈希送入链上证明流程。

当前版本只接入本地 mock 数据，不连接真实钱包、真实合约或真实 xAPI 服务。

## 技术栈

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Vitest + Testing Library
- lucide-react 图标

## 本地启动

```bash
npm install
npm run dev
```

默认预览地址：

```txt
http://localhost:3000
```

## 可用脚本

```bash
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
```

## 页面路由

```txt
/workspace
/tasks
/reports
/reports/[id]
/trace
/attestation
/watchlist
/settings
```

`/` 会重定向到 `/workspace`。

## 路由与查询参数

Header 全局搜索支持报告、任务、xAPI Trace 和 Watchlist 目标，最多展示 6 条结果。键盘可用 `ArrowUp`、`ArrowDown`、`Enter`、`Escape` 完成选择、跳转和关闭。

常用演示链接：

```txt
/reports/rep_eth_001
/reports?query=ZEC&verdict=CAUTION&minRisk=60
/tasks?task=task_eth_risk_001
/trace?trace=trace_004&headers=open
/trace?task=task_eth_risk_001
/watchlist?target=wl_curve
```

查询参数说明：

| 路由 | 参数 | 说明 |
|---|---|---|
| `/reports` | `query`、`mode`、`verdict`、`minRisk`、`maxRisk`、`startDate`、`endDate` | 同步报告中心筛选条件，点击“重置”会清空 query。 |
| `/reports/[id]` | 路径参数 `id` | 展示报告详情、证据、行动建议、Hash 和链上状态。无效 ID 会显示空状态。 |
| `/trace` | `trace`、`task`、`headers=open` | 定位指定 Trace、按任务筛选调用链，并控制 headers 面板默认展开。 |
| `/watchlist` | `target` | 高亮指定监控目标；点击“扫描”会同步到 URL。 |

## Mock 数据说明

本地演示数据集中在 `src/lib/mock-data.ts`：

- `reports`：报告中心、工作台最近报告、链上证明关联报告。
- `runningTasks`：运行任务、时间线、日志。
- `xapiTraces`：xAPI Trace 调用链、输入输出、失败样例。
- `watchlistTargets`：Watchlist 监控目标。
- `attestation`：报告哈希、证据哈希、交易哈希、钱包地址、区块信息。

筛选逻辑集中在 `src/lib/filters.ts`，类型集中在 `src/lib/types.ts`。

## Adapter 占位层

`src/lib/adapters/xapi-client.ts` 定义 `XApiClient` 接口和 `mockXApiClient`：

- `searchActions(query)`
- `getActionSchema(action)`
- `callAction(action, input)`
- `getTrace(taskId)`

未来接真实 xAPI 时，建议通过 Next.js route handler 在服务端注入 `XAPI_KEY`，前端页面继续消费同一个接口形状。

`src/lib/adapters/attestation-client.ts` 定义 `AttestationClient` 接口和 `mockAttestationClient`：

- `createReportHash(report)`
- `createEvidenceHash(evidence)`
- `attestReport(reportId, walletAddress)`
- `getAttestation(reportId)`

未来接真实链上证明时，在这里替换为 wagmi / viem 钱包连接、签名和合约写入逻辑。

## 环境变量

复制 `.env.example` 为 `.env.local` 后按需填写：

```env
XAPI_KEY=
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_CONTRACT_ADDRESS=
NEXT_PUBLIC_EXPLORER_BASE_URL=https://sepolia.etherscan.io
```

当前 Demo 不读取真实 `XAPI_KEY` 发起请求。

## 路演推荐打开顺序

1. `/workspace`
2. `/tasks`
3. `/trace`
4. `/reports`
5. `/attestation`

## 3 分钟路演脚本

| 时间 | 页面 | 讲解重点 |
|---|---|---|
| 0:00-0:35 | `/workspace` | 输入 `ETH` 或使用快速案例，说明 Agent 会把分析对象、模式和证据窗口转成任务上下文。 |
| 0:35-1:10 | `/tasks` | 展示运行进度、阶段时间线和真实自动滚动日志；点击“查看 Trace”进入调用链。 |
| 1:10-1:45 | `/trace?task=task_eth_risk_001` | 展示 xAPI action、schema、输入输出 Hash；切到失败 Trace 并展开 headers 说明可追溯性。 |
| 1:45-2:25 | `/reports/rep_eth_001` | 展示报告详情、风险分、Alpha 分、证据权重、行动建议、报告 Hash 与证据 Hash。 |
| 2:25-3:00 | `/reports?query=ZEC&verdict=CAUTION&minRisk=60`、`/watchlist?target=wl_curve` | 展示 URL 可复现筛选、全局搜索跳转、Watchlist 高亮和扫描同步。 |

## 后续真实服务替换位置

- xAPI：替换 `src/lib/adapters/xapi-client.ts` 的 mock 实现。
- 链上证明：替换 `src/lib/adapters/attestation-client.ts` 的 mock 实现。
- 钱包连接：在设置页和 attestation adapter 增加 wagmi / viem 连接流程。
- API Key：保持服务端读取，不把真实密钥暴露给浏览器。
