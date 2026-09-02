# Analytics 模块 - 洞察

## 职责

提供洞察首页、业绩预测、趋势股评分榜单与单股四维评分详情。

## 页面

- `pages/index.vue`：洞察入口与趋势评分 Top 3 预览。
- `pages/forecast.vue`：业绩预测。
- `pages/trend-score.vue`：趋势评分排行榜与本地搜索。
- `pages/trend-score-detail.vue`：单股技术面、赛道景气、消息面、基本面四维详情。
- `pages/traceability.vue`：市场洞见页（2026-08-27 改造：从完整归因报告改为简短洞察卡）。现只渲染 MarketInsightCard（InsightCard 简短洞见卡 + 现象/溯源/预判三块展开详情；简短卡完整展示三段文案、不截断——基础内容向所有用户看全；展开入口 `canViewFullReport` 付费墙预留）；数据流保留并行拉复盘报告 + `predictionApi.list({source_id: 'review:<date>'})`（预测接口失败降级 null，不拖垮主内容），prediction 供预判展开块，无预判时 brief 兜底"暂无预判"、展开时预判块不渲染（已移除原 20:30 空态占位）。**2026-09-02 新增主因板块区块**：`watch(displayedDate)` 拉 `agentApi.getSectorInsight(date)`，source 含 review_primary/both 的候选逐个渲染 SectorInsightCard（板块洞见卡，含主因板块溯源+预判+验证）；无主因/失败静默整块不渲染；区块标题右侧「全部板块 ›」跳板块四环页 `sector-loop?date=`。
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
