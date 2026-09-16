# changelog-pending.md（待提交修改记录）

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
