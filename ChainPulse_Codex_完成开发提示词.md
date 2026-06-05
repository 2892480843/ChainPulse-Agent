# ChainPulse Agent Web 完整开发提示词

你是 Codex，当前任务是在当前工作区完成 ChainPulse Agent Web Demo 的前端开发与本地可预览交付。请先阅读并理解当前目录中的 `ChainPulse_Agent_xAPI_需求文档.md`，再结合我提供的 UI 参考图压缩包 `ChainPulse_Agent_UI_Designs.zip` 和以下要求直接落地实现。

## 一、项目背景

ChainPulse Agent 是 ETH Beijing 2026 参赛项目，方向为 AI Agent 主赛道 + xAPI Track。产品定位是面向 Web3 投研、风险扫描、xAPI 调用审计与链上证明的 AI Agent 工具型后台。

一句话定位：

> ChainPulse Agent 是一个“会查资料、会交叉验证、会给风险结论、会把证据上链”的 Web3 情报智能体。

本次开发目标不是做营销页，而是完成一个可交互、可演示、视觉接近 UI 参考图的 SaaS Dashboard Demo。前端可使用本地 mock 数据，不要求接真实后端、真实 xAPI、真实钱包或真实合约，但页面必须把 Agent workflow、xAPI Trace、Report Center、On-chain Attestation 等核心能力表达清楚。

## 二、执行前必须做的事

1. 先检查当前项目结构：
   - 读取 `package.json`、`src`、`app`、`pages`、`components`、样式入口、路由文件等。
   - 如果已有前端项目，优先复用现有技术栈、组件、路由和样式系统。
   - 如果当前目录只有需求文档或没有可运行前端项目，则在当前目录创建一个最小可运行 Web 项目，推荐使用 `Next.js + React + TypeScript + TailwindCSS`。
2. 不要新建无关目录或脱离当前工作区另起项目。
3. 不要只输出方案，必须直接改代码、运行本地预览并给出预览地址。
4. 若 UI 设计图压缩包存在，先解压并查看全部 7 张图；实现时以参考图为准，不要自由重设计。
5. 若缺少 UI 图或图片无法读取，则按本文档中的布局和视觉要求实现，并在最终说明中标注该限制。

## 三、核心交付目标

完成一个 ChainPulse Agent Web Dashboard，至少包含 7 个页面，并使用统一 App Shell：

1. 工作台 Workspace
2. 运行中的任务 Running Tasks
3. 报告中心 Report Center
4. xAPI Trace
5. 链上证明 On-chain Attestation
6. Watchlist
7. 设置 Settings

P0 必须完成：

- App Shell：Sidebar、Header、主内容区、Footer links。
- 7 个页面都可切换，当前 Sidebar item 高亮正确。
- 所有页面使用本地 mock 数据，内容贴合 ChainPulse Agent 语境。
- 主要按钮有 hover、focus、active、loading、toast 或 copied 等反馈。
- 进度条、统计数字、Timeline、Sparkline、关键卡片有基础动画。
- 桌面端布局接近参考图，移动端不破版。
- 本地能启动预览，无明显控制台报错。

P1 尽量完成：

- 搜索与筛选可作用于 mock 数据。
- 复制 hash、下载 mock JSON、导出报告。
- Watchlist 添加目标 modal 或 inline form。
- Settings 表单保存成功反馈。
- API Key 显示 / 隐藏 / 复制。

P2 可选：

- URL 路由持久化。
- localStorage 保存设置或最近选择。
- 真实 xAPI client adapter、钱包连接、合约调用的占位接口。
- 深色模式。

## 四、视觉与设计要求

整体风格必须是专业、克制、工具型、低装饰的 SaaS Dashboard：

- 主色调：白色、近白、浅灰、低饱和蓝。
- 状态色：绿色表示正常 / 成功，橙色表示 caution / 中风险，红色表示 failed / 高风险，紫色用于 DAO / KOL 标签。
- 背景：浅灰或近白。
- 卡片：白底、细边框、轻阴影、8px 左右圆角，不要重阴影。
- 字体：现代、干净，优先复用项目已有字体；没有则使用系统 sans-serif 字体栈。
- 图标：优先使用已有图标库；没有则使用 `lucide-react` 或简化 SVG。不要用 emoji 代替核心 UI 图标。
- Token / 项目标识：ETH、ZEC、SOL、AAVE、Uniswap、Chainlink、MakerDAO、Curve 等需要有简化图标、渐变圆形图标或本地资产，不要全用灰色占位块。
- Logo：左上角实现“脉冲线 + ChainPulse Agent”组合，可用 SVG。
- 技术区域：JSON、trace、hash、headers、timing 使用等宽字体，层级清晰，不要 lorem ipsum。
- 不要做 landing page，不要 hero banner，不要大面积渐变，不要 3D 插画，不要营销文案堆叠。

## 五、通用布局

所有页面共享同一个 App Shell：

Sidebar：

- ChainPulse Agent Logo
- 工作台
- 运行中的任务
- 报告中心
- xAPI Trace
- 链上证明
- Watchlist
- 设置
- API 配额卡片，例如 `xAPI quota 72%`、`Agent runs 18/25`

Header：

- 全局搜索框：`搜索任务、报告、地址 / KOL...`
- 系统状态：正常
- 通知图标
- 用户头像：`W`
- 用户名：`Web3 Researcher`

响应式：

- 桌面端保留参考图中的后台布局。
- 平板 / 移动端 Sidebar 折叠为抽屉或顶部导航。
- 表格在小屏幕下横向滚动或转为卡片列表。
- 卡片网格自适应，文字不得溢出或互相遮挡。

## 六、页面功能要求

### 1. 工作台 Workspace

内容：

- 页面标题：`智能分析工作台`
- 分析对象输入框，支持 Token、合约地址、项目名、KOL、关键词。
- 模式选择：`Alpha Scan`、`Risk Scan`、`DAO 尽调`
- 高级筛选折叠项。
- `Run Agent` 主按钮。
- 今日概览卡片。
- 最近报告表格。
- 快速案例列表。

交互：

- 模式卡片可点击切换选中状态。
- `Run Agent` 点击后显示 loading / pressed 反馈，并模拟创建任务或切换到 Running Tasks。
- 快速案例点击后填充输入框或触发轻反馈。

### 2. 运行中的任务 Running Tasks

内容：

- 当前任务卡片：`ETH / Risk Scan / Running / 开始时间 / 已运行 / 进度`
- 执行进度 Timeline：
  - 任务解析
  - xAPI 搜索
  - 读取 Schema
  - 数据采集
  - 证据归一化
  - 推理与打分
  - 生成报告
- 实时执行日志。
- 右侧当前运行概览。
- 其他任务表格。

交互：

- 进度条首屏从 0 动画到目标值。
- Timeline 当前阶段有 active / pulse 动画。
- 取消任务、重新运行按钮有点击反馈。
- 日志区域可追加一条 mock 日志或切换自动滚动状态。

### 3. 报告中心 Report Center

内容：

- 搜索框。
- 日期范围。
- 模式筛选。
- 结论筛选。
- 风险分范围。
- 重置按钮。
- 导出报告按钮。
- 报告列表表格。
- 右侧报告概览、结论分布、模式分布、数据说明。

交互：

- 搜索和筛选可过滤本地 mock 报告。
- 重置按钮恢复默认。
- 导出报告按钮下载 mock JSON 或显示 toast。
- 查看 / 下载图标按钮有 hover 和 pressed 状态。

### 4. xAPI Trace

内容：

- 顶部统计：xAPI 调用总数、成功率、平均延迟、总耗时、唯一能力数。
- 左侧调用时间线。
- 右侧调用详情。
- `Input JSON` 代码块。
- `Output JSON` 代码块。
- Hashes 信息。
- Timing 信息。
- Headers 折叠区。

交互：

- 点击左侧 trace item，右侧详情切换。
- 成功 / 失败 / 运行中状态使用不同 badge。
- 复制按钮显示 copied 或 toast。
- 导出 JSON 按钮下载 mock trace JSON 或显示反馈。

### 5. 链上证明 On-chain Attestation

内容：

- 顶部报告证明信息卡。
- `Report Hash`、`Evidence Hash`、`Tx Hash`、`Wallet Address`、`Block`、`Timestamp`
- 链上证明步骤条：
  - 生成报告
  - 生成哈希
  - 钱包签名
  - 提交交易
  - 链上确认
- 证明详情。
- 关联报告。
- 证据包概览。
- 证明历史表格。

交互：

- 查看区块浏览器按钮有点击反馈，可打开 mock explorer 链接或显示 toast。
- 下载证明凭证按钮下载 mock JSON。
- Copy hash 按钮可复制并显示反馈。
- 步骤条首屏有轻微顺序动画。

### 6. Watchlist

内容：

- 添加监控目标按钮。
- 搜索框。
- 类别筛选。
- 告警状态筛选。
- 排序筛选。
- 监控统计。
- 监控列表表格。
- 24h 信号变化 sparkline。
- 右侧今日概览、最近告警、扫描任务计划。

交互：

- 添加监控目标打开 modal 或 inline form。
- 搜索 / 筛选可过滤 mock 数据。
- Sparkline 首屏绘制或淡入动画。
- 告警按钮、更多按钮有 hover / pressed 状态。

### 7. 设置 Settings

内容：

- 账户信息。
- API 与密钥。
- 模型设置。
- 链上网络配置。
- 通知设置。
- 安全与权限。
- 右侧当前环境概览。

交互：

- 表单可编辑。
- Toggle 可切换。
- Dropdown / segmented options 可切换。
- 保存按钮显示保存成功反馈。
- Log Out 显示确认或 toast。
- API Key 可显示 / 隐藏 / 复制。

## 七、Mock 数据要求

使用本地 mock 数据即可，但必须贴合产品语境。

对象示例：

- Token / 项目：`ETH`、`ZEC`、`SOL`、`AAVE`、`Uniswap`、`Chainlink`、`MakerDAO`、`Curve`
- KOL：`@defi_mochi`、`@MustStopMurad`
- xAPI actions：
  - `twitter.search_timeline`
  - `twitter.tweet_detail`
  - `twitter.user_tweets`
  - `web.search.realtime`
  - `news.search.latest`
  - `crypto.token.price`
  - `crypto.token.metadata`
  - `ai.text.summarize`
  - `ai.text.chat.reasoning`
- 状态：
  - `Running`
  - `Completed`
  - `Failed`
  - `已完成`
  - `已上链`
  - `未上链`
  - `已上链确认`
- 结论：
  - `POSITIVE`
  - `OBSERVE`
  - `CAUTION`
  - `NEGATIVE`
- 链上字段：
  - `Report Hash`
  - `Evidence Hash`
  - `Tx Hash`
  - `Wallet Address`
  - `Block`
  - `Timestamp`

Hash、JSON、时间戳、区块高度要看起来真实，但可以是 mock。

报告 JSON 至少包含：

```json
{
  "topic": "ETH",
  "mode": "Risk Scan",
  "summary": "ETH 近期讨论热度稳定，未发现明显社交操纵信号。",
  "riskScore": 32,
  "alphaScore": 68,
  "confidence": 0.74,
  "verdict": "OBSERVE",
  "evidence": [
    {
      "id": "ev_001",
      "source": "xapi:twitter.search_timeline",
      "title": "Recent ETH discussion cluster",
      "summary": "多位用户讨论 ETH 生态更新，情绪偏中性。",
      "weight": 0.25
    }
  ],
  "actions": [
    "继续观察 24h 社交热度变化",
    "若风险分高于 70，建议暂停自动交易或治理投票"
  ]
}
```

xAPI trace 数据可参考：

```ts
interface XApiTrace {
  id: string;
  taskId: string;
  action: string;
  schemaFetched: boolean;
  inputHash: string;
  outputHash: string;
  outputPreview: string;
  startedAt: string;
  endedAt: string;
  status: "success" | "failed" | "running";
  error?: string;
}
```

## 八、建议组件抽象

优先按现有项目风格实现。若从零创建，请至少抽象：

- `AppShell`
- `Sidebar`
- `Header`
- `StatCard`
- `StatusBadge`
- `ModeBadge`
- `DataTable`
- `ProgressBar`
- `Timeline`
- `CodeBlock`
- `Toast`
- `Sparkline`
- `CopyButton`
- `TokenIcon`

样式应统一管理，避免大量重复 CSS。实现时遵循 KISS、YAGNI、DRY、SOLID 原则，保持组件职责清晰。

## 九、技术建议

如果没有现成项目，推荐：

- `Next.js`
- `React`
- `TypeScript`
- `TailwindCSS`
- `lucide-react`

可选但不强制：

- `framer-motion` 用于轻量动画。
- `clsx` 或 `class-variance-authority` 管理 class。

不要混乱引入多个大型 UI 体系。若已有 shadcn/ui、Ant Design、MUI、CSS Modules 或其他体系，优先沿用已有体系。

## 十、验证要求

完成后必须执行：

1. 安装依赖。
2. 运行 lint / typecheck / build 中项目已有的可用命令。
3. 启动本地预览服务。
4. 手动自检以下项目：
   - 7 个页面是否都能切换。
   - Sidebar 当前高亮是否正确。
   - Header、Footer、API 配额卡片是否在页面间一致。
   - Run Agent、导出、复制、下载、取消、重新运行、查看区块浏览器、保存设置、Log Out 等按钮是否有反馈。
   - 搜索与筛选是否能作用于 mock 数据。
   - 进度动画、Timeline active、Sparkline、步骤条动画是否生效。
   - xAPI Trace 详情切换是否生效。
   - JSON / Hash / Headers / Timing 区域是否可读。
   - 桌面和移动端是否没有明显布局破裂。
   - 浏览器控制台是否没有明显报错。

如构建或测试失败，先定位根因并修复；不要在失败状态下声称完成。

## 十一、最终回复必须包含

请用简体中文给出最终汇报，并包含：

1. 改动文件清单。
2. 关键实现说明。
3. 本地预览地址 / 打开方式。
4. 可交互功能说明。
5. 验证命令与结果。
6. 与参考图仍有差异的点，如有。
7. 后续若要接真实 xAPI / 钱包 / 合约，需要替换哪些 mock 层。

## 十二、重要限制

- 不要做成 landing page。
- 不要重设计品牌方向。
- 不要加入大面积渐变、夸张 3D 插画或营销标题。
- 不要只完成首页，7 个页面都必须有。
- 不要只贴 UI 图或静态海报，必须是可交互页面。
- 不要在前端暴露真实 `XAPI_KEY`。
- 不要把大段报告正文或隐私数据假装“已上链”；链上证明展示的是 `reportHash` 与 `evidenceHash`。
- 若使用 mock 数据兜底，UI 中可通过小标签说明 `mock` 或 `fallback`，避免误导。

现在请开始执行：先分析当前项目结构，再完成实现、验证和本地预览。
