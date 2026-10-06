# changelog-pending — AI Stock app 前端（aistock-app-frontend）

## 2026-10-06 首页洞见卡：次卡标签对齐四宫格 + 市场/节奏改用真实结论

- `src/modules/home/components/DynamicInsightCard.vue`：
  - **次卡尾部标签**与四宫格统一：风口/市场用组件库 `Tag`（`size="sm"` + 语义 `type`，原为纯文字）；**节奏行改用档位色块** `.dyn-sec__rhythm`（40×34rpx / 圆角 8rpx / 白色 18rpx 文字，对齐四宫格「节奏洞见」卡的 `.rhythm-chip`）
  - `RhythmRow` 新增 `hint?` 并透传到小字详情
- `src/modules/home/components/MorningContent.vue`：
  - **市场**：头条标题仍是**现象摘要**（即 `InsightCard.title` 口径的「一句话结论」，取自 `display_report.summary`）；小字详情改为**洞见卡「溯源」里显示的那句话** = `toMarketInsightBrief(toMarketTracePresentation(record, d)).trace`（`{主因分类}：{结论}`；无主因日给「可能主因（待验证）…」/「证据不足，主因待验证」），取不到再回退溯源详情 → 现象摘要
  - **节奏**：小字详情由兜底文案「档位与建议仓位」改为**真实结论**「{档位中文} · 建议仓位{仓位}」（无仓位语义时只给档位，不伪造）
- `src/shared/utils/rhythmColors.ts`（档位色板/短码唯一副本）：新增 `RHYTHM_LEVEL_LABEL` 与 `levelLabel()`（档位中文全名：冰点/低迷/常温/活跃/亢奋，未知档位如实回退短码），与 rhythm 模块 `rhythmInsight.LEVEL_LABEL` 同口径
- `src/modules/home/components/DynamicInsightCard.mount.spec.ts`：12 例（含：市场头条标题=现象摘要、小字详情=传入的溯源句；节奏行详情取传入结论、不回退兜底文案）

## 2026-10-06 首页次卡尾部标签对齐四宫格卡片

- `src/modules/home/components/DynamicInsightCard.vue`：次要焦点行尾部的标签由**纯文字**（`.dyn-sec__badge`，中性态为灰字、无底色）改为**组件库 `Tag`**（`size="sm"` + 业务语义 `type`），与四宫格卡片（`MorningContent.vue` 的 `<Tag :type="itemTagType(...)" size="sm">`）完全一致
  - `badgeTone` 的取值恰好就是 Tag 支持的 `up / down / neutral`，直接透传导出，无需额外映射
  - 删除失效的 `.dyn-sec__badge` 纯文字样式（含末尾的语义色块规则），新增 `.dyn-sec__tag { flex: none }` 保证标签不被标题压缩；`toneClass` 仍由头条 badge 使用，未删
- `src/modules/home/components/DynamicInsightCard.mount.spec.ts`：新增用例——次卡尾部标签为组件库 Tag（`as-tag--sm` + 语义 type），且不再出现 `.dyn-sec__badge`

## 2026-10-06 首页时段动态洞见卡：头条链接文案简化

- `src/modules/home/components/DynamicInsightCard.vue`：头条底部蓝色文字链由「查看详情 →」改为「**详情 →**」（样式与点击行为不变，仍 emit `navigate`）；同步更新该处 CSS 注释
- `src/modules/home/components/DynamicInsightCard.mount.spec.ts`：布局用例断言由 `toContain('查看详情')` 收紧为 `toBe('详情 →')`，锁定文案

## 2026-10-06 洞见卡「多要点行」标签宽度与字号收口

- `src/shared/components/InsightCard.vue`（`.as-insight-card__line--point`，即「重点 / 机会 / 风险」这类多要点行）：
  - 标签宽度由固定 `flex: 0 0 128rpx` 改为**随文字自适应** `flex: 0 0 auto`（保留 `white-space: nowrap`）——原先 2 字标签只占约 24rpx 文字宽却预留 128rpx，把正文整体推右
  - 标签字号 `$font-size-xs`(22rpx) → **`$font-size-sm`(24rpx)**，与「溯源 / 预判」行的 key 一致
  - 正文字号 `$font-size-xs`(22rpx) → **`$font-size-sm`(24rpx)**，与「溯源 / 预判」行的正文一致
  - 影响面：所有用 `lines` 渲染多要点行的洞见卡（个股详情「综合洞见」的重点/机会/风险、`modules/analytics/pages/report-detail.vue`）；`--trace` / `--forecast` 行不受影响
  - 纯样式改动，无行为变更；由挂载 InsightCard 的既有用例验证 SCSS 可编译，`vue-tsc --noEmit` exit 0

## 2026-10-06 个股详情「行业政策」改为逐条展开

- `src/modules/favorites/components/PolicyList.vue`（新增）：行业政策列表 + **逐条展开**
  - 每条 = 利好标签 + 正文（折叠时 2 行截断）+ **本条末尾自带的「展开 / 收起」按钮**（`▾` 展开后旋转 180°）
  - 展开态为**同时只展开一条**（`expandedIndex`）：点某条只展开该条，点另一条会自动收起前一条；再点同一条即收起
  - 仅当正文超过 42 字（对应 CSS 的 2 行 clamp）才渲染该条的展开按钮，短条目不带按钮
  - 原页面 `.policy-list/.policy-item/.policy-tag/.policy-text` 样式一并下沉到本组件
- `src/modules/favorites/pages/detail.vue`（行业政策区块）：
  - **删除全局「查看完整」按钮**及其 `policyExpanded` / `policyNeedsExpand` / `visiblePolicyList` 三个状态（原逻辑：折叠时只渲染前 2 条、点「查看完整」才显示全部）
  - 改为渲染**全部**政策条目：`<PolicyList :policies="longMockData.policies" />`，卡片显隐条件由 `visiblePolicyList.length` 改为 `longMockData.policies.length`
  - 保留 `.news-toggle` / `.news-toggle-text` 样式（资讯列表的「查看全部 N 条」仍在用）
- `src/modules/favorites/components/PolicyList.mount.spec.ts`（新增，6 例）：渲染全部条目 / 仅超长条目带展开按钮 / 点某条只展开该条 / 再次点击收起 / 无全局「查看完整」按钮 / **同时只能展开一条（开第二条自动收起第一条）**
- `vitest.config.ts`：白名单登记新 spec
- **后端链路（本次调研结论，未改代码）**：政策条目并非独立政策库或专门爬虫，而是 app-api `TrendScoreService.calcTrackDim`（行业赛道景气维度）里 `policyItems: extractPolicyItems(newsItems)` 用**关键词匹配个股新闻标题**得到的；无 LLM 参与

## 2026-10-06 个股详情页「业绩预测」图表对齐 Web

- `src/modules/favorites/components/ForecastFinancialChart.vue`（新增）：业绩预测财务图（6 序列 / 上下两块）
  - 数据源为现有 `forecastData.detailIndicators`（后端 `业绩预测详表_详细指标预测`），**零后端改动**
  - 块 1「规模与成长」：净利润 + 营业收入(剩余) 堆叠柱（左轴亿元）+ 净利润增长率折线（右轴 %）
  - 块 2「成长与估值」：营业收入增长率 / 净资产收益率（左轴 %）+ 市盈率（右轴 倍）
  - 年份轴：取「YYYY-实际值」/「预测YYYY-平均」列升序；**同年两者并存时取实际值列**（不产生重复年份）
  - 单位归一：值含「万」折算为亿（与 Web 口径一致）
  - 预测年标注：预测段起点虚线分隔 + 预测段折线虚线 + 末点空心 + 图例下方「{年} 为预测」小标
  - 缺数据：整条序列缺失则该序列与图例项都不渲染；单年份缺点则折线断开；块内无序列则该块不渲染；两块皆空则组件不渲染
  - 渲染方式：**纯 CSS/DOM**（沿用原业绩图技法），折线用「起点 + `transform: rotate` 细线段」实现；绘图区用 `padding-top: 60%` 锁宽高比，角度按 `高/宽 = 5/7` 在构建期精确换算，跨设备一致；**不引入 echarts / canvas / renderjs**
- `src/modules/favorites/pages/detail.vue`：业绩预测区块的图表调用点由 `<ForecastProfitChart :items :visible>` 换为 `<ForecastFinancialChart :detail-rows="forecastData.detailIndicators">`；**其余全部保留**（更新时间、摘要、净利润同比、年度预测 panel、详细指标折叠表、刷新按钮、空态文案）
- `src/modules/favorites/components/ForecastFinancialChart.mount.spec.ts`（新增，10 例）：两块图例项数 / 年份轴升序且同年去重 / 堆叠柱归一 / 「万」折算为亿（左轴最大刻度 100）/ 缺点断线与不画点 / 预测年标注 / 缺序列不渲染 / 缺整块不渲染 / 折线段角度与长度几何 / 全空不渲染
- `vitest.config.ts`：白名单登记新 spec
- **未删除** `components/ForecastProfitChart.vue`——它仍是 `shared/components/NotificationInsightModal.vue`（推送弹窗业绩预测区）的消费方，删不删待确认
- 设计文档：`docs/superpowers/specs/2026-10-06-stock-detail-forecast-chart-design.md`

### 2026-10-06 续：画布尺寸调整 + 弹窗同步 + 「年度预测」改图表

- `components/ForecastFinancialChart.vue`（画布尺寸收口）：绘图区比例 `padding-top` 60% → **46%**（不再偏高）；左右留白 8% → **12%**（刻度文字不再贴卡片边缘）；标题下间距 10rpx → 16rpx、两块间距 20rpx → 28rpx
- `src/shared/components/NotificationInsightModal.vue`（推送弹窗业绩预测区同步换新图）：图表由 `ForecastProfitChart` 换为 `ForecastFinancialChart`；「年度预测」列表换为 `ForecastGrowthChart`；删除随之失去引用的 `forecastChartItems`、年度预测行的 `kindClass/kindText/growthText/growthClass/progress/value` 字段与 `.ni-forecast-year-*` / `.ni-forecast-progress-*` 样式
- `components/ForecastGrowthChart.vue`（新增，替代「年度预测」列表，方案 B）：
  - 净利润增长率柱状图：同比增长红（`$up`）/ 同比下降绿（`$down`），零基线在 0 值处，正柱向上、负柱向下
  - 柱上/柱下显示带符号的增长率（如 `+25%` / `-5%`）；柱下注脚为「年份 · 净利润额」
  - 绘图区垂直范围留白：值域映射到 **8%~92%**（上下各留 8%），保证最高柱/最低柱的数值标签仍有落脚空间；网格线与刻度同高
  - 数值标签规避重叠：正柱标签贴柱顶向上生长（`bottom` 定位），负柱标签贴柱底向下生长（`top` 定位）
  - 数据源为调用方既有的年度预测行（`{ year, netProfit, growth }`），保持原有 `predictions` 优先、详表兜底口径不变
  - **重要数据事实（本轮修正）**：`ForecastPrediction` 只有 `year / netProfit / growth`，**没有 `kind` 字段**，且 `predictions` 来自后端「预测年报净利润」，**各行均为机构预测年**。因此该图**不区分实际值/预测值**（方案图上原拟的「实际/预测」标注无数据支撑，已去掉）；预测年的标注由上方业绩预测财务图的预测段承担
- `src/modules/favorites/pages/detail.vue`：图表尺寸与年度预测换图同上；删除失效的 `.forecast-year-*` / `.forecast-progress-*` 样式与年度预测行中已无消费方的视图模型字段
- `components/ForecastGrowthChart.mount.spec.ts`（新增，8 例）：柱数按年份顺序 / 正负配色 / 柱高按含 0 基线归一且负柱挂零线下方 / 带符号增长率文本 / 年份与净利润额 / 缺增长率不画柱 / 字符串百分比解析 / 空数据不渲染
- **`components/ForecastProfitChart.vue` 已于本轮删除**（detail.vue 与弹窗均已换新图；删除前 grep 全仓确认无任何引用，`dist/` 产物除外）

### 2026-10-06 续 2：图表标题排版与刻度间距收口

- `components/ForecastFinancialChart.vue` + `components/ForecastGrowthChart.vue`（三个图表统一）：
  - 图表「标题」与「单位」由同一行改为**分行**（标题在上 `$font-size-sm`、单位在下 `$font-size-xs` 作副标题），`.ffc__block-head` / `.fgc__head` 由 `row + space-between` 改为 `column + flex-start`
  - 纵坐标刻度数值与坐标轴的距离由 8rpx 增至 **16rpx**（`.ffc__tick--left` 的 `margin-right`、`.ffc__tick--right` 的 `margin-left`、`.fgc__tick` 的 `margin-right`），数值不再贴轴

### 2026-10-06 续 3：补「成长与估值」横坐标 + 移除「年度预测」图表

- `components/ForecastFinancialChart.vue`（缺陷修复）：**「成长与估值」块缺横坐标年份轴**——该块 `columns` 为空（无柱状序列），而年份行原先遍历 `columns`，导致整行年份不渲染。现新增与柱状序列解耦的 `yearAxis` 字段，年份行改遍历 `yearAxis`，两块都有年份刻度
- **移除「年度预测」图表（含组件在所有页面的调用）**——其数据（净利润 + 净利润增长率）与块 1「规模与成长」重复（块 1 已含净利润堆叠柱与净利润增长率折线）：
  - `src/modules/favorites/pages/detail.vue`：移除 `<ForecastGrowthChart>` 调用与 import；删除已无消费方的 `forecastYearRows` 视图模型，并从 `hasForecastCardData` 去掉 `forecastYearRows.value.length`（`predictions.length` 已在同处单独判定）
  - `src/shared/components/NotificationInsightModal.vue`：移除 `<ForecastGrowthChart>` 调用与 import；删除已无消费方的 `forecastYearRows` 视图模型
  - `components/ForecastGrowthChart.vue`、其 9 例挂载测试与 `vitest.config.ts` 白名单条目**已删除**（删前 grep 全仓确认仅剩文档提及；主图图例下方的「{年} 为预测」小标按确认**保留**）
- `components/ForecastFinancialChart.mount.spec.ts`：新增「横坐标年份轴在两块都渲染」用例（12 例）

## 2026-10-06 首页特别提醒：个股情报 / 自选股洞察 卡片位置调换

- `src/modules/favorites/components/AlertContent.vue`：模板中两个 `alert-module` 块顺序对调，现为「个股情报」在上、「自选股洞察」在下（原顺序相反）；数据加载与交互逻辑不变
- `src/modules/user/pages/profile.vue`：「关于洞见」版本号 v0.1.3 → v0.1.4（与 manifest.json versionName 对齐）
