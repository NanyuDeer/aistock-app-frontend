# Favorites 模块 - 自选股

## 功能范围
自选股模块管理用户关注的股票，包括自选股列表、个股详情、搜索、异动监控和特别提醒。

## 页面
- `pages/index.vue` - 特别提醒（堆叠卡片式异动时间线）
- `pages/favorites.vue` - 自选股列表（含编辑态：批量删除 + 拖拽排序）
- `pages/favorites-grid.vue` - 多股同列（2 列宫格卡片，每格含迷你 K 线 + 名称/最新价/涨跌幅/涨跌额，顶部周期切换）
- `pages/detail.vue` - 个股详情页
- `pages/search.vue` - 股票搜索
- `pages/monitor.vue` - 自选股异动
- `pages/insight.vue` - 自选股洞察（2026-08-30 起统一为 stock-trace movements 列表，涨停雷达事件已并入该链路）
- `pages/insight-detail.vue` - 洞察详情（涨停雷达，**停用**——涨停雷达事件并入 stock-trace 后列表不再产生该类型，文件保留兼容历史直达链接）
- `pages/insight-detail-move.vue` - 洞察详情（价格异动/涨停雷达统一入口，数据源为 stocktrace movements API）

> **2026-08-30 链路合并**：涨停雷达命中不再建 watchlist_insight_events（存量保留不展示）；`AlertContent.vue`（首页特别提醒）与 `pages/insight.vue`（自选股洞察列表）均只消费 `stockTraceApi.list`（movements），`watchlistInsightApi.getInsights` 不再被列表页调用（monitor.vue 等存量入口保留历史引用）。
>
> **2026-09-04 更新（最终语义）**：`pages/monitor.vue`（自选股异动）已移除老雷达数据源 `watchlistInsightApi.getInsights`（存量 watchlist_insight_events 08-30 起停用，含 8 月初远古涨停雷达事件），监控页统一只消费 `stockTraceApi.list`。后端 `StockTraceService.listUserEvents` 可见性下界改为**当前持仓期**（JOIN ON `e.first_triggered_at >= us.created_at`）：老自选全历史 + 今日新触发照常，新加入股只显示加入后触发/仍活跃的异动；同时新增**加入即打点**（`UserController.addFavorites` 交易时段内对新加入 symbol 调 `PriceTriggerDetector.detectSymbols`，命中即 `immediateEnqueue` 归因）。
>
> **2026-09-13 更新（同日同股聚合）**：同一交易日同一只股票的多次异动只展示 **1 张卡片**（打点/落库照常，仅展示收敛）。纯函数 `dedupeDailyMovements(items)`（`components/insightCards.ts`）：分组键 = symbol（剥 SH/SZ/BJ 前缀）+ **上海交易日**（`triggered_at` 经 UTC+8 取日期），组内取 `window_end_at ?? triggered_at` 最新一条。**组合口径（最新 + 失败回退）**：调用方先 `filter(isUnattributableMovement)` 再 `dedupeDailyMovements` —— 不可用项已剔除，取最新即"当日最近一条有效归因"。**2026-10-06 起**：组内选"最新"时**跳过 `analysis_status === 'failed'`**——当日有有效归因则回退显示它，全组皆 failed 才保留最新那条（让「归因失败」可见）；`failed` 不被 `isUnattributableMovement` 隐藏（否则全失败时整组消失）。三处统一接入：`pages/monitor.vue`、`components/AlertContent.vue`（首页洞察块）、`pages/insight.vue`（洞察列表）。
> **2026-09-25 更新（洞察报告 PDF → SSE 流式输出）**：完整洞察报告**彻底移除 PDF 链路**，改为在详情页点击后在按钮下方**逐章节流式输出**。
> - 新增 `modules/favorites/utils/useInsightReportSSE.ts`：用 **`fetch + ReadableStream`**（**不用 `EventSource`**——`EventSource` 无法设置 `Authorization` 头，而 `report/stream` 端点是 JWT 鉴权；项目既有 `useAlertSSE` 能用 `EventSource` 是因为 `/agent/briefing/alert` 不校验登录）。用 fetch 的额外好处：能直接读 HTTP 状态码，前置错误（401/404/409/502）走真实状态码 + JSON。暴露 `header` / `sections`（逐条追加）/ `loading` / `done` / `error` / `start(eventId)` / `stop()`；60s 超时 + `AbortController`；按 `data: {...}\n\n` 分帧，单帧 JSON 解析失败忽略。配套 spec 7 例。
> - `insight-detail-move.vue`：底部 `downloadInsightReport` 下载按钮替换为**「生成完整洞察报告」按钮 + 按钮下方流式渲染区**（页眉 + 逐章节列表）。生成中按钮文案「生成中…（点击停止）」可中断，完成后变「重新生成完整报告」；`onLoad` 参数 `autostart=1` 时自动开始生成；`onUnload` 调 `stop()` 中止。
> - `pages/monitor.vue`：「报告 ›」入口不再直接下载，改为 `navigateToInsightDetail(eventId, 'price', { autostart: '1' })` 跳详情页并自动生成（列表页不展开长报告）；移除 `downloadInsightReport` 引用与 `reportBusy` 防抖。
> - `shared/utils/insightNavigation.ts`：`navigateToInsightDetail(eventId, eventType?, query?)` 新增第三参 `query`（拼接附加 query，如 `autostart=1`）。
> - **删除** `shared/utils/downloadInsightReport.ts` 与 `.spec.ts`。
> **2026-09-26 更新（报告章节改为结构化 blocks + 六阶段因果链纵向时间轴）**：用户反馈报告"排版不美观"、六阶段因果链想要表格/流程图 → 纯文本 `lines: string[]` 无法承载节点卡 → 契约改为 `blocks`，并新增渲染组件。
> - **新增 `components/InsightReportBody.vue`**：接收 `header` / `sections` / `loading`，按 `block.type` 分派渲染 6 类 block：
>   - `kv`（事件事实）：**表格式键值两列**（行间 `2rpx` 细线；标签 `$font-size-sm`/`$ink-mute`，值 `$font-size-base`/`$ink`，值比标签大一号）+ `tone` 为 up/down 时加 `.is-up`/`.is-down` 着色
>   - `verdict`（主因结论）：浅底卡（`$bg-soft`）+ 正文 `$font-size-md`/600 独占一行 + 徽标行（置信度/归类标签/归因生成时间）
>   - `candidates`（分层候选）：层级 + 状态徽标 → 正文 → **证据胶囊**（`.cand-evidence`，文本「证据 {id}」；无证据不渲染空行）；**非 `supported` 走中性弱化**
>   - `chain`（六阶段因果链：**纵向时间轴**，见下）
>   - `evidence`（证据清单）：`sourceId` + 等级徽标 / `provider｜kind｜时间` / 标题 / 摘要 四段式卡片
>   - `list`（未解问题）：**圆形序号标**（`.list-index`）+ 条目文本
>   - `blocks` 为空数组 → 渲染「暂缺」（空节兜底；规则由后端保证"源数据非空才出块"）
> - **中性弱化统一口径**：`candidates` 用 `item.statusKey !== 'supported'`、`chain` 用 `stage.statusKey !== 'established'` —— **一律按机器 key 判定，绝不匹配中文标签**（agent-py/app-api 为此在链节点与候选项上同时输出中文标签与 `*Key`）。弱化用灰阶（`$ink-soft`/`$ink-mute`/`$ink-faint`），**不用告警色**。
> - **六阶段因果链时间轴**：`.chain-node` 横排 = 左侧 `.chain-rail`（`.chain-dot` 序号圆点 + `.chain-line` 竖线，末节点用 `v-if="ci < stages.length - 1"` **不画线**，避免尾部悬空）+ 右侧 `.chain-body`（阶段名 + 证据条数 / 结论正文 / 认知·状态徽标）。字号：阶段名 `$font-size-md`、正文 `$font-size-base`、徽标/证据条数 `$font-size-xs`。
> - `pages/insight-detail-move.vue`：报告正文内联模板下沉为 `<InsightReportBody>`（页面只留按钮/错误/提示），相应 `.report-body`/`.report-header`/`.report-section`/`.report-heading`/`.report-line`/`.report-loading` 样式一并移入组件（`.report-error` 仍在页面）。
> - `utils/useInsightReportSSE.ts`：新增 `ReportBlock`/`ReportKvItem`/`ReportChainStage` 类型（与 app-api 逐字段一致）；`ReportSection.lines` → **`blocks`**；`section` 帧解析改为 `blocks: Array.isArray(evt.blocks) ? evt.blocks : []`（边界归一化，上游缺块时渲染"暂缺"）。本层**不做任何文本解析或再加工**。
> - 测试：`useInsightReportSSE.spec.ts` 9 例（新增 chain block 原样透传、缺 blocks 归一化）；`components/InsightReportBody.spec.ts` **13 例**（六阶段因果链：节点数/阶段顺序/序号 1..N/徽标/证据条数/**is-weak 仅非 established**/末节点无连接线；其余 block：verdict 徽标、candidates 证据胶囊与"无证据不渲染空行"、candidates 弱化 by `statusKey`、evidence 四段字段、list 序号圆标；兜底：空节"暂缺"、kv 两列与 tone、多章节），已在 `vitest.config.ts` 白名单登记；同时移除已删除的 `downloadInsightReport.spec.ts` 白名单条目。`npx vue-tsc --noEmit` exit 0。
> - **基线说明**：全量 `npx vitest run` 有 2 个**与本次无关的存量失败**——`tests/AnalyticsCardLayout.test.ts`（读 `modules/analytics/pages/*.vue`）与 `src/pages-sub-app/chat/cards/CardRenderer.spec.ts`（SFC 编译期 duplicate block）。
> **2026-09-26 续（补齐 App 端流式通道：双通道 + 运行时能力探测）**：上一条只做了 H5（`fetch + ReadableStream`），而 App 端 WebView 可能不支持 `ReadableStream`（项目既有硬约束），报告在 App 端会打不开。本次把 `useInsightReportSSE` 改为**双通道**：
> - **通道选择用运行时能力探测，不用条件编译**——`pickReportStreamChannel()`：有 `fetch` + `ReadableStream` → `'fetch'`（H5），否则 `'chunked'`（App / 小程序）。**刻意不用 `#ifdef`**：条件编译在 vitest 下不会被裁剪，两条分支会同时执行，无法为两端分别写测试。
> - **通道 A `fetch + ReadableStream`（H5）**：逻辑不变，另加**回退**——拿到响应但 `res.body` 为空（部分 App WebView 的真实表现）时抛 `ReportStreamUnsupportedError` 改走通道 B，而不是直接报"连接失败"。
> - **通道 B `uni.request({ enableChunked: true }) + requestTask.onChunkReceived`（App / 小程序）**：uni-app 原生分块传输，鉴权仍走 `header`（不受 `EventSource` 无法设置请求头的限制）；基座缺 `onChunkReceived` 时立即 `abort` 并抛「当前环境不支持流式读取」。
> - **抽出纯函数 `createReportStreamDecoder(handle)`**：两条通道共用同一套 `data: {...}\n\n` 分帧。用 `TextDecoder` 的 `{ stream: true }` **跨块续解**（多字节 UTF-8 被切在块边界不破损）、半帧缓存在 `buffer`、累计 `rawText`（非 200 时取 JSON `message`）；命中 `done` 后 `feed()` 直接短路，后续帧不再解析。
> - **取消方式统一为 `setCancel(cb)` 回调**：fetch 侧 `AbortController.abort`、chunked 侧 `requestTask.abort`，`stop()` 与超时逻辑无需区分通道。
> - 新增 `active` 标志：`stop()` 之后到达的响应（chunked 通道的 `success` 会晚于 `abort`）**不再改写界面状态**。
> - 测试：`useInsightReportSSE.spec.ts` 9 → **25 例**（帧解码 5 / 通道探测 3 / chunked 通道 3 / 通道回退 1 / H5 fetch 通道 / App chunked 通道 4 / 中止与迟到响应等）；`InsightReportBody.spec.ts` 13 例不变 → 合计 **38 passed**，`npx vue-tsc --noEmit` exit 0。**H5 回归实测**（浏览器自动化，真实事件 002342）：页眉正确、6 节、`.chain-node` ×6、无 `.report-error`、无「暂缺」——fetch 通道重构未回归。
> - **验证边界**：App 端 chunked 通道在 H5 上跑不到，**完全由单测锁定，未经真机/模拟器实测**（本机仅能跑 H5），需真机自验。
> **2026-09-26 续 2（归因主因卡置信度徽标：仅高置信显示「可信度高」）**：用户要求"低置信和中置信取消显示，只保留高置信"，且高置信文案改为「可信度高」以便用户理解。
> - `pages/insight-detail-move.vue`：主因标题行右侧徽标条件由 `v-if="confidenceLevel"` 收紧为 **`v-if="confidenceLevel === 'high'"`**，文案由 `confidenceText()` 映射（高/中/低置信）改为**固定文案「可信度高」**；随之删除已无引用的 `confidenceText()`。
> - 判定口径：`artifact.artifactJson.confidence.level === 'high'`（后端枚举 `high`/`medium`/`low`，阈值 `score >= 0.75`，见 app-api `StockTraceResultService`）；`level` 缺失时按 `score` 回退（本页回退阈值为 0.7/0.5，与后端 0.75/0.5 有微差——真实数据恒有 `level`，该分支实际不触发）。
> - **新增该页首个测试护栏** `pages/insight-detail-move.spec.ts`（3 例挂载用例：high → 「可信度高」/ medium → 无徽标 / low → 无徽标），已登记 `vitest.config.ts` 白名单。**先红后绿**：改前跑为 **3 failed**（实测 `高置信` ≠ `可信度高`、medium/low 徽标被误显示），改后 3 passed。
> - **H5 实测（浏览器自动化，真实数据）**：正例 `mv:002600:2026-09-10:…`（后端 `level=high` / score 0.78）→ `.main-title-row .badge` 文案「可信度高」；负例 `mv:002342:2026-09-24:…`（后端 `level=low` / score 0.35）→ 徽标数 0，且主因卡标题与单行文本正常渲染（排除"卡片未渲染所以没徽标"的无效证据）。线上 `confidence.level` 分布实测 `medium 232 / low 165 / high 11`，确认 `high` 确实存在、该徽标非死代码。
> - **未推广（刻意）**：报告正文 `verdict` block 的「置信度」徽标、`NotificationInsightModal` / `PriceMovementAnalysisContent`（推送弹窗）、`sector-loop` / `MarketTracePrediction`（板块预判）等处的置信度文案**一律未动**——后两者是不同业务概念（预判准确度，非归因可信度）；`insight-detail.vue` / `InsightDetailLayout.vue` / `InsightAlertCard.vue` 同类文案所在页面已无生产调用方。
> **2026-09-13 更新（完整洞察报告 PDF + 详情页精简 + 预判移除）**：
> - 洞察详情页（insight-detail-move.vue）精简为：报价头 + 一句话主因 + 报告下载按钮。删除了归因候选/六阶段链/证据清单等展开区块，仅在底部保留"下载完整报告"按钮调用 `shared/utils/downloadInsightReport.ts`。（**时点说明**：该"下载按钮"已于 2026-09-25 换成流式生成按钮，见上一条。）
> - 「异动卡片」下端新增「洞察报告」按钮（`InsightAlertCard.vue` 的 `reportable` prop + `report` emit，monitor.vue 据 `analysisStatus === 'completed'` 判定 → downloadInsightReport）。（**时点说明**：2026-09-24 起 monitor.vue 已改为**内联三段式 `Card`**、不再引用 `InsightAlertCard.vue`；报告入口下移到卡片下行右侧「报告 ›」小按钮，见下文「自选股异动页」章节。）
> - 预判区（forecast）已随后端迁移 022 全部移除：`detail.forecast` 不再可用，`ForecastSlotPayload`/`parseForecastSlot` 类型和工具函数已删除。
> - 预判 Tab 与 `hasForecast` 筛选已从洞察列表移除。

> **2026-10-07 更新（自选股异动 / 洞察列表两页 cursor 翻页 + `visible_only` 过滤前置）**：两页原先均固定 `stockTraceApi.list(20)` 只取第 1 页且**不翻页**（后端 `nextCursor` 无人消费）；而后端是「先 LIMIT 20、前端再过滤 + 同日同股去重」→ 被隐藏的行**白占窗口**，较早的有效异动可能取不到（实测 mxfff：50 条里 27 条是 `low`）。
> - **`stockTraceApi.list(limit, cursor?, options?)`**：`options.visibleOnly === true` 时 params 追加 `visible_only: 1`。**opt-in 非默认**：`AlertContent.vue`（首页特别提醒，取前 6 条）刻意不传，行为与改动前一致。
> - **`monitor.vue` / `insight.vue`**：新增 `rawItems / cursor / hasMore / loadingMore`；首屏（`onShow`）**在请求前同步复位**这四个状态（否则 `loadMore` 在飞行途中触达 `onShow` 时会读到旧 cursor 并发请求）；触底经 **`<SubPageCard2 @scrolltolower>`** 加载下一页 —— **不是 `onReachBottom`**：两页被 `SubPageCard2` 包裹、滚动发生在**内层 `<scroll-view>`**，页面级 `onReachBottom` 不会触发（先例：`detail.vue`、`NotificationDropdown.vue`）。
> - **`hasMore` 以 `nextCursor` 为准**（不得用 `items.length < limit`）；请求失败**不推进 cursor**、不置 `hasMore=false`（下次触底用同一 cursor 重试），并 `console.warn` 以便观测。
> - **必须对累积 `rawItems` 整体重派生**（`filter(isUnattributableMovement) → dedupeDailyMovements → map/sort`）：同一 (股, 上海交易日) 的两条可能跨页边界，只派生本页会让较早那条"复活"成第二张卡。
> - **`upsertEventById(prev, incoming)`（`components/insightCards.ts`，两页共享）**：按 `event_id` **浅合并** —— 已存在则保留原位置并用 incoming 覆盖同名字段，不存在则追加。既避免跨页重复事件渲染成多卡，又避免整体覆盖丢掉 `primary_cause`/`confidence_level`（WS 的 `movement.updated` 是部分字段 payload）。`monitor.vue` 的 WS 分支（`#ifdef APP-PLUS`）也改走它。
> - 后端配套（app-api `stock-trace/AGENTS.md`）：`GET /api/cn/favorites/movements` 新增可选 `visible_only`；`nextCursor` 改**复合键** `"<first_triggered_at ISO>|<event_id>"`，排序加 `event_id DESC` tiebreaker（否则同毫秒事件跨页会漏行）。
> - 实测（mxfff）：两页首屏 14 张，连续触底 14 → 24 → 37 → 47 → 60 后出现「没有更多」；第 2 页起请求带 `cursor=` 与 `visible_only=1`。
> - **残留（已知）**：中文提示词规则（`hasNoUsableCause` 的 6 条提示词）与**同日同股去重**仍未下沉到 SQL → 窗口仍会被少量占用（去重：同日同股多条只出 1 张卡，但占多行）。

> **2026-10-07（同日第二笔）**：两页异动/洞察列表收敛到「最近 14 个自然日」——由**前端计算窗口起点、后端 SQL 做时间下界**（`aistock-agent-py/docs/superpowers/plans/2026-10-07-movements-two-week-window.md` Task 2）。
> - `stockTraceApi.list(limit, cursor?, options?: { visibleOnly?: boolean; since?: string })`：`options.since`（`YYYY-MM-DD`）存在时 params 追加 `since`（与 `visible_only` 同为**opt-in 非默认**；首页 `AlertContent.vue` 不传，走全量降级）。
> - 新 helper `shared/utils/datetime.ts::shanghaiDateKeyDaysAgo(days)`：`YYYY-MM-DD`，按 **UTC+8 固定偏移**（中国无夏令时、不依赖本机时区），`since = shanghaiDateKeyDaysAgo(13)` = 今天-13 = 最近 14 个自然日含今天。
> - `monitor.vue` / `insight.vue` 首屏与 `loadMore` 均传 `{ visibleOnly: true, since: shanghaiDateKeyDaysAgo(TWO_WEEK_WINDOW_DAYS) }`；**无客户端过滤**——后端按 `trading_date >= since`，越界返回空页 + `nextCursor=null` → 自然「没有更多」；老 app-api 忽略该参数 → 优雅降级"显示全部"。
>   - ⚠️ `TWO_WEEK_WINDOW_DAYS = 13`（定义在 `shared/utils/datetime.ts`，附「为何是 13 而非 14」注释）：**"含今天共 14 个自然日" 等价于"回退 13 天"**；写成 `14` 会多算一天（今天 10-07 → 正确 `since = 2026-09-24`）。浏览器实测请求即为 `since=2026-09-24`。
>   - 实测（mxfff）：同日两页卡片由改动前的 ~60 张收敛到 **8 张**（日期范围 09-24 → 09-30，**无早于 09-24 的卡片**），首屏即「没有更多」。

## 异动卡片主因展示（价格异动）
- 数据源：stocktrace movements API 返回的 `StockTraceEvent.primary_cause`（LLM 生成的 ≤20 字简短主因短语）。
- 展示优先级（`AlertContent.vue` 的 `fromMovement()`、`monitor.vue` 的 `movementToAlertItem()`、`insight.vue` 价格异动映射三处一致）：
  1. `primary_cause` 存在 → `主因：${primary_cause}`
  2. 否则 `movement_view.primaryCandidate.verdict` 存在 → `主因：${verdict}`
  3. 否则按 `analysis_status` 兜底：`completed` → `归因完成` / `processing` → `归因中` / `failed` → `归因失败` / `unavailable` → `待归因`

## 自选股洞察列表页（pages/insight.vue，2026-09-24 模板统一）
- **目标**：该页模板统一到「个股情报」页（`modules/market/pages/event-catcher.vue`），页面风格与洞察/异动/节奏等他页一致。
- **容器**：保持 `SubPageCard2 title="自选股洞察"`（与 insight-detail-move / monitor / rhythm 同款；**不**跟随 event-catcher 的 `SubPageCard` v1）。
- **筛选栏**：顶部 `filter-bar` + 组件库 `Segmented`「全部 / 上涨 / 下跌」（对齐 event-catcher 的周期筛选栏）；**前端本地过滤 `direction`，不新增接口**（切档不重新拉取）。
- **列表行**：组件库 `Card` 三段式（对齐 event-catcher）：`.event-top`（股票名 `.stock-name` + 代码 chip `.stock-code` + 涨跌幅 `.stock-move` 红涨绿跌 | 方向 `Tag`：up→「上涨异动」/ down→「下跌异动」）→ `.event-title`（主因正文，三段式兜底同上）→ `.event-bottom`（左 `.meta-left` = `Badge`「涨停」**仅 `is_limit_up === true` 时渲染** + 日期 `MM-DD`；右 `.meta-time` = `formatTime` 时间）。
- **加载态**：组件库 `LoadingState`（替换原内联文本「加载中...」）。
- **内部展示模型**：`statusText` 更名 `causeText`，新增 `timeText`（`@/shared/utils/datetime` 的 `formatTime`）与 `is_limit_up`；均为展示层字段，**非 API 契约变更**。
- **未改动**：数据源 `stockTraceApi.list(20)`、`isUnattributableMovement` 过滤、`dedupeDailyMovements` 同日同股聚合、倒序、空态 `EmptyState`（「暂无自选股洞察」）、点击跳 `insight-detail-move?event_id=`。
- **实现注意**：共享组件按**逐文件**引入（`@/shared/components/Card.vue` 等），不走 barrel `@/shared/components`——barrel 会连带编译 `KLineChart.vue` 的 renderjs 双 `<script>`，在 vitest 下直接编译失败（存量基线问题）。
- **护栏**：`pages/insight.mount.spec.ts`（vitest 挂载 7 例：筛选栏三档 / Card 三段式 / 主因正文 / 涨停 Badge 仅涨停行 / 上涨下跌筛选 / 点击跳转 / 空态），已登记 `vitest.config.ts` 的 `test.include` 白名单。

## 自选股异动页（pages/monitor.vue，2026-09-24 模板统一）
- **目标**：与「自选股洞察」列表页（`pages/insight.vue`）/「个股情报」页（`event-catcher.vue`）**完全同款**模板，消除原先 `InsightAlertCard`（蓝渐变头部 + 左侧色条）的独立视觉。
- **容器**：保持 `SubPageCard2 title="自选股异动" subtitle="AI 实时盯盘 · 盘中异动推送"`。
- **保留的页面特有区块**（仅此处有，未改功能）：订阅状态卡（监控范围 N 只自选股 + **组件库 `Switch`** 开关）、区块标题行（「异动提醒」+ 市场状态 + **组件库 `Button`**「立即检测」）、App 端 WS 连接状态行。
- **筛选栏**：`filter-bar` + `Segmented`「全部 / 上涨 / 下跌」（与 insight.vue 同款）；**前端本地过滤 `direction`，不新增接口**。
- **列表行**：组件库 `Card` 三段式，与 insight.vue 逐节点同名同义——`.event-top`（`.stock-name` / `.stock-code` / `.stock-move` 红涨绿跌 | 方向 `Tag`）→ `.event-title`（主因正文，三段式兜底同上）→ `.event-bottom`（左 = `Badge`「涨停」**仅 `is_limit_up === true`** + 日期 `MM-DD`；右 `.meta-right` = 「报告 ›」+ 时间）。
- **洞察报告入口**：由原「卡片下方整行按钮」改为**下行右侧小字按钮「报告 ›」**（`.report-link`），**仅 `analysis_status === 'completed'` 时渲染**（`reportable`）。（**2026-09-25 起**）点击不再直接下载 PDF，而是 `navigateToInsightDetail(eventId, 'price', { autostart: '1' })` 跳详情页并自动开始流式生成（列表页不展开长报告）。`InsightAlertCard.vue` 自此**无生产调用方**（保留在 `shared/` 未删，处置待组长定）。
- **展示模型**：`AlertItem` 字段对齐 insight.vue——新增 `changePct` / `isLimitUp` / `causeText` / `dateText` / `timeText` / `reportable` / `sortTime`，原 `message`/`type`/`confidence` 移除（`confidence` 本就恒为 undefined）。
- **WS 报文契约（2026-09-24 补齐，三类报文）**：App 端（`#ifdef APP-PLUS`）订阅后按外壳类型分流——
  1. **新建异动**：外壳 `type='alert'`，内层 `data.type='movement.created'`（后端 `StockTraceService.sendInitialPush` → `toPublicEvent` 投影）。→ `isPriceMovementPayload()` 守卫（要求 `event_id` + `event_type === 'price'`）后 `unshift` 成卡。
  2. **二次推送**：外壳 `type='movement.updated'`（后端 `StockTraceAlertOrchestrator.pushSeverityUpgrade` / `pushConfirmedMajorCause`）。→ 按 `event_id` **就地更新**：`severity_upgraded` 刷新 `changePct`；`a_grade_major_cause` 用 `movement_view.primaryCandidate.verdict` 刷新主因正文、`status === 'confirmed'` 时放出「报告 ›」入口。**此前该外壳完全未被处理**（严重度升级/主因确认的实时更新全丢，须手动刷新或 `onShow` 重拉）。
  3. **必须过滤**：老涨停雷达洞察的 `insight.created`（形状 `{ eventId, content, symbol }`，无 `stock_name`/`direction`/`triggered_at`）仍可能经 `alert` 外壳到达（`InsightPushService` 链路未删）——守卫不放行，否则会插入缺字段的残缺卡片。
  - 测试护栏：`monitor.spec.ts` 用 `connectSocket` 桩捕获 `onMessage` 回调后直接投喂报文（4 例：created 插入 / severity_upgraded 就地更新 / a_grade_major_cause 更新主因与报告入口 / insight.created 被忽略）。
- **后端载荷（2026-09-24 已补齐，本仓零代码改动）**：`toPublicEvent` 现透出 `is_limit_up`，且 `analysis_status` 由硬编码 `'pending'` 对齐为 `'processing'`（与列表派生口径一致）；`listUserEvents`/`listRecentEvents` 的 SELECT 已带 `e.window_end_at` → 列表/WS 卡的 `window_end_at || triggered_at`「最近异动时刻」语义真正生效。`primary_cause`/`movement_view` 仍不在**新建**推送里——新建时本就无归因结果，由 `movement.updated` 二次推送补。
- **未改动**：数据源 `stockTraceApi.list(20)`、`isUnattributableMovement` 过滤、`dedupeDailyMovements` 同日同股聚合、倒序、空态 `EmptyState`（文案随开关态：已开启「暂无异动提醒」/ 已关闭「异动监控已关闭」）、点击跳 `navigateToInsightDetail`、`onReport` 的 toast 兜底。（`reportBusy` 防抖已随 2026-09-25 PDF 链路移除而删除。）
- **护栏**：`pages/monitor.spec.ts` **整体重写**（原 2 例断言 09-04 已移除的涨停雷达数据源 = 存量红，已随本次修正），现 **14 例**：筛选栏 / 订阅卡（组件库 `Switch` 的 `is-on` 与点击回调）/ 「立即检测」为组件库 `Button` 且点击重拉列表 / Card 三段式 + 上行字段 + 主因正文 / 涨停 Badge 仅涨停行 / 上涨下跌筛选 / 点击跳转 / 报告入口仅 completed 行且点击跳 `navigateTo`（断言 URL 含 `&autostart=1`，**2026-09-25 起**由"触发下载"改为"跳详情页自动生成"）/ 空态 / WS 四例（见上「WS 报文契约」）。

## 异动详情页（insight-detail-move.vue）
- **当前形态（2026-09-25 / 2026-09-26）**：报价头 + 一句话主因卡 + **「生成完整洞察报告」按钮 + 按钮下方流式渲染区**。
  - 报告可用条件：`reportAvailable = analysis.processing_status === 'completed' && !!artifact`；`completed` 但无 artifact 时显示灰字「本次归因未产出完整报告」。
  - 按钮三态文案：`生成完整洞察报告` → 生成中 `生成中…（点击停止）`（点击即 `stop()` 中止）→ 完成后 `重新生成完整报告`。
  - 流式渲染区：**已下沉为 `<InsightReportBody :header :sections :loading />`**（本页不再内联章节/行模板）；生成失败文案 `reportError` 仍由本页渲染。
  - `?autostart=1`（由自选股异动页「报告 ›」传来）：数据就绪后自动 `onToggleReport()`；`onUnload` 调 `stopReport()` 中止未完成的流。
  - 状态源：`modules/favorites/utils/useInsightReportSSE.ts`（见上文 2026-09-25 / 2026-09-26 更新）。
  - 主因卡标题行为**「异动原因」**（2026-09-26 由原「归因主因」改名，便于用户理解）；同一行右侧徽标：**仅 `artifact.confidence.level === 'high'` 时显示「可信度高」**，`medium` / `low` 不显示任何徽标（2026-09-26 调整；详见上文更新块）。
- **已移除（2026-09-13 精简）**：归因候选全量列表（`artifactJson.candidates`）、六阶段因果链（`artifactJson.chains` 的 `role=primary`）、证据清单（`artifactJson.evidence_index` 过滤 trigger_fact/quote_fact）等展开区块**均已从模板删除**——这些内容改由 agent-py 构建成 blocks、经流式报告输出。页面仍保留的 `artifactJson` 用法只有一处：从 `candidates`（按 `chains` 的 `role=primary` → candidateId 定位）取 `verdict` 作为主因兜底文案。
- **已移除（2026-09-13 随迁移 022）**：预判区（`detail.forecast` 的 `close ?? midday` slot 展示 summary 与 conditions）已随 forecast 列删除而移除。

## 组件
- `components/InsightReportBody.vue` - 完整洞察报告正文渲染（按 `block.type` 分派 6 类 block；六阶段因果链为纵向时间轴，非 `established` 阶段走中性弱化；空节渲染「暂缺」）
- `components/StockCard.vue` - 股票卡片
- `components/StockCardList.vue` - 股票列表
- `components/KLineChart.vue` - K 线图
- `components/MiniKLine.vue` - 迷你 K 线（多股同列宫格用；分时/五日为折线，日/周/月为蜡烛+成交量；App + H5 走 renderjs 视图层 `createElementNS` 构建真实 SVG，小程序回退到占位"--"）
- `components/PolicyList.vue` - 行业政策列表（2026-10-06 新增）：每条 = 利好标签 + 正文（折叠 2 行截断）+ 本条末尾自带的「展开/收起」按钮；**同时只展开一条**（点另一条自动收起前一条）；仅超长条目（>42 字）渲染按钮。替代原先的全局「查看完整」+ 只显示前 2 条
- `components/StockDetailTable.vue` - 股票详情表格
- `components/ForecastFinancialChart.vue` - 业绩预测财务图（2026-10-06 新增，对齐 Web 端个股详情页）：上下两块——「规模与成长」（净利润+营业收入堆叠柱 / 净利润增长率折线，双轴）与「成长与估值」（营业收入增长率 / 净资产收益率 / 市盈率，双轴）；数据源为 `forecastData.detailIndicators`；纯 CSS/DOM 实现（折线用 `transform: rotate` 细线段），不依赖 canvas / SVG / renderjs，全端可用。详情页与推送弹窗（`shared/components/NotificationInsightModal.vue`）共用
- ~~`components/ForecastGrowthChart.vue`~~ - 年度预测增长率图，**已于 2026-10-06 删除**：其数据（净利润 + 净利润增长率）与 `ForecastFinancialChart` 的「规模与成长」块重复，故整体移除（组件、测试、vitest 白名单、两处调用与视图模型一并清理）
- ~~`components/ForecastProfitChart.vue`~~ - 旧单序列净利润柱图，**已于 2026-10-06 删除**（详情页与推送弹窗均改用上面两个组件，删除前已 grep 确认无任何引用）

## Hooks
- `utils/useInsightReportSSE.ts`（**2026-09-25 新增，2026-09-26 改为双通道**）— 完整洞察报告流式读取。消费 `GET /api/cn/favorites/movements/:eventId/report/stream`，**按运行时能力择一通道**（`pickReportStreamChannel()`，不用条件编译）：H5 走 `fetch + ReadableStream`，App / 小程序走 `uni.request({ enableChunked: true }) + onChunkReceived`；fetch 拿到响应但无 `body` 时回退到 chunked。两条通道共用 `createReportStreamDecoder(handle)`（`data: {...}\n\n` 分帧、`TextDecoder({stream:true})` 跨块续解、半帧缓存、累计 `rawText`）。**不用 `EventSource`**：无法设置 `Authorization` 头，而该端点需 JWT。返回 `{ header, sections, loading, done, error, start(eventId), stop() }`；`sections` 逐条追加（`[...sections, section]` 触发响应式）；60s 超时后中止并置 `error='请求超时，请稍后重试'`；非 200 时读 JSON 的 `message` 作错误文案；单帧 JSON 解析失败忽略不中断；取消统一走 `setCancel(cb)`（`AbortController` / `requestTask.abort`）；`stop()` 用 `active` 标志阻断迟到响应改写状态。
- 其余沿用 `shared/utils` 中的 useFavorites 等（模块此前无专属 hooks）。

## 对外暴露的接口
- 其他模块通过 navigateTo 跳转到个股详情页

## 依赖的 shared/ 中的类型
- `@/shared/store/modules/favorites` - 自选股状态管理
- `@/shared/store/modules/app` - 应用配置状态
- `@/shared/api/modules/stock` - 股票 API
- `@/shared/api/modules/portfolio` - 持仓 API
- `@/shared/utils/tradingTime` - 交易时间工具
- `@/shared/utils/datetime` - 日期时间格式化
- `@/shared/utils/stock` - 股票格式化工具
- `@/shared/components/SubPageCard.vue` - 子页面容器
- `@/shared/components/SvgIcon.vue` - 图标组件

## 开发注意事项
- 自选股数据在未登录时使用 mock，登录后从后端获取
- 编辑态：点击表头编辑图标进入，右上角"完成"退出；支持勾选批量删除与拖拽排序（点"完成"统一保存 `saveOrder`）
- 编辑态以自选股原始顺序（后端 sort_order）为基准展示，隐藏行情列；左滑删除仅普通态生效
- 多股同列（favorites-grid）：表头网格图标进入，行情复用 favoritesStore，K 线按周期全部加载 + 前端 Map 缓存
  （`klineCache` 以 `${period}:${symbol}` 为 key，切回周期不重新请求）；默认日K，顶部切换分时/五日/日K/周K/月K
- 分时/五日走分钟级 K 线（klt=1），`getKLine` 会自动带 `startDate`（分时近 3 自然日、五日近 9 自然日）避免拉全量历史分钟数据
- 特别提醒页面使用堆叠卡片手势交互
- **子页面滚动容器（2026-08-19）**：H5 预览包装固定 `#app` 高度并 `overflow: hidden`，页面原生滚动被禁用。`insight.vue` / `insight-detail.vue` / `insight-detail-move.vue` 必须用 `SubPageCard2`（自带白色导航栏 + scroll-view）包裹（对应 pages.json `navigationStyle: "custom"`），否则长内容被裁剪、底部不可达。新增/改造子页面沿用此模式。

## 首页 AlertContent 自选股洞察（2026-09-04 还原为旧预览 ListCell 形态）
- `AlertContent.vue` 自选股洞察块还原为旧预览 ListCell 形态：`module-header`（标题"自选股洞察"+箭头，点跳 `/modules/favorites/pages/monitor` 自选股异动页）+ `ListCell` 列表（`CAPTURE_ROW_COUNT=6`）。行字段：`title=stock_name`、前缀 `Tag` 用方向（up/down, 红绿, 文案"涨/跌"）、`description=主因或状态 · MM-DD 时间`。点击行进 `insight-detail-move?event_id=`。
- 数据源：`stockTraceApi.list(20)` → `.filter(m => !isUnattributableMovement(m))`（保留无法归因不展示）→ 取前 6 条（含空行占位至 6）。
- 主因三段式兜底：`primary_cause` → `movement_view.primaryCandidate.verdict` → `analysis_status`（completed→归因完成 / processing→归因中 / failed→归因失败 / 其他→待归因）。
- 移除：Segmented[全部|预判|溯源]、buildInsightCards 聚合卡渲染、情报折叠、卡片级"预判区/溯源区/AI解读"按钮、intel 并行拉取（该数据仅个股情报块需要，个股情报块自身加载不动）。洞察块只拉 movements。
- `isUnattributableMovement` 仍从 `insightCards.ts` 导入复用，`insightCards.ts`/`insight.vue`/`monitor.vue`/详情页不动。（**时点说明**：该结论为 2026-09-04 时点；`insight.vue` 已于 **2026-09-24** 做模板统一改造，现状见上文「自选股洞察列表页」章节。）
- 个股情报块（intel module-card）保持阶段3改造不动（Segmented[全部|利好|利空] + ListCell 预览 + AI解读跳 alert-analysis）。

## 低置信度归因不展示异动卡片（2026-09-30）

- **产品口径**：归因置信度为 **`low` 的异动不展示卡片**；`medium`/`high` 照常展示。判定在展示层，机器枚举值来自 app-api 列表接口新增的 `confidence_level` 字段。
- **改动（单点）**：`components/insightCards.ts` 的 `isUnattributableMovement` 在 `analysis_status === 'unavailable'` 判据之后、`!== 'completed'` 之前新增 `if (m.confidence_level === 'low') return true`；`TraceEventLike` 新增 `confidence_level?: 'low' | 'medium' | 'high' | null`。三处消费者（`pages/monitor.vue` / `pages/insight.vue` / `components/AlertContent.vue`）均复用该过滤函数，**逻辑单点改动即三处生效**，调用点未动。
- **降级保护（关键）**：字段**缺失**（app-api 未升级）或 **`null`**（无归因结果）时一律**不隐藏**。理由：若写成"非 `high` 即隐藏"，在 app-api 未发布该字段时会**误杀全部卡片**（`undefined !== 'high'` 恒真）。因此判据只能是 `=== 'low'`，且两仓发布顺序不敏感。
- **口径边界**：`low` 与既有"无有效结论"（`analysis_status === 'unavailable'` / `movement_view.status ∈ {insufficient, not_applicable}` / 主因命中 `INVALID_CAUSE_HINTS`）是**独立判据**——`low` 也会被单独隐藏，即便它有主因短语。
- 测试：`components/insightCards.spec.ts` 新增 describe「isUnattributableMovement 低置信不展示口径」5 例（low→隐藏 / medium→展示 / high→展示 / 缺失→不隐藏 / null→不隐藏）→ 54 pass / 0 fail；`npx vue-tsc --noEmit` exit 0。
- H5 实测（mxfff 账号）：监控页与洞察列表页各 **6 张**（改前 10 张），保留项均为 medium、隐藏项均为 low，无「归因中」、无 09-30 卡片，符合预期。

## 宿迁联盛 2026-09-24 归因硬失败事故（2026-09-27 定位并处置，前端最终零改动）
- **现象**：宿迁联盛 09-24 异动卡片恒显示「归因中」，且同日同股聚合（`dedupeDailyMovements` 取最新）把它选为"最新"，**遮盖了 09:55 那条已有的有效结论**。
- **根因（跨仓契约不匹配）**：Node 侧 `buildTriggerEvent` 把涨停标记以 `isLimitUp` 写进冻结的 `stock_trace_snapshots.trigger_event_json`，而 agent-py 侧 `TriggerEvent` 是 `extra="forbid"` 且未声明该字段 → `StockTraceSnapshot.model_validate` 抛 `ValidationError`；该调用位于 worker 内层 try **之外**，被外层 `except Exception` 兜成**具误导性**的 `LLM_OR_DEPENDENCY_UNAVAILABLE` → 3 次**确定性秒失败**进 `dead_letter`、**从未产出 result**。修复落在 agent-py（`TriggerEvent` 声明 `is_limit_up`），**前端无代码改动**。
- **本次临时措施（已回退）**：定位当天曾在 `insightCards.ts` 加过 `SUPPRESSED_EVENT_IDS` + `isVisibleMovement` 硬编码隐藏该日两条事件，供"修契约需部署周期"期间先不展示。**归因用修复后的代码代跑成功（result `completed`）后已整体回退**，代码回到 `.filter(m => !isUnattributableMovement(m))`。
- **最终可见性**：恢复出的主因是「证据不足，异动原因未明」（快照缺 `article_context`，无新闻/公告支撑）→ 命中既有「无结论不展示」规则（`hasNoUsableCause` 的 `证据不足` 提示词）→ **该日两条都按正常规则不展示**，卡片保持隐藏，但原因从"归因卡住"变为"归因完成但无有效结论"。
- **尚未闭环（agent-py 侧）**：`TriggerEvent` 的修复**仍未部署到生产**；且 app-api 侧 `buildTriggerEvent` 的 `isLimitUp` 是**无条件**写入（`Boolean(...)`），**先发 app-api 会把"1 条卡住"放大成"每条新事件归因全挂"** —— 发布顺序必须 agent-py 先、app-api 后。
- **已知未处理（另一处独立缺陷）**：`dead_letter` 的 job 在 `listUserEvents` 的 `analysis_status` 派生里仍落 `processing`（该 CASE 只看 `stock_trace_results`，无 result 即与"仍在归因"不可区分）→ 任何"归因 job 永久失败"的事件都会长期显示「归因中」。属 app-api 侧口径问题，待后续按需处理。
