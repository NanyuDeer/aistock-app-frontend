# 待提交修改（aistock-app-frontend）

## 2026-10-13 — AI帮我选按涨跌幅降序 + 未登录自选股洞察示例数据

### 变更文件

- `src/modules/home/components/AiPickContent.vue`（「选股」Tab · AI帮我选）
  - 新增 `byChangePctDesc` 比较器，`recommendations` computed 末尾 `.sort(byChangePctDesc)`：列表按当日涨跌幅降序，**涨幅最大的排最前，与接口返回的 `rank` 顺序无关**。
  - 涨跌幅缺失（`changePct` 为 `null`/`undefined`，如停牌）视作 `Number.NEGATIVE_INFINITY`，**统一排到末尾**，不插进有涨跌幅的序列中间；等值保持原相对顺序（`Array.prototype.sort` 稳定）。
  - 不改字段、不改接口、不改渲染模板（行内「推荐理由 / 迷你走势图 / 自选按钮」原样）。
- `src/modules/favorites/components/AlertContent.vue`（首页「提醒」Tab · 自选股洞察块）
  - **未登录**（`useUserStore().isLoggedIn()` 为假）：`loadCaptureList()` 直接返回 3 条**示例数据**（`buildDemoCaptureList()`），**不发 `stockTraceApi.list` 请求**（匿名用户无自选股、异动链路对其无数据，请求只会拿到空数组把示例数据顶掉）。
  - `CaptureItem` 新增 `demo?: boolean`；模板 `:clickable="!!item && !item.demo"` 与 `@click="item && !item.demo && goTrace(...)"` —— 示例行**不可点击**（`event_id` 为空，跳异动详情必 404）。
  - 示例行日期取当日 `MM-DD`（`fmtDateMMDD(new Date().toISOString())`），保证与真实行同款展示（`主因 · MM-DD`）。
  - 登录态切换的 `watch(useUserStore().token)` 补上 `loadCaptureList()`（原先只重载个股情报）：登出后回到示例数据、登录后立即换成真实异动。
  - 已登录路径**完全未动**（`list(20)` → `isUnattributableMovement` 过滤 → `dedupeDailyMovements` 聚合 → 倒序）。

### 影响面

- AI帮我选排序：仅影响该列表渲染顺序，纯前端派生，调用方与接口零改动。
- 自选股洞察示例数据：仅未登录分支新增；已登录用户的首页洞察块行为与改动前逐字节一致。

### 验证

- `node ./node_modules/vue-tsc/bin/vue-tsc.js --noEmit`：EXITCODE=0。
- `node ./node_modules/vitest/vitest.mjs run src/modules/home/components/AiPickContent.mount.spec.ts src/modules/favorites/components/AlertContent.spec.ts`：2 files / **16 tests passed**。
  - 新增 4 例：涨跌幅降序（与返回顺序无关）/ 缺失值排末尾 / 未登录渲染 3 条示例且不请求接口 / 示例行不可点击不跳转。
  - AlertContent spec 的 `useUserStore` 改为桩（`isLoggedIn` 可切换，默认已登录）；`ListCell` 桩补 `:data-clickable` 供断言。
- `npm run test:node`：`期望基线 284/284/0，实际 284/284/0`（AI帮我选排序与首页示例数据均未被源码锚定护栏断言）。

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
