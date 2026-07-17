# Market 模块 - 行情

## 功能范围
行情模块提供异动捕手（事件监控）和长线风口（板块龙头）功能，以及大盘概览和资讯快讯滚动组件。

## 页面
- `pages/event-catcher.vue` - 异动捕手
- `pages/leaders.vue` - 长线风口（概览入口页：泡泡图 + 板块入口卡片列表，点击板块跳转详情）
- `pages/sector-detail.vue` - 板块详情子页面（板块统计、龙头股、AI 分析、主线/上游/下游个股列表）
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
- `@/shared/api/modules/stock` - 股票 API（含 getTrendEvents、getWindLeaders）
- `@/shared/utils/stock` - 股票格式化工具
- `@/shared/utils/datetime` - 日期时间格式化
- `@/shared/components/SubPageCard.vue` - 子页面容器
- `@/shared/components/SvgIcon.vue` - 图标组件

## 开发注意事项
- 长线风口数据通过 `stockApi.getWindLeaders(limit)` 获取，API 不可用时显示错误状态
- `leaders.vue` 为概览入口页，板块详情在 `sector-detail.vue` 子页面展示（通过 name 参数筛选）
- `sector-detail.vue` 调用同一 API 并按板块名称过滤，支持精确匹配和模糊匹配
- 长线风口页面包含泡泡图可视化布局
