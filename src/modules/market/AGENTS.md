# Market 模块 - 行情

## 功能范围
行情模块提供异动捕手（事件监控）和长线风口（板块龙头）功能，以及大盘概览和资讯快讯滚动组件。

## 页面
- `pages/event-catcher.vue` - 异动捕手
- `pages/alert-analysis.vue` - AI 异动解读
- `pages/hot-burst.vue` - 机构调研热门股
- `pages/leaders.vue` - 长线风口（概览入口页：泡泡图 + 板块入口卡片列表，点击板块跳转详情；长线/短线两档切换，龙头股行分档展示——长线档取 `long_leader`（趋势龙头，trend_scores 评分最高）、短线档取 `leading_stock_info`（短线领涨），跨板块去重）
- `pages/sector-detail.vue` - 板块详情子页面（板块统计、龙头股、AI 分析、主线/上游/下游个股列表）；板块详情页含近120日板块K线图（KLineChart + getBoardKline）；AI 分析区"层级流向图" App + H5 走 renderjs 视图层 DOM 注入 SVG（v-html 在 App webview 不渲染切题注入的 svg）；AI 分析卡之后嵌入**板块洞见卡**（SectorInsightCard，2026-09-02：按最近交易日拉 agentApi.getSectorInsight 匹配当前板块渲染 InsightCard 条件化预判，无记录严格占位；**2026-09-18：自动获得「依据详情 ▾」里的板块原因链 3 段**——`SectorInsightCard` 统一把 `candidate.trace.stages` 映射后传 `InsightCard` 顶层 `traceStages`，本页 0 改动）
- `pages/sector-loop.vue` - 板块四环页（2026-09-02：近 7 交易日回看的白卡列表——当日被溯源/预判板块的 来源tag/溯源短句/行情/预判概要；大盘归因链条；wind_leader/both 行跳板块详情、review_primary-only 行跳大盘溯源页；入口：leaders「板块预判 · 今日」+ traceability「全部板块」）。**2026-09-18 板块原因链展开**：每行溯源横幅下方新增「依据详情 ▾」（2026-09-19 文案统一，原「溯源过程 ▾」）——展开显示该板块 3 段溯源（触发 / 传导 / 结果）。**2026-09-19（组长裁定）**：行内**溯源小卡样式对齐组件库 `InsightCard` 的溯源块**（`__line--trace`）——冷雾蓝底 `#f4f8fe` + 描边 `#dce7f8` + `$r-md` 圆角 + `16rpx 20rpx` 内边距，key 为 `$font-size-sm`/700/字距 2rpx/`#4a6fbf`，正文 `$font-size-sm`/`#5e6673`（取值与 InsightCard 逐字一致，仅组件内不共享变量）；**只改溯源小卡样式，未换整行**——涨跌、来源 tag、预判概要 pill、依据详情入口全部保留，数据取 `candidate.trace.stages`（app-api `24b53a5` 加性透出，后端 4 段 → 展示 3 段，映射口径单点 `toReasonStages`）；无数据（旧记录/未溯源）则该行**不出入口**（不占位），展开态按行独立（键 = `ts_code`）；交互与排布对齐组件库 `InsightCard`「依据详情」（右对齐入口 + 三角箭头翻转 + 阶段名两列 + 虚线分隔）。**行 UI 本身未改**（仍是自绘列表行，未换成 `SectorInsightCard`——替换会把紧凑列表变成满宽卡堆，属独立视觉决策）
- `pages/push-history.vue` - 历史推送

## 组件
- `components/MarketOverview.vue` - 大盘概览
- `components/NewsSlider.vue` - 资讯快讯滚动
- `components/EventCard.vue` - 事件卡片
- `components/EventChainGraph.vue` - 事件传导图

## Hooks
（暂无模块专属 hooks）

## 对外暴露的接口
- 其他模块通过 navigateTo 跳转到异动捕手或长线风口页面

## 依赖的 shared/ 中的类型
- `@/shared/api/modules/attributionChain` - 大盘归因链 API（2026-09-04 提升至共享层；`fetchAttributionChain(date)` → `GET /api/agent/attribution-chain/:date`，返回 `{date, chain|null}`；无链/失败返回 null；类型 `AttributionChain`/`AttributionChainChild` 同文件导出；消费方：analytics/traceability 经共享组件 AttributionChainView、sector-detail「大盘联动」（`buildMarketLink(chain, name, { code })`，2026-09-17 R14 起按 `ts_code` 优先匹配）；弱依据字段 `root.evidence_weak` / `child.extraction` 由 `SectorInsightCard` → `InsightCard` 弱化呈现（2026-09-17 R16））
- `@/shared/api/modules/stock` - 股票 API（含 getTrendEvents、getFavoritesNews、getWindLeaders）
- `@/shared/utils/stock` - 股票格式化工具
- `@/shared/utils/datetime` - 日期时间格式化
- `@/shared/components/SubPageCard.vue` - 子页面容器
- `@/shared/components/SvgIcon.vue` - 图标组件
- `@/shared/components` - 共享 UI 组件（LoadingState, EmptyState, Tag, Badge, Button, Card, Segmented, StatGrid, GuideCard）

## 开发注意事项
- 长线风口数据通过 `stockApi.getWindLeaders(limit)` 获取，API 不可用时显示错误状态
- 每个板块带 cycle 字段（short/long），Agent 报告内分节展示
- `leaders.vue` 为概览入口页，板块详情在 `sector-detail.vue` 子页面展示（通过 name 参数筛选）
- `sector-detail.vue` 调用同一 API 并按板块名称过滤，支持精确匹配和模糊匹配
- 长线风口页面包含泡泡图可视化布局
