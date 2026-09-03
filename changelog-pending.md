# changelog-pending.md（待提交修改记录）

## 2026-09-03 App 更新"已是最新"假阳真机排障
- 初版只在 `checkAppUpdate` 打 `[appUpdate-diag]` console 日志，但正式包无法读 console，故改为 **UI 弹窗诊断**：
  - `src/shared/utils/useAppUpdate.ts`：新增导出 `updateDiag` 快照对象（latest/current/lastResult），比对处写入；保留 console 日志便于 logcat 侧看。
  - `src/modules/user/pages/profile.vue`：`checkUpdate()` 手动检查后 `showModal` 弹出「版本检测诊断」（online latest / current / 判定 / 结果），正式包真机点「版本更新」即可看到，无需读 console。
  - **确认根因后移除**：`updateDiag` 快照、profile 里的诊断弹窗、useAppUpdate 比对处的 console 诊断日志。

## 2026-09-03 App 更新"已是最新"假阳真机排障日志
- `src/shared/utils/useAppUpdate.ts`：`checkAppUpdate` 比对处增加 `[appUpdate-diag]` 诊断日志，打印线上 `latest`/本机 `current`/`isNever`/`manual`。真机打包含本行的包，点「版本更新」后读 console 即可锁定根因（线上已 0.1.3/103 时 current<=0 或 latest<=current 仍判已最新）。**确认根因后移除本日志**。

## 2026-09-03 修复 0.1.3 更新不弹窗（version.json 缓存命中旧版本号）
- `src/shared/api/modules/appUpdate.ts`：`fetchLatestVersion` 请求 URL 追加 `?t=${Date.now()}` cache-busting——version.json 带 Etag/Last-Modified，无绕过会命中 HTTP/App 层缓存旧的 `versionCode`（如 102），即使线上已是 103 也会被 `latest<=current` 误判为"已最新"而不弹更新。本修复随下一个包生效；存量包可用「个人中心」手动检查**暂时无果**（同一旧包拉取代码仍无时间戳），需重装含本修复的新包。

## 2026-09-03 发布 0.1.3（versionCode 103）版本号升级
- `src/manifest.json`：`versionName` 0.1.2 → 0.1.3，`versionCode` 102 → 103（打包依据）
- 配套 aistock-frontend `public/download/version.json`：0.1.3 / 103 / `aistock-0.1.3.apk` / 更新文案与 releaseDate 2026-09-03（fileSize 待打包后按实际产物修正）

## 2026-08-31 账号安全页补全手机号关联（绑定手机号 + 微信绑定支持手机号账户）
- `src/modules/user/pages/account-security.vue`：当前绑定新增「手机号」状态行（脱敏 138****0000）；绑定设置新增「绑定手机号」入口；绑定表单三模式（phone/email/wechat）——绑定手机号/邮箱输入新身份，绑定微信改为**用当前账户已绑定身份证明归属**（邮箱优先、手机号次之，只读展示脱敏身份）；说明文案更新为三者互绑 + 冲突自动合并。
- `src/shared/api/modules/auth.ts`：`sendSmsCode` 新增可选 `scenario`（bind → 100004 模板）；新增 `bindWechatByPhone`（手机号账户绑定微信）。
- 配套后端（aistock-app-api）：`/api/auth/bind/wechat` 泛化支持 `email|phone` 双身份证明（手机号账户可绑微信）；删除 SmsAuthController.bindWechat 重复实现。

## 2026-09-02 预判块双模式 + 日期下拉改版（板块四环）
- `ConditionalForecastBlock.vue`：条件行**双模式**——`conditionDisplay='tags'`（默认）：有 `keywords` 显示关键词标签流（无则长句兜底）；`'sentence'`：强制长句原文（prediction-detail 大盘详细报告用）。组件库同步。
- API/映射：`keywords?: string[]` 透传（agent.ts Market/Sector Condition、prediction.ts PredictionCondition、sectorInsight 映射/条件拆分），新数据（LLM 已按 prompt 输出 ≤10 字 keywords）在板块洞见卡/四环列表以标签展示，长句仍在详细页。
- `sector-loop.vue`：日期回看改**下拉菜单**（absolute 面板 + 点外关闭，仅交易日，回今天）；**默认显示前前交易日**（今日/昨日数据常未完成或重跑不稳定）；今日/昨天胶囊语义保留。

## 2026-09-02 预判条件卡改版：条件句 → 关键词 chip（金色块语言内）
- `src/shared/components/ConditionalForecastBlock.vue`：条件行由整句金色文字改为 **关键词 chip 流**（condChips 按 且/并且/并/、/，/； 切 1~3 个；括号细节仍剔除）；期段切换/基准/方向 pill/幅度置灰/触发点亮蓝签全部原样保留。同步至组件库同文件。

## 2026-09-02 板块四环：日期筛选改版 + 对冲分支反向标签
- `src/modules/market/pages/sector-loop.vue`：日期回看由横向胶囊改为「‹ 日期 › 步进 + 中间日期点开列表浮层（最近 20 交易日、一键回今天）」，远日期不再难翻。
- `src/shared/utils/conditionalForecast.ts`：拆出的对冲分支 direction 取主条件反向（主 bullish→bearish），8-27 类历史数据拆卡后也能带看空/看多标签。

## 2026-09-02 板块四环弱溯源还原 + 条件卡内文本拆分（全粒度）
- `src/modules/market/pages/sector-loop.vue`：还原弱溯源原文（不再替换为短标签），改用**溯源横幅样式**（浅蓝底 + “溯源” key，对齐洞见卡）展示在预判块上方；头行第 2 行只保留来源 tag + 右侧日期/验证文案。
- `src/shared/utils/conditionalForecast.ts`（新增）：`expandConditionalBranches`——把 scenario 内嵌“；若X则Y”的对冲/后续情形拆成独立条件条目（方向/锚点置空随主卡），解决一张条件卡里多段文本“杂糅”。
- `src/shared/utils/sectorInsight.ts` / `src/modules/analytics/components/MarketTracePrediction.vue`：板块与大盘条件化预判映射统一接入拆分器（板块洞见卡/四环列表/大盘预测详情同源）。

## 2026-09-02 板块四环列表改版（主因置顶 + 行内条件化预判块）
- `src/modules/market/pages/sector-loop.vue`：卡片列表重构——大盘溯源主因（review_primary/both）**置顶分组**（红强调描边 + “大盘溯源·主因板块”标题），下接“风口板块（长线）”；行卡＝第 1 行（板块名+当日涨跌+方向 pill 同行，长名单行省略）+ 第 2 行（来源 tag+溯源短句两行截断，验证/日期副文案靠卡片右侧）+ 预判详情区（复用共享 ConditionalForecastBlock，无预判/无期段分支不渲染空块）。
- `src/shared/utils/sectorInsight.ts`：新增 `sectorPredictionToStructured`（板块预测→通用条件化预判块结构化，单一映射源）；`SectorInsightCard.vue` 改为复用。
- 弱溯源精简：`traceSummary` 命中“未出现可明确解释当日行情/无单一触发事件”时替换为短标签“当日无单一明确触发事件（溯源证据不足）”。

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
