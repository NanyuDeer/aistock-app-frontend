# CHANGELOG.md — aistock-app-frontend 变更记录

> 所有修改记录按时间倒序排列。每条记录标注分支、时间、开发者。

## [changer] 2026-08-11 — P0 身份鉴权（Phase 1a）
**开发者**: 37588

### 改进
- `src/shared/api/modules/agent.ts`：`createAgentWebSocket` URL 追加 `?token=`（app-api 桥接握手鉴权）；`sendMessage` 删除 user_id 字段（服务端注入）；删除未使用的 useUserStore import
- `src/shared/utils/useChatStream.ts`：`send` 删除 user_id 字段；新增断连结算（4401/连接断开时结算挂起 send，走错误提示，不挂起 streaming）

### 文档
- AGENTS.md / src/modules/chat/AGENTS.md：user_id 服务端注入约束更新

> 发版约束：须在 Caddy 切换（/api/agent/ws/* 已指向 app-api）之后发布；此前前端 WS 仍直连 agent-py，删除 user_id 会导致登录态 WS 不落库不计费。

---

## [changer] 2026-08-10 — 市场洞见页新增影响持续性预判卡片

**开发者**: 37588

### 新增
- `src/modules/analytics/components/MarketTracePrediction.vue`：影响持续性预判卡片（预测状态 → 三档预判气泡标签 → 演化路径时间轴 → 风险因素），样式对齐同页 MarketTracePredictionValidation.vue
- `src/shared/api/modules/agent.ts`：`MarketTracePredictionHorizon/Risk/Step/Prediction` 类型 + `MarketTraceTrace.prediction`
- `src/modules/analytics/utils/marketTraceReview.ts`：`toPredictionPresentation` 防御性提取（prediction/evolutionSteps/horizons 校验，非法返回 null）

### 改进
- `src/modules/analytics/pages/traceability.vue`：预判对照卡片后插入预测卡片（prediction 为 null 时不渲染，兼容旧报告）
- 演化路径时间轴优先后端结构化 `evolution_steps`（含档位标签），旧记录回退 narrative 按标点拆分
- 三档预判气泡化：方向（看多红/看空绿/中性蓝）+ 置信度（置信高/中/低）胶囊标签，对齐个股详情关键词气泡

### 测试
- `marketTraceReview.spec.ts` 新增 5 用例（prediction 提取三态 + evolution_steps 映射 + 旧记录兼容），15 通过

---

## [changer] 2026-08-10 — B2.1 历史预测跟踪页面（列表/详情/入口）

**开发者**: 37588

### 新增
- `src/shared/api/modules/prediction.ts`：`predictionApi.list/detail` + `PredictionRecord/PredictionStats/PredictionListResponse` 等类型
- `src/modules/analytics/utils/predictionHistory.ts` + `predictionHistory.spec.ts`：状态纯函数（单档/整体/命中率口径，6 测试）
- `src/modules/analytics/pages/prediction-history.vue`：预测验证列表页（命中率统计栏 + 全部/进行中/已结束筛选 + 预测卡片含 prediction_status 与三档进度）
- `src/modules/analytics/pages/prediction-detail.vue`：预测详情页（复用 MarketTracePrediction + 新增验证结果区）
- `src/modules/analytics/components/PredictionVerification.vue`：逐档位验证结果组件

### 改进
- `src/modules/analytics/pages/traceability.vue`：右上角「预测验证」入口（#header-right 插槽）
- `src/pages.json`：注册 prediction-history / prediction-detail 路由
- `src/modules/analytics/utils/marketTraceReview.ts`：导出 `toPredictionPresentation`（详情页复用）

### 测试
- analytics node:test 38/38；tsc/vue-tsc 0 错误；build:h5 成功

---

## [master] 2026-08-08 — 首页异动捕手模块恢复列表展示（日期并入描述行）

**开发者**: Aria

### 改进
- `src/modules/favorites/components/AlertContent.vue`：异动捕手列表由 `InsightAlertCard compact` 卡片换回 `ListCell` 列表（与个股情报模块同款）：标题=股票名、描述=主因归因文案、prefix=涨跌 Tag（涨红/跌绿）
- 日期（MM-DD）并入描述行（"主因：xxx · 08-07"），移除右侧独立 value 与 `.capture-time` 样式；`.capture-list` 与 `.intel-list` 样式合并统一（紧凑行距 + 单行截断 + 空行占位等高）

### 测试
- `src/modules/favorites/components/AlertContent.spec.ts`：断言由 InsightAlertCard 改为 ListCell（标题/描述/涨跌 Tag type/点击跳转），4 用例通过
