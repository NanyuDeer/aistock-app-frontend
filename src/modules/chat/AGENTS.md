# Chat 模块 - AI 对话

## 功能范围
AI 对话模块提供智能投顾对话功能，支持行情查询、资金流向查询、龙头股查询等 Skill、深度分析（force_deep 升级），以及 WS 流式输出。App 专属对话主页面在 `pages-sub-app/chat/index.vue`（P3 收敛为纯对话流，市场复盘 tab 已退役；P11 起气泡渲染顺序为 ReasoningPanel（AI 思考过程 + 执行细节）-> CardRenderer（cards）-> 回复内容 -> DeepSummaryCard（兼容旧字段））。

改进 14：AI 回复 markdown 分节（核心结论/行情要点/数据说明）经 `parseMarkdownSections` 识别后由 `SectionCard` 区块卡片渲染；ReasoningPanel 视觉升级为卡片风格（$bg-card + $shadow-card + $r-md）；非分节回复（寒暄/科普）保持 mp-html 渲染。

P11（线 5）：消费 DONE 事件 `token_usage`（会话计费本地累加，UsageBar 展示）与 `cards`（5 类卡片经 CardRenderer 渲染）两字段；WS 身份契约 `user_id`=openid（登录用户）；HTTP 降级路径保持现状。

## 页面
- `pages/index.vue` - AI 对话主页面（主包，仅重定向到子包对话页）
- `pages/agent-report.vue` - 今日分析概览页（双模式：无 intent 参数→概览模式显示各 Agent 简报卡片；有 intent 参数→详情模式显示单个 Agent 报告）
- **App 子包对话主页面** `../pages-sub-app/chat/index.vue` - 纯对话流（WS 流式 + HTTP 降级；含 force_deep「深度分析」按钮 `rerunDeep` 重发前一条 user 消息；标题旁「会话」入口 + onLoad 自动建会话 + 首次用户消息 fire-and-forget upsert，P9）
- **App 子包会话列表页** `../pages-sub-app/chat/sessions.vue` - 会话列表（P9：新建/切换/删除 + 相对时间 + 当前高亮，仅登录时 onShow 拉 server 列表合并）

## 组件
- `../pages-sub-app/chat/DeepSummaryCard.vue` - 深度分析摘要卡片（消费 `ChatMessage.lastDeepReport`，worker 标签 + summary + symbols + 生成时间）
- `../pages-sub-app/chat/ReasoningPanel.vue` - P11 融合组件：思考链「AI 思考过程」+ 执行细节「执行细节」双折叠独立展开（消费 `ChatMessage.reasoningSteps` + `execSteps`；替代原 ReasoningCard/ExecStepsPanel）
- `../pages-sub-app/chat/cards/CardRenderer.vue` - 卡片路由（按 `ChatMessage.cards[].card_type` 分发 5 类卡片；未知类型不渲染）
- `../pages-sub-app/chat/cards/SectionCard.vue` - 分节区块卡片（改进 14 新增：单组件 + 语义变体 conclusion/points/notes/risk/other，按 markdown 二级/三级标题分节渲染）
- `../pages-sub-app/chat/cards/MarketSnapshotCard.vue` / `StockSnapshotCard.vue` / `CapitalFlowCard.vue` / `DeepAnalysisCard.vue` / `ComparisonCard.vue` - 5 类展示卡片（行情快照/个股快照/资金流向/深度分析/对比，纯展示，P11 新增）
- `../pages-sub-app/chat/UsageBar.vue` - 计费条（P11 新增：用户累计 + 本次会话本地累加；置于快捷按钮下、输入栏上）
- 通用气泡/流式文本组件位于 `shared/components/`（`ChatBubble.vue`/`StreamingText.vue`）；skillResult 卡片与 SkillButton 已随 P3/P6 删除

## Hooks
- 使用 `shared/utils/useChatStream.ts`（对话流主 hook：WS 为主、HTTP 降级；`send(content, { forceDeep })`；DONE 写 `execSteps`/`lastDeepReport`；P3-fix 起订阅 reasoning 事件按节点聚合 `reasoningSteps`）
- 事件树重组纯函数 `shared/utils/buildExecTree.ts`
- `shared/utils/parseMarkdownSections.ts` - 改进 14：markdown 分节识别纯函数（按 ## / ### 标题切分 + 变体分类，供 index.vue SectionCard 渲染）

## 对外暴露的接口
- 子包路径: `/pages-sub-app/chat/index`
- 模块内路径: `/modules/chat/pages/index`

## 依赖的 shared/ 中的类型
- `@/shared/store/modules/chat` - 对话状态管理（P9 起多会话：`sessions` 列表 + `messagesBySession` 分桶，新增 `createSession`/`switchSession`/`deleteSession`/`syncSessionsFromServer`/`hasUserMessage`）
- `@/shared/api/modules/agent` - AI Agent API 及 `ChatMessage` 类型（含 `lastDeepReport?: DeepReportRef` / `execSteps?: ExecStepNode[]`，P3 追加；`reasoningSteps?: ReasoningStep[]`，P3-fix 追加；`cards?: ChatCard[]` / `tokenUsage?: TokenUsage`，P11 追加；大盘溯源 schema 2.0 类型族保留，MarketTraceQa 系列与 `sendMarketTraceQaMessage` 已删除）
- `@/shared/components/SvgIcon.vue` - 图标组件

## 开发注意事项
- App 端推荐使用 WebSocket 流式输出（`useChatStream`，非 SSE `useStreamingChat`）
- 深度分析升级：light/闸门回复气泡下方显示「深度分析」按钮（仅 `!msg.lastDeepReport` 且非错误消息），点击以 `force_deep: true` 重发该回复前最近一条 user 消息
- 非 App 端使用非流式降级方案（`agentApi.sendMessage`，支持第三参数 `{ forceDeep }`）
