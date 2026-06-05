# ChainPulse Agent Web Demo

ChainPulse Agent 是一个 Web3 智能分析控制台 Demo，用于路演展示 Agent 如何从 xAPI 发现 action、读取 schema、采集证据、生成报告，并把报告哈希与证据哈希送入链上证明流程。

当前版本已接入服务端 xAPI 代理：未配置 `XAPI_KEY` 或上游失败时自动回退到本地 mock 数据；链上证明仍使用本地 mock，不连接真实钱包或真实合约。

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
/demo
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
搜索结果按 Reports、Tasks、xAPI Trace、Watchlist 分组；无结果时显示轻量空状态，打开结果后会清空当前 query。

常用演示链接：

```txt
/demo
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
| `/demo` | 无 | 评委演示入口，按 3 分钟路径串联 Workspace、Tasks、Trace、Report 和 Attestation。 |
| `/reports` | `query`、`mode`、`verdict`、`status`、`minRisk`、`maxRisk`、`startDate`、`endDate` | 同步报告中心筛选条件，点击“重置”会清空 query。 |
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

`src/lib/adapters/xapi-client.ts` 定义浏览器端 adapter 和本地 fallback：

- `routeXApiClient.healthCheck()`：请求 `/api/xapi/health`，只读取服务端状态，不接触密钥。
- `routeXApiClient.searchActions(query)`：请求 `/api/xapi/search?query=...`。
- `routeXApiClient.getActionSchema(action)`：请求 `/api/xapi/schema?action=...`。
- `routeXApiClient.callAction(action, input, taskId)`：请求 `/api/xapi/call`。
- `mockXApiClient.getTrace(taskId)`：用于路演稳定 fallback trace。

服务端实现位于 `src/lib/server/xapi-service.ts`，通过 Next.js route handler 读取 `XAPI_KEY` 并调用 `xapi-to` CLI。调用 action 前会先执行 schema discovery，即先 `get <actionId>`，再 `call <actionId>`。所有响应都会返回统一 JSON、运行模式和 runtime trace。

可用 xAPI route handler：

```txt
GET  /api/xapi/health
GET  /api/xapi/search?query=...
GET  /api/xapi/schema?action=...
POST /api/xapi/call
```

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
XAPI_ACTION_HOST=action.xapi.to
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_CONTRACT_ADDRESS=
NEXT_PUBLIC_EXPLORER_BASE_URL=https://sepolia.etherscan.io
```

`XAPI_KEY` 只允许在服务端读取；不要创建 `NEXT_PUBLIC_XAPI_KEY`。未配置密钥时，页面会标注 `mock fallback` / `no XAPI_KEY` 并继续展示本地 trace。上游失败时，页面展示 fallback 状态和脱敏错误摘要。

## Product Design audit

本轮 Product Design 审查记录在：

```txt
docs/product-design-audit.md
```

审查聚焦评委 3 分钟能否看懂、xAPI 价值是否突出、链上证明是否可信，以及页面之间是否形成完整叙事闭环。

## Proof Chain

`src/components/ui/ProofChain.tsx` 展示从用户输入到链上证明的路径：

```txt
User Query -> xAPI Actions -> Evidence Packet -> Report JSON -> Report Hash / Evidence Hash -> On-chain Attestation
```

当前已接入 `/demo`、`/reports/[id]` 和 `/attestation`，用于强化“证据可追溯、报告可审计、Hash 可验证”的产品理解。

## 路演推荐打开顺序

1. `/demo`
2. `/workspace`
3. `/tasks`
4. `/trace?task=task_eth_risk_001`
5. `/reports/rep_eth_001`
6. `/attestation`

## 3 分钟路演脚本

| 时间 | 页面 | 讲解重点 |
|---|---|---|
| 0:00-0:20 | `/demo` | 从 Demo Mode 说明完整路径：输入目标、Agent 运行、xAPI Trace、报告、链上证明。 |
| 0:20-0:50 | `/workspace` | 输入 `ETH` 或点击 `Demo recommended` 快速案例，说明 Agent 会把分析对象、模式和证据窗口转成任务上下文。 |
| 0:50-1:20 | `/tasks` | 展示运行进度、阶段时间线、每阶段为什么重要，以及 Next step 面板。 |
| 1:20-1:55 | `/trace?task=task_eth_risk_001` | 展示 xAPI action、schema、输入输出 Hash；说明 schema-first tool calling 与可追溯调用。 |
| 1:55-2:35 | `/reports/rep_eth_001` | 展示 Verdict rationale、证据权重、View related Trace、行动建议分类和 Proof Chain。 |
| 2:35-3:00 | `/attestation` | 展示 reportHash、evidenceHash、txHash、Why on-chain 和 Verify locally proof bundle。 |

## 后续真实服务替换位置

- xAPI：生产环境可把 `src/lib/server/xapi-service.ts` 中的 CLI runner 替换为官方 HTTP client，保持 route response 和 trace 结构不变。
- 链上证明：替换 `src/lib/adapters/attestation-client.ts` 的 mock 实现。
- 钱包连接：在设置页和 attestation adapter 增加 wagmi / viem 连接流程。
- API Key：保持服务端读取，不把真实密钥暴露给浏览器。
