# changelog-pending.md（待提交修改记录）

## 本批外部记录（2026-09-21 节奏大师：时点自动展示 + 生成时刻显示 + 事件日历放开 5 日）

> 随 `changer` 提交（PR #136）。此段仅供本地留痕。

- 范围：仅 `aistock-app-frontend` 改动（8 源文件/测试 + rhythm/AGENTS.md + CHANGELOG）；`aistock-frontend`（web）无对等组件、app-api 不消费 event_window → 无需同步；agent-py 配套改动单独提交（CHANGELOG 另条记录）。
- 判定表 `pickSlotByClock()`（UTC+8 固定）：<8:30→after_close、8:30-12:30→morning、12:30-16:05→midday、≥16:05→after_close；onLoad 一次 + onShow 跨时段重判定（不轮询）；目标 slot 缺失回退 SLOT_ORDER 就近（B6）。
- 洞见卡时间 `MM-DD · HH:MM`（日期=targetDate、时分=created_at 上海时区；createdAt 缺省/非法回退 slot 标签）——B7/B8：toRhythmInsight 增 createdAt 第 4 参。
- 观感/口径（分歧未物理消除，approved）：锚点(5日窗)与列表首条(全量)允许并存；卡片(high/medium)与面板(macro+delivery)口径不同定位不同。
- 验证：node:test 基线 252→256/256/0 一致；vue-tsc 通过；H5 模块编译 200（修复 `<script setup>` 误 export 的 500）。

## 2026-09-19 板块溯源/预判三处修复（① 溯源雷同、④ 去掉「待验证」、⑤ 溯源小卡对齐洞见卡）

- **① 修「所有板块详情的溯源都是同一句大盘结论」**：`SectorInsightCard.traceStructured` 的渲染判据改为**真正入链**（有 `relation` 或该板块 `driver` 非空）。根因：`buildMarketLink` 在**未命中链节点时仍填 `chain.root.summary`**，而 2026-09-18 的链只覆盖 2 个板块（汽车芯片/国家大基金持股）→ 其余所有板块都显示同一句大盘结论。未入链 → 回退该板块自己的溯源文本（无则整块不渲染）。
- **④ 板块详情不再显示「待验证」pill**：`sectorPredictionToStructured` 只保留 `hit/miss`，`pending`（含"到期后仍在验证窗口内"）归一 `null` → CFB 头部 pill 消失；折叠态由 `met` 驱动，不依赖该字段，故折叠/未命中标签不受影响。
- **⑤ 板块预判页溯源小卡对齐洞见卡**：`.sl-trace*` 样式对齐组件库 `InsightCard` 溯源块（`__line--trace`）——冷雾蓝底 `#f4f8fe` + 描边 `#dce7f8` + `$r-md` 圆角 + `16rpx 20rpx` 内边距，key `$font-size-sm`/700/字距 2rpx/`#4a6fbf`，正文 `$font-size-sm`/`#5e6673`。**按组长口径只改溯源小卡样式，不换整行**——涨跌、来源 tag、预判概要 pill、依据详情入口与展开体全部保留。
- **② 到期仍「待验证」：不改（组长裁定）**。口径澄清：验证窗口 = **[到期日, 到期+3 交易日]**，**到期 ≠ 出结论**（9-11 的 short 档 due=9-18 → 结论最早 9-23 产出）；生产日志 `prediction_validate_wait_window`（9-18 16:01，id 138/136/7/5/4）为该口径的直接佐证。
- **测试**：`npx vue-tsc --noEmit` **0 错误**；全量 `npx vitest run` → **476 passed / 4 failed**（4 条为无关存量红，**零新增**）。
- **跨端**：仅改 `aistock-app-frontend`（2 源文件 + 2 份 AGENTS.md + 本记录）；web 端 `aistock-frontend` 无此页面 → 无需同步；app-api / agent-py 本轮无改动（③ 的后端改动在 agent-py 侧单独立项）。

## 2026-09-19 「大盘归因链」更名「今日驱动板块」+ 视觉改向洞见卡（方案 E）

- **背景（组长先看三版 mockup 后裁定）**：组长认为原卡「样式需要改一改」，并要求**参考洞见卡片设计**；先出的三版（现状分层色块 / 主轴时间线 / 分支独立灰块）均不满意，第四轮按洞见卡语言出了 D/E/F 三版，**选定方案 E**；同时裁定**改名**（"毕竟和板块更相关"）→ 选定 **「今日驱动板块」**。
- **改动（`src/shared/components/AttributionChainView.vue`，模板 + 样式重写，脚本逻辑 0 改动）**：
  | 项 | 前 | 后 |
  |---|---|---|
  | 标题 | 大盘归因链 | **今日驱动板块** |
  | 大盘行 | `$bg-soft` 浅底圆角卡（tag「大盘」+ 一句话 + 涨跌） | **洞见卡行**：key「大盘」+ 涨跌 + **归因结论另起一行**（与板块分支同构）；「大盘」二字比板块名**更显眼**（**同取 `$primary` 品牌蓝**，靠字号 + 字重区分：大盘 `$font-size-md` 28rpx / 700；板块名 `$font-size-sm` 24rpx / 600），同行指数涨跌**右对齐** |
| 板块分支 | relation 徽 + 板块名 + 涨跌；驱动句 = `$primary-50` **浅蓝底块** | **洞见卡行**：key = 板块名（加粗彩色，撑满左侧）+ 涨跌 + relation 徽；结论正文无底色 |
  | 行分隔 | 分支间 2rpx 实线 | **渐变分隔线**（与 InsightCard 同款 `linear-gradient(90deg, $primary-100, rgba($primary-100,0))`） |
  | 展开入口 | 「溯源过程 ▾」 | **「依据详情 ▾」**（对齐洞见卡文案） |
  | 关系徽类名 | `.acv-badge` | `.acv-rel`（`.rel-self_driven` / `.rel-unknown` 修饰保留） |
- **为什么去掉底色块**：4 个分支就是 4 个同重量的浅蓝块，视觉权重均等 → **看不出哪个板块是主因**；改后整卡只有「加粗彩色 key + 灰正文」两级，靠 `需要` 层级而非色块区分。
- **逻辑与判别口径零改动**（逐项保留）：R16 弱依据标记、R17「未确认驱动原因」过滤、只渲染「中台」来源事件、`sectorStages` 3 段展开（触发/传导/结果）、按 |pct| 降序、空链空态、`mock` 演示数据。仅文案同步：空态「当日无驱动板块（无板块驱动异动或尚未生成）」、加载中「驱动板块加载中…」。
- **同轮复审（组长看完第一版后的两条裁定）**：① **大盘行的归因结论改为另起一行**（与板块分支同构，不再同行）；② **「大盘」二字比板块名更显眼**（**同取品牌蓝**，靠「字号 `$font-size-md` 28rpx + 字重 700」区分；首版误改为 `$ink` 墨色，组长裁定**颜色仍用蓝色**）；③ **大盘行的指数涨跌右对齐**（`justify-content: space-between`）。
- **文案统一（组长裁定）**：`src/modules/market/pages/sector-loop.vue`（板块预判页四环行）同一展开入口也由「溯源过程」改为「依据详情」——**全站洞见类展开入口文案至此统一**（链卡 / 四环行 / 板块详情 / 市场洞见主因卡）。
- **测试**：`AttributionChainView.mount.spec.ts` 断言「溯源过程」→「依据详情」（2 处）+ 用例名/注释同步；`.acv-sec`（板块名）与 `.acv-driver`（结论句）**类名保留**，故其余断言零改动。`npx vue-tsc --noEmit` **0 错误**；定向 3 spec **56 passed**；全量 `npx vitest run` → **476 passed / 4 failed**（4 条为无关存量红，零新增）。
- **组件名/API 未改**：`AttributionChainView` / `fetchAttributionChain` / `/api/agent/attribution-chain` 全部保留（仅用户可见标题与文档表述改为「今日驱动板块」），避免跨仓契约变更。
- **跨端**：仅改 `aistock-app-frontend`（1 源文件 + 1 测试文件 + 页面注释 + 2 份 AGENTS.md + 本记录）；`aistock-frontend`（web）无该页面 → 无需同步；app-api / agent-py / 组件库 0 改动。

## 2026-09-18 晚 大盘归因链：隐藏「检索」来源新闻条 + 撤掉「看该板块预判 →」入口

- **背景（组长两项裁定）**：
  1. **隐藏检索的新闻条**——链上事件胶囊按来源打标（`warehouse`→「中台」/ `search`→「检索」），检索那批是**板块定向检索补漏**，多为行情综述/研报观点/栏目碎片，属于反复要求挡在链外的噪声 → 链上只展示「中台」来源。
  2. **撤掉预判入口**——上一轮把「看该板块预判 →」从被删区块迁到了每个链分支；组长裁定链分支**不挂预判入口**（预判改由板块详情页/风口页进入），分支只留溯源侧。
- **改动**：
  | 文件 | 改动 |
  |---|---|
  | `src/shared/components/AttributionChainView.vue` | ① 新增 `warehouseEvents(c)` 过滤（只留 `source === 'warehouse'`），模板事件区改用它、`v-if` 以过滤后长度判断 → **全被滤掉则整区不渲染（不占位）**；补 `AttributionChainEvent` 类型 import（`vue-tsc` TS2532 根因：类型名未导入致返回值退化为可能 undefined）。② 删除 `.acv-forecast` 模板块 + `selectSector()` + `defineEmits(['select-sector'])` + `.acv-forecast*` 样式 + 一条失效注释 |
  | `src/modules/analytics/pages/traceability.vue` | 去掉模板 `@select-sector="goSectorDetail"`、删除 `goSectorDetail` 函数、更新两处注释（区块能力去向改为"同日撤掉（链分支不挂预判入口）"、链视图注释加"只展示「中台」来源事件"） |
  | `src/shared/components/AttributionChainView.mount.spec.ts` | 原「分支预判入口」describe（4 例）**替换**为：1 例「不挂预判入口」（`.acv-forecast` 不存在 + 文本不含"看该板块预判" + `emitted('select-sector')` 为 undefined）+ 3 例「隐藏检索来源新闻条」（中台保留/检索不渲染；全检索 → 事件区不渲染且分支其余照常；空数组 → 不渲染）；`withEvents` 形参类型改为 `AttributionChainEvent[]` |
  | `src/shared/components/EventRefChip.mount.spec.ts` | 「AttributionChainView 分支事件胶囊」里"渲染 2 条（中台+检索）"改为"**只渲染中台 1 条**"（旧断言随裁定作废）；文件头注释同步 |
  | `src/modules/analytics/pages/traceability.mount.spec.ts` | 删除「链分支『看该板块预判』→ select-sector」用例；mock 桩去掉 `emits: ['select-sector']`；文件头注释更新 |
  | `AGENTS.md` + `src/modules/analytics/AGENTS.md` | `AttributionChainView` / `EventRefChip` / `traceability` 三行同步两项裁定；顺带修正 traceability 护栏例数（10 → 9） |
- **未动（有意保留）**：链分支「溯源过程 ▾」展开、`sectorStages` prop、`chain-foot` 行（弱标记 + 全部板块 ›）、`isUnconfirmedAttribution` 过滤、事件胶囊组件本身（`EventRefChip` 两来源标记能力保留，其它接入点不受影响）。
- **验收**：`npx vue-tsc --noEmit` **exit 0（0 错误）**；三个 spec（AttributionChainView 37 + EventRefChip 10 + traceability 9 = **56 passed**）；全量 `npx vitest run` → **476 passed / 4 failed**，4 条红均为**本次无关**的存量红（`AnalyticsCardLayout` 1 + `insight-detail` 1 + `AlertContent` 2），**零新增**（另有 `CardRenderer.spec.ts` 套件级失败：`KLineChart.vue` 的 `<script setup>` 与 `<script module="chartView" lang="renderjs">` 编译冲突，**HEAD 存量**，本次未改该文件）。
- **跨端**：仅改 `aistock-app-frontend`（3 源文件 + 3 测试文件 + 2 份 AGENTS.md + 本记录）；`aistock-frontend`（web）无该页面/该组件 → **无需同步**；app-api / agent-py / 组件库 0 改动（纯展示端过滤与入口裁撤，接口契约未变）。

## 2026-09-18 板块原因链前端展示：3 字段（触发/传导/结果）可展开，三处同源

- **背景（组长裁定）**：板块溯源本身就是一条原因链（后端 **4 段** `现象→触发→传导→影响`，已由 app-api `24b53a5` 加性透出为 `trace.stages`），但前端一个字段都没显示。要求：**和大盘主因链一样只显示 3 个字段（触发、传导、结果）**，且**市场洞见 + 板块详情/板块预判页都能展开**。
- **关键发现（省掉一半工作）**：组件库 `InsightCard` 的 `traceStructured.stages` 槽位**早就实现**（注释写着"板块自身链阶段…本期仅预留渲染，无数据不渲染"），折叠入口「依据详情 ▾」+ `阶段名 | 文本` 两列渲染全都现成 —— **只是没人喂数据**。
- **改动**：
  | 文件 | 改动 |
  |---|---|
  | `src/shared/utils/sectorInsight.ts` | 新增 `toReasonStages(stages)` + `ReasonStageRow`：4 段 → **3 段**（触发/传导/结果←`impact`，**丢弃 `phenomenon`**），**保源序**、段名未知或 headline 空白跳过、全空返回 `[]`。**映射口径单点**，三处消费方共用 |
  | `src/shared/api/modules/agent.ts` | `SectorInsightTraceStage` + `SectorInsightTrace.stages?`（对齐 app-api 契约） |
  | `src/shared/components/InsightCard.vue` | 新增顶层 `traceStages` prop（**优先于** `traceStructured.stages`）；原槽位只挂在结构化形态上，导致"未入链但已有板块溯源"（无 marketLink → 走文本形态）时原因链无处可放 → 提到顶层；内部 computed `traceStages` 更名 `stageRows` |
  | `src/shared/components/SectorInsightCard.vue` | 把 `toReasonStages(candidate.trace.stages)` 传 `:trace-stages` → 板块详情页**零额外改动**即获得展开能力 |
  | `src/modules/analytics/pages/traceability.vue` | **首屏拉一次 `sector-insight`** 建 `sectorStageMap`（键 = `ts_code` **与**板块名双形态，抗命名漂移），传 `:sector-stages`；失败静默空映射不阻断报告 |
  | `src/shared/components/AttributionChainView.vue` | 新增 `sectorStages` prop + 分支「溯源过程 ▾」展开（键三级降级 `ts_code → sector_std → 原始名`，按分支独立展开态）；样式与 `InsightCard` 依据详情同款（右对齐入口 + 三角箭头翻转 + 阶段名两列 + 虚线分隔） |
  | `src/modules/market/pages/sector-loop.vue` | 行内新增同款「溯源过程 ▾」展开（`toReasonStages` 同源），复用现有行 UI，不改列表结构 |
- **交互分工（明确边界）**：链分支/四环行**只展开过程**，标题与驱动句仍是入口（板块详情页看完整预判）；`溯源过程` 与 `看该板块预判 →` 并列，溯源/预判两轨分离不变。
- **测试**：`AttributionChainView.mount.spec.ts` **+4 例**（无数据不出入口 / 展开显示 3 段并可收起 / 键三级降级 / 展开态按分支独立）；`traceability.mount.spec.ts` 原"**不再请求 sector-insight**"负向护栏**改为正向**（首屏恰 1 次、只为原因链）+ **+2 例**（双键索引且现象段被丢弃保源序 / 接口失败静默空映射）。**两个 spec 47 passed**。
- **验收**：`npx vue-tsc --noEmit` **TSC_OK**；全量 `npx vitest run` → **477 passed / 4 failed**（4 条为**本次无关**的存量红：`AnalyticsCardLayout` 1 + `insight-detail` 1 + `AlertContent` 2；改动前基线 475 passed / 同 4 条 → **零新增失败**）。
- **组件库归档（本轮**未做**，需你定）**：查证发现 ① app 的 `InsightCard.vue`（856 行）已**领先**组件库版本（800 行）——`titleTag` / `linePlacement` / `traceWord` 等 lib 都没有；② `SectorInsightCard.vue` 依赖 app 专属模块（`@/shared/api` 类型 + `@/shared/utils/sectorInsight`，后者又依赖 `expandConditionalBranches`），直接搬进 lib 会 type-check 不过，需先做依赖下沉或改成结构化 props；③ lib README 写明改动走「分支 → PR → review」流程（林晓研维护）。故**本轮未动 `aistock-component-lib`**，建议单独立项做"组件库回灌"（先把 app 领先的改动回灌，再归档 SectorInsightCard）。
- **跨端**：仅改 `aistock-app-frontend`；`aistock-frontend`（web）无该页面 → 无需同步；app-api 已在 `24b53a5` 提供 `stages`（本轮 0 改动）；agent-py 0 改动。
>>>>>>> origin/master

## 2026-09-18 市场洞见页：删除「今日影响大盘的主要板块」区块，能力并入大盘归因链

- **背景（组长裁定）**：该区块与上方「大盘归因链」**读同一份链**（页面 `fetchAttributionChain` 拉一次两处共用）、**用同一个过滤判据**（`sectorInsight.isUnconfirmedAttribution`）、**显示同一批板块**（角色徽 + 事件胶囊 + 驱动句），信息重复且同一批板块渲染两遍 → 只保留归因链。
- **改动（`src/modules/analytics/pages/traceability.vue` + `src/shared/components/AttributionChainView.vue`）**：被删区块的三个能力全部有去向，不丢功能：
  | 原能力 | 去向 |
  |---|---|
  | 「看该板块预判 →」（跳板块详情） | **迁到每个链分支**：`AttributionChainView` 新增 `defineEmits(['select-sector'])` + 每分支 `.acv-forecast` 入口；页面 `@select-sector="goSectorDetail"` 处理路由（组件只上报板块名、不持路由语义）。板块名取 `sector_std` 权威名，**空白则回退 `sector`**（脏数据不丢入口） |
  | 「归因较弱」（`root.evidence_weak`）+「全部板块 ›」（跳板块四环页） | 链视图下方新增 `chain-foot` 行（左弱标记 / 右入口），无链时不渲染 |
  | 「今日暂无可确认的驱动板块」空态 | **取消**（链树本身已过滤未确认节点，无分支即无卡，空态冗余） |
  - 同时清掉页面侧死代码：`SectorInsightCard` 引入、`SectorInsightCandidate` 类型引入、`primarySectorCandidates`、`rankedCandidates`、`loadPrimarySectorInsight`、`sectorInsight` 工具引入、watch 里的第二次请求、全部 `.primary-sector-*` 样式。
  - **页面不再请求 `agentApi.getSectorInsight`**（少一次接口往返）；该接口 `sector-loop`/`sector-detail` 仍在用，**接口与 vite proxy 均不动**。
- **测试（`src/modules/analytics/pages/traceability.mount.spec.ts` 重写 + `AttributionChainView.mount.spec.ts` 扩充）**：旧 spec 的 12 例全部断言被删区块（`.primary-sector-*` / 排序 / R14 / R16 / R17 出卡），随区块一并作废 → 重写为 8 例：旧区块彻底消失 / **不再请求 sector-insight**（负向护栏）/ 链数据仍受控传入 / 无链时 `chain-foot` 不渲染 / 有链出「全部板块 ›」且正常日无「归因较弱」/ 弱归因日出「归因较弱」/ `select-sector` → 跳板块详情（URL 编码断言）/「全部板块 ›」→ 跳四环页带展示日期。`AttributionChainView.mount.spec.ts` **+4 例**：每个渲染出的分支都有入口（被过滤分支没有）/ `sector_std` 权威名优先 / 无 `sector_std` 回退原始名 / **`sector_std` 为空白串仍回退原始名**（此例先红后绿——初版实现用 `c.sector_std || c.sector` 会让空白串吃掉入口，`trim` 判空后修正）。
- **验收**：两个 spec `npx vitest run` → **41 passed / 0 failed**；全量 `npx vitest run` → **471 passed / 4 failed**（4 条为**本次无关**的存量红：`tests/AnalyticsCardLayout.test.ts` 1 + `favorites/pages/insight-detail.spec.ts` 1 + `favorites/components/AlertContent.spec.ts` 2 + `CardRenderer.spec.ts` 套件级 `uni is not defined`，与上一版全量结果同集）；`npx vue-tsc --noEmit` **通过**。
- **遗留（未做，等指示）**：`src/shared/utils/sectorInsight.ts` 的 `buildPrimarySectorCandidates` / `rankSectorCandidatesByChain` / `rowDriverSummary` / `SectorInsightRow` 随区块移除**失去消费方**（`isUnconfirmedAttribution` / `buildMarketLink` / `findSectorCandidate` 仍在用）。本轮**保留未删**（区块若恢复可复用），仅在 docstring 标注"当前无消费方"；要清理说一声。
- **跨端**：仅改 `aistock-app-frontend`（4 源文件 + 2 测试文件 + `src/modules/analytics/AGENTS.md` + `vite.config.ts` 注释 + 本记录）；`aistock-frontend`（web）无该页面、无该工具函数 → **无需同步**；app-api / agent-py / 组件库 0 改动（接口契约未变，只是少了一个消费方）。

## 2026-09-18 「未确认驱动原因」否定词表扩表（与 agent-py 逐字对齐）

- **背景（生产实证）**：`isUnconfirmedAttribution` 的正则只有 `未确认驱动原因 | 证据不足[，,]?\s*未确认主因` 两条，而链上更常见的否定句是「**未检索到**可解释当日行情的独立触发事件」（2026-09-18 `注册制次新股` 的链摘要）。不匹配 → **两个视图都会把它出成卡**（大盘归因链树 + 今日影响大盘的主要板块），驱动句就是那句否定句本身——等于「未确认驱动原因的不放」这条口径没落实。
- **改动（`src/shared/utils/sectorInsight.ts`，单文件）**：`UNCONFIRMED_ATTRIBUTION_RE` 扩为与 agent-py `attribution_chain._NEGATIVE_SUMMARY_MARKERS`（同一晚迭代 4 引入）**逐字对齐**的 15 词：`未检索到 | 没有检索到 | 未找到 | 没有找到 | 未发现 | 没有发现 | 未确认 | 未明确 | 未识别 | 未匹配 | 无法确认 | 无法判断 | 不能确认 | 暂无 | 尚未`。原第二条 `证据不足，未确认主因` 被 `未确认` 覆盖，故删除（行为不变）。判定语义（`trace_summary` 去空白为空或命中即不展示）与两个消费方均未变，**口径单点**——改一处两个区块同时生效。
- **刻意不收（反向护栏）**：`不足 / 没有 / 缺少 / 缺乏 / 未出现`。理由：肯定归因句里的这些词不能误伤——2026-09-17 玉米的真实摘要是「未出现单一独立公告；催化来自超强厄尔尼诺供给扰动预期」，它是有内容的归因句，必须保留。
- **测试（TDD 先红后绿，`src/shared/components/AttributionChainView.mount.spec.ts`）**：**+27 例** —— 20 条 NEGATIVE（15 个否定词各 1 例 + 生产实证原句 + 空/纯空格 + `null`/`undefined`）× `isUnconfirmedAttribution === true`；6 条 POSITIVE（含「供给不足推动多晶硅价格上涨」「未出现单一独立公告；催化来自…」两个易误伤样本）× `=== false`；1 例端到端 mount（链上「未检索到…」的 child 不再渲染、`.acv-child` 只剩 1 个、页面不含「未检索到」）。**RED 取证**：`14 failed, 15 passed`（13 例 `expected true, received false` + 端到端 `toHaveLength(1)` 实际 2）→ 实现后 **GREEN 29 passed**。
- **验收**：`npx vitest run src/shared/components/AttributionChainView.mount.spec.ts src/modules/analytics/pages/traceability.mount.spec.ts` → **41 passed / 0 failed**；全量 `npx vitest run` → **471 passed / 4 failed**（4 条为**本次无关**的存量红：`tests/AnalyticsCardLayout.test.ts` 1 + `src/modules/favorites/pages/insight-detail.spec.ts` 1 + `src/modules/favorites/components/AlertContent.spec.ts` 2 + `CardRenderer.spec.ts` 套件级 `uni is not defined`；**已核对全仓只有本 spec 引用 `isUnconfirmedAttribution`**，其余 spec 不 import `sectorInsight` → 与本次改动无关联）；`npx vue-tsc --noEmit` **通过（无输出）**。
- **跨端**：仅改 `aistock-app-frontend`（1 源文件 + 1 测试文件 + `src/modules/analytics/AGENTS.md` + 本记录）。**web 前端 `aistock-frontend` 无此工具函数（全仓检索 0 命中）→ 无需同步**；agent-py / app-api / 组件库 0 改动（纯展示端过滤口径）。

## 2026-09-18 市场洞见主因区块改「以链 children 为准出卡」+ 未确认驱动原因过滤 + 板块名标签（R17）

- **问题（用户实测 2026-09-17）**：弱归因日链上有 3 个板块（CRO概念 +2.09 / 转基因 +4.04 / 玉米 +3.74，均为弱归因兜底），但 `sector-insight` 只给 1 个 `review_primary`（玉米）→ 旧实现「按候选出卡」只显示 1 张卡，用户误以为"只分析了一个板块"；且卡标题取 `candidate.trace.summary`（溯源主句）→ 卡片上看不出"这是哪个板块"。
- **出卡口径改为链优先**（`src/shared/utils/sectorInsight.ts::buildPrimarySectorCandidates(chain, candidates)`）：卡列表 = 链 `children[]` 逐个出卡，再补"候选里有、链上没有"的主因候选（链不全时信息不丢）；链上板块匹配不到候选 → 合成最小候选（`source='chain_only'`、`quote/trace/prediction=null`、`category='concept'`、`ts_code=child.ts_code`、`name=sector_std||sector`）。链↔候选匹配为 `findChainChild` 的**反向复用**（同 R14 优先级：`ts_code`（去 `.TI`）→ `sector_std` → `sector` → 归一化，`matchesChainChild` 私有函数），展示用的大盘联动仍走正向 `buildMarketLink`。排序复用 `rankSectorCandidatesByChain`（自驱动优先 → |pct| 降序，链上 pct 优先）不变。
- **类型加性扩展**（`src/shared/api/modules/agent.ts`）：新增导出 `SectorInsightSource = 'wind_leader' | 'review_primary' | 'both' | 'chain_only'`，`SectorInsightCandidate.source` 引用之。**消费方核查**：无 switch/exhaustive 判断因新值报类型错（`vue-tsc` 0 错误）；`sector-loop.vue::tagModel` 的末档 fallback（→「风口 · 主因」）仅在 chain_only 流入时才会语义不符，而 `chain_only` 只在 traceability 前端合成、sector-loop 直接消费接口原始候选 → 实际不可达，故按其"最小改动"原则未改（保留原样）。
- **未确认驱动原因过滤**（`sectorInsight.isUnconfirmedAttribution(traceSummary)` 单点口径）：驱动句去空白后为空、或命中 `/未确认驱动原因|证据不足[，,]?\s*未确认主因/` → 不展示。**不看 `events[]`**：当前 events 里常是「沪指跌0.41%…」「A股收評」这类行情综述（现象）而非驱动原因。应用到 ① 新区块卡列表（行驱动句 `rowDriverSummary`：链上驱动句优先、未入链回退候选溯源主句）② `AttributionChainView` 的 children 渲染（同一函数、同一口径）。
- **板块名标签**：`SectorInsightCard` 新增 `titleTag` 计算（仅 `traceOnly`：`sectorName` 优先、回退 `candidate.name`）→ `InsightCard` 新增可选 `titleTag` prop，渲染在标题**上方**的中性描边小标（`.as-insight-card__name-tag`，底色/文字走 `--ins-fc-bg`/`--ins-card-tx` 主题变量，刻意不用告警色/涨跌色；缺省不渲染 → 其他调用方零变化）。另：`traceOnly` 下 `inChain` 兼容"链上有驱动句但 relation=unknown"（链 only 卡无候选 trace，否则退化成"暂无板块研判"空壳）。
- **空态**：区块渲染条件由「链存在 && 有候选」改为**「链存在」**（无链仍整块不渲染，回归不变）；有链但过滤后无卡 → 中性空态一行「今日暂无可确认的驱动板块（大盘主因未确认）」（`.primary-sector-empty`），让"没归因"与"没数据"可区分。卡 `:key` 改为 `ts_code || name`（合成候选可能无 ts_code，避免重复 key）。
- **测试（先红后绿）**：`traceability.mount.spec.ts` 新增 3 条（链 3 children 中 2 个未确认 → 只出 1 卡 + 卡上板块名标签 / 链上板块不在候选中 → chain_only 仍出卡 + 名称取 `sector_std` / 全是未确认 → 区块仍渲染 + 空态文案），既有 8 条回归不变；新建 `src/shared/components/AttributionChainView.mount.spec.ts`（2 条：未确认 children 不渲染、root 不受影响）并登记 `vitest.config.ts` 的 `test.include` 白名单（node:test 基线不受影响）。红验：4 条新用例按预期失败（缺 `.as-insight-card__name-tag` / 卡数 1≠2 / 区块不存在 / 链节点未过滤）。
- 验收：`npx vue-tsc --noEmit` **0 错误**（exit 0）；`npm run test:node` `248/248/0`（exit 0，基线一致）；`npx vitest run src/modules/analytics/pages/traceability.mount.spec.ts src/shared/components/AttributionChainView.mount.spec.ts` **2 files / 14 tests passed**；`npm run test` 4 failed / 444 passed（失败文件 = `AnalyticsCardLayout.test.ts`、`favorites/AlertContent.spec.ts`、`favorites/insight-detail.spec.ts`、`chat/cards/CardRenderer.spec.ts`，与 changelog 记录的存量基线红完全一致，**零新增**）。
- 文档同步：`AGENTS.md`（`agent.ts` / `InsightCard` / `SectorInsightCard` / `AttributionChainView` 行）、`src/modules/analytics/AGENTS.md`（traceability 行）。组件库副本（`aistock-component-lib`）本次**未改**——`InsightCard.vue` 的 `titleTag` 属加性改动，需后续同步镜像（本任务只改 app-frontend）。

## 2026-09-17 溯源弱依据提示（R16 前端呈现）+ 角色徽匹配升级 ts_code/sector_std（R14，Task 10.2）

- **数据侧已就绪、前端此前未呈现**：弱归因日（`root.evidence_weak=true` + `child.extraction={source,weak:true}`）在前端有链、有卡但看不出"依据偏弱"。本次做中性、克制的弱化呈现（不引入新色系、不用告警色）。
- **类型加性扩展**（`src/shared/api/modules/attributionChain.ts`，全部可选，老数据零影响）：`AttributionChainRoot.evidence_weak?/attribution_status?`；`AttributionChainChild.extraction?: { source?: string; weak?: boolean }`（新增导出 `AttributionChainExtraction`）、`ts_code?: string | null`、`sector_std?: string | null`。
- **R14 匹配优先级升级**（`src/shared/utils/sectorInsight.ts::findChainChild`）：由「`sector` 精确 → 归一化」改为 **`ts_code` 精确（去 `.TI` 后缀比较）→ `sector_std` 精确 → `sector` 精确 → 归一化（`sector` 优先、`sector_std` 兜底）**；`buildMarketLink(chain, name, { code })` 新增第三参；`rankSectorCandidatesByChain` 传 `candidate.ts_code`，`sector-detail.vue` 传 `{ code: cur.code }`。修复"链上 `sector` 是复盘原文名、候选是 THS 权威名 → 有链但角色徽/驱动句不显示"。
- **弱标记文案单点**：新增纯函数 `extractionWeakLabel(extraction)`——`weak !== true` → `''`（不渲染）；`source === 'snapshot'` → 「无归因依据」（纯快照异动兜底、无归因理由）；其余（`candidate_claim`）→ 「依据较弱」。`SectorMarketLink` 加性扩展 `chainWeak: boolean` + `extraction: AttributionChainExtraction | null`。
- **UI（中性灰，克制）**：① 链级 —— `InsightCard` 溯源蓝卡摘要行旁「归因较弱」（`traceStructured.weak`），并沿用 `root.summary`（弱归因日的中性摘要「证据不足，未确认主因」）作一句话行；市场洞见页主因区块标题「今日影响大盘的主要板块」旁同款小标（`.primary-sector-weak`，`chainWeak`）。② 板块级 —— 溯源子卡角色徽驱动行旁「依据较弱」/「无归因依据」（`traceStructured.weakText`）与 `AttributionChainView` 板块行关系徽旁同款（`.acv-weak`）。三者均**可选渲染**：字段缺失（老数据/正常日）零标记、零变化；样式走 CSS 变量 `--ins-weak-bd/--ins-weak-tx`（light/dark 双套），未用红绿涨跌色与告警色。
- **两副本同步**：`aistock-component-lib/src/components/InsightCard.vue` 做同样改动（模板 2 处 + 接口 2 字段 + 样式 1 块 + 2 个 CSS 变量）；本次改动块两副本 `git diff` 正文各 30 行、`Compare-Object` **0 行差异**；全文件仍差 55 行 = **HEAD 已存在的允许差异**（app-only `lineStyle`/`plain-lines`，HEAD 实测 app 4 处 / 库 0 处）。`AttributionChainView.vue` 在组件库无对应文件（App 专属 wrapper），无需镜像。
- **测试（先红后绿）**：`traceability.mount.spec.ts` 新增 5 条（零弱标记回归 / `ts_code` 优先命中 / `sector_std` 次优先命中 / 弱归因日链级 + 板块级文案分流 + `root.summary` 保留）；`EventRefChip.mount.spec.ts` 新增 2 条（`AttributionChainView` 板块行弱标记：缺省与非 `true` 不渲染 / `snapshot` vs `candidate_claim` 文案）。红验：临时关闭 `findChainChild` 的 `ts_code` 分支 → `ts_code` 优先用例失败（`Cannot call text on an empty DOMWrapper`），还原后转绿。两 spec 均已在 `vitest.config.ts` `test.include` 白名单内（**未新增文件**，node:test 基线不受影响）。
- 验收：`npx vue-tsc --noEmit` exit 0（**0 错误**）；`npm run test:node` **248/248/0**（exit 0）；`npx vitest run` 5 files / 4 tests 失败（与既有基线 5 files / 4 tests 完全一致，零新增）；组件库 `npm run type-check` 仅存量 5 条（`dev/App.vue` Segmented ×4 + `AudioPlayer.vue` ×1），零新增。
- 文档同步：`AGENTS.md`（`attributionChain.ts` / `InsightCard` / `SectorInsightCard` / `AttributionChainView` 行）、`src/modules/analytics/AGENTS.md`（traceability 行）、`src/modules/market/AGENTS.md`（归因链类型消费方，顺带修正 sector-detail「待接入」陈旧表述）。

## 2026-09-17 到期未触发（condition_met=false）口径复核 + CFB mount 用例（Task 6.1）

- **结论：组件无需改动**（后端 Task 6.1 起到期对未触发条件写 `condition_met=false`）。CFB 的折叠/过滤/「未命中」
  标签一律按「当期有无已成立分支（`met === true`）」收口——与 met 是 `false` 还是**缺省**无关 → `false` 落库后
  仍是**折叠态 + 「未命中」**（需卡级 `verification === 'miss'`），**不会**落到空态文案「条件未成立 · 暂无已验证结论」
  （该文案仅在无任何分支可渲染时出现，折叠态优先 —— 2026-09-17 既有决议）。`resolveDisplayMode`/`hasMetData`
  在生产已无调用方（仅导出待用），故不存在旧口径"false 触发结论模式却无 true 分支 → 大面积空态"的风险。
- 测试：`src/shared/components/ConditionalForecastBlock.mount.spec.ts` 新增 1 例（`met:false` ×2 + `verification=miss`
  → 折叠入口存在 + 「未命中」+ 分支节点 0 + 全文不含空态文案）→ **6/6 通过**（vitest）。
- 两副本一致性：`ConditionalForecastBlock.vue` 本次**未改动**；库/App 差异仍仅限允许项（App `import selectVisibleConditions`
  vs 库内联 + 内联 `hasMetData`/`resolveDisplayMode`），SHA256 不等属预期（`Compare-Object` 复核差异行即该段）。
- 验收：`npx vue-tsc --noEmit` exit 0；`npm run test:node` **248/248/0**（基线一致）；`npx vitest run
  src/shared/components/ConditionalForecastBlock.mount.spec.ts src/modules/analytics src/modules/market` **3 files / 14 tests passed**。

## 2026-09-17 市场洞见主因区块改造（今日影响大盘的主要板块）+ 链数据提升 + 链树事件胶囊（P3' Task 4.1/4.2）

- 「主因板块 · 板块研判」→「**今日影响大盘的主要板块**」（spec §7.1）：区块 `v-if` 由「有主因候选」改为「**链存在 && 有候选**」（无链整块隐藏、不占位）；卡列表改按 `rankSectorCandidatesByChain` 排序（自驱动优先 → |pct| 降序，pct 取链上该板块 pct，未入链排末尾；同组同 |pct| 保持原序）。
- 链数据提升到页面（Task 4.1 Step 1）：`traceability.vue` 持 `chain`/`chainLoading` ref，`watch(displayedDate)` 并行 `fetchAttributionChain(date)` + `agentApi.getSectorInsight(date)`；`AttributionChainView` 改受控 props（`chain`/`loading`/`mock`，移除组件内 fetch + onMounted/watch，保留空态/加载态与 `mock` 内置演示分支——仓库内无 mock 调用方，仅演示用）。
- 两轨分离（Task 4.1 Step 3）：`SectorInsightCard` 新增 `traceOnly`（默认 false）→ 传给 InsightCard 的 `structured` 恒 null（不渲染 CFB 预判子卡）、标题不回退预判综述（取 `candidate.trace.summary`）；主因卡传 `:market-link`（含 `events`）与 `:sector-name`，保留「依据详情 ▾」与「看该板块预判 →」。
- 命名口径（Task 4.1 Step 3）：`buildMarketLink` 原为 `children[].sector === name` 精确匹配，而链上 `sector` 是复盘报告原始名、候选 `name` 是 `resolveBoardName` 后的权威名 → 新增 `normalizeSectorName`（与 app-api `ThsBoardService.normName` 同口径：去空白/括号 + 去 概念/板块/行业/产业链 后缀 + 小写）与 `findChainChild`（精确 → 归一化；**不做包含匹配**，避免「半导体」误连「半导体材料」）；`SectorMarketLink` 加性扩展 `pct`/`events`。
- 链树事件胶囊（Task 4.2）：新建 `shared/components/EventRefChip.vue`（纯 UI：来源标记 中台/检索 + 摘要单行省略；`eventRef` 为 http(s) URL 才可点，emit `select(url)`，跳转由 wrapper 侧执行）；接入 `AttributionChainView`（每分支 `events`）与 `InsightCard`（`traceStructured.events` 加性扩展，空则不渲染该区，胶囊点击 emit `eventSelect`）；`SectorInsightCard` 接 `@event-select` → H5 `window.open` / App+小程序 webview 承载页（`pages-sub-app/webview/index?url=`）。两副本（`EventRefChip.vue` / `InsightCard.vue`）与组件库 SHA256 相等（`Compare-Object` 无输出）。
- 测试（先红后绿）：新增 `src/modules/analytics/pages/traceability.mount.spec.ts`（5 条：无链不渲染区块 / 自驱动优先排序 / 角色徽 / 主因卡无 `.as-insight-card__sc` / 事件胶囊条数）与 `src/shared/components/EventRefChip.mount.spec.ts`（8 条：来源文案区分 / URL 可点 emit / 非 URL 不可点 / InsightCard 空与有值 / `eventSelect` / 链视图空与有值）；两文件已登记 `vitest.config.ts` 的 `test.include` 白名单（`tests/run-node-specs.mjs` 未改，node:test 基线保持 `248/248/0`）。
- 验收：`npx vue-tsc --noEmit` **0 错误**（exit 0）；`npm run test:node` `248/248/0`（exit 0）；`npx vitest run src/modules/analytics src/modules/market` 2 files / 8 tests passed（exit 0）；`npx vitest run src/shared/components` 7 files / 35 tests passed + 1 套件存量失败（`NotificationDropdown.spec.ts`：`KLineChart.vue` 的 `<script setup lang="ts">` 与 `<script module="chartView" lang="renderjs">` 编译冲突，HEAD 的 barrel 已导出 KLineChart，非本次引入，未改该文件）；组件库 `npm run type-check` 仅存量 5 条（`dev/App.vue` Segmented ×4 + `AudioPlayer.vue` ×1）。
- 文档同步：`AGENTS.md`（InsightCard / SectorInsightCard / AttributionChainView 行 + 新增 EventRefChip 行）、`src/modules/analytics/AGENTS.md`（traceability 行）。

## 2026-09-17 CFB 折叠/过滤按 displayMode 收口（修复节奏大师洞见卡零分支）+ sentence 空态文案还原 + 新增 mount 三态护栏

- 问题（复审必须项 A）：上一轮「三态判定改按已成立分支」后 `displayMode` prop 完全不再驱动 UI，折叠对所有调用方生效 → **节奏大师洞见卡**（`src/modules/rhythm/pages/index.vue:20-27` 未传 `display-mode` → 默认 `full`；其 structured 只有 conditions、无 horizons → `activeBase` 恒空；`met` 恒 null）100% 折叠，卡内只剩一行入口、核心分支内容默认不可见。
- 修正（CFB 两副本，最小改动）：① `isFoldedUnmet` 前置 `props.displayMode === 'conclusion'`；② `renderedConditions` 前置 `if (props.displayMode !== 'conclusion') return inHorizonConditions.value`（恢复改造前 full 全量行为）；③ `showHiddenBranchLabel` 与 `showMissTag` 同样以 `displayMode === 'conclusion'` 收口（「另有 N 条条件未成立」与「未命中」标签只在结论模式出现）；④ `litConditions = selectVisibleConditions(inHorizonConditions, 'conclusion')` 口径不变，`resolveDisplayMode` / `hasMetData` 仍保留（无消费方，函数与单测保留）；`displayMode` prop 的 JSDoc 同步改为「折叠/过滤/隐藏标注/未命中标签一律以此收口」。
- 行为分档：`full`（rhythm / 未传 display-mode）→ 全量分支 + 既有 pill/空态（与改造前一致，无折叠入口）；`conclusion`（sector-detail / sector-loop / traceability）→ 三态不变（未触发折叠 / 只显已触发 / 到期未触发 + 入口行「未命中」且抑制头部同义 pill）。
- 空态文案还原（附带项 B）：模板三元改回 `conditionDisplay === 'sentence' ? '该期暂无细分情景' : '条件未成立 · 暂无已验证结论'`（sentence 恢复改造前原文案）；`ConditionalForecastBlock.spec.ts` 中该串断言同步改锚定整个三元表达式，**用例数不变（仍 3 条）**。
- 新增挂载护栏（附带项 C）：`src/shared/components/ConditionalForecastBlock.mount.spec.ts`（vitest + happy-dom，5 条）——① conclusion + 全无 met → 有折叠入口且分支节点 0；② 点开入口 → 分支节点 == 该档 conditions 数；③ conclusion + 一条 `met:true` → 「条件成立」徽 + 无折叠入口 + 「另有 1 条条件未成立」；④ `verification:'miss'` + 折叠态 → 「未命中」且头部 `.as-insight-card__verify` 不渲染；⑤ full / 不传 display-mode → 分支节点 == conditions 数且无折叠入口（A 的回归护栏，反向变异实测可捕获）。新文件已登记进 `vitest.config.ts` 的 `test.include` 白名单（`tests/run-node-specs.mjs` 未改，node:test 计数保持 `248/248/0`）。
- 验收：`npx vue-tsc --noEmit` **0 错误**（exit 0）；`npm run test:node` `248/248/0`（exit 0）；`node --import tsx --test src/shared/components/ConditionalForecastBlock.spec.ts src/shared/utils/conditionalForecast.spec.ts` 11/11 passed；`npx vitest run src/shared/components/ConditionalForecastBlock.mount.spec.ts src/modules/analytics src/modules/market src/modules/rhythm src/modules/fear-greed` 6 files / 47 tests passed（exit 0，无存量红）；组件库 `npm run type-check` 仅存量 5 条（`dev/App.vue` Segmented ×4 + `AudioPlayer.vue` ×1）。两副本 `Compare-Object` 差异仍仅内联 helper 定义块（库 233-257，25 行）↔ App import 行（161 行 + 空行），切除后逐行相等；`InsightCard.vue` 两副本一致。
- 文档同步：`AGENTS.md`（CFB 行）、`src/modules/analytics/AGENTS.md`（traceability 行）。

## 2026-09-17 CFB 折叠态判定修正（按已成立分支 lit 判，不再依赖降级模式）+ 未命中标签去重

- 问题（用户报障）：折叠态判定挂在 `resolvedDisplayMode === 'conclusion'`（= 当期含布尔 `met`），而后端按决策 D1 只写 `condition_met=true`、不写 false → 未触发档没有任何布尔 `met` → `hasMetData` 为假 → `resolveDisplayMode` 降级 `full` → 分支渲染源返回全部分支 → **折叠态在真实数据下不可达**。
- 修正（CFB 两副本）：三态判定改为按「当期有无已成立分支」——① `folded = conditionDisplay !== 'sentence' && lit.length === 0 && inHorizon.length > 0`（`lit` = 当期 `met===true`，取 `selectVisibleConditions(inHorizon, 'conclusion')`；`inHorizon.length > 0` 守卫避免「该档无条件分支」时渲染出点开后空无一物的入口）→ 只显基准行 + 折叠入口「查看条件化预判 ▾ / 收起条件化预判 ▴」（本地展开后铺开该档全部分支）；② 已触发（`lit.length > 0`）只渲染 `lit` 分支 + 分支区末尾「另有 N 条条件未成立」（N = `inHorizon − lit`，仅 N>0）；③ `sentence` 形态不折叠、不过滤，维持整句原文直显。
- 去重：folded 且 `verification === 'miss'` → 头部同义 pill「验证未中」由 `verifyText` 抑制，只保留入口行「未命中」标签；`pending`/`hit`/未折叠的 `miss` 保持既有 pill 行为不变。
- 取值：空态文案「条件未成立 · 暂无已验证结论」在 tags 形态下不再出现（由折叠态承接）；最终保留在模板三元里仅由 `sentence` 形态命中（该档无基准行且无分支时）。
- `resolveDisplayMode` / `hasMetData` 在组件内已无消费方：`src/shared/utils/conditionalForecast.ts` 函数与 8 条单测保留（供后续使用），App 侧 import 收窄为 `selectVisibleConditions`；CFB 的 `displayMode` prop 保留但不再驱动 UI。
- spec：`src/shared/components/ConditionalForecastBlock.spec.ts` **用例数不变（仍 3 条）**，仅加/改断言——锚定 `litConditions`（`selectVisibleConditions(inHorizonConditions.value, 'conclusion')`、`litConditions.value.length === 0`、`if (!isFoldedUnmet.value) return litConditions.value`）+ `doesNotMatch(/resolvedDisplayMode/)` 防回归 + miss pill 抑制表达式；`tests/run-node-specs.mjs` 基线维持 `248/248/0`（未改常量）。
- 验收：`npx vue-tsc --noEmit` **0 错误**（exit 0）；`npm run test:node` `248/248/0`（exit 0）；`npx vitest run src/modules/analytics src/modules/market src/modules/fear-greed` 5 files / 42 tests passed（exit 0）；组件库 `npm run type-check` 仅存量 5 条（`dev/App.vue` Segmented ×4 + `AudioPlayer.vue` ×1）；两副本 `Compare-Object` 差异仅 helper 定义块（库 25 行）↔ App import 行（1 行 + 空行），InsightCard 两副本无输出。
- 文档同步：`AGENTS.md`（CFB 行）、`src/modules/analytics/AGENTS.md`（traceability 行）。

## 2026-09-17 洞见卡未触发折叠态（查看条件化预判）+ 未命中标签 + 隐藏分支标注 + 市场洞见主因卡预判入口

- CFB（两副本）：**未触发折叠态**——当前档无 `met === true` 分支、且 `conclusion` 实际生效、且 tags 形态 → 分支区不铺开，收为一行入口「查看条件化预判 ▾」/「收起条件化预判 ▴」（本地展开，切期段归零）；展开后铺开该档**全部**条件分支（沿用既有分支渲染与样式）。基准行（方向 + 基准 · label + 置信 + 剩余窗口）照常显示。
- 取值口径（二选一收敛，已授权）：原空态文案「条件未成立 · 暂无已验证结论」的显示场景（`conclusion` 生效 + 无已成立分支）**整体由折叠态承接，该文案在 tags 形态下不再出现**；仅保留给 `sentence` 形态的同类场景。理由：`conclusion` 生效且无已成立分支在本组件内是同一状态，两条渲染分支会给同一状态两套 UI。
- 到期未触发标签：折叠态下 `structured.verification === 'miss'`（卡级聚合验证口径；无新增后端字段、不写 `condition_met=false`）→ 入口旁显示中性灰「未命中」（沿用既有 miss 灰/中性色，不与 `hit` 实心绿混用）；`pending`/缺失不显示。
- 隐藏分支纯标注：`conclusion` 生效 + 有已成立分支（非折叠态）+ 被过滤分支数 > 0 → 分支区末尾「另有 N 条条件未成立」（N = 该档 `inHorizonConditions.length − activeConditions.length`），caption 字号中性小标签、不可点开。
- 已触发（存在 `met === true`）保持现设计：只渲染已成立分支 + `[条件成立]` 徽 + 验证标识，不折叠、不显示折叠入口。
- `src/modules/analytics/pages/traceability.vue`：「主因板块 · 板块研判」每张 `SectorInsightCard` 之后加一行「看该板块预判 →」，跳 `/modules/market/pages/sector-detail?name=<candidate.name>`（沿用项目既有 `?name=` 入参约定）；预判内容不进主因卡（溯源/预判两轨分离不变）。
- spec：`src/shared/components/ConditionalForecastBlock.spec.ts` 在既有用例体内补断言（查看/收起条件化预判、折叠判定的 `conditionDisplay !== 'sentence'` 守卫、`verification === 'miss'`、`另有 {{ hiddenConditionCount }} 条条件未成立`、`renderedConditions`/`toggleBranches`）——用例数不变（仍 3 条），`tests/run-node-specs.mjs` 基线维持 `248/248/0`。
- 连带生效（同一组件语义，无额外改动）：`market/pages/sector-loop.vue` 的 CFB（`display-mode="conclusion"` + 默认 tags）同样进入折叠态；`MarketTracePrediction` 走 `condition-display="sentence"` → 折叠逻辑不生效（保持整句原文直显）。
- 验收：`npx vue-tsc --noEmit` 0 错误（exit 0）；`npm run test:node` `248/248/0`（exit 0）；`npx vitest run src/modules/analytics src/modules/market src/modules/fear-greed` 5 files / 42 tests passed（exit 0，无存量红）；CFB 两副本 `Compare-Object` 差异仅 helper 定义块 + App 侧 import 行，InsightCard 两副本无差异。

## 2026-09-16 洞见卡结论模式（只显示已验证结论）落地

- CFB 新增 `displayMode: 'full' | 'conclusion'`（默认 `full`，向后兼容）：结论模式只渲染 `met === true` 分支，未满足分支彻底隐藏（不置灰、不提示）；该期无已成立分支时显示「条件未成立 · 暂无已验证结论」。
- 降级口径（用户裁决，Task 5b）：`resolveDisplayMode` 使 `conclusion` 仅在整块含布尔 `met` 时生效；整块无布尔 `met`（后端未回填 `condition_met`）时自动降级 `full`，避免全空态，后端回填后自然生效。
- 纯函数 `selectVisibleConditions` / `hasMetData` / `resolveDisplayMode`（`src/shared/utils/conditionalForecast.ts`）+ 8 条 node:test 单测（`conditionalForecast.spec.ts`）。
- InsightCard：新增溯源「依据详情」展开入口（`traceDetail` + `traceStructured.more`，本地展开不新增接口）+ `traceStructured.stages` 预留链式溯源 P3'（无数据不渲染）+ `displayMode` 透传 CFB；SectorInsightCard 透传 `displayMode` / `traceDetail`（缺省回退 `candidate.trace.summary`，与溯源行同句时不重复渲染入口）。
- 板块粒度接入：sector-detail / sector-loop / traceability 传 `display-mode="conclusion"`。
- 基线修复与同步：CFB 回灌 `positionAction` 仓位动作徽标至组件库、补单档守卫（`horizonSegments.length > 1`）+ `activeHorizon` `watchEffect` 校正使既有红测转绿；`tests/run-node-specs.mjs` 基线同步 `237/237/0` → `243/243/0` → `246/246/0`（实测 `246/246/0`，exit 0）。
- 覆盖缺口（不含本次范围，需另行排期）：
  - **大盘粒度**（MarketTracePrediction）分支级 `met` 恒为 `undefined`（2026-09-16 取证）→ 保持 full 渲染，待后端补齐 `conditions[].met` 后再接入 `display-mode="conclusion"`。
  - 取证证据：`src/shared/api/modules/agent.ts:213-221` `MarketTracePredictionCondition` 仅 `condition/label/scenario/anchor/keywords`，**无 `met` 字段**（对照 `agent.ts:586-599` 板块 `SectorInsightCondition.met?: boolean | null`）；`src/modules/analytics/utils/marketTraceReview.ts:314-332` `toPredictionPresentation` 不产出 `met`（同文件 170-180 `PredictionConditionPresentation` 亦无该字段）；`MarketTracePrediction.vue:145` 写死 `met: undefined`。唯一分支级 `met` 来源是板块链路（`aistock-app-api/src/core/routes/sectorInsightRouter.ts:260-300` 由 `verification[].condition_met` 按 `condition_index` 派生）；且该 `condition_met` 当前后端恒为 `null`（`aistock-agent-py/src/aistock_agent/services/prediction_validator.py:370,391`「两段判定推迟，§9-5」，agent-py 权威 schema 亦无 `met` 字段）。备选口径（**未采用**）：大盘 entry 级 `conditionStage`（`predictionHistory.ts:37-41` 读 `verification[c{i}].result`）语义是「scenario 是否命中」而非 spec §9-5「条件成立」，故不作 `met` 代理。
  - **板块页观察**：因上述恒 `null`，板块粒度在无 `met === true` 数据时同样走降级全量渲染（不再落空态）；待后端条件验证两段判定落地后自然出结论。
  - **个股粒度**：App 端无 CFB 接入点（现仅 `insight-detail-move.vue` 裸渲染 conditions 列表）→ 需先建接入点。
  - **Web 端**（`aistock-frontend`）：零等价组件（仅 `modules/event/components/AiEventReport.vue` 内联手写文本洞见卡）→ 跨端属新增工作。
- 验收（Task 8 全量回归）：App `npx vue-tsc --noEmit` **0 错误**（exit 0）；`npm run test:node` `246/246/0`（exit 0）；`npx vitest run` 4 failed / 406 passed——5 个失败文件经 A/B 回退到本计划前基线复核**全部为存量基线红**（KLineChart.vue renderjs 双 script 编译错 ×2 suite、reports.vue 布局断言、favorites AlertContent/insight-detail 断言），本次零引入；CFB 两副本差异仅 helper 定义块、InsightCard 两副本无差异。
- 终审收口（2026-09-16 全分支终审 I/L 项）：`resolvedDisplayMode` 改为按**当前期段**判定降级（新增 `inHorizonConditions` computed，`activeConditions` 改由它过滤）——消除跨档假空态：某档有布尔 `met`、另一档全为 `null/undefined` 时，切到后者不再误显「条件未成立 · 暂无已验证结论」并隐藏该档全部分支（I1）；spec 追加 2 条锚定断言（过滤必须取 `resolvedDisplayMode`；App 侧必须 import shared util，防「库→App 整文件复制」把内联灌回使 utils 变死代码）（I3/L2）；SectorInsightCard `traceDetailText` 补「与卡标题同句 → 空」，与既有「与溯源行同句 → 空」并列（L1）。验证：`npx vue-tsc --noEmit` 0 错误（exit 0）；`npm run test:node` `246/246/0`（exit 0，断言加在既有用例内，基线不变）。

## 2026-09-16 condition_met 两段判定：条件点亮中间态不再误标「已验证」（终审阻塞项 #1）

- 问题：后端两段判定第①段（到期前点亮）只写 `verification[c{i}].condition_met = true`、**不写 `result`**；`conditionStage` 旧口径「entry 存在即 verified」把中间态判成 `result: undefined`，`condBadgeText` 落到 `map[undefined] || '已验证'` → 详情页误显「已验证」+「实际 --」。
- 修复：`src/modules/analytics/utils/predictionHistory.ts` 新增 `ConditionStage` 分支 `{ kind: 'condition_met' }`（判定：entry 存在、`result == null`、`condition_met === true`），置于「有 result → verified」之前；`verified` 分支返回形状不变（向后兼容）。
- 组件：`src/modules/analytics/components/PredictionVerification.vue` 的 `condBadgeText` 对新 kind 输出「条件已成立 · 待验证」，颜色沿用既有 `badge-pending`（`condBadgeClass` 未改，fallthrough 即 pending）；「实际 X」仍只在 `kind === 'verified'` 渲染，中间态不再出现「实际 --」。
- 测试（先红后绿）：`predictionHistory.spec.ts` 新增 2 条（中间态 → `condition_met`；到期后 `condition_met` 保留 + 有 `result` → `verified`）；新增 vitest 挂载 spec `src/modules/analytics/components/PredictionVerification.spec.ts`（3 条：中间态文案+pending 色且不含「已验证」/「实际」、到期后「命中」+「实际 +5.2%」、无 c{i} 仍「待验证」），并登记进 `vitest.config.ts` 的 `test.include` 白名单（否则 vitest 静默跳过）。
- 基线同步：`tests/run-node-specs.mjs` `EXPECTED_BASELINE` `246/246/0` → `248/248/0`。
- 验收：`npx vitest run src/modules/analytics` 3/3 passed（exit 0）；`npm run test:node` `248/248/0`（exit 0）；`npx vue-tsc --noEmit` 0 错误（exit 0）；`npx vitest run` 全量为存量红（4 failed / 409 passed + 2 失败 suite，A/B 回退取证与本次改动前逐条一致）。
- 未改：`PredictionVerification` 其他状态文案/样式、后端契约、`overallStatus`（c{i} entry 本就不参与 `status=verified`）。
