# Chat 模块 - AI 对话

## 功能范围
AI 对话模块提供智能投顾对话功能，支持行情查询、资金流向查询、龙头股查询等 Skill、深度分析（force_deep 升级），以及 WS 流式输出。App 专属对话主页面在 `pages-sub-app/chat/index.vue`（P3 收敛为纯对话流，市场复盘 tab 已退役；P3-fix 起气泡渲染顺序为 ReasoningCard（AI 思考过程）→ 回复内容 → DeepSummaryCard）。

## 页面
- `pages/index.vue` - AI 对话主页面（主包，仅重定向到子包对话页）
- `pages/agent-report.vue` - 今日分析概览页（双模式：无 intent 参数→概览模式显示各 Agent 简报卡片；有 intent 参数→详情模式显示单个 Agent 报告）
- **App 子包对话主页面** `../pages-sub-app/chat/index.vue` - 纯对话流（WS 流式 + HTTP 降级；含 force_deep「深度分析」按钮 `rerunDeep` 重发前一条 user 消息；标题旁「会话」入口 + onLoad 自动建会话 + 首次用户消息 fire-and-forget upsert，P9）
- **App 子包会话列表页** `../pages-sub-app/chat/sessions.vue` - 会话列表（P9：新建/切换/删除 + 相对时间 + 当前高亮，仅登录时 onShow 拉 server 列表合并）

## 组件
- `../pages-sub-app/chat/DeepSummaryCard.vue` - 深度分析摘要卡片（消费 `ChatMessage.lastDeepReport`，worker 标签 + summary + symbols + 生成时间）
- `../pages-sub-app/chat/ExecStepsPanel.vue` - 执行细节面板（消费 `ChatMessage.execSteps` 层级树：一级节点 + 二级工具 + 耗时/思考时长，默认收起；**P3-fix 起对话页已退役，文件保留待 P9 复用**）
- `../pages-sub-app/chat/ReasoningCard.vue` - AI 思考过程卡片（P3-fix 新增，消费 `ChatMessage.reasoningSteps`，渲染于回复内容上方；折叠/展开 + 流式 dot 动画）
- 通用气泡/流式文本组件位于 `shared/components/`（`ChatBubble.vue`/`StreamingText.vue`）；skillResult 卡片与 SkillButton 已随 P3/P6 删除

## Hooks
- 使用 `shared/utils/useChatStream.ts`（对话流主 hook：WS 为主、HTTP 降级；`send(content, { forceDeep })`；DONE 写 `execSteps`/`lastDeepReport`；P3-fix 起订阅 reasoning 事件按节点聚合 `reasoningSteps`）
- 事件树重组纯函数 `shared/utils/buildExecTree.ts`

## 对外暴露的接口
- 子包路径: `/pages-sub-app/chat/index`
- 模块内路径: `/modules/chat/pages/index`

## 依赖的 shared/ 中的类型
- `@/shared/store/modules/chat` - 对话状态管理（P9 起多会话：`sessions` 列表 + `messagesBySession` 分桶，新增 `createSession`/`switchSession`/`deleteSession`/`syncSessionsFromServer`/`hasUserMessage`）
- `@/shared/api/modules/agent` - AI Agent API 及 `ChatMessage` 类型（含 `lastDeepReport?: DeepReportRef` / `execSteps?: ExecStepNode[]`，P3 追加；`reasoningSteps?: ReasoningStep[]`，P3-fix 追加；大盘溯源 schema 2.0 类型族保留，MarketTraceQa 系列与 `sendMarketTraceQaMessage` 已删除）
- `@/shared/components/SvgIcon.vue` - 图标组件

## 开发注意事项
- App 端推荐使用 WebSocket 流式输出（`useChatStream`，非 SSE `useStreamingChat`）
- 深度分析升级：light/闸门回复气泡下方显示「深度分析」按钮（仅 `!msg.lastDeepReport` 且非错误消息），点击以 `force_deep: true` 重发该回复前最近一条 user 消息
- 非 App 端使用非流式降级方案（`agentApi.sendMessage`，支持第三参数 `{ forceDeep }`）
