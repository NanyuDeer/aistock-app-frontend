# Market 模块 - 行情

## 功能范围
行情模块提供异动捕手（事件监控）和长线风口（板块龙头）功能，以及大盘概览和资讯快讯滚动组件。

## 页面
- `pages/event-catcher.vue` - 异动捕手
- `pages/alert-analysis.vue` - AI 异动解读
- `pages/hot-burst.vue` - 机构调研热门股
- `pages/leaders.vue` - 长线风口（概览入口页：泡泡图 + 板块入口卡片列表，点击板块跳转详情；长线/短线两档切换，龙头股行分档展示——长线档取 `long_leader`（趋势龙头，trend_scores 评分最高）、短线档取 `leading_stock_info`（短线领涨），跨板块去重）
- `pages/sector-detail.vue` - 板块详情子页面（板块统计、龙头股、AI 分析、主线/上游/下游个股列表）；板块详情页含近120日板块K线图（KLineChart + getBoardKline）；AI 分析区"层级流向图" App + H5 走 renderjs 视图层 DOM 注入 SVG（v-html 在 App webview 不渲染切题注入的 svg）；AI 分析卡之后嵌入**板块洞见卡**（SectorInsightCard，2026-09-02：按最近交易日拉 agentApi.getSectorInsight 匹配当前板块渲染 InsightCard 条件化预判，无记录严格占位）
- `pages/sector-loop.vue` - 板块四环页（2026-09-02：近 7 交易日回看的白卡列表——当日被溯源/预判板块的 来源tag/溯源短句/行情/预判概要；大盘归因链条；wind_leader/both 行跳板块详情、review_primary-only 行跳大盘溯源页；入口：leaders「板块预判 · 今日」+ traceability「全部板块」）
- `pages/push-history.vue` - 历史推送

## 组件
- `components/MarketOverview.vue` - 大盘概览
- `components/NewsSlider.vue` - 资讯快讯滚动
- `components/EventCard.vue` - 事件卡片
- `components/EventChainGraph.vue` - 事件传导图
- `components/AttributionChainView.vue` - 大盘归因链视图（2026-09-03 P1 chain-attribution：大盘根 → 主驱动板块分支，relation 徽（自驱动/跟随大盘/关系未知）+ 板块一句话溯源驱动卡；props `{ date, mock? }`，mock=true 渲染内置演示数据，无链/失败组件内空态承接；消费下方模块私有 API，展示页为 analytics/traceability（大盘溯源页））

## API（模块私有）
- `api/attributionChain.ts` - 大盘归因链 API（2026-09-03 P1；`fetchAttributionChain(date)` → `GET /api/agent/attribution-chain/:date`，返回 `{date, chain|null}`；无链/请求失败返回 null，不抛出；类型 `AttributionChain`/`AttributionChainChild` 同文件导出，供 components/AttributionChainView 与 pages/sector-detail「大盘联动」消费）

## Hooks
（暂无模块专属 hooks）

## 对外暴露的接口
- 其他模块通过 navigateTo 跳转到异动捕手或长线风口页面

## 依赖的 shared/ 中的类型
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
