# changelog-pending.md（待提交修改记录）

## 2026-09-17 溯源弱依据提示（R16 前端呈现）+ 角色徽匹配升级 ts_code/sector_std（R14，Task 10.2）

- **数据侧已就绪、前端此前未呈现**：弱归因日（`root.evidence_weak=true` + `child.extraction={source,weak:true}`）在前端有链、有卡但看不出"依据偏弱"。本次做中性、克制的弱化呈现（不引入新色系、不用告警色）。
- **类型加性扩展**（`src/shared/api/modules/attributionChain.ts`，全部可选，老数据零影响）：`AttributionChainRoot.evidence_weak?/attribution_status?`；`AttributionChainChild.extraction?: { source?: string; weak?: boolean }`（新增导出 `AttributionChainExtraction`）、`ts_code?: string | null`、`sector_std?: string | null`。
- **R14 匹配优先级升级**（`src/shared/utils/sectorInsight.ts::findChainChild`）：由「`sector` 精确 → 归一化」改为 **`ts_code` 精确（去 `.TI` 后缀比较）→ `sector_std` 精确 → `sector` 精确 → 归一化（`sector` 优先、`sector_std` 兜底）**；`buildMarketLink(chain, name, { code })` 新增第三参；`rankSectorCandidatesByChain` 传 `candidate.ts_code`，`sector-detail.vue` 传 `{ code: cur.code }`。修复"链上 `sector` 是复盘原文名、候选是 THS 权威名 → 有链但角色徽/驱动句不显示"。
- **弱标记文案单点**：新增纯函数 `extractionWeakLabel(extraction)`——`weak !== true` → `''`（不渲染）；`source === 'snapshot'` → 「无归因依据」（纯快照异动兜底、无归因理由）；其余（`candidate_claim`）→ 「依据较弱」。`SectorMarketLink` 加性扩展 `chainWeak: boolean` + `extraction: AttributionChainExtraction | null`。
- **UI（中性灰，克制）**：① 链级 —— `InsightCard` 溯源蓝卡摘要行旁「归因较弱」（`traceStructured.weak`），并沿用 `root.summary`（弱归因日的中性摘要「证据不足，未确认主因」）作一句话行；市场洞见页主因区块标题「今日影响大盘的主要板块」旁同款小标（`.primary-sector-weak`，`chainWeak`）。② 板块级 —— 溯源子卡角色徽驱动行旁「依据较弱」/「无归因依据」（`traceStructured.weakText`）与 `AttributionChainView` 板块行关系徽旁同款（`.acv-weak`）。三者均**可选渲染**：字段缺失（老数据/正常日）零标记、零变化；样式走 CSS 变量 `--ins-weak-bd/--ins-weak-tx`（light/dark 双套），未用红绿涨跌色与告警色。
- **两副本同步**：`aistock-component-lib/src/components/InsightCard.vue` 做同样改动（模板 2 处 + 接口 2 字段 + 样式 1 块 + 2 个 CSS 变量）；本次改动块两副本 `git diff` 正文各 30 行、`Compare-Object` **0 行差异**；全文件仍差 55 行 = **HEAD 已存在的允许差异**（app-only `lineStyle`/`plain-lines`，HEAD 实测 app 4 处 / 库 0 处）。`AttributionChainView.vue` 在组件库无对应文件（App 专属 wrapper），无需镜像。
- **测试（先红后绿）**：`traceability.mount.spec.ts` 新增 5 条（零弱标记回归 / `ts_code` 优先命中 / `sector_std` 次优先命中 / 弱归因日链级 + 板块级文案分流 + `root.summary` 保留）；`EventRefChip.mount.spec.ts` 新增 2 条（`AttributionChainView` 板块行弱标记：缺省与非 `true` 不渲染 / `snapshot` vs `candidate_claim` 文案）。红验：临时关闭 `findChainChild` 的 `ts_code` 分支 → `ts_code` 优先用例失败（`Cannot call text on an empty DOMWrapper`），还原后转绿。两 spec 均已在 `vitest.config.ts` `test.include` 白名单内（**未新增文件**，node:test 基线不受影响）。
- 验收：`npx vue-tsc --noEmit` exit 0（**0 错误**）；`npm run test:node` **248/248/0**（exit 0）；`npx vitest run` 5 files / 4 tests 失败（与既有基线 5 files / 4 tests 完全一致，零新增）；组件库 `npm run type-check` 仅存量 5 条（`dev/App.vue` Segmented ×4 + `AudioPlayer.vue` ×1），零新增。
- 文档同步：`AGENTS.md`（`attributionChain.ts` / `InsightCard` / `SectorInsightCard` / `AttributionChainView` 行）、`src/modules/analytics/AGENTS.md`（traceability 行）、`src/modules/market/AGENTS.md`（归因链类型消费方，顺带修正 sector-detail「待接入」陈旧表述）。

## 2026-09-17 到期未触发（condition_met=false）口径复核 + CFB mount 用例（Task 6.1）

- **结论：组件无需改动**（后端 Task 6.1 起到期对未触发条件写 `condition_met=false`）。CFB 的折叠/过滤/「未命中」
  标签一律按「当期有无已成立分支（`met === true`）」收口——与 met 是 `false` 还是**缺省**无关 → `false` 落库后
  仍是**折叠态 + 「未命中」**（需卡级 `verification === 'miss'`），**不会**落到空态文案「条件未成立 · 暂无已验证结论」
  （该文案仅在无任何分支可渲染时出现，折叠态优先 —— 2026-09-17 既有决议）。`resolveDisplayMode`/`hasMetData`
  在生产已无调用方（仅导出待用），故不存在旧口径"false 触发结论模式却无 true 分支 → 大面积空态"的风险。
- 测试：`src/shared/components/ConditionalForecastBlock.mount.spec.ts` 新增 1 例（`met:false` ×2 + `verification=miss`
  → 折叠入口存在 + 「未命中」+ 分支节点 0 + 全文不含空态文案）→ **6/6 通过**（vitest）。
- 两副本一致性：`ConditionalForecastBlock.vue` 本次**未改动**；库/App 差异仍仅限允许项（App `import selectVisibleConditions`
  vs 库内联 + 内联 `hasMetData`/`resolveDisplayMode`），SHA256 不等属预期（`Compare-Object` 复核差异行即该段）。
- 验收：`npx vue-tsc --noEmit` exit 0；`npm run test:node` **248/248/0**（基线一致）；`npx vitest run
  src/shared/components/ConditionalForecastBlock.mount.spec.ts src/modules/analytics src/modules/market` **3 files / 14 tests passed**。

## 2026-09-17 市场洞见主因区块改造（今日影响大盘的主要板块）+ 链数据提升 + 链树事件胶囊（P3' Task 4.1/4.2）

- 「主因板块 · 板块研判」→「**今日影响大盘的主要板块**」（spec §7.1）：区块 `v-if` 由「有主因候选」改为「**链存在 && 有候选**」（无链整块隐藏、不占位）；卡列表改按 `rankSectorCandidatesByChain` 排序（自驱动优先 → |pct| 降序，pct 取链上该板块 pct，未入链排末尾；同组同 |pct| 保持原序）。
- 链数据提升到页面（Task 4.1 Step 1）：`traceability.vue` 持 `chain`/`chainLoading` ref，`watch(displayedDate)` 并行 `fetchAttributionChain(date)` + `agentApi.getSectorInsight(date)`；`AttributionChainView` 改受控 props（`chain`/`loading`/`mock`，移除组件内 fetch + onMounted/watch，保留空态/加载态与 `mock` 内置演示分支——仓库内无 mock 调用方，仅演示用）。
- 两轨分离（Task 4.1 Step 3）：`SectorInsightCard` 新增 `traceOnly`（默认 false）→ 传给 InsightCard 的 `structured` 恒 null（不渲染 CFB 预判子卡）、标题不回退预判综述（取 `candidate.trace.summary`）；主因卡传 `:market-link`（含 `events`）与 `:sector-name`，保留「依据详情 ▾」与「看该板块预判 →」。
- 命名口径（Task 4.1 Step 3）：`buildMarketLink` 原为 `children[].sector === name` 精确匹配，而链上 `sector` 是复盘报告原始名、候选 `name` 是 `resolveBoardName` 后的权威名 → 新增 `normalizeSectorName`（与 app-api `ThsBoardService.normName` 同口径：去空白/括号 + 去 概念/板块/行业/产业链 后缀 + 小写）与 `findChainChild`（精确 → 归一化；**不做包含匹配**，避免「半导体」误连「半导体材料」）；`SectorMarketLink` 加性扩展 `pct`/`events`。
- 链树事件胶囊（Task 4.2）：新建 `shared/components/EventRefChip.vue`（纯 UI：来源标记 中台/检索 + 摘要单行省略；`eventRef` 为 http(s) URL 才可点，emit `select(url)`，跳转由 wrapper 侧执行）；接入 `AttributionChainView`（每分支 `events`）与 `InsightCard`（`traceStructured.events` 加性扩展，空则不渲染该区，胶囊点击 emit `eventSelect`）；`SectorInsightCard` 接 `@event-select` → H5 `window.open` / App+小程序 webview 承载页（`pages-sub-app/webview/index?url=`）。两副本（`EventRefChip.vue` / `InsightCard.vue`）与组件库 SHA256 相等（`Compare-Object` 无输出）。
- 测试（先红后绿）：新增 `src/modules/analytics/pages/traceability.mount.spec.ts`（5 条：无链不渲染区块 / 自驱动优先排序 / 角色徽 / 主因卡无 `.as-insight-card__sc` / 事件胶囊条数）与 `src/shared/components/EventRefChip.mount.spec.ts`（8 条：来源文案区分 / URL 可点 emit / 非 URL 不可点 / InsightCard 空与有值 / `eventSelect` / 链视图空与有值）；两文件已登记 `vitest.config.ts` 的 `test.include` 白名单（`tests/run-node-specs.mjs` 未改，node:test 基线保持 `248/248/0`）。
- 验收：`npx vue-tsc --noEmit` **0 错误**（exit 0）；`npm run test:node` `248/248/0`（exit 0）；`npx vitest run src/modules/analytics src/modules/market` 2 files / 8 tests passed（exit 0）；`npx vitest run src/shared/components` 7 files / 35 tests passed + 1 套件存量失败（`NotificationDropdown.spec.ts`：`KLineChart.vue` 的 `<script setup lang="ts">` 与 `<script module="chartView" lang="renderjs">` 编译冲突，HEAD 的 barrel 已导出 KLineChart，非本次引入，未改该文件）；组件库 `npm run type-check` 仅存量 5 条（`dev/App.vue` Segmented ×4 + `AudioPlayer.vue` ×1）。
- 文档同步：`AGENTS.md`（InsightCard / SectorInsightCard / AttributionChainView 行 + 新增 EventRefChip 行）、`src/modules/analytics/AGENTS.md`（traceability 行）。

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
