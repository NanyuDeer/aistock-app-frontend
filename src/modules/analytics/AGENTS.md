# Analytics 模块 - 洞察

## 职责

提供洞察首页、业绩预测、趋势股评分榜单与单股四维评分详情。

## 页面

- `pages/index.vue`：洞察入口与趋势评分 Top 3 预览。
- `pages/forecast.vue`：业绩预测。
- `pages/trend-score.vue`：趋势评分排行榜与本地搜索。
- `pages/trend-score-detail.vue`：单股技术面、赛道景气、消息面、基本面四维详情。
- `pages/traceability.vue`：大盘溯源报告（与大盘洞见同页展示）。

## 组件

- `components/TrendKLineChart.vue`：趋势评分专用 K 线图，支持 H5、App 和小程序画布。
- `components/MarketTracePrediction.vue`：影响持续性预判卡片（B2 预测能力），样式对齐同页 `MarketTracePredictionValidation.vue`。

## API

- `GET /api/cn/stocks/trend-score/top`：最新趋势评分榜单。
- `GET /api/cn/stocks/:symbol/trend-score/detail`：单股四维评分详情。
- 前端封装位于 `shared/api/modules/trend-score.ts`，页面中禁止直接发起 HTTP 请求。

## 开发注意事项

- 评分详情严格保持四个维度：技术面 35%、行业赛道景气 25%、消息面催化 20%、基本面 20%。
- 技术面同时展示个股与概念指数相同时间范围的 K 线。
- A 股颜色采用红涨绿跌；图标统一使用 `SvgIcon`。
- 页面必须兼容 H5 预览和 App 画布实现。
