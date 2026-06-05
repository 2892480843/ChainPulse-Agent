# ChainPulse Agent 路演体验与桌面 Web 精修提示词

你是 Codex。当前项目已经完成 ChainPulse Agent Web Demo 的第二轮桌面端工程化优化。请在当前项目继续迭代，不要重建项目，不要回退已完成的组件拆分和路由结构。

本轮目标：把当前“桌面端可运行 Dashboard”进一步打磨成“适合 ETH Beijing 路演演示的完整 Web 产品体验”。暂时不做移动端，不接真实后端，不接真实钱包，不接真实 xAPI。

## 一、当前已知状态

当前已完成：

- `Next.js 16 + React 19 + TypeScript + TailwindCSS`
- 7 个路由：
  - `/workspace`
  - `/tasks`
  - `/reports`
  - `/trace`
  - `/attestation`
  - `/watchlist`
  - `/settings`
- `src/components/DashboardApp.tsx` 已降到约 28 行。
- 页面组件已拆到 `src/components/pages/`。
- Shell 已拆到 `src/components/shell/`。
- UI 组件已拆到 `src/components/ui/`。
- 已新增：
  - `README.md`
  - `.env.example`
  - `src/lib/adapters/xapi-client.ts`
  - `src/lib/adapters/attestation-client.ts`
- 当前验证已通过：
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - `npm run build`
- 测试覆盖已扩展到 10 个用例。

当前主要缺口：

- Header 全局搜索框只是本地输入，没有实际搜索结果或跳转。
- Report Center 的“查看报告”只显示 toast，没有报告详情页。
- Running Tasks 只有列表与当前任务卡，没有任务详情路由或和报告、trace 的深度联动。
- `/trace` 的选中 trace、Headers 展开状态还没有同步到 URL query。
- Report Center 筛选状态没有同步到 URL query，刷新后丢失。
- 表单还缺少 `autoComplete="off"` 等细节。
- Header / Workspace placeholder 仍有 `...`，应改成中文省略号 `…`。
- Sidebar 底部 `#docs/#status/#privacy` 是无目标锚点，桌面端体验不完整。
- AppShell 缺少 skip link 和主内容 id。
- Running Tasks 的“自动滚动”目前是状态和样式，日志区域未真正滚动到底。

## 二、本轮不做什么

- 不做移动端适配。
- 不接真实 xAPI。
- 不接真实钱包或合约。
- 不引入新大型 UI 框架。
- 不做 landing page。
- 不重设计已有视觉风格。
- 不拆掉现有 7 个主页面。

## 三、P0：路演关键体验补齐

### 1. 实现全局搜索体验

目标：Header 的全局搜索要成为桌面端路演可用入口。

要求：

- 在 `Header` 中输入关键词后，显示搜索结果 popover。
- 搜索范围包括：
  - reports：报告标题、topic、summary
  - tasks：任务 topic、mode、status
  - xAPI traces：action、capability、outputPreview
  - watchlist：target name、symbol、category
- 每条搜索结果显示：
  - 类型标签，例如 `Report` / `Task` / `Trace` / `Watchlist`
  - 标题
  - 简短说明
  - 目标路径
- 点击搜索结果跳转到对应页面：
  - report 结果跳到 `/reports/[id]`
  - task 结果跳到 `/tasks?task=<id>` 或 `/tasks/[id]`
  - trace 结果跳到 `/trace?trace=<id>`
  - watchlist 结果跳到 `/watchlist?target=<id>`
- 支持键盘操作：
  - `ArrowDown` / `ArrowUp` 切换选中项
  - `Enter` 打开选中项
  - `Escape` 关闭 popover
- 搜索框为空时不展示结果。
- 最多展示 6 条结果。
- 增加测试覆盖。

建议新增：

```txt
src/lib/search.ts
src/components/shell/GlobalSearch.tsx
```

### 2. 新增报告详情页

目标：Report Center 的“查看报告”不能只 toast，要进入完整报告详情。

新增路由：

```txt
/reports/[id]
```

页面内容：

- 报告标题、topic、mode、status、createdAt。
- riskScore、alphaScore、confidence、verdict。
- summary。
- evidence 列表。
- actions 建议。
- reportHash、evidenceHash，带复制按钮。
- 链上状态卡片：
  - 已上链：显示 txHash / explorer link。
  - 未上链：显示 `Attest on-chain` mock 按钮，点击后 toast。
- 右侧概览栏：
  - xAPI sources summary
  - evidence weight distribution
  - hash proof readiness
- 返回报告中心按钮。

要求：

- Report Center 表格里的查看按钮使用 Next `<Link>` 指向 `/reports/[id]`。
- 下载按钮保留现有 mock JSON 下载。
- 对无效 id 显示友好的空状态，不要崩溃。
- 增加测试覆盖。

### 3. 强化任务与 Trace 联动

目标：路演时从 `/tasks` 能自然跳到对应 xAPI Trace。

要求：

- Running Tasks 当前任务卡增加：
  - `查看 Trace` 按钮，跳转 `/trace?task=<taskId>`
  - `查看报告草稿` mock 按钮，若有对应 report 则跳 `/reports/[id]`，否则 toast。
- `/trace` 支持读取 URL query：
  - `?trace=<traceId>`：打开指定 trace。
  - `?task=<taskId>`：筛选该 task 的 traces。
  - `?headers=open`：默认展开 Headers。
- 点击 trace item 后更新 URL query 中的 `trace`。
- Headers 展开/收起同步到 `headers=open` 或移除该 query。
- 增加测试覆盖。

## 四、P1：URL 状态与桌面表格体验

### 1. Report Center 筛选同步 URL query

要求：

- `/reports?query=ETH&verdict=OBSERVE&minRisk=20&maxRisk=45&startDate=2026-06-05&endDate=2026-06-05`
- 刷新后筛选条件仍保留。
- 点击重置后清空 query。
- 不需要引入 `nuqs`，可以用 Next `useSearchParams` + `useRouter` + `URLSearchParams` 简单实现。

### 2. Watchlist 状态同步 URL query

要求：

- `/watchlist?target=wl_eth`
- 搜索结果或外部跳转进入后，对应 target 高亮。
- 点击扫描后可把 `target` 写入 query。

### 3. 桌面端信息密度微调

只做桌面端：

- Report Center 表格保留 7 列，但让 summary truncate 更稳定。
- Trace 左侧列表可固定高度并滚动，右侧详情保持顶部对齐。
- Tasks 日志区域真正支持自动滚动到底。
- 表格数字列使用 `tabular-nums`。

## 五、P1：可访问性与表单细节

参考 Web Interface Guidelines 完成以下修复：

- 所有非登录业务 input/select 增加 `autoComplete="off"`。
- Header 搜索 placeholder 改为 `搜索任务、报告、地址 / KOL…`。
- Workspace placeholder 改为 `ETH、0x…、@KOL、DAO proposal…`。
- AppShell 增加 skip link：
  - 文案：`跳到主内容`
  - 指向 `<main id="main-content">`
- Sidebar 底部链接不要使用无目标 `#docs/#status/#privacy`：
  - 要么改为真实路由或外链占位。
  - 要么改为普通文本状态信息。
- `inputClass` 中的 `outline-none` 保留可以，但必须确保 `focus-visible` 样式清晰；如有更好写法可改成 `focus-visible:outline-none`。
- 所有 icon-only 按钮保持 `aria-label`。
- 所有可打开新窗口的链接或按钮要有清晰反馈。

## 六、P1：文档更新

更新 `README.md`：

- 增加新增路由 `/reports/[id]`。
- 增加全局搜索说明。
- 增加 URL query 示例：
  - `/trace?trace=trace_004`
  - `/trace?task=task_eth_risk_001&headers=open`
  - `/reports?query=ETH&verdict=OBSERVE`
- 增加路演 Demo 脚本：3 分钟路径。

## 七、测试要求

补充或更新测试，至少覆盖：

- 全局搜索：
  - 输入 `ETH` 展示 report/task/trace/watchlist 结果。
  - 点击 report 结果跳转 `/reports/<id>`。
  - 键盘 `ArrowDown` + `Enter` 可打开选中结果。
- Report Detail：
  - `/reports/rep_eth_001` 显示报告详情、scores、evidence、hash。
  - 无效 report id 显示空状态。
- Trace URL query：
  - `/trace?trace=trace_004` 默认选中失败 trace，并显示 error panel。
  - `/trace?headers=open` 默认展开 Headers。
- Report filters URL query：
  - 带 query 进入 `/reports` 后筛选状态正确。
  - 重置后清空筛选。
- Running Tasks：
  - “查看 Trace” 跳转到 `/trace?task=...`。
  - 自动滚动开启时追加日志后日志区滚到底。测试可验证调用行为或 DOM 状态，不必依赖真实滚动像素。

## 八、验证命令

完成后必须运行：

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

再启动：

```bash
npm run dev
```

桌面端手动验收：

- 打开 `/workspace`，用全局搜索搜索 `ETH`。
- 从搜索结果进入 `/reports/rep_eth_001`。
- 从任务页点击 `查看 Trace` 进入 `/trace?task=...`。
- 在 `/trace?trace=trace_004&headers=open` 能直接看到失败 trace 和 headers。
- 在 `/reports?query=ZEC&verdict=CAUTION&minRisk=60` 刷新后筛选仍保留。
- 1440px 宽度下无明显布局重叠、表格错位、内容溢出。

## 九、最终回复必须包含

请用简体中文汇报：

1. 改动文件清单。
2. 新增路由清单。
3. 全局搜索实现说明。
4. 报告详情页实现说明。
5. URL query 状态实现说明。
6. 可访问性与表单修复说明。
7. 测试与构建验证结果。
8. 本地预览地址。
9. 剩余未完成事项和下一步建议。

如果某项没有完成，必须明确写“未完成”和原因，不要笼统写“已优化”。
