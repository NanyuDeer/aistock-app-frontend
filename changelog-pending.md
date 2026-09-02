# changelog-pending.md（待提交修改记录）

## 2026-09-02 H5 dev 板块四环「加载失败」修复（vite 代理）
- `vite.config.ts`：新增 `/api/agent/sector-insight` 代理 → Node.js app-api（sectorInsightRouter 是 Node 本地路由非 Python）。此前缺失导致 H5 dev 将其落入 `/api/agent` 兜底（→ agent-py 8080）404 → 板块四环页/溯源主因板块显示「加载失败」（线上复现根因，2026-09-02）。置于 Python 兜底之前，与 trading-calendar 同款模式。

## 2026-09-02 条件化预判块通用化（板块洞见组件全粒度共用）
- `src/shared/components/ConditionalForecastBlock.vue`（新增，同步组件库）：从 InsightCard structured 抽取的**通用条件化预判块**——期段 Tab（短/中/长）+ 每期基准方向/置信/剩余时长 + 互斥分支（若 条件 → 方向 pill → scenario 幅度置灰）+ met 触发点亮/置灰 + 验证 pill + **验证锚点 chip（anchor.threshold/metric，大盘等粒度透传，板块暂无则不渲染）**。凡有条件化预判的粒度（大盘/板块/个股）一律渲染本块，与板块洞见卡同款 UI。
- `src/shared/components/InsightCard.vue`：structured 内块改为内部复用 ConditionalForecastBlock（公共 props/API 与视觉零变化）；删除迁出后冗余的期段状态/文案净化/样式。
- `src/shared/components/index.ts`：导出 ConditionalForecastBlock。
- `src/modules/analytics/components/MarketTracePrediction.vue`：删除 2026-09-02 上午自绘的 conditions 分支块（f016903），条件化预判区改嵌 ConditionalForecastBlock（PredictionPresentation → condStructured：horizon 校验自 anchor.horizon、方向自 anchor.direction、threshold/metric 作 chip）；大盘专属的状态/归因摘要/期段明细（target/metricProjection/phase）/演化路径/风险保留。prediction-detail 与市场洞见展开（MarketInsightCard）两处共用。
- 用户指示："板块洞见那个组件应属所有有条件化预判的粒度都用，而非板块粒度独占"（推翻 f016903 commit 中"不用洞见组件"的范围决策）。

## 2026-09-02 板块四环前端（sector-loop 新页 + 入口 + 主因板块洞见）
- 新增 `src/modules/market/pages/sector-loop.vue`：板块四环页（SubPageCard 白卡容器；近 7 交易日胶囊回看、默认最近交易日；大盘归因链「上证 涨/跌 → 主因板块（±x%）」；行=板块名+来源 tag(风口/大盘主因/风口·主因)+溯源短句+当日行情(红涨绿跌)+预判概要(方向 pill/待验证/已验证·命中/未中/置信)；wind_leader/both 行跳板块详情、review_primary-only 行跳大盘溯源页；空态提示「收盘后数据更全」）
- `src/pages.json`：注册 `modules/market/pages/sector-loop`（navigationBarTitleText 板块四环 / navigationStyle custom / disableScroll / slide-in-right）
- `src/modules/market/pages/leaders.vue`：GuideCard 下新增「板块预判 · 今日 ›」入口行 → `/modules/market/pages/sector-loop`
- `src/modules/analytics/pages/traceability.vue`：MarketInsightCard 后新增「主因板块 · 板块研判」区块——按展示日期（displayedDate）拉 `agentApi.getSectorInsight`，source 含 review_primary/both 的候选逐个渲染 `SectorInsightCard`；失败静默置空整块不渲染；标题右侧「全部板块 ›」跳 `sector-loop?date=`

## 2026-09-02 板块四环前端（组件/API/板块详情卡，配套上一条）
- `src/shared/components/InsightCard.vue`：同步组件库升级版（条件化预判兼容扩展）——新增 `structured` prop（horizons/conditions/dueLabel/verification）渲染"期段 Tab + 每期基准方向 + 互斥条件情景（分支点亮：met=true 整支点亮蓝缘+已触发签 / false 置灰未触发 / 缺省待观察）"；新增 `tag-text` 覆盖标签文字；condition 展示主干（括号补充剔除 condMain）、scenario 幅度段自动置灰（splitScenario）；标题「预判」；文本形态（trace/forecast）零破坏兼容
- `src/shared/components/SectorInsightCard.vue`（新增）：板块洞见卡 wrapper——candidate 命中渲染 InsightCard（板块洞见，title=板块名+当日涨跌/溯源 summary/条件化预判块），null 严格占位（D4）
- `src/shared/api/modules/agent.ts`：新增 `agentApi.getSectorInsight(date)` + SectorInsight 类型族（Candidate/Quote/Trace/Horizon/Condition/Prediction/Response；direction/confidence 窄联合）
- `src/modules/market/pages/sector-detail.vue`：AI 分析卡**洞见化回退**（还原 commit 3c319a2 前的 "AI 分析"标题 + 灰底传递行 + 风险红字样式，洞见语义让位给板块洞见卡）；新增板块洞见卡嵌入（loadSectorInsight：最近交易日 getSectorInsight → findSectorCandidate 按 code/name 匹配），位于 AI 分析卡之后、K线卡之前
- `src/shared/utils/sectorInsight.ts`（新增）：`findSectorCandidate`（code/.TI/name 匹配）+ `todayDateStr()`
- 文档：modules/market/AGENTS.md、modules/analytics/AGENTS.md、根 AGENTS.md §7 组件表同步（InsightCard 升级说明 + SectorInsightCard 新增）

## 2026-09-02 大盘条件化预判前端展示升级（MarketTracePrediction）
- `src/modules/analytics/components/MarketTracePrediction.vue`：条件化预判区由"蓝缘平铺列表"升级为**按期段（短/中/长，按 anchor.horizon 分组）的分支卡**——每组含档位标题 + 该档基准方向 pill（取 horizons 同期 direction）+ 互斥分支（序号 + 若[条件] → 方向 pill + scenario + anchor 阈值/指标 chips）；不再用洞见组件（prediction-detail/市场洞见展开两页面共用本组件，大盘条件化预判 now 后即自动展示分组分支）。注释定位"大盘/板块/个股有条件化预判同构展示"。
