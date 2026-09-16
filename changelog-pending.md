# changelog-pending.md（待提交修改记录）

## 2026-09-16 无 met 数据时降级为全量渲染（Task 5b，用户裁决）

- 背景：后端 `condition_met` 当前恒为 `null`（`prediction_validator.py:370,391`）→ 板块路由派生的 `conditions[].met` 为 `null` → 板块页结论模式会**全部落空态**（错误观感）。裁决：**无 met 数据时降级为全量渲染**，只有整块确实含布尔 `met` 数据时才严格只显已成立分支。
- `src/shared/utils/conditionalForecast.ts`：新增 `resolveDisplayMode(conditions, mode)`——`conclusion` 仅在含布尔 `met` 时生效，否则返回 `full`；`conditionalForecast.spec.ts` 新增 3 条 node:test 用例（full 恒 full / conclusion 含 met 生效 / 全无 met 降级 full）。
- `src/shared/components/ConditionalForecastBlock.vue`：新增 `resolvedDisplayMode` computed 驱动 ①分支过滤 ②结论空态门控（`resolvedDisplayMode === 'conclusion' && !activeConditions.length`）；无 met 数据时保持全量渲染与既有 full 空态文案。
- `src/shared/components/ConditionalForecastBlock.spec.ts`：源码断言同步为 `resolvedDisplayMode === 'conclusion'`（门控变量改名所致，无新增用例）。
- 基线同步：`tests/run-node-specs.mjs` `EXPECTED_BASELINE` `243/243/0` → `246/246/0`（实测 246/246/0，exit 0）。
- 验收：App `npx vue-tsc --noEmit` 0 错误；CFB 两副本差异仍**仅** helper 定义块（App import / 库内联），InsightCard 两副本无差异。

## 2026-09-16 结论模式接入大盘粒度：取证为「无 met 数据」→ 保持 full 渲染（Task 5）

- 结论模式覆盖缺口：大盘粒度（MarketTracePrediction）分支级 `met` 恒为 `undefined`（2026-09-16 取证），故本期待后端补齐 `conditions[].met` 后再接入 `display-mode="conclusion"`，当前保持 full 渲染。
- 取证证据（大盘链路无分支级 met）：
  - `src/shared/api/modules/agent.ts:213-221` `MarketTracePredictionCondition` 仅 `condition/label/scenario/anchor/keywords`，**无 `met` 字段**（对照 `agent.ts:586-599` 板块 `SectorInsightCondition.met?: boolean | null`「该条件是否已触发（验证回填）」）。
  - `src/modules/analytics/utils/marketTraceReview.ts:314-332` `toPredictionPresentation` 条件映射不产出 `met`，`PredictionConditionPresentation`（同文件 170-180）亦无该字段。
  - `src/modules/analytics/components/MarketTracePrediction.vue:145` 条件分支 `met: undefined` 写死（`condStructured`）。
  - 唯一分支级 `met` 来源是板块链路：`aistock-app-api/src/core/routes/sectorInsightRouter.ts:260-300` 由 `verification` 条目的 `condition_met` 按 `condition_index` 派生；前端 `condition_met` 仅 `src/shared/api/modules/prediction.ts:32` 的**类型声明、无消费方**，大盘无等价 join。
  - 且该 `condition_met` 当前**后端恒为 null**：`aistock-agent-py/src/aistock_agent/services/prediction_validator.py:370,391`（"两段判定推迟，§9-5"）；agent-py 权威 schema `schemas/prediction.py:85-108` 本身也无 `met` 字段。
  - 备选口径（**未采用**，需另行确认）：大盘记录确有 entry 级 per-condition 信号 `conditionStage`（`src/modules/analytics/utils/predictionHistory.ts:37-41` 按 `c{i}` 读 `verification[c{i}].result`，`components/PredictionVerification.vue:103` 消费），但其语义是"scenario 是否命中"（validator 按 `anchor.direction`+`threshold` 窗口累计判定），非 spec §9-5 的"条件成立"，故不作为 `met` 代理。
- 遗留（不属本次范围，供排期参考）：因上述恒 null，板块粒度结论模式在没有 `met === true` 的数据时同样只呈现空态（`条件未成立 · 暂无已验证结论`），需后端条件验证两段判定落地后才会出结论。
