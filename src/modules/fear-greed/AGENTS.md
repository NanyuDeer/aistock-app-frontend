# Fear-Greed 模块 - 恐贪指数

## 职责

展示市场恐贪指数的简化情绪温度面板：沸点/冰点生活化表述 + 投资建议 + 情绪洞见，
数据由独立的恐贪指数服务（Python FastAPI，端口 8001）实时计算。

## 页面

- `pages/index.vue`：情绪温度主面板，按渲染内容含：当前情绪 hero（恐贪指数 + 档位标签 + 更新时间）、
  半圆情绪仪表盘（指针/刻度，冰点/沸点极端档显示呼吸光圈）、历史走势折线图（近 3 个月，含交互热区 tooltip、图例、
  5-20-60 日均线数值）、投资建议卡片、AI 情绪洞见卡片、波段操作节奏入口卡、页面底部免责声明。
  **不包含**六指标导航、饼图、柱状图等复杂图表（简化版需求）。

## 波段操作节奏入口卡（2026-09-15）

- 页面顶部常驻「波段操作节奏」入口卡：外壳挂在 `.fg-page` 顶层，与 loading / error / dashboard 三分支链**并列**（不参与该 `v-if` 链），三态均显示。
- 摘要取数走 `agentApi.getRhythmMasterCalendar(2)`（2 个交易日），格式化走纯函数 `utils/fgRhythmSummary.ts`（`formatRhythmSummary` / `getRhythmUrl`，单测 `fgRhythmSummary.spec.ts`）；档位色/短码引用 `src/shared/utils/rhythmColors.ts` 唯一副本。
- 拉取失败**静默降级**为纯导航卡（`rhythmSummary = null`，不置错误态）；两行均无档位时如实展示「暂无档位」，不伪造。
- 跨日门控（2026-09-15 I2/I3 重构）：决策抽为纯函数 `utils/fgRhythmGate.ts` 的 `decideRhythmRefresh`（返回 `load` / `summary` / `none`）+ `localDayKey`（**本地自然日**）；主面板内存缓存另记拉取日 `dashboardLoadedDay`。**主面板缓存当日内有效、仅摘要跨日 → 只补拉摘要**（摘要接口持续失败时单请求隐式重试，不再连带重拉 dashboard/sectors）；**主面板跨日仍整体重拉**（顺带治愈内存缓存跨日 stale）。storage 键 `STORAGE_KEYS.FG_RHYTHM_SUMMARY_DATE`（`fg_rhythm_summary_date`）存摘要拉取日，仅拉取成功才写。
- `errorMsg` 策略：跨日刷新失败且 `dashboard` 已有缓存时**保留缓存、不置错误态**；该策略由 `shouldSetErrorMsg`（`utils/fgRhythmGate.ts`，同一纯函数文件）承载，语义不变（有缓存保留数据、避免错误页覆盖）。
- 门控与错误态策略由 `fgRhythmGate.spec.ts`（10 断言）覆盖。
- 跳转 `modules/rhythm/pages/index` **恒带 `?date=`**（取该行 `date`，即详情页 `report_date`/`target_date` 键；无有效行才不带参，不依赖详情页 fallback 链）。**勿改用 `basis_date`**：`basis_date` = 证据日 = `date − 1 个交易日`，会落到前一张卡。
- 口径文案「短线实时 / 波段昨收：周期不同，请独立判断，勿混用」；页面底部另有免责声明行。

## 入口

- 首页悬浮温度计（`shared/components/FearGreedIndex.vue`）点击跳转至本模块。
- 路由路径：`/modules/fear-greed/pages/index`。

## API

- `GET /api/fear-greed/dashboard?index=jq`：主面板数据（指数 + 历史）。
- `GET /api/fear-greed/sectors`：当日板块行情榜（topGainers/topInflows/topLosers/topOutflows，camel），供建议引擎 `utils/fgAdvice.ts` 选取配置方向；availability=false 时回退静态档位。
- 前端封装位于 `shared/api/modules/fear-greed.ts`，页面中禁止直接发起 HTTP 请求。
- 开发代理：`/api/fear-greed` → `http://127.0.0.1:8001`（见 `vite.config.ts`）。
- 悬浮温度计在 `onMounted` 时同样拉取该接口展示真实指数（失败保留默认值，不阻塞首页）。

## 开发注意事项

- 恐贪指数统一为 0-100；情绪分档用沸点/冰点生活化表述（冰点 0-20 / 寒冷 20-45 / 常温 45-55 / 温热 55-80 / 沸点 80-100），避免专业术语。
- 温度档静态常量（`ZONES`）仅作 UI 元数据（色/标签/仓位锚点）与 fallback；**投资建议/操作要点/配置方向标签走 `utils/fgAdvice.ts` 主路径**（`buildAdvice` / `buildActions` / `buildSectorTags`，输入为当前指数 + 指标 + 后端板块榜，板块不可用时回退 `ZONES` 静态档位内容）；悬浮温度计分档定义在 `FearGreedIndex.vue` 内常量维护，改动需同步。
- 当前情绪仪表盘与历史走势均为内联 SVG（data URI）：仪表盘为半圆表盘（`gaugeImgSrc`，刻度 + 指针 + 冰点/常温/沸点标签），走势图为折线图（`historyChartSrc`，含 20/80 分割线、5-20-60 日均线数值、交互热区 + tooltip）；**不引入 ECharts**。
- 情绪配色：冰点绿 `#00C853`（低吸机会）、沸点红 `#FF3B30`（过热风险），遵循 A 股"绿=机会/红=风险"直觉，勿用国际"冰红沸绿"。
- 页面必须兼容 H5 预览；后端未启动时页面展示加载/错误态。
