# 待提交修改记录

## 2026-10-07 — 自选股异动/洞察列表：cursor 分页 + visible_only 过滤接前端（A）

跨仓计划：`aistock-agent-py/docs/superpowers/plans/2026-10-07-movements-pagination-and-visible-filter.md` Task 2。两页此前固定 `list(20)` 取第 1 页且不翻页（`nextCursor` 无人消费）；现接后端前置完成的 `visible_only`（commit `272ccbe`）并支持触底翻页。

- `src/shared/api/modules/stockTrace.ts`：`list(limit, cursor?, options?: { visibleOnly?: boolean })`，`options.visibleOnly === true` 时 params 追加 `visible_only: 1`。**opt-in 非默认**——首页 `AlertContent.vue` 仍调 `list(20)`（不传 options），行为与改动前一致。
- `src/modules/favorites/pages/monitor.vue` / `pages/insight.vue`：
  - 新增 `rawItems` / `cursor` / `hasMore` / `loadingMore`；`hasMore` 以 `nextCursor` 为准（不用 `items.length < limit`）。
  - **触底事件走 `<SubPageCard2 @scrolltolower>`**（SubPageCard2 内层 `<scroll-view>` 已 `@scrolltolower` 透传、`lower-threshold=100`；页面级 `onReachBottom` 不触发）。触底 `!hasMore || loadingMore` 直接返回 → `list(20, cursor, { visibleOnly: true })` → 按 `event_id` upsert 合并 → 更新 cursor/hasMore → 重派生；失败**不推进 cursor**、不置 `hasMore=false`。
  - `onShow` 整表重拉时**重置** `cursor`/`rawItems`/`hasMore`。
  - **必须对整体 `rawItems` 重派生**（`filter(isUnattributableMovement) → dedupeDailyMovements → map → sort`），跨页同 (股, 上海交易日) 只出一张卡（map/sort 去重规则未改动）。
  - 底部"加载中.../没有更多"轻量文案（`.load-more-tip`，走 design token）。
- `monitor.vue` WS（`#ifdef APP-PLUS`）：`movement.created`/`movement.updated` 改为按 `event_id` **浅合并 upsert 进 `rawItems`** 后统一重派生，替代原先直接改 `alerts`；`movement_updated` 部分字段 payload 不清空既有 `primary_cause`/`confidence_level`，`movement_view.status === 'confirmed'` 时补 `analysis_status='completed'` 以放行「报告 ›」入口（沿用原 `applyMovementUpdate` 语义，避免翻页重派生冲掉 WS 卡）。
- 测试：`monitor.spec.ts` / `insight.mount.spec.ts` 各新增 6/5 例（可见 `visible_only`、首屏+触底跨页同组只出一张卡、`nextCursor===null` 不再请求、加载失败不推进 cursor 再次触底用旧 cursor 重试、`onShow` 重置不叠加旧行；monitor 另加 WS 浅合并保留 `primary_cause`）。SubPageCard2 桩加 `stub-scroll-trigger`（emit `scrolltolower`）、`@dcloudio/uni-app` onShow 加回调登记以再次触发。相关 spec **66 passed**；`npx vue-tsc --noEmit` exit 0。
- **复查后收尾（commit `265e970`）**：`upsertEventById` 下沉到 `components/insightCards.ts`（消除两页字节级重复的本地 `upsertRaw`）；首屏请求**前**同步复位 `rawItems/cursor/hasMore/loadingMore`（原先在 `await` 之后复位，在途 `loadMore` 会读到旧 cursor → 关掉该竞态窗口）；`loadMore` 的 `catch` 加 `console.warn`（原先静默吞错，线上分页失败不可观测）；`insightCards.spec.ts` 补 `upsertEventById` 三例（追加/已存在更新且保位置/不改输入）、`monitor.spec.ts` 补跨页同 `event_id` 去重断言 → 相关 3 spec **65 passed**，`vue-tsc` exit 0。
- **端到端实测（浏览器，mxfff）**：两页首屏 14 张 → 连续触底 14 → 24 → 37 → 47 → **60** 后出现「没有更多」；第 2 页起请求 URL 带 `cursor=2026-09-21T01:41:49.027Z|mv:688203:…`（复合键）与 `visible_only=1`；「归因失败回退」未被破坏（海正生材仍显示「主因：科创板走弱拖累个股」）。
- **遗留（既有，非本次引入）**：`tests/AnalyticsCardLayout.test.ts` 1 例失败（只读 `analytics/pages/reports.vue` 布局，与本次改动无关）。

## 2026-10-06 — 归因失败：前端 `failed` 展示（B）+ 失败回退（C）

跨仓计划：`aistock-agent-py/docs/superpowers/plans/2026-10-06-stock-trace-attribution-failure-observability.md` Task 2。根因：`analysis_status` 新增第 4 个值 `failed`（app-api 由死信 job `dead_letter` 派生）；此前失败被派生为 `processing` → 卡片永久「归因中」，且因`dedupeDailyMovements` 取最新而遮住当日已有有效归因。

- `src/shared/api/modules/stockTrace.ts`：`StockTraceEvent.analysis_status` 与 `StockTraceAnalysisResponse.processing_status` 联合各补 `'failed'`。
- `src/modules/favorites/components/insightCards.ts`：`dedupeDailyMovements` 组内选"最新"时**跳过 `failed`（非 failed 优先于 failed；全组皆 failed 才保留最新那条，让「归因失败」可见）**；更新函数注释，明确与 `filter(isUnattributableMovement)` + `dedupeDailyMovements` 的「最新 + 失败回退」契约。**`isUnattributableMovement` 不改**——`failed` 保持不被隐藏（否则全失败时整组消失）。判定一律正向 `=== 'failed'`，禁反向。
- 三处列表卡片文案新增 `failed` → 「归因失败」（正向等值）：`pages/monitor.vue` `movementToAlertItem`、`pages/insight.vue` `fromMovement`、`components/AlertContent.vue` `fromMovement`。
- `pages/insight-detail-move.vue`：状态区块新增 `processing_status === 'failed'` → 「归因失败」（`.status-failed`，琥珀 `$warning`；此前会整段静默）。
- 测试：`components/insightCards.spec.ts` 新增 failed 可见性 1 例 + 失败回退 3 例（最新 failed + 当日有 completed → 取 completed；全 failed → 取最新 failed；mixed 不因 failed 胜出）；`pages/insight-detail-move.spec.ts` 新增 failed 状态渲染 + 无报告入口 2 例 → 相关 4 spec **62 + 2 = 64 passed**，`npx vue-tsc --noEmit` exit 0。
- **关联后端（不在本仓）**：app-api Task 1 派生 `failed`，agent-py Task 3 上报 `last_error_detail`。发布顺序：migration024 + 前端先行（加性），app-api 激活派生，agent-py 上报明细。

## 2026-09-30 — Task 9：H5 端到端实测结果（控制器执行，真实浏览器 + 真实 LLM）

页面：`http://localhost:5173/h5/modules/market/pages/alert-analysis?symbol=600519`（**注意 H5 为 history 路由 + `base:/h5/`，必须用路径形式，`#/...` 会落到首页**）。服务：agent-py `:8000`（新代码，`SCHEDULER_ENABLED=false` 等已禁用）、app-api `:3000`、H5 `:5173`。

| 待验证项 | 结果 |
|---|---|
| ① 「AI 思考过程 · N 步」出现且流式中默认展开、圆点有动画 | ✅ T+20~29s 首次出现，**1 步 → 2 步**，`.arp-think-body` 未点击即展开（高度 590→674px）；T+38s 类名为 `arp-step streaming`，T+89.2s 变 `arp-step done` |
| ② 解说文本**逐字出现**而非一次刷出 | ✅ 面板文字由约 **190 字增长到 781 字**；措辞含「已用约8秒」「此刻已推进约四十秒」等随时间推进才成立的表述 |
| ③ 长等待期**持续有新解说**（心跳） | ✅ 汇聚研判段在 T+38s→T+84.1s 由 479 字增至 581 字，且出现多段不同措辞的推进说明 |
| ④ 「一句话速览」**早于**详细分析出现 | ✅ T+29.5s 速览已显示「段永平晒单买入，主力净流入7.4亿推升茅台」，同一时刻页面**完全没有**「详细分析」区块 |
| ⑤ 完成后详情正常渲染 | ✅ T+152.6s 变「完成」；详细分析（四板块）/相关股票/风险提示四区块齐全 |
| ⑥ 面板位置 | ✅ 位于「分析进度」区块上方（面板 y≈203px vs 进度标题 y≈927px） |
| 三步节点中文映射 | ✅ 「多维分析」「汇聚研判」 |

- **后端帧序另经直连核实**（`curl -N` 经 app-api 反代，`symbol=000001`，截取 22s）：`tool_start(sub_agents)` → `reasoning(node=alert_scan)` 逐字流出 → `tool_end(sub_agents)` → `tool_start(master)` → **`preview`（速览三件套）** → `: ping` 心跳，与设计契约一致。
- **未覆盖/不可确认**：截图工具本次连续超时（4 次 60s timeout），未取得截图；圆点闪烁仅由 `streaming→done` 类名变化推断；未验证「重新分析」按钮行为（按只读要求未点击）。
- **顺带发现（非本特性引入）**：图谱发散子 Agent 调用 `GET http://localhost:3000/internal/graph/{概念}` 返回 **502**（`node_api_http_error`），该子 Agent 降级为错误文本、主流程不受影响；本次改动未触碰图谱工具与 app-api，属既有问题，待后续排查。

## 2026-09-30 — Task 9：AI 异动解读特性文档同步（思考面板 / useAlertSSE / 速览）

- `src/modules/market/AGENTS.md`：`pages/alert-analysis.vue` 条目补充速览三件套（`summary`/`impact`/`keywords`）为 **preview 优先、result 兜底**、`details`/`stocks`/`risks` 仍只取 `result`、面板置于「分析进度」上方；`components/` 列表新增 `AlertReasoningPanel.vue`；`Hooks` 新增 `useAlertSSE.ts` 条目（`reasoningSteps`/`preview` + 超时 120s）。
- `changelog-pending.md`：顺带修正 Task 7 条目 `AlertReasoningPanel.spec.ts` 例数（修复 commit 已扩到 7 例）——「5 例/5 pass」修正为「7 例/7 pass」（spec 实测 7 个 `it()`，含 props 后续新增 streaming 自动展开、用户手动折叠不被抢展开）。
- **验证状态**：H5 端到端浏览器实测已由控制器单独执行并通过，结果见本文档顶部「Task 9：H5 端到端实测结果」条目（本条目仅记录文档改动，当时尚未实测）。
- 关联后端：aistock-agent-py（Task 1–5）`GET /api/agent/briefing/alert` 已推送 `reasoning`/`preview` 帧且 `result.display_report` 为合并后 6 字段。

## 2026-09-30 — Task 8：`alert-analysis.vue` 接入思考面板与 preview 速览

- `src/modules/market/pages/alert-analysis.vue`：「AI 异动解读」详情页接入 Task 6/7 产物。
  - 模板在「分析进度」区块**上方**插入 `<AlertReasoningPanel :steps="reasoningSteps" />`（等待期可见、流式解说，`reasoningSteps` 为空时不渲染）。
  - `<script setup>`：import 追加 `AlertReasoningPanel`；解构 `useAlertSSE()` 追加 `reasoningSteps, preview`。
  - 速览三件套数据源改为 **preview 优先、缓存路径回退 result**（`preview ?? result`）：`summary`、`displayKeywords`、`impactLabel`（impactBadgeType 改用 `impactLabel.value` 判定）。live 路径 preview 先到即先渲染；命中缓存路径 preview 为 null，自然回退 result。
  - `details` / `stocks` / `risks` **仍只读 `result`**（职责不重叠，不与 preview 混淆）。
  - 「一句话速览」卡片 `v-if="summary || loading"` 与 `v-else` 加载分支保持既有结构不变（preview 先到，loading 分支实际被即时填充覆盖）。
  - **未改动** `useAlertSSE.ts` / `AlertReasoningPanel.vue`（Task 6/7 范围）。
- `src/modules/market/pages/alert-analysis.spec.ts`：新增 vitest spec，2 例（preview 到达即渲染一句话速览 result 尚未到；result 到达时以 result 为准）→ 2 passed / 0 fail。mock `useAlertSSE` + `@dcloudio/uni-app` + `mp-html` + `SubPageCard2`/`SvgIcon`/`@/shared/components` barrel/podcast store（沿用仓库既有页面 spec 惯例，见文件内逐条注释）。
- `vitest.config.ts`：`test.include` 白名单登记 `src/modules/market/pages/alert-analysis.spec.ts`。
- **验证**：改前 `npx vitest run src/modules/market/pages/alert-analysis.spec.ts` 1 failed( RED，preview 用例找不到「速览结论」，因旧实现 summary 只读 result ) / 1 passed；改后 **2 passed**；`npx vue-tsc --noEmit` exit 0。

## 2026-09-30 — Task 7：新增 `AlertReasoningPanel.vue`

- `src/modules/market/components/AlertReasoningPanel.vue`：新增「AI 思考过程」单区可折叠面板，仅渲染 `reasoning` 帧聚合的 `ReasoningStep[]`；`steps` 为空时不渲染（避免"0 步"空头）；有 `streaming` 步骤时默认展开，否则折叠，点击头部 `@tap` 切换；`streaming` 步骤圆点带 `@keyframes pulse` 呼吸动画；节点中文映射 `alert_scan→多维分析`、`alert_master→汇聚研判`，未知节点回退原名；`mp-html` + `markdownToHtml` 渲染文本；样式走 design token（`$bg-card/$shadow-card/$r-md/$s-3/$line-soft/$ink-soft/$ink-mute/$primary/$font-size-*`），`SvgIcon` 颜色用令牌实值 `#8a96b0`(`$ink-mute`) / `#0b5fff`(`$primary`)。**本任务不做页面接入**（Task 8 范围）。
- `src/modules/market/components/AlertReasoningPanel.spec.ts`：新增 vitest spec，7 例（空不渲染 / 标题步数 / streaming 默认展开 / 全 done 折叠+点击展开 / 节点中文映射 / props 后续新增 streaming 步骤时自动展开 / 用户手动折叠后 streaming 不被抢展开）→ 7 pass / 0 fail。沿用 chat 侧 `ReasoningPanel.spec` 的 `vi.mock` 占位 `mp-html`（其 uni-app 版 SFC 含 uni 特有语法及 node.vue 多 script 块，无法在 vitest 的 @vue/compiler-sfc 下解析）。
- `vitest.config.ts`：`test.include` 白名单登记 `src/modules/market/components/AlertReasoningPanel.spec.ts`。
- **验证**：`npx vitest run src/modules/market/components/AlertReasoningPanel.spec.ts` 7 passed；`npx vue-tsc --noEmit` exit 0。
- **依赖**：Task 6 `useAlertSSE` 已暴露 `reasoningSteps: Ref<ReasoningStep[]>`，本次消费 `ReasoningStep` 类型（`@/shared/api/modules/agent`），未改动 `useAlertSSE.ts` 与 `alert-analysis.vue`（Task 6 / 8 范围）。

## 2026-09-30 — Task 6：`useAlertSSE` 支持 reasoning / preview + 超时 120s

- `src/modules/market/utils/useAlertSSE.ts`：新增 `reasoningSteps`（按 `node` 聚合的 `ReasoningStep[]`）与 `preview`（`AlertDisplayReport | null`）两个响应式状态；`AlertSSEEvent` 新增 `node?` / `chunk?` 字段；`handleEvent` 新增 `reasoning`（按 node 聚合、文本累加并标 `streaming`）与 `preview` 分支；`done` 把仍在 `streaming` 的步骤收尾为 `done`+补 `endAt`，`error` 收尾为 `failed`+补 `endAt`；`start()` 重置 `reasoningSteps` 与 `preview`；超时 `60_000 → 120_000`（对齐后端 LLM 请求超时 600s）。复用 `@/shared/api/modules/agent` 的 `ReasoningStep` 类型，与 chat 侧结构一致。
- `src/modules/market/utils/useAlertSSE.spec.ts`：新增 vitest spec，6 例（reasoning 按 node 聚合文本累加 / 两个阶段两个步骤 / preview 写入 / done 收尾 done+endAt / error 收尾 failed / start 重置）→ 6 pass / 0 fail。
- `vitest.config.ts`：`test.include` 白名单登记 `src/modules/market/utils/useAlertSSE.spec.ts`。
- **验证**：`npx vitest run src/modules/market/utils/useAlertSSE.spec.ts` 6 passed；`npx tsc --noEmit` exit 0。
- **依赖**：后端 aistock-agent-py（Task 1–5）`GET /api/agent/briefing/alert` 已推送 `reasoning` / `preview` 帧且 `result.display_report` 为合并后 6 字段；本任务不依赖 `raw` 内容语义。

## 2026-09-30 — 低置信度归因不展示异动卡片

- `src/modules/favorites/components/insightCards.ts`：`TraceEventLike` 新增可选字段 `confidence_level?: 'low' | 'medium' | 'high' | null`；`isUnattributableMovement` 在 `analysis_status === 'unavailable'` 判据之后、`!== 'completed'` 之前新增 `if (m.confidence_level === 'low') return true`。**降级保护**：字段缺失（老 app-api 未升级）或 `null`（无归因结果）时**不隐藏** —— 若按"非 high 即隐藏"会把卡片全部误杀。
- `src/modules/favorites/components/insightCards.spec.ts`：新增 describe「isUnattributableMovement 低置信不展示口径」5 例（low→隐藏 / medium→展示 / high→展示 / 字段缺失→不隐藏 / null→不隐藏）→ 54 pass / 0 fail。
- `src/shared/api/modules/stockTrace.ts`：`StockTraceEvent` 新增 `confidence_level?: 'low' | 'medium' | 'high' | null`（与 app-api 列表字段对齐）。
- `src/modules/favorites/AGENTS.md`：新增「低置信不展示」章节。
- **生效范围（三处统一）**：`pages/monitor.vue`（自选股异动）、`pages/insight.vue`（洞察列表）、`components/AlertContent.vue`（首页洞察块）——三处均复用 `isUnattributableMovement` 过滤，逻辑单点改动即三处生效。
- **验证**：`npx vue-tsc --noEmit` exit 0；H5 浏览器实测（mxfff 账号）监控页与洞察列表页各 **6 张**卡片（改前 10 张），逐条核对：保留均为 medium 归因、已隐藏均为 low、无「归因中」、无 09-30 卡片。
- **涨跌幅口径已核实（非缺陷）**：黄河旋风 600172 09-29 页面显示 **-8%**，而"最新事件"是 -9.7%。经查该日共 6 条事件，`window_end_at` 最新的一条（15:05 打点，-9.70%）归因 `confidence_level='low'` → **被本次新规则隐藏**，`dedupeDailyMovements` 遂取次新的 -8.00%（medium）→ 页面 -8% 是**新口径下的正确结果**，非数据/展示错误。
- **依赖**：app-api 侧 `confidence_level` 需先透出（见 aistock-app-api changelog）；缺失时前端不隐藏，故两仓发布顺序不敏感。

## 2026-09-27 — 宿迁联盛 2026-09-24 归因硬失败事故：定位、临时隐藏、恢复后回退（前端最终仅文档改动）

- `src/modules/favorites/AGENTS.md`：文末新增「宿迁联盛 2026-09-24 归因硬失败事故（2026-09-27 定位并处置，前端最终零改动）」章节（现象 / 跨仓契约根因 / 临时措施已回退 / 最终可见性 / 发布顺序约束 / 另一处独立缺陷）。
- **代码零改动**：定位当天曾在 `insightCards.ts` 加过 `SUPPRESSED_EVENT_IDS` + `isVisibleMovement` 硬编码隐藏该日两条事件；**归因用修复后的代码代跑成功（result `completed`）后已整体回退**，三处消费者（`monitor.vue` / `insight.vue` / `AlertContent.vue`）与 `insightCards.spec.ts` 均回到改动前状态。
- **最终可见性**：恢复出的主因是「证据不足，异动原因未明」→ 命中既有「无结论不展示」规则 → 该日两条都按正常规则不展示（卡片仍不显示，但原因已是"归因完成但无有效结论"，不再是"归因卡住"）。
- 数据层：未改 `stock_trace_events` / `jobs` / `snapshots` 的结构；仅通过 app-api 的 `/internal/stock-trace/results/external` 新增了 1 条真实 result + artifact（等价于生产重投的产出），并把该 job 由 `dead_letter` 置为 `completed`。
- 护栏：`insightCards.spec.ts` 现有用例已覆盖该判定（`completed 无 view + 证据不足 → true`）。
