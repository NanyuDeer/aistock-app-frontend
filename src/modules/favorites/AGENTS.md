# Favorites 模块 - 自选股

## 功能范围
自选股模块管理用户关注的股票，包括自选股列表、个股详情、搜索、异动监控和特别提醒。

## 页面
- `pages/index.vue` - 特别提醒（堆叠卡片式异动时间线）
- `pages/favorites.vue` - 自选股列表
- `pages/detail.vue` - 个股详情页
- `pages/search.vue` - 股票搜索
- `pages/monitor.vue` - 异动监控
- `pages/insight.vue` - 自选股洞察（涨停雷达 + 价格异动融合列表）
- `pages/insight-detail.vue` - 洞察详情（涨停雷达）
- `pages/insight-detail-move.vue` - 洞察详情（价格异动，数据源为 stocktrace movements API）

## 异动卡片主因展示（价格异动）
- 数据源：stocktrace movements API 返回的 `StockTraceEvent.primary_cause`（LLM 生成的 ≤20 字简短主因短语）。
- 展示优先级（`AlertContent.vue` 的 `fromMovement()`、`monitor.vue` 的 `movementToAlertItem()`、`insight.vue` 价格异动映射三处一致）：
  1. `primary_cause` 存在 → `主因：${primary_cause}`
  2. 否则 `movement_view.primaryCandidate.verdict` 存在 → `主因：${verdict}`
  3. 否则按 `analysis_status` 兜底：`completed` → `归因完成` / `processing` → `归因中` / `unavailable` → `待归因`

## 异动详情页（insight-detail-move.vue）
- 归因候选：直接取 `artifactJson.candidates` 展示全部五层候选（含偏弱/证据不足/排除判定），主候选排第一（按 `primary_chain_id` → 链的 candidateId 定位）。不依赖 `movementView.alternatives`（其仅含 supported 候选，证据不足时为空）。
- 六阶段链：仅渲染主因链（`artifactJson.chains` 中 `role=primary`）。备选链统一不展示——其信息已由归因候选全量覆盖，且证据不足时 LLM 仅生成主因链，避免时有时无。
- 证据清单：`artifactJson.evidence_index` 中过滤掉系统生成的 trigger_fact/quote_fact 条目（"触发时刻行情"/"价格触发事件"不展示）；market_fact/sector_fact 的英文模板摘要由 `evidenceExcerpt` 转中文展示（"涨跌幅 -X%"、"板块最新日涨跌幅 -X%（MM-DD）"）。

## 组件
- `components/StockCard.vue` - 股票卡片
- `components/StockCardList.vue` - 股票列表
- `components/KLineChart.vue` - K 线图
- `components/StockDetailTable.vue` - 股票详情表格

## Hooks
（暂无模块专属 hooks，使用 shared/utils 中的 useFavorites 等）

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
- 特别提醒页面使用堆叠卡片手势交互
- **子页面滚动容器（2026-08-19）**：H5 预览包装固定 `#app` 高度并 `overflow: hidden`，页面原生滚动被禁用。`insight.vue` / `insight-detail.vue` / `insight-detail-move.vue` 必须用 `SubPageCard2`（自带白色导航栏 + scroll-view）包裹（对应 pages.json `navigationStyle: "custom"`），否则长内容被裁剪、底部不可达。新增/改造子页面沿用此模式。
