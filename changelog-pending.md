# 待提交修改（aistock-app-frontend）

## 2026-11-08 — 首页自选股悬浮卡：上滑叉掉 + 一键关闭全部（手势收敛为只保留上滑）

### 变更文件

- `src/shared/components/FloatingStockAlertCards.vue`
  - **上滑叉掉该卡**：最上层卡跟手向上位移，松手超过 `DISMISS_DISTANCE_PX`（220rpx ≈ 114px）→ 向上飞出并 `emit('close', symbol)`（本次会话不再展示）；未达阈值回弹。
  - **取消左右滑动与下滑**（用户确认）：横向/向下不再跟手、不再关闭，也不再用于切换卡片（原有「左右拖动切换」一并移除，`flyingOut`/`progress`/`rotateOrder` 相关分支删除）。
  - **点击下层卡置顶**：替代原拖动切换，只改 `order` 顺序、不关闭任何卡。
  - **拖动只作用于最上层卡**（`idx === 0`）：修复此前「拖动下层卡却移动上层卡」的鼠标拖动手感问题。
  - **H5 桌面鼠标拖动**：`mousedown/mousemove/mouseup` 驱动同一套上滑手势（仅 `isH5`，卡内按钮不参与拖动）。
  - **右上角悬浮圆钮「一键关闭全部」**：贴堆叠卡顶边，`emit('closeAll')`。
- `src/shared/utils/useStockAlerts.ts`：新增 `dismissAll()`（把当前所有卡合并进 `dismissedSymbols`，仅本次会话、不持久化）。
- `src/shared/components/MainTabs.vue`：绑定 `@close-all="dismissAllAlerts"`。
- `src/shared/components/FloatingStockAlertCards.spec.ts`：按新语义重写用例（上滑跟手/达阈值关闭/未达回弹/触控中断/鼠标上拖关闭/左右与下滑无效果/拖动下层卡不动上层卡/点击下层卡置顶/一键关闭/小程序上滑可用）。
- `AGENTS.md`：共享组件表中本组件的交互与事件说明同步为最新口径。

### 验证

- `npx vitest run src/shared/components/FloatingStockAlertCards.spec.ts`：**14 passed**。
- `npx vue-tsc --noEmit`：EXITCODE=0。
- 真实 H5 页面（localhost:5173/h5）实测：鼠标上拖 150px 松手 → 顶层卡消失、下一张补位；点击第二层卡 → 置顶且不关闭；点右上角圆钮 → 全部悬浮卡消失。

---

## 2026-11-07 — 修复：自选消息按股票筛选时混入别家自选股的资讯（前端归属护栏）

**现象**：筛选到「贵州茅台」，列表仍出现「江波龙：资讯异动」「中际旭创：资讯异动」。

**根因（后端数据归属，非筛选逻辑）**：实测请求已正确带 `symbol=600519`、筛选栏也显示贵州茅台，
但返回行里 3 条的 `stock_name` 是别的股票 —— 即库里 `symbol=600519` + `stock_name=江波龙` 的错配行。
后端 `stock_info_judgements.dedupe_key` 按「文章」去重（`source|info_type|source_id`），同一篇文章会被
多只股票的新闻搜索返回；冲突更新执行 `DO UPDATE SET stock_name = EXCLUDED.stock_name` 而 `symbol`
不在 SET 列表，于是留下错配行，建通知时用 `symbol` 决定归属、用 `stock_name` 拼标题，别家资讯就挂到了当前股票下。
（后端修复见 `aistock-app-api`：入库不再改写 `stock_name` + 建通知前用 `stocks` 权威名称校验；
 历史脏数据清理脚本 `aistock-app-api/docs/sql/fix_stock_info_attribution.sql`）

**本次前端改动（显示层护栏，防后端同类回归）**：
- `shared/components/NotificationDropdown.vue`：新增 `stockFilterAuthoritativeName`（当前筛选股票在自选列表里的权威名称）；
  `displayItems` 在按 `symbol` 过滤后**再按名称挡一层** —— `stockName` 与该股票权威名称不一致的消息不展示
  （`stockName` 为空时保留，避免误伤）。后端脏数据或未来回归都不会再把别家资讯显示在当前股票下。

**测试**：
- `NotificationDropdown.spec.ts` 新增 1 例「归属错配的消息不展示」：mock 返回 `symbol=600519` 且
  `stockName` 分别为「贵州茅台」「江波龙」的两条，筛选贵州茅台后只展示前者。
- 该 spec 现 **10 passed**；`npx vue-tsc --noEmit` exit 0。
- 真实页面复验（登录态、硬刷新后）：筛选「贵州茅台」列表仅剩「贵州茅台：资讯异动」「贵州茅台：业绩预测更新」，
  江波龙 / 中际旭创 均已消失。

---

## 2026-11-07 — 修复：自选消息面板「查看全部」在面板已展开时筛选失效（混入其它股票消息）

**现象**：点某只自选股悬浮卡的「查看全部」，通知面板里出现与该股票无关的其它股票消息（如贵州茅台的消息列表里混入宁德时代等）。

**根因**（`shared/components/NotificationDropdown.vue`）：`targetSymbol`（「查看全部」带过来的目标股票）是一次性意图，但只在 `watch(open)` 里、且仅当 `open` 由 false→true 时消费。真实布局下铃铛在左上、悬浮卡在底部可同时可见 —— 若面板已展开再点「查看全部」，`open` 不变 → watcher 不触发 → 筛选被整个丢弃，列表停留在「全部自选股」，于是目标股票的消息里混入其它股票。同时该意图会滞留，后续用铃铛开面板时会突然跳到上一次的股票。

**修复**：
- `watch(targetSymbol)` 独立监听：面板已展开时也生效（清空意图 → 应用筛选 → 重拉 → 补齐）。
- `watch(open)` 中存在待消费意图时不再自行 `load()`，交由上述 watcher 统一处理，避免同一意图触发两次请求。
- 未登录/面板未展开时保留意图，等 `open` 时再消费；抽出 `applyTargetSymbol()` 复用。

**测试**：
- `NotificationDropdown.spec.ts` 新增 2 例：`openPanel(symbol)` 开面板即筛选（一次性意图消费后置空）；**面板已展开时点「查看全部」仍要筛到目标股票**（修复前红、修复后绿）。
- 补 `enableAutoUnmount(afterEach)`：面板开合是模块级共享状态，用例间不卸载旧实例会让残留实例抢先把意图消费掉（此前该 spec 存在跨用例污染）。
- 验证：`NotificationDropdown` + `FloatingStockAlertCards` + `cardStackSwipe` 三个 spec **33 passed**；`npx vue-tsc --noEmit` exit 0。

---

## 2026-11-03 — PR #151 合入（中性沿用标注 / 节奏卡去 score / 次行回退时效）

- src/modules/rhythm/utils/rhythmInsight.ts：标题顺序改为「仓位动作 · 档位」；phase_evidence.stage_source == "inherited_prev_day" 时档位后缀「（中性沿用）」。
- src/modules/rhythm/components/RhythmCard.vue：主视觉改为仓位动作长句，不再展示 score 数字（档位序号×20 会被误读为温度分）。
- src/modules/fear-greed/utils/fgRhythmSummary.ts：次行回退加 5 自然日时效（FALLBACK_MAX_AGE_DAYS，isFreshBasis fail closed）。
- 	ests/run-node-specs.mjs：node:test 基线 284 → **286**（hythmInsight.spec.ts 新增 2 例）。
- 验证：vitest 68 passed；node specs 286/286/0；type-check 通过；CI 绿。
- **待人工**：App 云打包（HBuilderX GUI + DCloud 账号），本次未执行。

## 2026-10-31 — 0.1.6 版本升级（待打包发布）

- `src/manifest.json`：`versionName` 0.1.5 → **0.1.6**、`versionCode` 105 → **106**（打包版本号）
- `src/modules/user/pages/profile.vue`：「关于洞见」版本号 0.1.5 → **0.1.6**（App 内部版本说明，需与 manifest 同步）
- `CHANGELOG.md`：新增 0.1.6 版本发布记录（含 App 更新文案 12 条）
- Web 端 `aistock-frontend/public/download/version.json`：同步 0.1.6 / 106 / `aistock-0.1.6.apk` / releaseDate 2026-11-05 / 新更新文案（12 条）
- 更新文案口径：因下方 2026-10-17 条目将「AI帮我选」展示顺序回退为服务端 AI 排序，文案写作「按 AI 排序优先展示」，不描述为按涨跌幅重排
- 2026-11-05 复核补充：0.1.6 版本提交后又合入 15 个提交（PR #151 节奏卡语义收口、#152 节奏前端切仓位档位 + 洞见卡溯源/变奏/折叠账本、#153「去问 AI」问句编码修复），已把节奏大师改版与乱码修复补入更新文案；版本号保持 0.1.6 / 106 不变
- **打包后待办**：按实测 APK 大小修正 version.json 的 `fileSize`（暂沿用 22.98 MB），commit+push 两仓库后按 release 流程部署（上传 APK + web 构建部署 + 线上自检）

## 2026-10-17 — AI帮我选展示顺序回退为服务端 AI 排序

### 变更文件

- `src/modules/home/components/AiPickContent.vue`（「选股」Tab · AI帮我选）
  - 删除 2026-10-13 新增的 `byChangePctDesc` 比较器与 `recommendations` computed 末尾的 `.sort(byChangePctDesc)`，**展示顺序恢复为服务端 AI 给出的顺序**（即接口数组/`rank` 顺序），前端不做任何重排；补一行中文注释固化该口径。
  - 行内「推荐理由 / 迷你走势图 / 自选按钮（双向切换）」等其余逻辑未动。
- `src/modules/home/components/AiPickContent.mount.spec.ts`
  - 移除 2026-10-13 新增的 `describe('AiPickContent 列表排序（按当日涨跌幅降序）')` 两例（降序 / 缺失值排末尾）——该行为已不存在，避免留下反向护栏。
  - 保留原有「自选按钮双向切换」3 例。
- `src/modules/home/AGENTS.md`
  - `components/AiPickContent.vue` 一条改回：**展示顺序遵循服务端 AI 给出的 `rank`，前端不做任何重排**（并注明 2026-10-17 曾短暂按涨跌幅降序、已回退）。

### 原因

按当日涨跌幅降序会打乱服务端 AI 已排定的优先级顺序，产品口径应以 AI 排序为准。

### 验证

- `node ./node_modules/vue-tsc/bin/vue-tsc.js --noEmit`：EXITCODE=0。
- `node ./node_modules/vitest/vitest.mjs run src/modules/home/components/AiPickContent.mount.spec.ts src/modules/favorites/components/AlertContent.spec.ts`：2 files / **14 tests passed**（回退后由 16 → 14，减少的正是移除的两例排序断言）。
- `npm run test:node`：`期望基线 284/284/0，实际 284/284/0`。

## 2026-10-13 — 未登录自选股洞察示例数据

### 变更文件

- `src/modules/favorites/components/AlertContent.vue`（首页「提醒」Tab · 自选股洞察块）
  - **未登录**（`useUserStore().isLoggedIn()` 为假）：`loadCaptureList()` 直接返回 3 条**示例数据**（`buildDemoCaptureList()`），**不发 `stockTraceApi.list` 请求**（匿名用户无自选股、异动链路对其无数据，请求只会拿到空数组把示例数据顶掉）。
  - `CaptureItem` 新增 `demo?: boolean`；模板 `:clickable="!!item && !item.demo"` 与 `@click="item && !item.demo && goTrace(...)"` —— 示例行**不可点击**（`event_id` 为空，跳异动详情必 404）。
  - 示例行日期取当日 `MM-DD`（`fmtDateMMDD(new Date().toISOString())`），保证与真实行同款展示（`主因 · MM-DD`）。
  - 登录态切换的 `watch(useUserStore().token)` 补上 `loadCaptureList()`（原先只重载个股情报）：登出后回到示例数据、登录后立即换成真实异动。
  - 已登录路径**完全未动**（`list(20)` → `isUnattributableMovement` 过滤 → `dedupeDailyMovements` 聚合 → 倒序）。

### 影响面

- 仅未登录分支新增；已登录用户的首页洞察块行为与改动前逐字节一致。

### 验证

- `node ./node_modules/vue-tsc/bin/vue-tsc.js --noEmit`：EXITCODE=0。
- `node ./node_modules/vitest/vitest.mjs run src/modules/favorites/components/AlertContent.spec.ts`：11 tests passed（新增 2 例：未登录渲染 3 条示例且不请求接口 / 示例行不可点击不跳转；`useUserStore` 改桩、`ListCell` 桩补 `:data-clickable`）。
- `npm run test:node`：`期望基线 284/284/0，实际 284/284/0`。
- **同期条目**：本次一并提交的「AI帮我选按涨跌幅降序」已于 2026-10-17 回退（见上方最新条目）。

## 2026-10-13 — 首页暂隐时段动态洞见卡

### 变更文件

- `src/modules/home/components/MorningContent.vue`
  - 时段动态洞见卡 `DynamicInsightCard` 加 `v-if="false"` 暂时隐藏（置于 `briefing-card` 与 `feature-grid` 之间）。
  - **非删除**：组件文件、`leaderSectors/chainEvents/traceReports/rhythmRows` 取数与 `onBarNavigate` 分发全部保留（后三者仍被四宫格消费），恢复只需删掉 `v-if="false"`。
  - 附中文注释说明隐藏原因与恢复方式。

### 验证

- `node ./node_modules/vue-tsc/bin/vue-tsc.js --noEmit`：EXITCODE=0。
- `npm run test:node`：`期望基线 284/284/0，实际 284/284/0`（`MorningContent.spec.ts` 源码锚定护栏断言 `DynamicInsightCard` 仍位于 briefing 与 feature-grid 之间，未失效）。

## 2026-10-12 — 条件化预判卡信息区灰字可读性提升（两种形态全量生效）

### 变更文件

- `src/shared/components/ConditionalForecastBlock.vue`（共享条件化预判块）
  - 上一轮曾用 `conditionDisplay === 'sentence'` 触发的 `as-insight-card__fc--detail` 修饰类**仅在长句形态**抬升灰字；本轮**取消范围限定**——把新值直接合并进**基线类规则**，`sentence`（预测详情/长句）与 `tags`（板块卡/板块四环/节奏大师）两种形态一致受益。
  - **删除冗余**：模板根节点的 `:class="{ '…--detail': conditionDisplay === 'sentence' }"` 绑定与 `<style>` 末尾整个 `.as-insight-card__fc--detail { … }` 修饰块（连同其注释）一并移除，避免同一件事两处定义；根节点恢复为 `class="as-insight-card__fc"`。
  - 灰色小字统一按「字号至少 22rpx + 颜色至次要信息层 `$ink-soft`(#4b5a7a)」落在基线类（保持上一轮已抬升的字号，不再加大；仅颜色较上一轮再加深一档）：
    - `as-insight-card__horizon-phase`（影响形成/影响高峰/影响衰减/回归常态）：`20rpx/$ink-faint` → `$font-size-xs/$ink-soft`
    - `as-insight-card__remain`（剩余时长）：`20rpx/$ink-faint` → `$font-size-xs/$ink-soft`
    - `as-insight-card__horizon-projection`（档位口径说明行）：`20rpx/$ink-faint` → `$font-size-xs/$ink-soft`
    - `as-insight-card__conf`（置信）：`22rpx/$ink-mute` → `$font-size-xs/$ink-soft`
    - `as-insight-card__sc-or-tx`（分支间「或」分隔）：`22rpx/$ink-faint` → `$font-size-sm/$ink-soft`（保留上一轮字号档）
    - `as-insight-card__sc-more-tx`（行1「详情/收起」）：`20rpx/$ink-mute` → `$font-size-xs/$ink-soft`
    - `as-insight-card__sc-conn`（行2「若/则」）：`22rpx/$ink-faint` → `$font-size-xs/$ink-soft`
    - `as-insight-card__sc-amp-chip`（行2「则」后预判标签）：`$ink-mute` → `$ink-soft`（字号随 `sc-chip` 22rpx 不动）
    - `as-insight-card__sc-amp`（预判句内幅度/目标位段）：`$ink-mute` → `$ink-soft`（字号随正文 24rpx 不动）
    - `as-insight-card__anchor-chip`（验证锚点 chip，含阈值/指标）：`20rpx/$ink-mute` → `$font-size-xs/$ink-soft`
    - `as-insight-card__sc-hidden-tx`（「另有 N 条条件未成立」纯标注）：`20rpx/$ink-faint` → `$font-size-xs/$ink-soft`
    - `as-insight-card__sc-fold-tx`（「查看/收起条件化预判」入口）：`22rpx/$ink-mute` → `$font-size-xs/$ink-soft`
    - `as-insight-card__sc-miss`（「未命中」中性标签）：`20rpx/$ink-mute` → `$font-size-xs/$ink-soft`
    - `as-insight-card__sc-empty`（空态说明）：`20rpx/$ink-faint` → `$font-size-xs/$ink-soft`
  - **层级约束不变**：主信息（基准 `ph-tt`、分支方向 `dir`、预判原文 `sc-lead`/`sc-scenario`、方向色徽标、关键词 chip）仍为 `$ink`/语义色，次要灰字最深只到 `$ink-soft`，不与主信息同重。
  - 未改动：布局结构/字段顺序/文案/交互逻辑；部分语义/图标类按原样保留（header `verify--miss` 状态 pill、`sc-more-chev` 三角图标、`horizon-name` 蓝底色块、`sc-live` 白字实心徽）。
  - 全部色值/字号使用 `src/shared/styles/variables.scss` 变量，无硬编码。

### 影响面

- 因改进落在**基线类**，所有使用方（`sentence` 与 `tags` 两种形态）一并生效：
  - 直接调用 `ConditionalForecastBlock`：`src/modules/market/pages/sector-loop.vue`（板块四环，`display-mode="conclusion"`，tags）
  - 经 `InsightCard` structured 形态（tags）：`src/shared/components/InsightCard.vue`、`src/shared/components/SectorInsightCard.vue`（板块四环/详情）、`src/modules/favorites/pages/detail.vue`、`src/modules/favorites/pages/insight-detail.vue`、`src/modules/rhythm/pages/index.vue`（节奏大师）、`src/modules/fear-greed/pages/index.vue`、`src/modules/analytics/pages/trend-score-detail.vue`、`src/modules/analytics/pages/report-detail.vue`、`src/modules/chat/event/components/AiEventReport.vue`、`src/shared/components/NotificationInsightModal.vue` 等
  - 经 `MarketTracePrediction`（`condition-display="sentence"`）：`src/modules/analytics/pages/prediction-detail.vue`（大盘预测详情页）、`src/modules/analytics/components/MarketInsightCard.vue`（市场洞见展开，`src/modules/analytics/pages/traceability.vue` 使用）
- 均为纯样式（字号/颜色）变更，不涉及 props/API/交互，调用方零改动。

### 验证

- `node ./node_modules/vue-tsc/bin/vue-tsc.js --noEmit`：EXITCODE=0。
- `node ./node_modules/vitest/vitest.mjs run src/shared/components/ConditionalForecastBlock.mount.spec.ts src/modules/analytics/components/MarketTracePrediction.mount.spec.ts src/modules/analytics/pages/traceability.mount.spec.ts`：3 files / 19 tests passed。
- `npm run test:node`：`期望基线 284/284/0，实际 284/284/0`（`ConditionalForecastBlock.spec.ts` 源码锚定护栏未断言 `--detail` 修饰类或字号/颜色，故无需同步断言）。

## 2026-10-11 — 早点听晨报头条卡片版式调整

### 变更文件

- `src/pages-sub-app/briefing/index.vue`（头条卡片，仅晨报展示）
  - 蓝色小标签由静态文案「今日头条」改为**报告标题**（`headlineItem.title`，如「晨间市场展望」）
  - 结论 `headlineItem.conclusion` 由原灰色小字行**升为大标题位**（`.headline-title`，34rpx/700 墨色）
  - 删除原灰色小字行与已无引用的 `.headline-conclusion` 样式（卡片不再有灰色小字）；★ 与 `relatedTags` 标签行保持不变

### 验证

- `vue-tsc --noEmit`：EXITCODE=0。
- `npm run test:node`：实际 284/284/0，与仓库基线一致（无 spec 断言该卡片文案/类名，无需同步断言）。

## 2026-10-11 — 风口两档默认改短线 + 首页风口洞见卡改短线口径

### 变更文件

- `src/modules/market/pages/leaders.vue`
  - 两档切换项顺序调整：`CYCLE_OPTIONS` 由「长线风口榜 → 短线风口榜」改为「短线风口榜 → 长线风口榜」（仅展示顺序，取数与分档过滤逻辑未动）。
  - 默认档位由长线改为短线：`activeCycle` 初值 `'long'` → `'short'`，首屏即渲染短线风口数据（泡泡图标题/空态文案本已随 `activeCycle` 变化，自洽）。
  - 加载失败文案去档位指向：`'长线风口数据加载失败'` → `'风口数据加载失败'`（该加载同时服务两档，非长线专属）。
- `src/modules/home/components/MorningContent.vue`
  - 「风口洞见」卡改为真正的短线口径：`loadLeaderSectors` 改取 `getWindLeaders(20)`（控制器上限，确保排在长线榜之后的短线榜板块也在列），再按后端短线榜口径 `cycle ∈ short/both` + `freq20` 降序（同值按 `short_heat` 降序）重建排序取前 3。
  - 修正上一版错误：`getWindLeaders(8)` 返回的只是双榜合并数组（`applyDualRankings`）的前 8 项 = 长线榜，在其上做 `cycle` 过滤实为「既长又短」的子集，并非短线榜前 3。
  - `extractSectorPreview` 不再按 `score` 重排（改为保留调用方传入的榜单顺序）；相关注释与错误日志文案由「长线风口」改为「短线风口」。
- `src/modules/market/AGENTS.md` — `pages/leaders.vue` 条目同步为「短线风口榜在前、长线在后 + 默认展示短线档」。
- `src/modules/home/AGENTS.md` — 功能范围中「长线风口预览」同步为「短线风口预览」并注明 `cycle` short/both 口径。

### 验证

- `npx vue-tsc --noEmit`：EXITCODE=0，无本次改动引入的类型错误。
- `npx vitest run tests/WindLeaderBubble.test.ts`：14 passed。
- `npm run test:node`：实际 284/284/0，与仓库基线 `EXPECTED_BASELINE=284/284/0` 一致（未因本次改动漂移；相关 node:test spec 为 `MorningContent.spec.ts`，未断言档位顺序/默认档/取数口径，无需同步断言）。
