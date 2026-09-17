# changelog-pending.md（待提交修改记录）

## 2026-09-17 CFB 折叠/过滤按 displayMode 收口（修复节奏大师洞见卡零分支）+ sentence 空态文案还原 + 新增 mount 三态护栏

- 问题（复审必须项 A）：上一轮「三态判定改按已成立分支」后 `displayMode` prop 完全不再驱动 UI，折叠对所有调用方生效 → **节奏大师洞见卡**（`src/modules/rhythm/pages/index.vue:20-27` 未传 `display-mode` → 默认 `full`；其 structured 只有 conditions、无 horizons → `activeBase` 恒空；`met` 恒 null）100% 折叠，卡内只剩一行入口、核心分支内容默认不可见。
- 修正（CFB 两副本，最小改动）：① `isFoldedUnmet` 前置 `props.displayMode === 'conclusion'`；② `renderedConditions` 前置 `if (props.displayMode !== 'conclusion') return inHorizonConditions.value`（恢复改造前 full 全量行为）；③ `showHiddenBranchLabel` 与 `showMissTag` 同样以 `displayMode === 'conclusion'` 收口（「另有 N 条条件未成立」与「未命中」标签只在结论模式出现）；④ `litConditions = selectVisibleConditions(inHorizonConditions, 'conclusion')` 口径不变，`resolveDisplayMode` / `hasMetData` 仍保留（无消费方，函数与单测保留）；`displayMode` prop 的 JSDoc 同步改为「折叠/过滤/隐藏标注/未命中标签一律以此收口」。
- 行为分档：`full`（rhythm / 未传 display-mode）→ 全量分支 + 既有 pill/空态（与改造前一致，无折叠入口）；`conclusion`（sector-detail / sector-loop / traceability）→ 三态不变（未触发折叠 / 只显已触发 / 到期未触发 + 入口行「未命中」且抑制头部同义 pill）。
- 空态文案还原（附带项 B）：模板三元改回 `conditionDisplay === 'sentence' ? '该期暂无细分情景' : '条件未成立 · 暂无已验证结论'`（sentence 恢复改造前原文案）；`ConditionalForecastBlock.spec.ts` 中该串断言同步改锚定整个三元表达式，**用例数不变（仍 3 条）**。
- 新增挂载护栏（附带项 C）：`src/shared/components/ConditionalForecastBlock.mount.spec.ts`（vitest + happy-dom，5 条）——① conclusion + 全无 met → 有折叠入口且分支节点 0；② 点开入口 → 分支节点 == 该档 conditions 数；③ conclusion + 一条 `met:true` → 「条件成立」徽 + 无折叠入口 + 「另有 1 条条件未成立」；④ `verification:'miss'` + 折叠态 → 「未命中」且头部 `.as-insight-card__verify` 不渲染；⑤ full / 不传 display-mode → 分支节点 == conditions 数且无折叠入口（A 的回归护栏，反向变异实测可捕获）。新文件已登记进 `vitest.config.ts` 的 `test.include` 白名单（`tests/run-node-specs.mjs` 未改，node:test 计数保持 `248/248/0`）。
- 验收：`npx vue-tsc --noEmit` **0 错误**（exit 0）；`npm run test:node` `248/248/0`（exit 0）；`node --import tsx --test src/shared/components/ConditionalForecastBlock.spec.ts src/shared/utils/conditionalForecast.spec.ts` 11/11 passed；`npx vitest run src/shared/components/ConditionalForecastBlock.mount.spec.ts src/modules/analytics src/modules/market src/modules/rhythm src/modules/fear-greed` 6 files / 47 tests passed（exit 0，无存量红）；组件库 `npm run type-check` 仅存量 5 条（`dev/App.vue` Segmented ×4 + `AudioPlayer.vue` ×1）。两副本 `Compare-Object` 差异仍仅内联 helper 定义块（库 233-257，25 行）↔ App import 行（161 行 + 空行），切除后逐行相等；`InsightCard.vue` 两副本一致。
- 文档同步：`AGENTS.md`（CFB 行）、`src/modules/analytics/AGENTS.md`（traceability 行）。

## 2026-09-17 CFB 折叠态判定修正（按已成立分支 lit 判，不再依赖降级模式）+ 未命中标签去重

- 问题（用户报障）：折叠态判定挂在 `resolvedDisplayMode === 'conclusion'`（= 当期含布尔 `met`），而后端按决策 D1 只写 `condition_met=true`、不写 false → 未触发档没有任何布尔 `met` → `hasMetData` 为假 → `resolveDisplayMode` 降级 `full` → 分支渲染源返回全部分支 → **折叠态在真实数据下不可达**。
- 修正（CFB 两副本）：三态判定改为按「当期有无已成立分支」——① `folded = conditionDisplay !== 'sentence' && lit.length === 0 && inHorizon.length > 0`（`lit` = 当期 `met===true`，取 `selectVisibleConditions(inHorizon, 'conclusion')`；`inHorizon.length > 0` 守卫避免「该档无条件分支」时渲染出点开后空无一物的入口）→ 只显基准行 + 折叠入口「查看条件化预判 ▾ / 收起条件化预判 ▴」（本地展开后铺开该档全部分支）；② 已触发（`lit.length > 0`）只渲染 `lit` 分支 + 分支区末尾「另有 N 条条件未成立」（N = `inHorizon − lit`，仅 N>0）；③ `sentence` 形态不折叠、不过滤，维持整句原文直显。
- 去重：folded 且 `verification === 'miss'` → 头部同义 pill「验证未中」由 `verifyText` 抑制，只保留入口行「未命中」标签；`pending`/`hit`/未折叠的 `miss` 保持既有 pill 行为不变。
- 取值：空态文案「条件未成立 · 暂无已验证结论」在 tags 形态下不再出现（由折叠态承接）；最终保留在模板三元里仅由 `sentence` 形态命中（该档无基准行且无分支时）。
- `resolveDisplayMode` / `hasMetData` 在组件内已无消费方：`src/shared/utils/conditionalForecast.ts` 函数与 8 条单测保留（供后续使用），App 侧 import 收窄为 `selectVisibleConditions`；CFB 的 `displayMode` prop 保留但不再驱动 UI。
- spec：`src/shared/components/ConditionalForecastBlock.spec.ts` **用例数不变（仍 3 条）**，仅加/改断言——锚定 `litConditions`（`selectVisibleConditions(inHorizonConditions.value, 'conclusion')`、`litConditions.value.length === 0`、`if (!isFoldedUnmet.value) return litConditions.value`）+ `doesNotMatch(/resolvedDisplayMode/)` 防回归 + miss pill 抑制表达式；`tests/run-node-specs.mjs` 基线维持 `248/248/0`（未改常量）。
- 验收：`npx vue-tsc --noEmit` **0 错误**（exit 0）；`npm run test:node` `248/248/0`（exit 0）；`npx vitest run src/modules/analytics src/modules/market src/modules/fear-greed` 5 files / 42 tests passed（exit 0）；组件库 `npm run type-check` 仅存量 5 条（`dev/App.vue` Segmented ×4 + `AudioPlayer.vue` ×1）；两副本 `Compare-Object` 差异仅 helper 定义块（库 25 行）↔ App import 行（1 行 + 空行），InsightCard 两副本无输出。
- 文档同步：`AGENTS.md`（CFB 行）、`src/modules/analytics/AGENTS.md`（traceability 行）。

## 2026-09-17 洞见卡未触发折叠态（查看条件化预判）+ 未命中标签 + 隐藏分支标注 + 市场洞见主因卡预判入口

- CFB（两副本）：**未触发折叠态**——当前档无 `met === true` 分支、且 `conclusion` 实际生效、且 tags 形态 → 分支区不铺开，收为一行入口「查看条件化预判 ▾」/「收起条件化预判 ▴」（本地展开，切期段归零）；展开后铺开该档**全部**条件分支（沿用既有分支渲染与样式）。基准行（方向 + 基准 · label + 置信 + 剩余窗口）照常显示。
- 取值口径（二选一收敛，已授权）：原空态文案「条件未成立 · 暂无已验证结论」的显示场景（`conclusion` 生效 + 无已成立分支）**整体由折叠态承接，该文案在 tags 形态下不再出现**；仅保留给 `sentence` 形态的同类场景。理由：`conclusion` 生效且无已成立分支在本组件内是同一状态，两条渲染分支会给同一状态两套 UI。
- 到期未触发标签：折叠态下 `structured.verification === 'miss'`（卡级聚合验证口径；无新增后端字段、不写 `condition_met=false`）→ 入口旁显示中性灰「未命中」（沿用既有 miss 灰/中性色，不与 `hit` 实心绿混用）；`pending`/缺失不显示。
- 隐藏分支纯标注：`conclusion` 生效 + 有已成立分支（非折叠态）+ 被过滤分支数 > 0 → 分支区末尾「另有 N 条条件未成立」（N = 该档 `inHorizonConditions.length − activeConditions.length`），caption 字号中性小标签、不可点开。
- 已触发（存在 `met === true`）保持现设计：只渲染已成立分支 + `[条件成立]` 徽 + 验证标识，不折叠、不显示折叠入口。
- `src/modules/analytics/pages/traceability.vue`：「主因板块 · 板块研判」每张 `SectorInsightCard` 之后加一行「看该板块预判 →」，跳 `/modules/market/pages/sector-detail?name=<candidate.name>`（沿用项目既有 `?name=` 入参约定）；预判内容不进主因卡（溯源/预判两轨分离不变）。
- spec：`src/shared/components/ConditionalForecastBlock.spec.ts` 在既有用例体内补断言（查看/收起条件化预判、折叠判定的 `conditionDisplay !== 'sentence'` 守卫、`verification === 'miss'`、`另有 {{ hiddenConditionCount }} 条条件未成立`、`renderedConditions`/`toggleBranches`）——用例数不变（仍 3 条），`tests/run-node-specs.mjs` 基线维持 `248/248/0`。
- 连带生效（同一组件语义，无额外改动）：`market/pages/sector-loop.vue` 的 CFB（`display-mode="conclusion"` + 默认 tags）同样进入折叠态；`MarketTracePrediction` 走 `condition-display="sentence"` → 折叠逻辑不生效（保持整句原文直显）。
- 验收：`npx vue-tsc --noEmit` 0 错误（exit 0）；`npm run test:node` `248/248/0`（exit 0）；`npx vitest run src/modules/analytics src/modules/market src/modules/fear-greed` 5 files / 42 tests passed（exit 0，无存量红）；CFB 两副本 `Compare-Object` 差异仅 helper 定义块 + App 侧 import 行，InsightCard 两副本无差异。

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

## 2026-09-16 condition_met 两段判定：条件点亮中间态不再误标「已验证」（终审阻塞项 #1）

- 问题：后端两段判定第①段（到期前点亮）只写 `verification[c{i}].condition_met = true`、**不写 `result`**；`conditionStage` 旧口径「entry 存在即 verified」把中间态判成 `result: undefined`，`condBadgeText` 落到 `map[undefined] || '已验证'` → 详情页误显「已验证」+「实际 --」。
- 修复：`src/modules/analytics/utils/predictionHistory.ts` 新增 `ConditionStage` 分支 `{ kind: 'condition_met' }`（判定：entry 存在、`result == null`、`condition_met === true`），置于「有 result → verified」之前；`verified` 分支返回形状不变（向后兼容）。
- 组件：`src/modules/analytics/components/PredictionVerification.vue` 的 `condBadgeText` 对新 kind 输出「条件已成立 · 待验证」，颜色沿用既有 `badge-pending`（`condBadgeClass` 未改，fallthrough 即 pending）；「实际 X」仍只在 `kind === 'verified'` 渲染，中间态不再出现「实际 --」。
- 测试（先红后绿）：`predictionHistory.spec.ts` 新增 2 条（中间态 → `condition_met`；到期后 `condition_met` 保留 + 有 `result` → `verified`）；新增 vitest 挂载 spec `src/modules/analytics/components/PredictionVerification.spec.ts`（3 条：中间态文案+pending 色且不含「已验证」/「实际」、到期后「命中」+「实际 +5.2%」、无 c{i} 仍「待验证」），并登记进 `vitest.config.ts` 的 `test.include` 白名单（否则 vitest 静默跳过）。
- 基线同步：`tests/run-node-specs.mjs` `EXPECTED_BASELINE` `246/246/0` → `248/248/0`。
- 验收：`npx vitest run src/modules/analytics` 3/3 passed（exit 0）；`npm run test:node` `248/248/0`（exit 0）；`npx vue-tsc --noEmit` 0 错误（exit 0）；`npx vitest run` 全量为存量红（4 failed / 409 passed + 2 失败 suite，A/B 回退取证与本次改动前逐条一致）。
- 未改：`PredictionVerification` 其他状态文案/样式、后端契约、`overallStatus`（c{i} entry 本就不参与 `status=verified`）。
