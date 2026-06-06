# ChainPulse Agent Web Demo

ChainPulse Agent 是一个 Web3 智能分析控制台 Demo，用于路演展示 Agent 如何从 xAPI 发现 action、读取 schema、采集证据、生成报告，并把报告哈希与证据哈希送入链上证明流程。

当前版本已接入服务端 xAPI 代理和双模式证明 adapter：未配置 `XAPI_KEY` 或上游失败时自动回退到本地 mock 数据；未配置合约地址时明确显示 `not configured` / `mock fallback`，配置真实链上环境和浏览器钱包后可走 `viem` 编码的真实交易入口。

## 技术栈

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Vitest + Testing Library
- lucide-react 图标
- viem 合约 calldata 编码

## 本地启动

```bash
npm install
npm run dev
```

默认预览地址：

```txt
http://localhost:3000
```

推荐路演入口：

```txt
http://localhost:3000/demo
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

`src/lib/adapters/xapi-client.ts` 定义浏览器端 adapter、Workspace run orchestration 和本地 fallback：

- `routeXApiClient.healthCheck()`：请求 `/api/xapi/health`，只读取服务端状态，不接触密钥。
- `routeXApiClient.searchActions(query)`：请求 `/api/xapi/search?query=...`。
- `routeXApiClient.getActionSchema(action)`：请求 `/api/xapi/schema?action=...`。
- `routeXApiClient.callAction(action, input, taskId)`：请求 `/api/xapi/call`。
- `runWorkspaceAgent(context)`：按 `health -> search -> schema -> call` 执行一次可观察 run，并把 runtime traces 保存到 `sessionStorage`。
- `mockXApiClient.getTrace(taskId)`：用于路演稳定 fallback trace。

服务端实现位于 `src/lib/server/xapi-service.ts`，通过 Next.js route handler 读取 `XAPI_KEY` 并调用 `xapi-to` CLI。调用 action 前会先执行 schema discovery，即先 `get <actionId>`，再 `call <actionId>`。所有响应都会返回统一 JSON、运行模式和 runtime trace。

可用 xAPI route handler：

```txt
GET  /api/xapi/health
GET  /api/xapi/search?query=...
GET  /api/xapi/schema?action=...
POST /api/xapi/call
```

`src/lib/adapters/attestation-client.ts` 定义 `AttestationClient` 接口、`mockAttestationClient` 和 `chainAttestationClient`：

- `createReportHash(report)`：对报告 JSON 做 deterministic SHA-256，本地可复算。
- `createEvidenceHash(evidence)`：对 evidence packet 做 deterministic SHA-256，本地可复算。
- `verifyProofBundle(report, evidence, record)`：复算并比较 `reportHash` / `evidenceHash`。
- `readAttestationConfig()`：读取 `NEXT_PUBLIC_CHAIN_ID`、`NEXT_PUBLIC_CONTRACT_ADDRESS`、`NEXT_PUBLIC_EXPLORER_BASE_URL`。
- `mockAttestationClient`：无合约配置时用于稳定演示，UI 明确标注 `mock fallback`。
- `chainAttestationClient`：有合约地址时使用 `viem` 编码 `SignalAttestation.attest(...)` calldata，并通过浏览器钱包发起 `eth_sendTransaction`。

没有 `NEXT_PUBLIC_CONTRACT_ADDRESS` 时不会伪造 live 上链；按钮会 disabled 并说明缺少的配置。当前默认 ABI 为：

```solidity
function attest(
  bytes32 reportHash,
  bytes32 evidenceHash,
  string topic,
  uint8 riskScore,
  uint8 alphaScore,
  string verdict,
  string metadataURI
) returns (uint256 reportId)
```

若真实合约 ABI 不同，只需调整 `src/lib/adapters/attestation-client.ts` 内的 `attestationAbi`，页面和 proof bundle 结构不变。

## 环境变量

复制 `.env.example` 为 `.env.local` 后按需填写：

```env
XAPI_KEY=
XAPI_ACTION_HOST=action.xapi.to
XAPI_TIMEOUT_MS=12000
SEPOLIA_RPC_URL=https://rpc.sepolia.ethpandaops.io
SEPOLIA_MNEMONIC=
ETHERSCAN_API_KEY=
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_CONTRACT_ADDRESS=
NEXT_PUBLIC_EXPLORER_BASE_URL=https://sepolia.etherscan.io
```

`XAPI_KEY` 只允许在服务端读取；不要创建 `NEXT_PUBLIC_XAPI_KEY`。未配置密钥时，页面会标注 `mock fallback` / `no XAPI_KEY` 并继续展示本地 trace。上游失败时，页面展示 fallback 状态和脱敏错误摘要。

### 配置 xAPI

1. 复制 `.env.example` 为 `.env.local`。
2. 填入服务端密钥：

```env
XAPI_KEY=sk-...
XAPI_ACTION_HOST=action.xapi.to
```

3. 启动 `npm run dev` 后，在 `/workspace` 点击 `Run Agent`。
4. `/trace` 会显示 `live xAPI`、`no XAPI_KEY` 或 `upstream failed`。密钥只在服务端 route handler 使用，不会进入浏览器 bundle。

### 配置链上证明

1. 部署或准备兼容 ABI 的 attestation 合约。
2. 在 `.env.local` 配置：

```env
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_EXPLORER_BASE_URL=https://sepolia.etherscan.io
```

3. 使用带钱包的浏览器打开 `/attestation`。
4. 当合约、Explorer 和钱包都可用时，`Write real attestation` 会启用；否则页面会显示缺少 `NEXT_PUBLIC_CONTRACT_ADDRESS`、`NEXT_PUBLIC_EXPLORER_BASE_URL` 或 browser wallet。

### 部署 Sepolia 合约并自动验证

`contracts/SignalAttestation.sol` 是默认测试网合约。部署脚本只读取 `.env.local`，不会把助记词写入仓库或日志。

```bash
npm run contract:compile
npm run sepolia:deploy
npm run sepolia:check
npm run sepolia:attest:test
npm run sepolia:verify
```

- `sepolia:deploy` 会编译并部署合约，生成 `deployments/sepolia.json`，并回写 `.env.local` 的 `NEXT_PUBLIC_CONTRACT_ADDRESS`。
- `sepolia:check` 会确认合约地址存在 bytecode，并读取 `reportCount`。
- `sepolia:attest:test` 会调用 `attest(...)`，等待 receipt，解码 `ReportAttested` 事件，并读取链上记录逐字段比对。
- `sepolia:verify` 只有在 `ETHERSCAN_API_KEY` 存在时才提交 Etherscan source verification；没有 key 时只记录 skip。

### 真实功能与 fallback 边界

| 能力 | 真实路径 | fallback 边界 |
|---|---|---|
| xAPI health/search/schema/call | `/api/xapi/*` 服务端 route 读取 `XAPI_KEY` 并调用 `xapi-to` | 未配置密钥或上游失败时返回 mock data，并标注 `unconfigured` / `fallback` |
| Workspace Run Agent | 浏览器调用 route client，按 `health -> search -> schema -> call` 保存 runtime traces | route 不可用时保存本地 fallback traces，不崩溃 |
| Report/Evidence hash | 浏览器本地 deterministic SHA-256 复算 | hash mismatch 会显示 mismatch，不自动修正 |
| Attestation | `chainAttestationClient` 用 `viem` 编码完整 `SignalAttestation.attest(...)` calldata，浏览器钱包发交易 | 无合约/Explorer/钱包时按钮 disabled，展示 mock fallback receipt |
| Explorer | 使用 `NEXT_PUBLIC_EXPLORER_BASE_URL` 拼接 tx/address 链接 | 未配置时不伪造 Sepolia 链接 |

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

## 3 分钟满分路演脚本

| 时间 | 页面 | 讲解重点 |
|---|---|---|
| 0:00-0:20 | `/demo` | 先看 `100-point judge checklist`：Agent workflow、xAPI integration、Evidence traceability、Local hash verification、On-chain readiness、Test/build readiness。 |
| 0:20-0:50 | `/workspace` | 输入 `ETH` 或点击推荐案例，说明 `Run Agent` 会执行 `health -> search -> schema -> call`，不是只写 sessionStorage。 |
| 0:50-1:20 | `/tasks` | 展示运行进度、runtime logs、下一步入口，说明每个阶段为何可审计。 |
| 1:20-1:55 | `/trace?task=task_eth_risk_001` | 展示 schema-first call、input/output Hash、fallback/live 状态，说明 xAPI 证据可回放。 |
| 1:55-2:35 | `/reports/rep_eth_001` | 展示 Verify evidence chain、证据来源 action、证据权重、贡献解释和 Trace 链接。 |
| 2:35-3:00 | `/attestation` | 展示 Report Hash match、Evidence Hash match、Contract configured、Wallet mode 和 Judge proof panel。强调无配置时不伪造上链。 |

## 评委检查清单

| 维度 | 评委应看到 |
|---|---|
| 产品叙事 | `/demo` 可在 3 分钟内串起输入、Agent、Trace、Report、Proof。 |
| 工程质量 | xAPI route 不泄露密钥，schema-first call 有测试覆盖，fallback 不崩。 |
| 功能完整度 | Workspace run 可观察，Trace 可复核，Report 可解释，Attestation 可本地验证。 |
| 创新与记忆点 | Proof bundle 能本地复算，证据卡能回链到 xAPI action。 |
| 真实落地可信度 | 无合约时明确 `not configured`；有合约和钱包时有真实交易入口。 |

更多细节：

```txt
docs/judge-scorecard.md
docs/proof-verification.md
```

## 后续真实服务替换位置

- xAPI：生产环境可把 `src/lib/server/xapi-service.ts` 中的 CLI runner 替换为官方 HTTP client，保持 route response 和 trace 结构不变。
- 链上证明：替换 `src/lib/adapters/attestation-client.ts` 的 mock 实现。
- 钱包连接：在设置页和 attestation adapter 增加 wagmi / viem 连接流程。
- API Key：保持服务端读取，不把真实密钥暴露给浏览器。
