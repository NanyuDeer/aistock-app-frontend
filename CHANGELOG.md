# Changelog — aistock-app-frontend

> 所有修改记录按时间倒序排列。每条记录标注分支、时间、开发者。

## [master] 2026-08-08 — 首页异动捕手模块恢复列表展示（日期并入描述行）

**开发者**: Aria

### 改进
- `src/modules/favorites/components/AlertContent.vue`：异动捕手列表由 `InsightAlertCard compact` 卡片换回 `ListCell` 列表（与个股情报模块同款）：标题=股票名、描述=主因归因文案、prefix=涨跌 Tag（涨红/跌绿）
- 日期（MM-DD）并入描述行（"主因：xxx · 08-07"），移除右侧独立 value 与 `.capture-time` 样式；`.capture-list` 与 `.intel-list` 样式合并统一（紧凑行距 + 单行截断 + 空行占位等高）

### 测试
- `src/modules/favorites/components/AlertContent.spec.ts`：断言由 InsightAlertCard 改为 ListCell（标题/描述/涨跌 Tag type/点击跳转），4 用例通过

---

## [changer] 2026-08-10 — 市场洞见页新增影响持续性预判卡片

**开发者**: 37588

### 新增
- `src/modules/analytics/components/MarketTracePrediction.vue`：影响持续性预判卡片（预测状态 → 三档预判气泡标签 → 演化路径时间轴 → 风险因素），样式对齐同页 MarketTracePredictionValidation.vue
- `src/shared/api/modules/agent.ts`：`MarketTracePredictionHorizon/Risk/Step/Prediction` 类型 + `MarketTraceTrace.prediction`
- `src/modules/analytics/utils/marketTraceReview.ts`：`toPredictionPresentation` 防御性提取（prediction/evolutionSteps/horizons 校验，非法返回 null）

### 改进
- `src/modules/analytics/pages/traceability.vue`：预判对照卡片后插入预测卡片（prediction 为 null 时不渲染，兼容旧报告）
- 演化路径时间轴优先后端结构化 `evolution_steps`（含档位标签），旧记录回退 narrative 按标点拆分
- 三档预判气泡化：方向（看多红/看空绿/中性蓝）+ 置信度（置信高/中/低）胶囊标签，对齐个股详情关键词气泡

### 测试
- `marketTraceReview.spec.ts` 新增 5 用例（prediction 提取三态 + evolution_steps 映射 + 旧记录兼容），15 通过

### 文档
- `src/modules/analytics/AGENTS.md`：补 traceability 页面与 MarketTracePrediction 组件记录

---

## [changer] 2026-08-09 — 清理合并带入的 mock 环境开关残留

**开发者**: 37588

### 修复
- `env/.env.production`：移除 `VITE_USE_INSIGHTS_MOCK=true`（合入 master 时被重新带回，与「mock 数据移除」策略不符）

---
## [master] 2026-08-07 — 晚报市场异象卡片改版为头条风格并移至音频播报下方

**开发者**: Aria

### 改进
- `pages-sub-app/briefing/components/EveningAnomalyCard.vue`：样式由洞见行改为参考早报「今日头条」卡片——白底圆角 + 左侧主题色竖条 + 顶部 ★ 标签 + 标题 + 结论；label 为「市场异象」、标题为「今日主因」
- `pages-sub-app/briefing/index.vue`：晚报市场异象卡片从 Agent 洞见之后移到音频播报正下方（与晨报头条卡片位置对齐）；大盘行情/板块行情卡片保持在 Agent 洞见之后

---
## [changer] 2026-08-07 — 异动捕手卡片视觉重构 + mock 数据移除

**开发者**: 37588

### 新增
- 共享组件 `src/shared/components/InsightAlertCard.vue`：异动提醒卡片（品牌蓝渐变头部 + 左侧涨跌色条 + 置信度 Tag，含 compact 模式供首页预览卡使用）
- 模块组件 `src/modules/favorites/components/InsightDetailLayout.vue`：洞察详情布局（头部卡 + 主因/次因/详情/来源多段卡片，条件渲染）
- 5 个 vitest 测试：`InsightAlertCard.spec.ts`、`InsightDetailLayout.spec.ts`、`monitor.spec.ts`、`insight-detail.spec.ts`、`AlertContent.spec.ts`

### 重构
- `monitor.vue` 异动列表：`Card` → `InsightAlertCard`，头部 Tag 红涨绿跌实色，左侧色条加宽
- `AlertContent.vue` 异动捕手模块：`ListCell` → `InsightAlertCard compact`（4 行占位稳定）
- `insight-detail.vue`：改用 `SubPageCard2` 容器 + `InsightDetailLayout`，移除重复 subtitle
- 头部渐变：从左到右 `$primary` → `$bg-soft`（蓝 → 浅灰）

### 移除
- `src/modules/favorites/mock-data.ts`：异动捕手 mock 数据不再进仓库（仅本地开发用）
- 三个页面 mock 回退逻辑：改走真实 API，接口失败/空数据展示空状态
- `VITE_USE_INSIGHTS_MOCK` 环境开关（env 三文件 + `src/env.d.ts`）
- `AGENTS.md` mock-data 说明

### 验证
- vitest：26 个测试全绿（favorites 模块）
- `npx tsc --noEmit` 通过
- `pnpm build:h5` 构建成功

## [master] 2026-08-07 — 晚报页归因结论：优先展示 review 综合主因一句话摘要

**开发者**: Aria

### 改进
- `shared/api/modules/agent.ts`：`MarketTraceTrace` 新增 `attribution_summary?: string | null`（综合主因的一句话结论，旧报告可能缺失）
- `shared/utils/eveningBriefCards.ts`：新增 `extractAttributionSummary()`（读 `content.market_trace.trace.attribution_summary`，空值返回空串）；`buildEveningCardViewModel` 结论文本优先取 review 短摘要，缺失时回退 brief 归因结论（主因链拼接长文本）——解决晚报「归因结论」条目超长问题

### 测试
- `shared/utils/eveningBriefCards.spec.ts`：makeReview 的 trace 增加 attribution_summary 字段（默认 null），新增优先展示/回退/空值 4 个用例（23 passed）

---
## [master] 2026-08-07 — 晚报页去重：洞见列表仅保留收盘复盘，行情归卡片展示

**开发者**: Aria

### 修复
- `pages-sub-app/briefing/index.vue`：晚报（type=review）场景下 Agent 洞见列表仅保留「收盘复盘」摘要，不再重复展示「归因结论」与「市场快照」
  - 背景：此前三条文本全部进入洞见列表，同时 EveningAnomalyCard / EveningMarketIndexCard / EveningSectorsCard 又分别展示归因结论、大盘、板块，导致「归因结论」与「板块行情」内容重复出现
  - 现在的展示分工：洞见列表 = 收盘复盘摘要；卡片区 = 市场异象（归因结论）+ 大盘行情 + 板块行情，逻辑顺序为现象 → 行情数据 → 归因原因

## [changer] 2026-08-07 — 晚报界面卡片重设计（Agent 洞见风格 + 异象排序）

**开发者**: Aria

### 新增
- 晚报卡片 ViewModel 组装工具（`shared/utils/eveningBriefCards.ts`）：`detectMarketAnomaly` 异象判定（文本+结构化双重判定）、`extractAttributionConclusion` 归因结论提取、`extractBreadth` 涨跌家数提取
- 晚报专属卡片组件（`pages-sub-app/briefing/components/`）：`EveningAnomalyCard`（市场异象结论）、`EveningMarketIndexCard`（大盘行情：指数+涨跌家数）、`EveningSectorsCard`（板块行情：领涨/领跌）

### 改进
- 晚报卡片样式统一为早报 Agent 洞见行风格（白底圆角 + 左侧圆角图标 + mini-tag 标签）
- 卡片排版：Agent 洞见 → 市场异象（有才显示）→ 大盘行情 → 板块行情；晚报场景下即使 brief 无数据也保留「Agent 洞见」分区标题，保持与早报一致的页面结构
- `marketTraceReview.ts`：`indexPerfFromUnknown` 支持后端对象（map）结构的 indexes，并兼容 `change_pct`/`pct_change` 字段名

### 修复
- 大盘行情只显示涨跌家数、无具体指数涨跌：根因是后端 indexes 为对象（map）而前端期望数组，修复后指数正常展示
- 音频入口文案写死「AI早报音频」：新增 `audioLabelText` 根据播报类型动态显示早报/晚报音频

### 验证
- `npx tsc --noEmit` 通过

## [master] 2026-08-06 — agent-report wind_leader 分卡片展示 + 板块卡片 markdown 渲染修复

**开发者**: Aria

### 修复
- `agent-report.vue` wind_leader 板块卡片：body 原用 `<text>` 直接输出导致 `- **上榜次数**：...` 等 markdown 语法原样显示 → 改用 `mp-html` + `markdownToHtml`（新增 `.wind-sector-body-html` 样式）

### 改进
- 按后端 prompt 章节结构分卡片展示：风口结论（summary）→ 风口概览（`## 风口概览`）→ 长线/短线研判两档切换 + 板块卡片（`###` 子节）→ 龙头股推荐（`## 龙头股推荐` + `display_report.stocks` 代码标签）→ 风险提示（`## 风险提示`）→ 关注建议（`## 关注建议`）
- 移除原"风口分析（长短线分类）"全文卡片，改为各章节解析均失败时兜底展示原文（避免内容丢失）；新增 `windRiskHtml` / `windAdviceHtml` 章节解析

---

## [master] 2026-08-06 — leaders 泡泡图：半径上限 50px + 双色阶（长线蓝系/短线橙红系）

**开发者**: Aria

### 改进
- `windLeaderBubble.calcBubbleRadius`：半径上限 65→50px、下限 22→20px（长线满格 120 天 / 短线满格 10 天，`20 + 天数/满格×30`）
- `windLeaderBubble` 新增双色阶 + `calcBubbleColor(kind, value)`：
  - 长线蓝系：0.3 浅蓝 `#dbeafe` → 0.5 普通蓝 `#3b82f6` → 0.9 近黑蓝 `#121a44`（0.6 深蓝 `#1552d0`、0.7 藏青 `#1e3a8a`，相邻档亮度差 12~15%）
  - 短线橙红系：0.3 浅橙 `#fed7aa` → 0.5 普通橙 `#f97316` → 0.8 转红 `#7f1d1d` → 0.9 暗红 `#5b1414`
  - 0.1/0.2 与 0.3 同色（低于 cycle 门槛的板块会被筛选掉，收敛最浅色）；值在相邻档间线性插值
- 移除 `calcBubbleOpacity` 透明度逻辑；`leaders.vue bubbleItemStyle` 改用 `calcBubbleColor` 填充色，去掉元素透明度双重叠加；提示文案更新"长线蓝系/短线橙红系"

---

## [master] 2026-08-06 — leaders 泡泡图：大小按长短线各自量级归一化 + 颜色对比度加强

**开发者**: Aria

### 改进
- `windLeaderBubble.calcBubbleRadius`：长线以 120 天为满格、短线以 10 天为满格，半径 22→65px 线性、超过封顶——修复原 `clamp(26+days×coef,22,65)` 长线 75+ 天全封顶、长短线系数不匹配各自量级的问题（长线 45d→38px / 75d→49px 可区分）
- `windLeaderBubble.calcBubbleOpacity`：`0.4+0.6×值` → `0.3+0.7×值`，低强度更浅、高强度更深（原 conf/heat 多集中在 0.3~0.6，映射后几乎全是浅蓝无法区分）
- `leaders.vue bubbleItemStyle`：ratio 反推同步改为 `(opacity-0.3)/0.7`

---

## [master] 2026-08-06 — 风口龙头接口 limit 20→40（配合后端双轨选板）

**开发者**: Aria

### 修复
- `leaders.vue` / `sector-detail.vue`：`getWindLeaders(20)`→`(40)`——后端双轨选板后分析数约 27，limit=20 会截断短线池候选，导致前端过滤 0 天板块后长短线凑不满 8

---

## [master] 2026-08-06 — leaders 双榜过滤 0 天板块 + cycle 类型对齐

**开发者**: Aria

### 修复
- `src/modules/market/pages/leaders.vue`：`displaySectors` 先过滤当前档位天数为 0 的板块（另一链被裁剪或长短线均不成立的 `'none'` 板块），再按天数降序取 top8——宁少勿滥，避免短线档塞满 0 天补位板块
- `src/shared/api/modules/stock.ts`：`WindLeaderSector.cycle` 类型增加 `'none'`，与后端 deriveCycle 四态对齐

---

## [junliang] 2026-08-06 — pages.json 路由重构回滚：恢复被删页面路由 + 删除死文件

**开发者**: Aria

### 修复
- `src/pages.json`：回滚非自选股洞察相关的路由重构——恢复被误删的页面路由（trend-score 系列 / reports / report-detail / traceability / sector-detail / hot-burst-report / briefing-detail）及原 style 配置，修复这些页面的跳转失效（如洞察页趋势股评分卡片、业绩页 redirectTo reports、长线风口板块详情、首页大盘溯源）；仅保留洞察改动（stock-trace 路由替换为 insight、新增 insight-detail）

### 清理
- 删除死文件：`src/modules/favorites/pages/stock-trace.vue`（路由已替换为 insight、无跳转引用）、`src/modules/user/pages/icon-gallery.vue`（无路由注册、无跳转引用）

---

## [junliang] 2026-08-06 — 异动监控接入自选股洞察 + 提醒tab更名"自选股洞察"

**开发者**: Aria

### 改进
- `src/modules/favorites/pages/monitor.vue`：异动监控数据源从已停用的 stock_trace 切换到自选股洞察 API，卡片展示主因 / 置信度（高置信/待验证）/ 日期，点击进入洞察详情页；移除"全部/大涨/大跌"筛选分栏，所有异动事件直接平铺展示；"立即检测"改为刷新列表（洞察由后端 cron 周期采集）
- `src/modules/favorites/components/AlertContent.vue`：底部"提醒"tab 的"异动捕手"模块更名为"自选股洞察"，数据源切换为洞察 API，列表展示自选股涨停雷达归因事件（股票 + 主因 + 日期），点击事件进洞察详情、点击模块标题进异动监控页

---

## [master] 2026-08-06 — leaders 分档逻辑按天数排序 top8（长短线各满 8 个）

**开发者**: Aria

### 修复
- `leaders.vue` `displaySectors`：不再按 `cycle` 过滤，改为长线按 `long_term_days` 降序 top8、短线按 `short_term_days` 降序 top8——解决 deriveCycle 对长线不成立板块误判 short 塞入短线档（短线全是 0 天、长线不足 8 个）的问题，两榜各自取天数最高的 8 个，0 天板块自然排后补位

---

## [master] 2026-08-06 — 风口龙头 leaders 页面修复（短线板块截断/次数口径/移除 cycle 标签）

**开发者**: Aria

### 修复
- `leaders.vue`：`getWindLeaders(10)`→`(20)`——后端双榜（长线榜 top8 + 短线榜 top8）长线在前，limit=10 截断导致短线档只剩 2-3 个板块
- `leaders.vue`：上榜次数按档位显示（新增 `boardCount`）——短线档显示近 20 日 `freq20`、长线档显示近 60 日 `frequency`（原先统一显示 60 日 frequency，短线次数超 30 次）

### 改进
- `leaders.vue`：删除 cycle 三态标签展示（长线风口/短线风口/长线+短线 Tag），`cycle` 字段仍用于双榜分流

---

## [changer] 2026-08-06 — ChatAgent 会话用量徽标 + 单轮用量进气泡 + 气泡消失修复 + HTTP 降级 token_usage + WS 端口对齐 8080

**开发者**: Aria

### 新增
- 会话列表 token 用量徽标（`sessions.vue`）：本地 `sessionUsage` 优先 + 服务端 `getChatSessionUsage` 补足（未登录也显示本地用量）；`sessionUsageMerge.ts` 纯函数合并（本地优先，服务端仅补缺失会话，不数值相加避免翻倍）
- 聊天气泡底部单轮用量文本（`index.vue`）：左侧「N tokens」+ 右侧深度分析按钮；移除底部 `<UsageBar />`
- `ChatMessage` 类型扩展 `tokenUsage?`/`cards?`；`agentApi.getTokenUsageSummary()`

### 修复
- 气泡消失根因（`useChatStream.ts`）：Pinia store 实例上访问 computed 被自动解包成普通值 → 消费方捕获陈旧数组快照 → v-for 永不更新；改用 `storeToRefs(chatStore)` 暴露响应式 ref
- HTTP 降级路径 token_usage 透出（`useChatStream.ts`）：降级分支 `appendMessage` 透出 `tokenUsage: result.token_usage`（此前恒 undefined）
- `sendMessage` 超时 15s→120s（非流式跑完整 graph ~50s 会超时无回复）
- `deleteSession` 同步清理 `sessionUsage` 残留（防幽灵徽标）

### 改进
- `env/.env.development` + `env/.env.example`：`VITE_AGENT_WS_BASE` 端口 `8000`→`8080` 对齐 agent-py 新端口

### 验证
- vitest 19 文件 98+ 用例全绿；vue-tsc 0 错误
- 浏览器实测气泡用量 + 会话徽标均正常显示

---

## [master] 2026-08-06 — 修复动态模块加载失败（SCSS 未定义变量）

**开发者**: Aria

### 修复
- `src/modules/chat/pages/agent-report.vue`：`$ink-2` → `$ink-soft`，修复 sass Undefined variable 导致的 Failed to fetch dynamically imported module
- `src/modules/market/pages/leaders.vue`：`$color-primary` → `$primary-color`、`$text-secondary` → `$text-color-secondary`（3 处），同类问题

---

## [master] 2026-08-05 — 今日分析概览页新增晚报（收盘复盘）入口与结构化展示

**开发者**: Aria

### 新增
- `src/modules/chat/pages/agent-report.vue`：概览模式新增「收盘复盘」卡片（AGENT_META review：moon-line 图标 + 紫色主题，排在 trend_score 之后）；详情模式新增 review 结构化展示（参考晨报分区：收盘结论 / 确认的市场现象 / 归因结论 / 预判对照 / 候选解释与反证 / 风险提示），`conclusion-card--review` 紫色主题色
- `src/shared/api/modules/agent.ts`：`PUBLIC_REPORT_INTENTS` 加入 `review`，支持从 URL `?intent=review` 直达详情

---

## [master] 2026-08-05 — 播报续播：早报/晚报退出页面移交悬浮窗续播

**开发者**: Aria

### 改进
- `src/pages-sub-app/briefing/index.vue`：退出页面时把播放移交悬浮窗续播（从当前进度续播）；移除冗余条目标题，来源标签升级为标题样式
- `src/shared/components/AudioPlayer.vue`：新增 `initialTime` 属性（自动播放时跳到指定进度，实现续播）；播放被浏览器拦截时静默
- `src/shared/components/FloatingPodcast.vue`：收起态保持 AudioPlayer 挂载（音频持续播放，仅视觉隐藏）；播放中悬浮球图标持续旋转；新增 play/pause/ended 事件同步
- `src/shared/store/modules/podcast.ts`：新增 `playDirect`（直接播放已有音频，跳过文本合成）、`setPlaying`/`consumeAutoplay`（同步播放状态）、`autoplay`/`startTime`/`playing` 状态字段

---

## [changer] 2026-08-05 — ChatAgent P9 会话管理（会话列表页 + 多会话 store + 会话 API 层）

**开发者**: Aria

计划：`D:\ai_stock_app\docs\superpowers\plans\2026-08-05-chat-agent-p9-session-management.md`

### 新增
- `src/shared/api/modules/agent.ts`：`ChatSessionMeta` 接口（session_id/title/last_message_at?/created_at?）+ `agentApi.listChatSessions()`（GET /chat/sessions，失败静默返回 []）/ `upsertChatSession(sessionId, question?)`（POST /chat/sessions，fire-and-forget 静默失败）/ `deleteChatSession(sessionId)`（DELETE /chat/sessions/:id，静默失败）
- `src/pages-sub-app/chat/sessions.vue`（pages.json 注册于 chat/index 后）：会话列表页——新建/切换/删除 + 相对时间（刚刚/N分钟前/N小时前/N天前/日期）+ 当前会话高亮 + 空态；仅登录时 onShow 拉 server 列表合并；样式走 Design Token（variables.scss）+ SvgIcon（chat-history-line/add-line/delete-bin-line）

### 重构
- `src/shared/store/modules/chat.ts`：单会话 → 多会话——新增 `sessions: ChatSessionMeta[]` + `messagesBySession: Record<string, ChatMessage[]>`（本地 storage 分桶，CHAT_SESSIONS / CHAT_HISTORY_BY_SESSION）；对外导出保持兼容（messages computed / sessionId / setSessionId / appendMessage / clearHistory / sendMessage）；新增 `createSession`（`app_${Date.now()}`，同毫秒碰撞追加自增后缀）/ `switchSession`（归档当前 + 切 id 持久化）/ `deleteSession`（清本地 + fire-and-forget server 删除，删当前会话切最近或新建）/ `syncSessionsFromServer`（server 覆盖本地同名 title/last_message_at，保留本地仅有）/ `hasUserMessage`；一次性旧数据迁移 `migrateLegacyHistory`（旧 CHAT_HISTORY → messagesBySession[旧 CHAT_SESSION_ID]，迁移后删旧 key）

### 改进
- `src/pages-sub-app/chat/index.vue`：header-right 新增「会话」入口（chat-history-line）→ 会话列表页；onLoad 无当前会话时自动 createSession；handleSend/quickAsk 前置 `upsertSessionMeta`（仅登录且 `!hasUserMessage` 时 fire-and-forget，须在 chatStream.send 之前调用）

### 文档
- 根 AGENTS.md §2 会话管理页面行 + §6.2 agent.ts 会话 API；README 模块表 AI 对话补充会话管理

### 测试
- `chatStore.spec.ts`（vitest 10 用例）+ `chatSessions.spec.ts`（node:test 6 用例）+ `sessions.spec.ts` 源码断言 + `index.spec.ts` 会话入口断言；vitest 全量 8 文件 31/31 通过 + `npx tsc --noEmit` 0 errors

---

## [changer] 2026-08-05 — ChatAgent P5-fix 前端会话持久化（问题 14 session_id 回写）

**开发者**: Aria

计划：`D:\ai_stock_app\docs\superpowers\plans\chat-agent-roadmap.md` §1 P5-fix 行 / §4 问题 14

### 修复
- `chatStore.setSessionId`（写 ref + storage 持久化，新增 `STORAGE_KEYS.CHAT_SESSION_ID`）；`useChatStream` WS 路径首轮生成 session_id 后 `setSessionId` 写回、后续轮复用；HTTP 降级路径改用 `setSessionId`；`clearHistory` 同步清 sessionId —— 此前 WS 路径每轮生成新 `app_${Date.now()}` → 后端 checkpointer 每轮新 thread → 多轮指代/纠错失效

### 测试
- `useChatStream.spec.ts` 新增"session_id 持久化 + 跨 send 复用"用例；mock 修正（getter 模拟 Pinia ref unwrap + sessionRef 状态测试间重置）；vitest 全量 21/21 + `npx tsc --noEmit` 0 errors

---

## [changer] 2026-08-04 — ChatAgent P6 退役清理（市场复盘 tab 前端代码 + $success 修复）

**开发者**: Aria

计划：`D:\ai_stock_app\docs\superpowers\plans\2026-08-04-chat-agent-p6-retirement.md`

### 重构
- 删除 `src/shared/utils/useStreamingChat.ts`（SSE 旧对话流死代码，全仓 0 消费者）+ `tests/AdvisorTraceTransport.test.ts`
- 移除 `skillResult` / `advisorTrace` 类型字段与渲染：agent.ts（`ChatMessage.skillResult/advisorTrace` + `SkillResult`/`AdvisorTrace` 接口）、useChatStream.ts 映射、chat.ts store（`setLastAssistantAdvisorTrace` + sendMessage 两字段映射，sendMessage 本体保留）、modules/chat/pages/index.vue（skillResult 卡片渲染块 + goStockDetail/getFlowClass/formatFlowAmount 辅助函数）；`MarketTrace*` 类型族与 `getMarketTraceReview` 保留（analytics 消费）

### 修复
- `src/modules/favorites/pages/search.vue`：`$success` → `$success-color`（未定义 SCSS 变量基线错误，master 合并 4dc71be 引入，阻塞 build:h5）

### 文档
- 根 AGENTS.md 移除 2 处陈旧 useStreamingChat 引用；modules/chat/AGENTS.md 注释更新

### 测试
- vitest 20/20 + `npx tsc --noEmit` 0 errors + `pnpm build:h5` 通过

---

## [changer] 2026-08-04 — ChatAgent P5 大盘概览接入（工作线 C）

**开发者**: Aria

计划：`D:\ai_stock_app\docs\superpowers\plans\2026-08-04-chat-agent-p5-capability.md`

### 新增
- `src/shared/api/modules/stock.ts`：`stockApi.getCnIndexQuotes(symbols)`（纯数字 6 位代码 → `/api/cn/index/quotes`，中文键→驼峰映射，`CnIndexQuote` 类型）
- `src/modules/home/components/StockContent.vue`：首页行情 tab 顶部接入 `MarketOverview`（大盘三指数）+ onMounted fetch

### 改进
- `src/shared/store/modules/market.ts`：`fetchIndices` 改走 `getCnIndexQuotes(['000001','399001','399006'])`（000001 语义=上证指数，接口分离消解 `getCoreQuotes` 带前缀 400 参数歧义）；删除 `mapIndexName` 硬编码映射（服务端 CN_INDEX_NAMES 提供名称）

### 测试
- 新建 `src/shared/store/modules/market.spec.ts`（2 用例）+ `src/modules/home/components/StockContent.spec.ts`（1 用例）；vitest 全量 23/23 通过
- `npx tsc --noEmit` 0 errors；`pnpm build:h5` 成功

---

## [feat/market-trace-improvement] 2026-08-03 — 三大任务前端：播报优化 + OCR识图加自选 + 悬浮播报

**开发者**: Aria

### 新增
- `src/shared/components/FloatingPodcast.vue`：悬浮播报（右侧贴边、纵向 1/3、悬浮球 72rpx 可拖动吸附左右边缘、展开态仅 AudioPlayer，按钮经 #actions 插槽放标题右侧）
- `src/shared/store/modules/podcast.ts`：Pinia 播报 store（open/generate/expand/collapse/close，跨页共享）
- `src/shared/utils/ocrImage.ts`：OCR 选图/压缩（H5 canvas 压缩 / App uni.compressImage + base64）
- `src/shared/utils/useReportPodcast.ts`：从 /agent/report/:intent/:date 拉取 podcast_brief，以 report_{intent}_{date} 为缓存 key 打开悬浮播报

### 改进
- `src/shared/components/PodcastCard.vue`：MAX_PODCAST_TEXT_LENGTH=250 文本裁剪（与后端校验一致）+ 音频命中缓存时 cached 提示
- `src/shared/components/AudioPlayer.vue`：新增 `#actions` 具名插槽（标题右侧操作区）
- `src/modules/favorites/pages/search.vue`：重写为「文字搜索 / 识图添加」双 Tab，支持选图→预览→识别→勾选→批量加自选
- `src/shared/api/modules/stock.ts`：新增 OcrImageInput/OcrStockItem 类型 + ocrStocksFromImages（timeout 100s，batchConcurrency 2）
- `src/shared/store/modules/favorites.ts`：新增 addMany 批量加自选（已存在跳过）
- 报告页播报按钮接线：alert-analysis / agent-report / hot-burst / leaders / trend-score；SubPageCard/SubPageCard2/MainTabs 挂载 FloatingPodcast

### 修复
- `ai-analysis.vue` / `reports.vue`：预先存在类型错误修复（formatMetricKey String 转换、filter 参数标注），保证 type-check 全绿

---

## [master] 2026-08-01 — 重磅事件跳 AI 事件分析页 + 早晚报切换 + agent-report 兜底渲染

**开发者**: Aria

### 改进
- `src/modules/home/components/MorningContent.vue`：重磅事件跟踪卡片点击跳转目标从资讯详情页改为 AI 事件分析页（`/modules/chat/pages/event/detail?id=${eventId}`），无 eventId 时回退到事件列表页
- `src/pages-sub-app/briefing/index.vue`：新增"晨报/晚报"切换按钮（type-switch），切换后重新加载当日对应类型报告；subtitle 同步显示当前类型（晨报/晚报）

### 修复
- `src/modules/chat/pages/agent-report.vue`：晨报/风口报告卡片由纯文本列表改为 mp-html 渲染 markdown（修复 LLM 偶发返回纯文本/段落结构时 5 个结构化 Card 全不渲染导致空白页面的问题，兜底用 mp-html 渲染 details 原文）
- `src/shared/utils/markdown.ts`：新增 `#### h4` 标签支持；剔除 ```json``` 等 fenced 代码块（防止 LLM 违规输出原始 JSON 混入渲染）

---

## [master] 2026-08-01 — 异动监控新增"立即检测"按钮

**开发者**: Aria

### 新增
- `src/modules/favorites/pages/monitor.vue`：section-header 新增"立即检测"按钮，点击调 `stockTraceApi.detect()` 触发后端绕过交易时段限制的价格检测，检测完延迟1秒刷新列表；detecting 状态防重复点击
- `src/shared/api/modules/stockTrace.ts`：新增 `detect()` 方法，调 `POST /cn/favorites/movements/detect`

---

## [master] 2026-08-01 — alert-analysis 结构化渲染 + 通用播报卡片 + 当日缓存 + dev代理指向远程

**开发者**: Aria

### 新增
- `src/shared/components/PodcastCard.vue`：通用播报卡片组件（idle/loading/ready/error 四态），点击"生成播报"调 `POST /api/agent/brief/generate-podcast` 合成单主播音频，已在 `components/index.ts` 导出，可复用到其他 AI 报告页面
- `src/shared/api/modules/agent.ts`：新增 `generatePodcast(text, key)` 方法、`getAlertReport(symbol, date)` 方法和 `AlertReportRecord` 类型
- `src/modules/market/utils/useAlertSSE.ts`：新增 `loadFromCache(symbol, date)` 方法，从 DB 加载 alert 报告并填充 result；新增 `result` 事件处理；超时从 30s 调整为 60s（异动分析含 3 个子 Agent + Master，耗时较长）

### 修复
- `src/modules/market/pages/alert-analysis.vue`：改用 `result.displayReport` 结构化渲染（summary/details/stocks/risks/keywords/impact），不再用 `markdownToHtml(content)` 渲染原始 JSON 文本（修复 stocks/risks/podcast_brief 等内部字段直接显示的问题）；进入页面先查当日缓存命中直接展示，未命中才 SSE；新增"重新分析"按钮强制刷新；最上方新增 `PodcastCard` 播报卡片
- `env/.env.development`：`VITE_PROXY_AGENT_TARGET` 从 `http://localhost:8080` 改为 `https://gupiao-api.yaozhineng.com`（本地未启动 Python Agent 服务导致 AI 异动解读 SSE 流连接失败）

### 改进
- `src/modules/analytics/pages/report-detail.vue`：SVG 图标硬编码 hex 颜色抽为设计令牌常量（primaryColor/warningColor），与组件库 tokens.json 对齐
- `src/modules/analytics/components/ai-analysis.vue`：SVG 图标硬编码 hex 颜色抽为设计令牌常量（warningColor），与组件库 tokens.json 对齐

---

## [master] 2026-08-01 — 大盘溯源卡片改进 + 资金流向图表颜色令牌化

**开发者**: Aria

### 改进
- `src/modules/home/components/MorningContent.vue`：大盘溯源卡片标签改为日期(MM-DD)格式(和事件传导一致)，名称改为现象快照摘要文字，待更新时显示规则提示文字"每日收盘后生成异动溯源"
- `src/modules/favorites/components/CapitalFlowCharts.vue`：数值网格背景改纯白$white(原$bg-soft灰底)，SVG柱形图硬编码hex颜色替换为设计令牌(通过CSS自定义属性桥接SCSS变量$up/$down/$line-soft/$ink-mute/$ink)

---

## [master] 2026-08-01 — 资金流向图表重设计 + 多页面组件库样式统一 + agent-report 空页面修复

**开发者**: Aria

### 重设计
- `src/modules/favorites/components/CapitalFlowCharts.vue`：资金流向图表重设计（方案C 垂直柱形+数值网格）
  - 资金拆解：4 条独立横向条形（中心线在50%，正值向右红色，负值向左绿色）
  - 10日资金节奏：面积折线图改为垂直柱形图（柱子圆角纯色 rx=3，红正绿负，对齐资金拆解样式；最新柱 $ink 深色边框高亮）
  - 数值网格：底部 5×2 网格显示每日日期+数值，最新格白底 $bg-card + $ink 深边框高亮
  - 面板纯白底 $bg-card + $line 边框，颜色全部令牌化，删除 latestIsPositive computed
- `src/modules/analytics/pages/traceability.vue`：大盘溯源页重设计（方案C 调查推理板）
  - Hero 可信度进度条、现象快照合并卡、归因结论品牌横幅、候选解释双栏、证据 chip 云
  - 未解问题（蓝 question-line）/风险提示（琥珀 alert-line）颜色区分，删除 hero-icon
- `src/modules/analytics/pages/trend-score-report.vue`：按 hot-burst-report 样式统一（引入 LoadingState/EmptyState/Card，移除渐变）
- `src/modules/chat/event/components/AiEventReport.vue`：AI事件分析详情页重设计（Hero卡 + 左侧蓝色色条 + 评级徽章）
- `src/modules/chat/event/components/AiAnalysisSection.vue`：卡片化 + 蓝色实心编号圆 01-05（$primary 底 + 白字）
- `src/modules/chat/event/components/InvestmentSummaryCard.vue`：删除重复评级标签（已上移至 Hero 卡）
- `src/modules/favorites/pages/detail.vue`：个股详情页样式统一（卡片统一 $bg-card+$line+$r-md，间距 24rpx→16rpx，22+处硬编码 hex 令牌化）

### 修复
- `src/modules/news/pages/detail.vue` + `src/pages.json`：修复顶部多余导航栏（navigationStyle:custom + SubPageCard2 包裹）
- `src/modules/chat/pages/agent-report.vue`：长线风口空页面兜底（5个结构化Card全不渲染且 detailsText 存在时用 mp-html 渲染 details 原始 markdown）
- `src/modules/favorites/pages/detail.vue`：AI投顾入口图标改纯白 #ffffff（配合 ai-icon-wrap 蓝色背景圆形）

### 改进
- `src/modules/home/components/MorningContent.vue`：大盘溯源卡片改为多日列表（方案C，查询 today/today-1/today-2 三天报告状态）
- `src/modules/chat/event/components/EventTransmissionGraph.vue`：画布背景改浅蓝 $primary-50（#eaf2ff）

---

## [changer] 2026-08-01 — 大盘溯源报告 app 界面 + 多端适配 + 搜索页导航栏改造

**开发者**: 37588

### 新增
- `docs/superpowers/specs/2026-08-01-market-trace-review-redesign-design.md`：大盘溯源报告页重构设计文档（schema 2.0 字段提取规则、ViewModel 类型树、UI 章节顺序、跨端断点策略）
- `docs/superpowers/plans/2026-08-01-market-trace-review-redesign.md`：大盘溯源重构实施计划（8 个独立任务）
- `src/shared/components/SubPageCard.vue`：新增 `noChatBar` prop（与 SubPageCard2 对齐，向后兼容默认 false），用于搜索页等模态场景隐藏全局 AI 对话栏

### 改进
- `src/modules/favorites/pages/search.vue`：改用 `SubPageCard title="搜索股票" noChatBar`（透明导航栏与 favorites 列表页视觉一致），搜索框放导航栏下方；删除自定义 statusBarHeight/goBack/back-btn（SubPageCard 内置）
- `src/pages.json`：search 页新增 `navigationStyle: "custom"`，隐藏 uni-app 原生导航栏（消除"搜索"标题文字覆盖问题）
- `src/modules/analytics/components/MarketTracePhenomenon.vue`：板块列表从 flex wrap 改为响应式 grid 布局（sm 1 列 / md 2 列 / lg 3 列）
- `src/modules/analytics/components/MarketTracePendingRisks.vue`：精简风险列表样式
- `src/modules/analytics/pages/traceability.vue`：清理冗余代码
- `tests/TraceabilityPage.test.ts`：补充测试用例
- `README.md`：analytics 模块描述补充"大盘溯源报告"

### 类型标签
- 新增：设计文档、实施计划、SubPageCard noChatBar prop
- 改进：搜索页导航栏改造、大盘溯源板块列表响应式 grid 布局、文档补充

---

## [changer] 2026-08-01 — 早点听/晚报非交易日自动回退最近可用报告

**开发者**: 37588

### 新增
- `src/pages-sub-app/briefing/index.vue`：当日无报告（非交易日/未生成）时自动向前回退最近可用报告（最多 7 天），并展示提示"当日（X）播报尚未生成，当前显示最近可用报告（Y）"
- `src/pages-sub-app/briefing/index.spec.ts`：新增非交易日回退用例（MAX_FALLBACK_DAYS / addCalendarDays 向前回退 / 回退提示文案）

### 改进
- `AGENTS.md`：同步早点听页面回退行为说明

---

## [changer] 2026-07-31 — 同步 PR#30 focusEvents + GI 数据适配 + ghost 文件清理

**开发者**: 37588

### 改进
- 合并 origin/master：同步 PR#30 focusEvents + mixed type 支持 + 组件库同步
- `src/modules/chat/event`：GI 数据适配 `/event/list`，修复双排名卡片布局
- 删除 6 个 ghost 文件（组件重构后残留）：ChatBubble / SkillButton / SkillCard / StreamingText / EventTabBar / ImportanceStars

## [master] 2026-07-31 — 早点听卡片 CSS 调整 + agent-report 跳转修复
**开发者**: ARIA

### 修复
- `src/modules/chat/pages/agent-report.vue`：修复报告页跳转路径问题
- `src/modules/home/components/MorningContent.vue`：「缺失来源」标记从 briefing-top 移到「专属播报」按钮右侧；`.feature-sub` 恢复 `$font-size-xs`；新增 `.briefing-btn-row` flex 布局，优化按钮排列

## [changer] 2026-07-29 — 早报降级路径：brief 接口优先 + 降级文案优化

**开发者**: 37588

### 新增
- `briefingReport.spec.ts`：4 个回归测试覆盖 parseBriefingReport 降级路径（degraded=true 单条目、degraded=false 多条目、missing_sources 为空拒绝、brief_type 不匹配拒绝）

### 修复
- `briefing/index.vue`：`loadReport` 优先调 `agentApi.getBrief()` 获取 brief.v1 结构化数据，失败回退 `agentApi.getReport()` 兼容旧 schema 1.0/2.0 历史数据
- `briefing-detail/index.vue`：降级提示文案从"缺失来源：X"改为"部分数据源暂不可用（X），以下为可用内容"，不阻塞内容显示

---

## [master] 2026-07-28 — PR #29 合并后类型修复 + mock 清理 + 组件化
**开发者**: Aria

### 修复
- chat/index.vue: 用 MarketTraceEvidence 组件替换 94-137 行内联证据溯源代码，移除重复的 confidenceLabel/sourceKindLabel 函数和 110 行证据溯源样式
- index.spec.ts: 测试改为验证组件使用而非内联 HTML 匹配
- agent-report.vue: 移除 agentOverviewMock 导入和两处 DEV 环境降级 fallback，统一使用真实 API
- briefing/index.vue: 修复 audioPath 访问路径（report.value?.audio_path → report.value?.content?.audio_path）
- agent.ts: ChatMessage 接口添加 advisorTrace 字段，清理重复的 MarketTraceQaTrace/MarketTraceQaResponse 接口定义
- briefingAdapter.ts: 新增 ReportType 类型，通过 toBriefType() 映射到 BriefingType，解决 splitReportToCards 参数类型冲突
- vite.config.ts: 补齐 PR #29 新增的 brief/broadcast 代理路由

### 重构
- event-chain/index.vue: 移除硬编码 mockHeadlineEvents，改为从真实事件列表派生焦点事件（按 importance >= 4 和 affectedIndustries 情绪方向筛选）

### 删除
- src/modules/chat/mock/agent-overview.json（PR #29 已删除但被后续合并重新引入）

---

## [master] 2026-07-25 — PR review修复 + 个股详情页UI优化 + Agent报告页 + 趋势股评分报告页
**开发者**: Aria

### 修复
- PR #28 review 问题修复：any 类型消除（stock.ts 20处 + useStockAiAnalysis.ts）、代码去重（format.ts 提取 compactNumber/isInvalidValue/cleanValue）、KLineChart SVG 宽高比（preserveAspectRatio xMidYMid meet）、SubPageCard2 prop 化（contentPaddingBottom）
- SubPageCard2 底部留白统一：默认 contentPaddingBottom 从 220rpx 改为 148rpx（与 v1 一致）
- 个股详情页双重 padding 消除：去掉 .page-detail 重复 padding-bottom 和 min-height
- 个股详情页删除振幅字段、移除底部重复行情明细（与短线交易数据重复）
- 新闻列表分页：每页3条 + 翻页控件（‹ 当前页/总页数 ›）
- AI 投顾卡片与行情数据间距：添加 margin-top: 32rpx
- 首页重磅事件跟踪跳转改为 AI 事件分析页 + profile 删除特别提醒 + 推送设置显示真实状态
- 报告页日期时间统一用 created_at(真UTC) + formatDateTime
- 趋势股评分和业绩预测卡片替换 mock 为真实 API 数据
- uni-text 样式区分（行情红/日期绿/已更新蓝）+ 事件文本两行省略
- agent-report 概览进详情后返回键直接回首页的问题修复

### 新增
- Agent 报告概览页：双模式设计（概览模式显示4张Agent简报卡片，详情模式显示单报告）
- 趋势股评分 AI 分析报告页（trend-score-report.vue）+ 列表页入口
- 早点听播报页重构为结构化早晚报（方案四：分段式布局）
- 底部 Tab 从 4Tab 重构为 3Tab（早点听/选股/提醒）
- 异动捕手新模块页面 + 自选股情报（原个股情报）路由改名
- 长线风口接入后端 API + 板块详情子页面拆分
- H5 页面固定 9:16 长宽比

---

## [changer] 2026-07-18 — 晨报/复盘报告卡片模型重构 + 事件适配层增强
**开发者**: 37588

### 重构
- `src/shared/utils/briefingReport.ts`（新增）：从 `useBriefingCard.ts` 抽取 `BriefingReport` 类型与 `parseBriefingReport` 解析函数，新增 `sectors` 字段
- `src/shared/utils/reportCard.ts`（新增）：统一 `ReportCard[]` 卡片模型 + 晨报/复盘分段器；`splitMorningReport` 按 `##` 标题匹配 5 张晨报卡片；`splitReviewToCards` 复用复盘分段器；未匹配正文统一以"补充分析"卡片展示，禁止静默丢弃
- `src/shared/utils/useBriefingCard.ts`：改为引用 `briefingReport.ts`，移除内联类型与解析逻辑（-42 行）

### 改进
- `src/modules/chat/event/api/eventAdapter.ts`：新增 `buildSourceInfo` 从后端 source 字段构建来源展示信息（URL 解析 + 媒体域名中文映射）；新增 `MEDIA_NAME_BY_DOMAIN` 映射
- `src/modules/chat/event/components/AiEventReport.vue`：适配新数据结构
- `src/modules/chat/event/components/EventItemCard.vue`、`EventTransmissionGraph.vue`：适配
- `src/modules/chat/event/composables/useAiReasoning.ts`：精简
- `src/modules/chat/pages/event/detail.vue`：适配
- `src/modules/home/components/MorningContent.vue`、`src/pages-sub-app/briefing-detail/index.vue`、`src/shared/components/SubPageCard2.vue`：适配新卡片模型

### 测试
- `src/modules/chat/event/api/eventAdapter.spec.ts`（新增）
- `src/shared/utils/briefingReport.spec.ts`（新增）
- `src/shared/utils/reportCard.spec.ts`（新增）

---

## [master] 2026-07-17 — 跨仓库一致性修复（代理配置/emoji清理/接口路径/环境变量模板）
**开发者**: Aria

### 修复
- `vite.config.ts`：改用 `loadEnv` 加载 `env/` 目录变量；proxy 目标改读 `VITE_PROXY_API_TARGET`/`VITE_PROXY_AGENT_TARGET`/`VITE_PROXY_WS_TARGET`（原读 `process.env` 不自动加载 .env 文件，导致 dev 代理始终 fallback 到生产端口）
- `src/shared/api/modules/agent.ts`：`getEventChain` 路径修正（移除多余的 `/chain/` 段，与后端 `/api/agent/event/:eventId` 对齐）；占位接口补充 TODO 标注

### 改进
- `env/.env.development`、`env/.env.production`：新增 `VITE_PROXY_*` 代理目标变量
- `env/.env.example`：新建环境变量模板（微信密钥用占位符）
- emoji 清理（统一替换为 SvgIcon 组件）：`AiThinkingHeader.vue`（🤖→robot-line）、`EventItemCard.vue`（🤖→robot-line）、`event/detail.vue`（⚠→error-warning-line）、`event/list.vue`（📭→inbox-line、⚠→error-warning-line）、`alert-analysis.vue`（🤖/⚠️/⚡/✓/◌→robot-line/error-warning-line/flashlight-line/check-line/loader-line）、`login.vue`（⚠→error-warning-line）

---

## [master] 2026-07-17 — 彻底修复提醒页"帮我分析"按钮被挤下 + mp-html符号换行
**开发者**: Aria

### 修复
- `src/shared/components/MainTabs.vue`：移除 JS 计算 scrollHeight 方案（`footerH=rpx2px(68)` 远小于实际92rpx），`.card-content` 改为全平台 `flex:1; min-height:0`，footer 靠 `flex-shrink:0` 固定，不再被挤下
- `src/pages-sub-app/chat/index.vue`：`:deep(.bubble-html)` → `:deep(.bubble-html), :deep(.bubble-html *)` 通配符覆盖，确保 `word-break: keep-all` 应用到 mp-html 内部所有子元素
- `src/modules/chat/pages/agent-report.vue`：同上 `:deep(.report-html)` 通配符覆盖
- `src/pages-sub-app\briefing-detail\index.vue`：添加 `word-break: keep-all; overflow-wrap: break-word`（之前缺失）
- `src/modules/market/pages/alert-analysis.vue`：同上添加 keep-all

---

## [master] 2026-07-17 — APP端微信登录失败自动降级到扫码登录
**开发者**: Aria

### 修复
- `src/modules/user/pages/login.vue`：统一登录模板，移除 `#ifdef H5`/`#ifdef APP-PLUS` 条件编译分割，二维码区域改为全平台通用
- `src/modules/user/pages/login.vue`：APP端 `uni.login` 失败时（`login:fail send`）自动调用 `startScanLogin()` 降级到扫码登录，不再直接显示错误死循环
- `src/modules/user/pages/login.vue`：新增 `handleRetry()` 函数 + "使用扫码登录"备选按钮（APP-PLUS 专属）

---

## [master] 2026-07-17 — 微信登录修复 + 业绩预测卡片优化 + Markdown换行/布局溢出修复 + SubPageCard2重构
**开发者**: Aria

### 修复
- `src/manifest.json`：从后端 `.env` 获取 `WECHAT_SECRET` 填入 `appsecret`，移除空值 `UniversalLinks`（仅安卓端），修复 `login:fail 业务参数配置缺失`
- `env/.env.development` + `env/.env.production`：新增 `VITE_WX_APPID`/`VITE_WX_APPSECRET` 配置项（文档化）
- `src/modules/analytics/components/ForecastContent.vue`：移除"增持"评级标签（无后端逻辑）；`stock-col` 宽度 180→140rpx 防换行；`metric-value` 字体 26→22rpx 与 `growth-val` 一致；新增 `formatEpsGrowth()`/`formatNetProfitGrowth()` 为正数补 `+` 前缀
- `src/pages-sub-app/chat/index.vue`：`.bubble-html` 改用 `word-break: keep-all`（CJK 不在标点处断行）；`.message-list` 添加 `overflow: hidden`；`.quick-skills`+`.input-bar` 添加 `flex-shrink: 0` 防止消息过多时输入栏消失
- `src/modules/chat/pages/agent-report.vue`：`.report-html` 同上 keep-all 换行策略
- `src/modules/chat/pages/index.vue`：`.bubble-text` 同上 keep-all 换行策略 + `.message-list` overflow hidden
- `src/shared/components/MainTabs.vue`：`scrollHeight` 计算新增 `footerH` 扣减（alert 标签页底部 footer-bar 之前未计入导致内容被挤出）；`.card-content` 添加 `overflow: hidden`
- `src/modules/market/pages/hot-burst.vue`：分数显示 `得分 95`→`95分`（数值在前单位在后）；`level-tag` padding `4rpx 16rpx`→`4rpx 10rpx` 减小按钮宽度

### 重构
- `src/shared/components/SubPageCard2.vue`：移除 JS 计算 scrollHeight 逻辑（`computed`/`windowHeight`/`rpx2px`/`getChatBarHeightPx`），改用 flex 布局（`.sub-page-2-body` flex 容器 + `padding-bottom` 为 GlobalChatBar 留白），参照 SubPageCard 模式，修复底部内容被 AI 对话栏遮挡

---

## [master] 2026-07-17 — 业绩预测卡片重构 + card-header 高度对齐
**开发者**: Aria

### 修复
- `src/shared/components/MainTabs.vue`：`.card-header` 添加 `position: relative`，`.toggle-group` 改为绝对定位（`position: absolute; right: 24rpx; top: 50%; transform: translateY(-50%)`），使业绩 tab header 高度与无 toggle 的 tab（早点听/洞察）完全一致
- `src/shared/components/MainTabs.vue`：`.card-content` 移除 `padding-bottom: 24rpx` 和 `box-sizing: border-box`，与 PageCard 完全对齐
- `src/shared/components/MainTabs.vue`：`.toggle-btn` 添加 `white-space: nowrap`，修复 `<uni-text>` 文本换行导致 toggle-group 高达 85px 的问题

### 重构
- `src/modules/analytics/components/ForecastContent.vue`：业绩预测卡片模板重构 — 左侧股票信息（名称+代码+评级标签）| 右侧指标区（预测EPS+预测净利润，蓝色值+红色增长率）| 分隔线 | 更新时间+机构数
- `src/modules/analytics/components/ForecastContent.vue`：字体按 stock-name 比例(26/28)整体缩放，对标 ReportsContent.vue；排列方式栏（搜索+排序）padding/font-size/border-radius 全面对标报告卡片
- `src/modules/analytics/pages/forecast.vue`（新建）：从 `origin/gaojingwen` 分支恢复，作为独立业绩预测页面参照
- `src/pages.json`：添加 `modules/analytics/pages/forecast` 路由
- `src/manifest.json`：添加 Barcode/OAuth 模块 + 微信 OAuth appid 配置

---

## [master] 2026-07-17 — 布局系统性修复 + 业绩 Tab 重构 + 多项 UI 优化
**开发者**: Aria

### 修复
- `src/shared/components/SubPageCard2.vue`：删除基于 `getSystemInfoSync().windowWidth` 的本地 `rpx2px`，改复用 `@/shared/utils/layout` 的 `rpx2px`/`getChatBarHeightPx`，修复 H5 dev 模式 scroll-view 内容未占满
- `src/shared/utils/layout.ts`（新建）：共享布局工具，`rpx2px` 改用 `uni.upx2px`，提供 `getSafeAreaInsetBottom`/`getChatBarHeightPx`/`getTabBarBottomPx`/`getBottomFixedHeightPx`，修复 H5 dev 模式 rpx 换算严重偏大导致滚动失效
- `src/shared/components/SubPageCard.vue`：scrollHeight 改用 `getChatBarHeightPx()`，新增 `.sub-page-body` flex 容器，修复刘海屏底部约 69rpx 重叠 + H5 滚动失效
- `src/shared/components/PageCard.vue`：移除动态 `:style` 高度，改用 `flex:1; min-height:0`；新增 `footerHeight` prop 保证 footer 固定；`marginBottom` 改用 `getBottomFixedHeightPx()`
- `src/shared/components/AppBottomBar.vue`：`.as-tab-bar` 的 `bottom` 改用 `:style` 绑定 `getTabBarBottomPx()`；"业绩"tab 路径改为 `/modules/home/pages/index?tab=forecast`
- `src/modules/chat/pages/index.vue`：`.message-list` 添加 `min-height:0`，`.chat-header`/`.quick-skills`/`.input-bar` 添加 `flex-shrink:0`，修复输入框被对话内容挤没
- `src/modules/user/pages/profile.vue`：`handleLogout()` 退出后跳转首页；`DEFAULT_SETTINGS` 改回全 `false`；`getSwitchValue()` 替换 3 处 `any`
- `src/shared/utils/useAuth.ts`：`requireLogin()` 跳转路径修正为 `/modules/user/pages/login`
- `src/modules/market/pages/leaders.vue`：`onReady` 测量 `.bubble-wrap` 实际宽度更新 `containerWidth`，修复 App 端 zoom:1.2 导致泡泡图偏右
- `src/modules/market/pages/hot-burst.vue`：股票代码改垂直排列；卡片 padding 紧凑化；`.kw-tag` 字号 22rpx→20rpx
- `src/modules/favorites/pages/favorites.vue`：删除按钮改左滑揭示，新增 touch 事件处理
- `src/modules/favorites/components/AlertContent.vue`：移除内部 footer，通过 `defineExpose` 暴露状态
- `src/shared/components/MainTabs.vue`：alert tab footer 移至 scroll-view 外固定；新增"业绩"tab 预测/报告切换按钮
- `src/shared/components/GlobalChatBar.vue`：`unreadCount` 默认值 11→0，移除硬编码徽章
- `src/modules/home/components/MorningContent.vue`：`.briefing-card` 背景改为 `#f5f7fb`
- `src/modules/news/pages/detail.vue`：适配 SubPageCard 外壳
- `src/modules/analytics/pages/report-detail.vue`：改用 SubPageCard；修复 H5 canvas `getContext` 错误（取 `uni-canvas` 内部真实 canvas）；走势图高度 360→240px；修复 `ctx.scale` 与 uCharts `pixelRatio` 叠加缩放问题；类型修复 `any`→具体类型

### 重构
- `src/modules/analytics/pages/trend-score.vue` + `trend-score-detail.vue`：移除自定义 position:fixed 外壳，改用 `<SubPageCard>` 统一收敛
- `src/modules/analytics/pages/report-detail.vue`：同上，改用 SubPageCard
- `src/modules/analytics/components/ReportsContent.vue`（新建）：从 reports.vue 提取业绩报告内容组件
- `src/modules/analytics/components/ForecastContent.vue`：替换为原 forecast.vue 内容，保留卡片样式与真实 API
- `src/modules/analytics/pages/forecast.vue`：删除（功能由 MainTabs 接管）
- `src/modules/analytics/pages/reports.vue`：switchTo 路径更新
- `src/pages.json`：移除 forecast 路由

---

## [changer] 2026-07-16 — 简报卡片接入真实 API 数据
**开发者**: 37588

### 改进
- `src/modules/home/components/MorningContent.vue`：简报卡片改用真实 API 数据渲染，替换 mock 数据
- `src/pages-sub-app/briefing-detail/index.vue`：简报详情页重构，接入后端报告 API，支持双层 display_report 结构解析
- `src/shared/utils/useBriefingCard.ts`：适配真实数据格式
- `src/pages.json`：路由配置更新

### 新增
- `src/shared/utils/reportSplitter.ts`：报告内容分段工具（按标题分割文本段落）

### 文档
- `docs/superpowers/plans/2026-07-16-briefing-card-real-data.md`：实施计划
- `docs/superpowers/specs/2026-07-16-briefing-card-real-data-design.md`：设计文档

---

## [master] 2026-07-15 — 自选股双向同步合并 + 事件详情页重构 + H5扫码登录修复
**开发者**: Aria

### 合并
- 合并 PR #11《App 自选股与网页端双向同步》：统一自选股接口读写、修正扫码登录 Cookie、补充添加/删除入口、回前台自动同步、异常保留缓存
- 解决 `leaders.vue` 合并冲突（保留远程 top 10 + `??` 运算符版本）

### 改进
- `src/modules/market/pages/leaders.vue`：风口概念泡泡图横向溢出修复，动态计算容器宽度
- `src/shared/components/GlobalChatBar.vue`：下拉箭头符号改用 `‹` 旋转样式
- `src/shared/components/SubPageCard2.vue`：新建白色顶栏子页面组件
- `src/modules/chat/pages/event/detail.vue`：移除 AiThinkingHeader，改用 SubPageCard2
- `src/modules/chat/pages/agent-report.vue`：改用 SubPageCard2 组件
- `src/modules/user/pages/login.vue`：H5 保留扫码登录，APP-PLUS 改为微信 App 授权登录
- `src/shared/store/modules/user.ts`：适配后端返回 `{ token, userInfo }` 格式
- `src/pages.json`：自选页面动画改为 slide-in-bottom，禁用 agent-report H5 导航栏
- `src/manifest.json`：新增 oauth.weixin 配置

---

## [master] 2026-07-10 — 事件传导组件暗色值清理 + AI 投顾错误处理改善
**开发者**: Aria

### 修复
- 事件传导模块 8 个文件共 30+ 处硬编码暗色值改为浅色 `--ev-*` 变量：
  - `AiThinkingHeader.vue`：头部背景 `rgba(15,17,25,0.94)` → `rgba(255,255,255,0.94)`，返回按钮 `rgba(255,255,255,0.06/0.12)` → `rgba(0,0,0,0.04/0.08)`
  - `EventItemCard.vue`：卡片背景暗色渐变 → `var(--ev-bg-card)`，标题色 `#FFFFFF` → `var(--ev-text-primary)`，默认类型色 `#1E293B` → `#f0f2f5`
  - `HistoryTimeline.vue`：卡片背景 `rgba(30,35,55,0.8)` → `var(--ev-bg-card-muted)`，竖线/标签背景改为 `--ev-border` 变量
  - `EventTabBar.vue`：tab 背景 `rgba(255,255,255,0.04)` → `var(--ev-bg-card-muted)`
  - `AiTransmissionAnalysis.vue`：星星/进度条/竖线暗色值改为 `--ev-border` 变量
  - `ImportanceStars.vue`：未激活星星色 `#2A2E3F` → `var(--ev-border)`
  - `pages/event/detail.vue`：重试按钮硬编码蓝色改为 `--ev-accent` 变量，删除重复 `.error-text` 定义
  - `pages/event/list.vue`：**删除深色主题覆盖代码**（AppBottomBar 和 GlobalChatBar 的 `#161A26` 暗色背景 `:deep()` 覆盖），滚动条/重试按钮/加载更多按钮硬编码颜色改为 `--ev-*` 变量
  - `pages/news/detail.vue`：**整个页面从暗色主题改为浅色**（背景 `#0F1119` → `var(--ev-bg-page)`，标题色 `#F1F5F9` → `var(--ev-text-primary)`，正文色 `#CBD5E1` → `var(--ev-text-secondary)`，所有硬编码颜色改为 `--ev-*` 变量）
- `shared/api/request.ts`：错误回调增加 `request:ok` + `statusCode` 提取逻辑（App 端请求成功但 statusCode 非 2xx 时，error.errMsg 是 `request:ok`，之前直接显示给用户。现在提取 statusCode 和 responseData，显示如 "服务异常(502): Agent service unavailable"）

---

## [master] 2026-07-10 — 样式统一 + App 端三个 bug 修复
**开发者**: Aria

### 改进
- `shared/styles/variables.scss`：统一 design token，新增 `$brand-color`、`$brand-gradient`、`$text-color-title`、`$text-color-tertiary`、`$radius-lg`、`$spacing-base` 等变量，把硬编码的 `#4d7cfe`、`#1a1d24`、`#9ca3af`、`#6b7280` 统一为变量
- `shared/styles/global.scss`：事件传导模块 `--ev-*` 变量从暗色系（`#0F1119`）改为浅色系（`#f5f7fb`），与其他页面统一
- `AGENTS.md`：新增 4 条硬约束（Design Token、App 端 envDir、App 端错误对象、App 端状态栏）

### 修复
- `vite.config.ts`：添加 `envDir: 'env'`（**App 端所有网络请求失败的根因**：Vite 默认读取根目录 .env，但项目 env 文件在 env/ 子目录，导致 App 打包时 VITE_API_BASE_URL 为 undefined，所有 API 请求 fallback 到 /api 无法解析）
- `modules/chat/pages/agent-report.vue`：添加 `paddingTop: statusBarHeight`（App 端顶部被状态栏遮挡，用户以为"页面打不开"）
- `pages-sub-app/briefing/index.vue`：同上，添加状态栏高度处理
- `shared/store/modules/chat.ts`：catch 块错误信息改用 `e?.errMsg || e?.message`（uni-app 网络错误对象是 `{ errMsg }` 格式，没有 `message` 属性，导致显示 "undefined"）
- `modules/user/pages/login.vue`：同上，修复微信登录"获取二维码失败"的错误信息读取

---

## [master] 2026-07-10 — 重新创建 AGENTS.md（区分用途）+ README 补充
**开发者**: Aria

### 新增
- `AGENTS.md`：面向 AI 开发助手的入口地图（模块架构地图、开发规范、硬约束、API 契约、共享组件/Hooks 速查）
  - 区分 README（面向人类，介绍全貌和快速开始）和 AGENTS（面向 AI，聚焦开发规范和约束）
  - 与 2026-07-05 删除的版本不同：新版不重复 README 内容，聚焦"怎么开发、必须遵守什么"

### 改进
- `.gitignore`：移除 AGENTS.md 忽略规则（根级 AGENTS.md 需要提交到 git）
- `README.md`：顶部添加 AGENTS.md 引用说明；修正技术栈（luch-request 而非 axios）；补充环境变量说明（VITE_API_BASE_URL）；补充 Pinia 持久化插件和 vue-i18n

---

## [changer] 2026-07-05 — 移除冗余 AGENTS.md，加入 .gitignore
**开发者**: changer-collab

### 文档
- 删除 repo 根级 AGENTS.md（与 README.md 内容重叠 80%+，维护两份易漂移）
- .gitignore 新增 AGENTS.md 忽略项
- 跨仓库约定（git 分支策略等）改由项目根 AGENTS.md 和 project_memory.md 承载（不在 git 仓库内）

---

## [main] 2026-07-02 — 项目模块化重组
**开发者**: 尹辰

### 重构
- 全项目从扁平结构重组为 shared/ + modules/ 模块化架构
- 新增 6 个业务模块目录（home/favorites/chat/market/user/news）
- 新增 shared/ 共享层（api/store/styles/components/utils/types）
- 更新 pages.json 路由路径
- 新增各模块 AGENTS.md
- 新增 README.md

---
