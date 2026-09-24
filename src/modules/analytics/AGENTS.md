# Analytics 模块 - 洞察

## 职责

提供洞察首页、业绩预测、趋势股评分榜单与单股四维评分详情。

## 页面

- `pages/index.vue`：洞察入口与趋势评分 Top 3 预览。
- `pages/forecast.vue`：业绩预测。
- `pages/trend-score.vue`：趋势评分排行榜与本地搜索。
- `pages/trend-score-detail.vue`：单股技术面、赛道景气、消息面、基本面四维详情。
- `pages/traceability.vue`：市场洞见页（2026-08-27 改造：从完整归因报告改为简短洞察卡）。现只渲染 MarketInsightCard（InsightCard 简短洞见卡 + 现象/溯源/预判三块展开详情；简短卡完整展示三段文案、不截断——基础内容向所有用户看全；展开入口 `canViewFullReport` 付费墙预留）；数据流保留并行拉复盘报告 + `predictionApi.list({source_id: 'review:<date>'})`（预测接口失败降级 null，不拖垮主内容），prediction 供预判展开块，无预判时 brief 兜底"暂无预判"、展开时预判块不渲染（已移除原 20:30 空态占位）。**2026-09-02 新增主因板块区块**：`watch(displayedDate)` 拉 `agentApi.getSectorInsight(date)`，source 含 review_primary/both 的候选逐个渲染 SectorInsightCard（板块洞见卡，含主因板块溯源+预判+验证）；无主因/失败静默整块不渲染；区块标题右侧「全部板块 ›」跳板块四环页 `sector-loop?date=`。**2026-09-03 新增大盘归因链区块**：MarketInsightCard 与主因板块区块之间渲染 AttributionChainView（共享组件 `@/shared/components/AttributionChainView.vue`，2026-09-04 自 modules/market 提升消除跨模块依赖；大盘根 → 主驱动板块分支 relation 徽 + 一句话驱动卡 + 事件胶囊）；**链数据 2026-09-17 提升到页面**（页面 `fetchAttributionChain(displayedDate)` 持 `chain` ref、`:chain`/`:loading` 受控传入，页面据此做卡排序与 marketLink 匹配，避免组件内自拉导致页面拿不到链），空态/加载态仍由组件承接，不阻断报告内容。**2026-09-17 主因区块改造（P3' spec §7.1）**：「主因板块 · 板块研判」更名「**今日影响大盘的主要板块**」，**仅当链存在时渲染**（无链整块隐藏、不占位）；卡列表 = 主因候选（review_primary/both）按「**自驱动优先 → |pct| 降序**」（pct 取链上该板块涨跌幅，未入链排末尾）排序，每卡传 `:market-link="buildMarketLink(chain, name)"`（含链上 `events`）与 `:sector-name`，并加 `trace-only`（spec §2.1 两轨分离：不渲染 CFB 预判子卡、标题回退溯源主句），保留「依据详情 ▾」与「看该板块预判 →」；链上事件由 InsightCard 溯源子卡内 EventRefChip 胶囊渲染（URL 可跳原文）。**2026-09-17 主因卡预判入口**：每张 SectorInsightCard 之后加一行「看该板块预判 →」（`candidate.name` → `/modules/market/pages/sector-detail?name=`），预判内容仍只在板块详情页（溯源/预判两轨分离）；同日 CFB 未触发折叠态生效（2026-09-17 判定修正：按「当期无已成立分支 `met===true`」判定，不再依赖 `resolvedDisplayMode` 降级，否则无 met 数据时折叠态不可达）——主因卡当期无已成立分支时，分支区收为「查看条件化预判 ▾」入口（miss 时带「未命中」标签、头部同义「验证未中」pill 抑制）；同日复审收口：折叠/过滤/隐藏标注/「未命中」标签**仅 `displayMode === 'conclusion'` 生效**，未传 display-mode 的调用方（节奏大师洞见卡等）恒全量分支直显）。**2026-09-17 弱依据提示（R16）+ 角色徽匹配升级（R14）**：`root.evidence_weak === true`（当日大盘未确认主因）时区块标题「今日影响大盘的主要板块」旁加中性灰小标「归因较弱」（`.primary-sector-weak`，非告警色）；卡列表 `buildMarketLink` 改传 `{ code: candidate.ts_code }`，匹配优先级 `ts_code` 精确 → `sector_std` 精确 → `sector` 精确 → 归一化（修复"有链但角色徽/驱动句不显示"）；板块级弱依据（`child.extraction.weak`）在溯源子卡内按 `source` 分流「依据较弱」/「无归因依据」，字段缺失时零标记；护栏见 `traceability.mount.spec.ts`（弱标记 ×3 + R14 ×2）。**2026-09-18 出卡口径改为「以链 children 为准」（R17）**：弱归因日链上有 3 个板块而 `sector-insight` 只给 1 个 `review_primary` → 旧"按候选出卡"只显示 1 张卡；现卡列表 = 链 `children[]` 逐个出卡（匹配不到候选则由 `buildPrimarySectorCandidates` 合成 `source='chain_only'` 最小候选，名称取 `sector_std || sector`）+ 补"候选里有、链上没有"的主因候选；区块 `v-if` 由「链存在 && 有候选」放宽为**「链存在」**，过滤后无卡时渲染中性空态「今日暂无可确认的驱动板块（大盘主因未确认）」（无链仍整块不渲染）；同时过滤「未确认驱动原因」节点（`isUnconfirmedAttribution`：驱动句空或中性未确认表述；events 多为行情综述，故只看摘要）。**2026-09-18 晚补：否定词表扩表** —— 旧判据只认「未确认驱动原因」「证据不足，未确认主因」两条，而链上更常见的是「**未检索到**可解释当日行情的独立触发事件」（当日 `注册制次新股` 生产实证）→ 不匹配 → 两个视图都把它出成卡、驱动句就是那句否定句本身（"未确认驱动原因的不放"没落实）；现扩为与 agent-py `attribution_chain._NEGATIVE_SUMMARY_MARKERS` **逐字对齐**的 15 词（未检索到 / 没有检索到 / 未找到 / 没有找到 / 未发现 / 没有发现 / 未确认 / 未明确 / 未识别 / 未匹配 / 无法确认 / 无法判断 / 不能确认 / 暂无 / 尚未），两侧同一口径。**反向护栏**：「不足 / 没有 / 缺少 / 缺乏 / 未出现」刻意不入表——2026-09-17 玉米真实摘要「未出现单一独立公告；催化来自超强厄尔尼诺供给扰动预期」是有内容的归因句，必须保留（护栏见 `AttributionChainView.mount.spec.ts` 的 NEGATIVE/POSITIVE 双向表）。卡上新增板块名标签（`sectorName` → InsightCard `titleTag`）。**2026-09-18 区块删除（组长裁定）**：该区块与上方「大盘归因链」读同一份链、用同一个过滤判据、显示同一批板块（角色徽 + 事件胶囊 + 驱动句），信息重复且同批板块渲染两遍 → **整块删除，页面只保留归因链**。能力去向：① 「看该板块预判 →」→ 先迁到**每个链分支**上，**2026-09-18 晚再撤掉**（组长裁定：链分支不挂预判入口，`select-sector` 事件与页面 `goSectorDetail` 一并删除；预判改由板块详情页/风口页进入）；② 「归因较弱」（`root.evidence_weak===true`）+「全部板块 ›」→ 链视图下方新增 `chain-foot` 行；③ 「今日暂无可确认的驱动板块」空态**取消**（链树本身已过滤未确认节点，无分支即无卡）。页面不再调 `agentApi.getSectorInsight`（`sector-loop`/`sector-detail` 仍在用，接口与 vite proxy 不动）。`buildPrimarySectorCandidates`/`rankSectorCandidatesByChain`/`rowDriverSummary`/`SectorInsightRow` 随之**无消费方**（保留未删，待复用；是否清理见 changelog 同日条目）。护栏：`traceability.mount.spec.ts`（9 例：旧区块消失 / 首屏恰拉 1 次 sector-insight 且只为原因链 / 双键索引且现象段丢弃保源序 / 接口失败静默空映射 / chain-foot 显隐 / 全部板块跳转）+ `AttributionChainView.mount.spec.ts`（+4 例入口 +4 例依据详情展开）。**2026-09-18 补：链分支可展开板块原因链 3 段**（触发/传导/结果）——页面首屏拉一次 `sector-insight` 建 `sectorStageMap`（键 `ts_code` + 板块名双形态）传 `AttributionChainView` 的 `sectorStages`，分支出「依据详情 ▾」（2026-09-19 文案统一）——键三级降级 `ts_code → sector_std → 原始名`，展开态按分支独立）；映射口径单点 `toReasonStages`，与板块详情/四环行同源同形。**2026-09-19（组长裁定，方案 E）**：该区块**更名「今日驱动板块」**（原「大盘归因链」；组件名 `AttributionChainView` 与 API 均不改）并**改向洞见卡视觉**——卡内改为「加粗彩色 key（大盘 / 板块名）+ 归因结论正文 + 渐变分隔线」行语言，去掉 `$bg-soft` 根卡块与每分支 `$primary-50` 驱动句块，展开入口文案改「依据详情」；纯样式/文案变更，逻辑零改动（页面的 `sectorStageMap` 索引、`chain-foot` 行均不变）。**2026-09-18 晚（组长两项裁定）**：① 链上事件胶囊**只展示「中台」（`warehouse`）来源**，`search`（检索补漏）在链上隐藏（全被滤掉 → 事件区不渲染、不占位）；② **撤掉链分支「看该板块预判 →」入口**（页面 `goSectorDetail` 与 `@select-sector` 绑定一并删除，预判改由板块详情页/风口页进入）。
- `pages/prediction-history.vue`：历史预测跟踪列表页（B2.1：命中率统计栏 + 全部/进行中/已结束筛选 + 预测卡片，卡片含 prediction_status 与三档进度；skipped 记录仅在"全部"可见，显示"已跳过"标签不渲染 horizon）。
- `pages/prediction-detail.vue`：预测详情页（B2.1：复用 MarketTracePrediction 展示预测内容 + PredictionVerification 展示验证结果；badge 增加 skipped 分支显示"已跳过"）。

## 组件

- `components/TrendKLineChart.vue`：趋势评分专用 K 线图，支持 H5、App 和小程序画布。
- `components/MarketTracePrediction.vue`：影响持续性预判卡片（B2 预测能力，样式对齐同页 `MarketTracePredictionValidation.vue`）。**2026-09-02 通用化**：条件化预判区改嵌共享 `ConditionalForecastBlock`（从 InsightCard structured 抽取，大盘/板块/个股一切有条件化预判共用同款分支 UI）；大盘专属的状态/归因摘要/期段明细/演化路径/风险保留。prediction-detail 与市场洞见展开复用本组件。
- `components/MarketInsightCard.vue`：市场洞见卡片（简短的 InsightCard + 现象/溯源/预判三块展开详情，付费墙预留）。
- `components/PredictionVerification.vue`：预测验证结果组件（B2.1），逐档位渲染到期日/结果徽标/实际涨跌幅/验证时间/reason。
- `KLineChart` 已提升至 `shared/components/`（`shared/components/KLineChart.vue`），此处引用共享组件。

## API

- `GET /api/cn/stocks/trend-score/top`：最新趋势评分榜单。
- `GET /api/cn/stocks/:symbol/trend-score/detail`：单股四维评分详情。
- 前端封装位于 `shared/api/modules/trend-score.ts`，页面中禁止直接发起 HTTP 请求。
- `GET /api/predictions`：历史预测列表（B2.1，含命中率统计；**支持 `source_id=review:YYYY-MM-DD` 定向与 `status` 含 skipped，2026-08-14**）。
- `GET /api/predictions/:id`：历史预测详情（B2.1）。
- 前端封装位于 `shared/api/modules/prediction.ts`（predictionApi.list/detail；`PredictionRecordStatus = 'pending'|'verified'|'skipped'`，`PredictionStats.skippedCount`）与 `shared/api/modules/trend-score.ts`，页面中禁止直接发起 HTTP 请求。

## 开发注意事项

- 评分详情严格保持四个维度：技术面 35%、行业赛道景气 25%、消息面催化 20%、基本面 20%。
- 技术面同时展示个股与概念指数相同时间范围的 K 线。
- A 股颜色采用红涨绿跌；图标统一使用 `SvgIcon`。
- 页面必须兼容 H5 预览和 App 画布实现。
- B2.1 状态纯函数在 `utils/predictionHistory.ts`（HORIZON_ORDER/HORIZON_LABELS/horizonStage/overallStatus/computeStats，node:test spec 覆盖）；命中率口径 = hit/(hit+miss)，insufficient 与未验证档位不计入，与后端 publicRouter stats 对齐。
