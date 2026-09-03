# CHANGELOG.md — aistock-app-frontend 变更记录

> 所有修改记录按时间倒序排列。每条记录标注分支、时间、开发者。

## [feat/fear-greed-node] 2026-09-03 — 恐贪建议引擎修复：操作要点恒 3 条去重 + 温热警示文案防自相矛盾

**开发者**: 林晓研

### 修复
- `utils/fgAdvice.ts` `buildActions`：修复要点数量不恒 3 条与去重失效——原逻辑检查的原始命中文案均不含"仓位"子串导致 `hitHasPosCtrl` 恒 false，纪律条恒追加，且零命中时拼出仅 2 条、寒冷档两条均以"控制仓位"开头语义重复。现改为：档位前缀 + 指标命中整体去重后不足 3 条时，用通用要点池（严格执行止损纪律 / 关注量能与换手变化 / 等待方向明朗再出手）按序补足，**任何输入恒返回恰好 3 条全文互不重复**的操作要点
- `utils/fgAdvice.ts` `buildSectorTags`：温热档警示文案按来源参数化——净流出榜无高位股、回退当日涨幅榜补位时，reason 由"高位资金流出"改为"当日涨幅已高、偏离成本区，追高风险大"，不再与"主力净流入"同现自相矛盾
- `utils/fgAdvice.ts` `tagOf`：净额措辞按符号区分——负净额输出"主力净流出 N亿"（绝对值）、正净额"主力净流入 N亿"，杜绝"主力净流入 -9亿"式表述
- 清理：删除未引用的 `DECENT` 常量及 `buildAdvice` 内 `tagNames` 自赋值死代码段

### 测试
- `utils/fgAdvice.spec.ts` 新增用例：零命中（常温 50 / 寒冷 30 / 沸点 90）恒 3 条且无重复全文；≥2 命中仍恒 3 条；温热档净流出警示用"净流出 + 绝对金额"措辞；温热档回退涨幅榜警示不与净流入冲突
- `vitest` 全绿（10 passed）；`vue-tsc --noEmit` 0 错误

---

## [feat/fear-greed-node] 2026-09-03 — 恐贪「投资建议」动态化：配置方向接真实板块行情 + 建议引擎

**开发者**: 林晓研

### 新增
- `utils/fgAdvice.ts` 建议引擎（纯函数 + vitest）：按"温度档 × 9 指标结构 × 当日板块榜"生成 配置方向(3)/操作要点(3)/advice/AI 洞见"今日主因"
- 配置方向板块来自当日真实净流入榜（恐惧期选逆势流入、过热期警示高位流出），行情不可用自动回退静态档位

### 改进
- 恐贪页建议卡由静态 ZONES 改数据驱动渲染；AI 洞见句首补当日主导因子

---

## [feat/fear-greed-node] 2026-09-03 — 恐贪历史走势图：冰点日改绿点 + 新增沸点日红点与图例

**开发者**: 林晓研

### 改进
- `src/modules/fear-greed/pages/index.vue` 历史走势图：冰点日（恐贪<20，超卖机会区）圆点由红改**绿**（#00C853，A股习惯绿=低吸机会）；新增**沸点日**（恐贪>=80，超买风险区）**红**点（#FF3B30）标记
- 图例区新增"沸点日"条目（红点，样式 `fg-chart__legend-dot--hot`），**常显**作为图例说明；出现 >=80 数据时图中自动标红点（标记为数据驱动，图例为常显）；"冰点日"图例保持原有条件显示
- 同时将图表曲线 / 5/20/60 均线 / 冰点反弹统计的数据源由「DB `historySnapshots` 日均值优先、回退 `history.scores`」统一为仅用 `history.scores`（calculator 日级序列，覆盖近 3 个月）——因 `historySnapshots` 为日内粒度、DB 仅当天数据时图表曾只显示当日；`historySnapshots` 字段保留给其他日内消费方，不再被本页图表引用

---
## [master] 2026-09-03 — 板块洞见卡标题改用 LLM 一句话研判（去板块名+涨跌幅）

**开发者**: Aria

### 改进
- `shared/components/SectorInsightCard.vue`：洞见卡"一句话"标题不再用"板块名+涨跌幅"（行情由页面统计卡展示，洞见标题应与大盘溯源"现象一句话"同构取 LLM 生成句）：
  - 优先 `prediction.attribution_summary`（板块预判综述一句话，agent 30~40 字产出，app-api 已透传）；
  - 回退 `trace.summary`（仅溯源无预判时标题即溯源主句，溯源行不再重复展示）；
  - 回退首档基准走势生成"短/中/长期预计 {label}"；
  - 兜底板块名
- 增加合规占位句守卫：`attribution_summary` 为"（点位表述已按合规要求移除）"（红线下架整句替换、无研判信息）时跳过，走后续回退
- `shared/api/modules/agent.ts`：`SectorInsightPrediction` 补可选 `attribution_summary`

## [master] 2026-09-03 — 板块详情洞见卡空壳修复（无溯源/预判不再只渲染行情标题）

**开发者**: Aria

### 修复
- `shared/components/SectorInsightCard.vue`：候选命中但既无溯源结论、也无预判分支（今日未产预判的风口板块）时，此前只渲染"板块名+涨跌幅"标题的空壳洞见卡 → 改为展示"暂无板块研判 · 该板块今日无溯源/预判记录"占位，避免把行情误当洞察内容

## [master] 2026-09-03 — 预判卡情景行换行优化（灰幅度段与黑字粘连）

**开发者**: Aria

### 改进
- `shared/components/ConditionalForecastBlock.vue`：情景正文由 flex-chip 拆分改**整句内联文本流**——灰色幅度段（+3%~+5% 等）不再以独立 chip 强拆导致前后黑字频繁孤立换行；幅度段首尾插入零宽连字符 U+2060 与前后文字粘连，行内自然换行
- 幅度识别正则补 `±`（如 `波幅小于±1%` 此前只灰化 `1%`、`±` 残留黑色）

## [master] 2026-09-03 — 预测历史页只显示大盘 + 板块预判 label 展示链路就绪

**开发者**: Aria

### 改进
- `modules/analytics/pages/prediction-history.vue`（大盘溯源预测历史 B2.1）：调用 `predictionApi.list` 显式传 `source_type: 'market_trace'`——板块预判记录（sector_prediction）不再混入大盘历史页（板块预判在板块四环聚合页查看）
- `shared/api/modules/prediction.ts`：`list` 参数补可选 `source_type`（market_trace | sector_prediction），与后端 `/api/predictions` 白名单过滤对齐

### 备注
- 板块四环预判卡 label/互斥路径展示所需字段已由后端 sector-insight 透传（app-api d34ee17），前端类型/映射此前已就绪

## [master] 2026-09-03 — 洞见卡去金重构同步：溯源/预判同构双子卡 + label 字段链路

**开发者**: Aria

### 改进
- 镜像同步组件库洞见卡重构：`shared/components/InsightCard.vue`、`ConditionalForecastBlock.vue`（同构双子卡、互斥路径“或”分隔、命中“条件成立”徽、label 缺失回退长句）

### 字段链路
- `shared/api/modules/agent.ts`：`SectorInsight`/`MarketTrace` 的 Horizon/Condition 类型补可选 `label?: string` 注解
- `shared/utils/sectorInsight.ts`：`sectorPredictionToStructured` 透传 `horizons[].label` 与 `conditions[].label`（旧数据缺省回退）
- `shared/utils/conditionalForecast.ts`：对冲分支对象清理时 label 一并置 `undefined`，防主支 label 泄漏
- `modules/analytics/utils/marketTraceReview.ts` + `MarketTracePrediction.vue`：大盘预判映射透传 label

### 测试
- `vue-tsc --noEmit` 零错误

## [changer] 2026-09-03 — 午间报「午后前瞻 → 机会/风险对位」（schema 2.1）

**开发者**: 37588

### 新增
- 早点听午间报卡「午后前瞻」由长段落改为**机会提示/风险提示左右双栏**（`briefing/index.vue`）：机会 = `午后前瞻.opportunities`（4-5 个 ≤8 字 pill，蓝），风险 = `display_report.risks`（短词 pill，红）；LLM 无明确机会（空数组）时卡保留、仅渲染风险栏全宽；opportunities 与 risks 双空整卡隐藏；老数据（无 opportunities 键）回退段落流 + 底部独立风险卡

### 改进
- `shared/utils/middayReport.ts`：`MiddaySection.opportunities?` 可选字段；`normalizeSections` 保留条件放宽（opportunities 键存在即对位，空数组兼容）；`normalizeKeywords` 防御归一（trim/去空/最多 5 个/每项 ≤8 字截断）；risks 不做内容截断（老数据长句原样保留）
- `shared/api/modules/agent.ts`：`MiddayReportRecord.content.display_report` 补可选 `sections[{ title?, conclusion?, opportunities? }]`

### 测试
- 新增 `shared/utils/middayReport.spec.ts`：新结构保留 / 空 opportunities 兼容 / 防御归一 / 老数据兼容（opportunities undefined）/ risks 不截断
- `pages-sub-app/briefing/index.spec.ts`：追加双栏对位 / displaySections 过滤 / 空机会守卫 source 断言
- `vue-tsc --noEmit` 零错误

### 文档
- 根 `AGENTS.md`：分包表「早点听」行与 §6.2 `agent.ts` 行补充 schema 2.1 对位契约（`content.display_report.sections[].opportunities` 可选）

## [changer] 2026-09-02 — 节奏大师页通用子页化 + 顶部日期条 + 首页近5日摘要卡

**开发者**: changer-collab

### 改进
- 节奏详情页 `rhythm/pages/index.vue` 与日历页 `pages/calendar.vue` 由自绘 nav + `.page{height:100%}` 迁移到通用子页容器 `SubPageCard2`（fixed 布局 + 原生滚动 + 白底导航），根治 H5 固定 9:16 视口下页面"翻不动"；底部随容器恢复全局 AI 对话栏 GlobalChatBar（报告|AI 对话胶囊|自选 + 免责声明）
- 节奏详情页内容区顶部新增**近 7 交易日紧凑日期条**（收盘基准档位色 + 短码 + 建议仓位文本，点格切换目标日并重拉三时点版本）；右上 header-right 新增"日历"入口（此前 60 日总览页无任何入口）
- 首页节奏大师卡由"仅最近 1 天摘要"改为**近 5 交易日摘要行**（MM-DD + 档位色 chip + 建议仓位，点行进该日详情），一次 `getRhythmMasterCalendar(5)` 取数，不再逐日 `getRhythmMaster`（避免放大首页 onShow 刷新成本）
- `agent.ts`：新增 `RhythmCalendarDay`/`RhythmPositionBand`/`RhythmCalendarResponse` 类型，`getRhythmMasterCalendar` 类型化（含 `position_band`）
- 修复 `chat/event/components/EventHeadlineCard.vue` `sourceInfo: () => undefined` 冗余默认值导致的 TS2322（基线遗留，挡 vue-tsc）

### 测试
- `MorningContent.spec.ts`：节奏卡近 5 日摘要相关用例更新（getRhythmMasterCalendar / goRhythmDate / 失败兜底 / onShow 接入）；`rhythm/pages/index.spec.ts`、`RhythmCard.spec.ts` 保持通过；`vue-tsc --noEmit` 零错误

### 文档
- `src/modules/rhythm/AGENTS.md`：页面容器变更、顶部日期条、首页近 5 日摘要、`position_band` 契约

## [changer] 2026-09-02 — 节奏大师下一重大事件锚点 + 洞察详情引用修复

**开发者**: changer-collab

### 新增
- `RhythmCard` 事件日历区块新增「下一重大事件」锚点条：渲染 `rhythm_card.next_event_anchor`（首条 high 事件 + 距运行日 N 天），`v-if` 控制无锚点整块不渲染（`components/RhythmCard.vue`）
- `RhythmCard` 类型加可选字段 `next_event_anchor?: { title, event_date, days_until, note } | null`（旧报告零破坏）（`shared/api/modules/agent.ts`）

### 修复
- `insight-detail-move.vue`：删除残留 `suggestedActions` 引用（建议跟踪 2026-08-25 已移除，定义删除时漏删引用），修复 TS2304

### 测试
- `RhythmCard.spec.ts`：P1 锚点渲染源码断言（next_event_anchor / v-if / 下一重大事件 / rc-anchor）

### 文档
- `src/modules/rhythm/AGENTS.md`：渲染契约表追加 next_event_anchor 字段行

## [master] 2026-09-01 — 条件化预判改造前端（Spec A，三端全量收尾）

**开发者**: Aria

### 新增
- `src/shared/api/modules/agent.ts` + `prediction.ts`：新增 `MarketTracePredictionAnchor`/`MarketTracePredictionCondition`/`PredictionCondition`/`PredictionConditionAnchor`；`MarketTracePrediction` 增加可选 `conditions`，`PredictionVerificationEntry` 扩展 `condition_index/condition_met/threshold/target_type`
- `marketTraceReview.ts`：`PredictionPresentation` 增加 `conditions`，`toPredictionPresentation` 映射后端 conditions
- `predictionHistory.ts`：新增 `ConditionStage` 与 `conditionStage(record, index)` 按 `c{i}` key 读取条件验证（独立于 horizon）
- `MarketTracePrediction.vue`：新增条件化预判块（condition+scenario+anchor 芯片），2.0 旧记录 conditions 空不渲染
- `PredictionVerification.vue`：新增条件化预判验证渲染（按 c{i}），融合 A1 early_exit 失效信号，horizon 验证保持兼容

### 测试
- `predictionHistory.spec.ts` 新增 `conditionStage` 用例；`marketTraceReview.spec.ts` 新增 conditions 映射与空兜底；`marketInsightBrief.spec.ts` 补 `conditions` 字段；node:test 28 通过，Spec A 相关 `vue-tsc --noEmit` 通过

---

## [master] 2026-08-31 — 登录页恢复「手机号验证码登录」入口（阿里云短信认证）

**开发者**: Aria

### 新增
- `login.vue`：登录方式增加「手机号验证码登录」入口按钮（`phone-line` 图标）；新增手机号表单（phone + smsCode，`handleSendSms`/`handlePhoneLogin`，手机号格式校验 `^1[3-9]\d{9}$`，60s 倒计时），与邮箱表单共享 `smsCode`/`countdown`
- `user.ts` store：新增 `smsLogin(phone, code)`（复用 `authApi.smsLogin`，存 token/userInfo 后 `fetchUserInfo`）并导出

### 说明
- 仅 App 端（aistock-app-frontend）；Web 端登录方式不变。`vue-tsc --noEmit` 通过

---

## [master] 2026-08-31 — 洞见卡标签统一 + VIP 弹窗/会员页优化 + 登录验证码可读性修复

**开发者**: Aria

### 修复
- `AiEventReport.vue` + `insight-detail.vue` + `insight-detail-move.vue`：移除三处自定义洞见标签（动因/展望、依据/展望、依据/跟踪），统一使用 InsightCard 默认「溯源/预判」，与全局洞见卡契约一致
- `login.vue` + `account-security.vue`：验证码按钮禁用态整体 opacity 导致白字变浅灰看不清，改为取消整体透明度、背景手动淡化 + 文字固定纯白
- `MarketInsightCard.vue`：通过 `:deep()` 覆盖子组件 section padding 为 0，并移除"溯源"外层白卡包装，使现象/溯源/预判卡外边界与洞见卡对齐（消除卡中卡）

### 改进
- `vip.vue`：会员身份卡由纵向居中改为横向布局——皇冠标识左对齐（渐变金色圆底），权益勾选标识加浅绿圆底，提升页面质感
- `agent-report.vue` + `ConfirmModal.vue`：非会员引导开通弹窗统一为 ConfirmModal（560rpx + 等宽 secondary/primary 双按钮）；ConfirmModal 新增 `maskClosable` prop 透传（VIP 弹窗点遮罩不可关闭）

---

## [junliang] 2026-08-28 — 修复异动详情页渲染崩溃（suggestedActions 残留引用）

**开发者**: Aria

### 修复
- `src/modules/favorites/pages/insight-detail-move.vue`：洞见卡 computed 中 `forecast` 引用已删除的 `suggestedActions`（2026-08-25 移除"建议跟踪"时漏删）→ `ReferenceError` 导致详情页渲染崩溃白屏。修复为 `forecast` 恒为空（与移除建议跟踪的决策一致），并同步注释

## [changer] 2026-08-30 — 节奏大师语义修正 + 日历热力图总览（design-debate）

**开发者**: changer-collab

### 新增
- 节奏日历热力图总览页 `pages/calendar.vue`：近 60 交易日网格（7 列按周），独立五档色板 + 图例，灰格=无报告/沿用前值，点格跳详情（带 date），H5 直开兜底
- `agentApi.getRhythmMasterCalendar(days)` API（契约 #7）

### 修复
- `RhythmCard.vue` 分支语义：拆分"触发条件 / 目标参考区间"标签、点位来源脚注、`conflict=true` 隐藏仓位建议（G2 背离纪律）、空区间"结果待公布"占位
- 详情页返回按钮 H5 直接 URL 打开时 `reLaunch` 回首页兜底
- `vite.config.ts` 新增 `/api/agent/trading-calendar` 显式代理规则（修复本地 H5 节奏大师 fallbackDate 500）

### 文档
- `src/modules/rhythm/AGENTS.md` 更新（日历页/接口/分支语义/契约 #7）

---

## [master] 2026-08-28 — 洞见卡片体系统一：横幅卡配色 + 板块洞见蓝卡 + 修复市场洞见预判

**开发者**: Aria

### 新增
- 全局 SCSS mixin `insight-banner`（洞见 key+text 卡片化：顶部小字关键词 + 底部正文，底色由 `--banner-bg` 指定）与 `insight-line`（左 key 右 text 统一排版），一处调整全站生效
- 趋势洞见独立紫色 token（`$insight-trend` 系列）与 `InsightCard`/`InsightTag` 的 `trend` 类型，与市场蓝脱色区隔

### 改进
- 洞见 key+text 全部升级为彩色横幅卡（同「归因结论」样式）：溯源=实底蓝、预判=浅金柔底（`$gold-soft-bg` #fff4de + 深金字 + 细描边）、优势=绿、风险=红；覆盖 `InsightCard`、个股综合决策（重点/机会/风险）、板块洞见等
- 板块洞见：持续原因/传递方向/传递判断 合入**同一蓝色卡片**（分隔线分开、行距优化），风险提示独立红色横幅；AI 分析卡上移至板块 K 线上方
- 全站接入统一洞见卡片（事件页/情报页/异动页/业绩洞见/趋势详情），溯源/预判 与 lines（优势/风险/建议）字段契约稳定
- 洞见解 line 统一排版抽离（key=22rpx/600/$primary，text=26rpx/$ink-soft/400），个股详情与板块页同步生效

### 修复
- 市场洞见页预判恒显示"暂无预判"：预测记录改为按**报告真实日期**关联（后端 review 查询会回退返回最近可用报告），回退场景也能命中预测；日期标签同步显示真实报告日期
- `InsightCard` 的 `trace`/`forecast` 声明为可选，修复 report-detail 传 `lines` 时的类型报错

### 文档
- AGENTS / README / LLM prompt 改造建议（字段契约、横幅卡语义色、板块洞见关键词）同步

---

## [changer] 2026-08-28 — 市场洞见展开详情渲染修复

**开发者**: 37588

### 重构
- 展开详情现象块复用 MarketTracePhenomenon 完整卡片（严重度标签 + 指数表现/领涨领跌网格），移除手写现象块与领涨领跌代码，清理 detail computed / sectorNames 等无引用代码与样式
- 溯源块删除冗余「主因」标题，结构收敛为「溯源 → 归因结论」；预判去掉外层「预判」标题，三块统一单层标题（核心现象 / 溯源 / 影响持续性预判）

---

## [changer] 2026-08-27 — 市场洞见页改造：完整归因报告改为简短洞察卡

**开发者**: 37588

### 改进
- 市场洞见页（原大盘溯源报告页）由完整归因报告改版为「简短洞察卡 + 展开详情」：卡片完整呈现现象/溯源/预判与置信度（不截断省略），展开后按现象/溯源/预判三块展示详情
- 移除备选链、被拒候选、待确认风险与「完整报告（原始）」折叠区块，信息更聚焦
- 无预判记录时不再显示"预判生成中/今日暂无预判"空态占位，改为卡片内兜底提示

### 文档
- README/AGENTS/分析模块说明同步（简短洞察卡改版）

---

## [master] 2026-08-27 — 午间报切换修复 + 盘中要点从 details 解析 + 卡片样式统一

**开发者**: Aria

### 修复
- 晨/晚报切换后路由不更新（URL 停在进入时类型）→ `switchType` 状态切换 + H5 `history.replaceState` 同步 URL 类型参数（不重建页面）
- 切回午间报后残留晨报 Agent 洞见 → `fetchReportFor` 午间报分支先清空 items/report/eveningViewModel，杜绝类型间数据串扰
- 晚报切回午间报盘中要点卡片消失 → 根因：后端 `display_report` 只返回 `details`（markdown），不返回结构化 `sections` 字段，前端只消费 `sections`（恒空）→ 盘中要点从未渲染。修复：`middayReport.ts` 新增 `parseSectionsFromDetails` 从 details「## 第N部分：标题」解析分段摘要（标题去前缀、结论为要点合并），`parseMiddayReport` 在 sections 为空时兜底；结论加 `-webkit-line-clamp: 3` 截断；保留 loadSeq 竞态守卫

### 改进
- 盘中研判标题方标「盘」→ 早报同款 ★ 星标；盘中要点分段卡片改洞见卡同款布局（左侧方标 + 右侧标题/结论随 body 缩进）；风险提示标题字号/字重统一 28rpx/600（红色保留）；风险编号列表项加 20rpx 左缩进

### 验证
- `npx tsc --noEmit` 通过；`parseSectionsFromDetails` 用真实后端 details 解析出「上午盘面回顾/午后前瞻」2 个分段

---

## [xusiyun] 2026-08-27 — 修复事件原文详情页顶部状态栏遮挡

**开发者**: xusiyun

### 修复
- `src/pages-sub-app/event-article/index.vue`：页面配置 `navigationStyle: custom` 后自绘导航栏从屏幕最顶渲染，返回按钮与「原文详情」标题被系统状态栏/摄像头/刘海遮挡。修复：页面根容器增加 `paddingTop: statusBarHeight`（`uni.getSystemInfoSync().statusBarHeight`，APP 端除以 zoom 1.2 补偿，与 SubPageCard2 同款方案），兼容 iOS 刘海 / Android 状态栏 / 普通设备 / H5（H5 statusBarHeight=0，无额外顶部空白）。
- 验证：`npm run type-check` 通过；`npm run build:app` 构建通过且产物含修复；H5 实测 statusBarHeight=0、导航栏紧贴视口顶端、正文正常从导航栏下方开始；真机待验证。

## [changer] 2026-08-26 — AI 投顾追问面板（回答后底部建议追问 + 输入框）

**开发者**: 37588

### 新增
- 追问面板：回答打字机完成后底部弹出建议追问胶囊 + 输入框；点胶囊发送追问 → 面板收起、输入栏恢复；无 questions（deep 降级/闸门/澄清）不弹面板；× 收起恢复 quick-skills 行，消息 footer「查看追问」弱入口可恢复；上滑（followPaused）不自动弹、弱入口可恢复
- ChatMessage 增加 `questions?: string[]`（WS/HTTP 容缺消费，`[]` 与 `undefined` 均视为无建议）；FollowupSuggestChips 组件自组件库复制接入；面板状态机 + 打字机完成信号触发（typingMsgKey → null 才展示，F2 守卫）

### 改进
- 新发送轮/发送追问收起面板；立即展示路径保留 pending（× 收起后 footer 弱入口可恢复）；删除气泡胶囊与 parseFollowupQuestions 解析器（单一追问面板范式）

### 验证
- vitest useChatStream 48/48 + node:test chat/index 49/49 + tsc/vue-tsc 0 错误

---

## [master] 2026-08-26 — 悬浮播报 App 端面板定位修复

**开发者**: Aria

### 修复
- `FloatingPodcast.vue`：展开面板右缘出屏 + 面板头部最右侧「关闭」按钮落在屏外点不到（用户反馈"× 叉不掉"、"右偏移到屏幕外"）。根因：App 内核整页缩放时 `right` 定位推算右缘溢出屏外（与既有注释记载的 App rpx 基准不一致问题一致）。修复：App/小程序分支静止/吸附/展开统一改为 `left` px 计算定位并 clamp（右缘恒为 winW - margin），面板与悬浮球完全落在屏内，关闭按钮回到可点击区域。
- 验证：`FloatingPodcast.spec.ts` 2 个用例通过；`npx tsc --noEmit` 通过。

---

## [master] 2026-08-26 — 文档：部署 Web 前端流程补充

**开发者**: Aria

### 文档
- `docs/app-update-release-process.md`：补充「部署 Web 前端」章节警告（`npm run build -- --dest` 无效，`scripts/build.js` 忽略 `--dest`，须用 rm+cp 方案）并新增常见问题条目「部署后网页没更新」（2026-08-26，0.1.2 重发时实测踩坑）

---

## [master] 2026-08-26 — 我的页 UI 完善 + 统一确认弹窗 + Modal 隐形拦截修复 + 多端适配

**开发者**: Aria

### 新增
- 统一确认弹窗 `src/shared/components/ConfirmModal.vue`：基于 Modal 组件（白色圆角卡片 + 标题 + 关闭叉号 + 内容区 + footer 等宽按钮），样式与版本更新弹窗（UpdateModal）一致；支持 `v-model:visible`、title/content、confirmText/cancelText、showCancel（信息弹窗）、danger（删除等危险操作红字确认）；替换原生 `uni.showModal`（H5 浏览器原生样式不统一）：
  - `profile.vue`：确认退出、确认删除（danger）、确认重置、关于洞见（单按钮）
  - `favorites.vue`：删除自选股（单个/批量，danger）
- 多端适配（方案 B 中等自适应，平板/折叠屏/横屏大屏）：
  - `src/pages.json` globalStyle 配置 rpx 收敛参数（`rpxCalcMaxDeviceWidth: 1024` 等，平板/折叠屏展开时 rpx 放大不再失控）
  - 新增 `src/shared/utils/useAdaptiveScreen.ts`：宽屏判断（阈值 700px）+ `uni.onWindowResize` 监听窗口变化（折叠屏展开/收起、平板旋转实时响应）
  - `src/shared/utils/h5-scale.ts` 支持画布模式切换（手机 390×693 / 平板竖屏 860×900 / 平板横屏 1194×834 / 大屏 1024×768）：切换时同步 html font-size（rpx 基准）与 #app 尺寸，仅 H5 开发环境显示右下角切换按钮（localStorage 持久化）
  - 宽屏布局：MainTabs/SubPageCard/SubPageCard2 宽屏内容限宽 1200px 居中；首页 feature-grid 宽屏 3 列

### 修复
- Modal.vue 隐藏态隐形拦截：`.as-modal:not(.is-visible) .as-modal__dialog { pointer-events: none }`——弹窗隐藏时（opacity:0）dialog 不再占据 DOM 捕获指针事件，修复首页「机构推荐热门股」整卡点不开（CDP 实证：居中的不可见版本更新弹窗恰好盖住屏幕中央卡片）；一并解决所有使用 Modal/UpdateModal 页面屏幕中央区域被隐形拦截的同类问题
- 账号与安全页双顶栏：`src/pages.json` 为 `account-security`/`vip` 页补 `"navigationStyle": "custom"`（此前原生导航栏与 SubPageCard2 自带白色导航栏同时渲染）
- ListCell 可点击列表项 H5 光标：`.as-list-cell.is-clickable` 补 `cursor: pointer; user-select: none`（与 Card 组件一致）
- 首页白色卡片与提醒模块卡片按压动效：MorningContent.vue（feature-card/track-card）与 AlertContent.vue（module-card）复用 briefing-card 点击动效（`:active { transform: scale(0.98); box-shadow: $shadow-sm }`），与「今日专属」卡片一致

### 改进
- 账号与安全页改用 SubPageCard2（v2 白色导航栏，与 vip/insight/monitor 等新子页面视觉统一）：`account-security.vue` 由 SubPageCard v1 迁移，`noChatBar` → `no-chat-bar`，内容区顶部加 32rpx 间距
- profile.vue「对话引导」重置先弹确认窗：确认后才清除 `chat_empty_guide_closed` 标记并提示，取消无操作
- profile.vue「关于」入口修正：由仅弹 toast（版本号过期 v2.1）改为弹关于对话框（洞见 v0.1.2 + 简介 + 免责声明），菜单项移到「版本更新」下方；最终菜单顺序：自选股 → 账号与安全 → 对话引导 → 版本更新 → 关于
- 文档：`src/modules/user/AGENTS.md` 补充 account-security/vip 页面登记，注明 SubPageCard2 容器使用情况

### 验证
- CDP 实证：Modal 隐形拦截根因（`document.elementFromPoint` 命中 um-footer）+ 修复后真实鼠标点击卡片跳转成功；多端画布切换（尺寸/rpx 基准/缩放）、首页 is-wide 类、宽屏 3 列均正常
- 多端适配经 5 轮验收修正收敛（平板按宽缩放/完整显示、画布模式 4 个、宽屏限宽 1200px、平板竖屏 860×900 等）

---

## [master] 2026-08-26 — 午间报展示与播报 + 邮箱登录 App 联调 + 请求 scheme 修复

**开发者**: Aria

### 新增
- 首页「今日专属」报卡补充午间报：`src/modules/home/components/MorningContent.vue` 按时间自动切换晨报/午间报/晚报（12:00–15:30 显示午间报，摘要+短关键词标签与晨/晚报样式统一）；`src/shared/utils/useBriefingCard.ts` 扩展支持 `midday` 类型（走 `/agent/report/midday/:date` 的 display_report 结构，晨/晚报仍走 `/agent/brief/:type/:date`）；`briefingTypeAtShanghaiTime` 时段划分：15:30+ 晚报 / 12:00–15:30 午间报 / 早间晨报
- agent-report 概览加入「午间报」入口：`src/modules/chat/pages/agent-report.vue` 概览卡片在「收盘复盘」正上方新增午间报卡片（`OVERVIEW_ORDER` 增加 `midday`），走统一 `/agent/report/:intent/:date` 读取，点击 `selectAgent('midday')` 原地加载详情；`AGENT_META`/`titleMap` 新增 midday 配置
- `src/shared/utils/middayReport.ts`：新增 `MiddaySection` 接口与 `normalizeSections` 归一化多分段摘要（仅保留含非空 conclusion 的项，容忍 LLM 字段缺漏/顺序变化）
- `src/shared/utils/briefingNavigation.ts`：`buildBriefingUrl` 类型扩展支持 `midday`
- 邮箱登录 App 前端联调打通：`Input.vue` 修复输入框高度塌缩为 0px 无法点击（`.as-input__inner` 固定 `height: 88rpx; box-sizing: border-box`）与 v-model 失效（`handleInput` 优先读 uni-app 标准 `event.detail.value`，保留 `target.value` 兜底）；邮箱登录表单验证码发送、60s 倒计时与登录落盘正常

### 修复
- App 调试请求 scheme 错误导致首页无数据：`src/shared/utils/constants.ts` 新增 `isExternalUrl()`（仅接受绝对且非回环地址），`API_BASE_URL`/`WS_BASE_URL`/`AGENT_WS_BASE_URL` 在 APP-PLUS 下仅接受外部绝对地址、否则兜底线上，不再被 dev 注入的相对 `/api` 或 `localhost` 覆盖（真机/基座调试不再报 `request:fail Expected URL scheme 'http' or 'https'`）；`src/shared/api/request.ts` baseURL 直接复用 constants 的 `API_BASE_URL`，删除重复的 `|| /api` 判定
- 早点听午间报格式对齐晨/晚报（精简）：`src/pages-sub-app/briefing/index.vue` 午间报页由「完整长报告」改为与晨/晚报一致的精简结构——播报器 + 「盘中研判」结论卡 + 风险提示洞见卡，移除 `details` 全文渲染，新增「查看完整报告」入口 `openMiddayFullReport()` 跳转 agent-report 查看完整 Markdown
- 邮箱绑定报错透传 + 空壳账户自动接管：`src/shared/api/request.ts` 非 2xx 错误归一化时把原始响应体挂到 `error.data`；`src/modules/user/pages/account-security.vue` `handleBind` 失败 toast 优先取 `e.data.message`，绑定被空账户占用的邮箱时自动释放旧账户并绑定成功
- `src/shared/components/MainTabs.vue`：移除 `touch-action: none`（H5 端预览 App 会禁用浏览器原生触摸滚动与点击识别，导致「划很多次才动」、卡片点击无反应）

### 验证
- `vue-tsc --noEmit` 退出码 0；`node --import tsx --test` 相关用例全过（含午间报入口/格式新增用例）

---

## [master] 2026-08-25 — App 手机号短信验证码登录 + 账号与安全绑定

**开发者**: Aria

### 变更
- `src/shared/api/modules/auth.ts`：新增 `sendSmsCode` / `smsLogin` / `bindPhone` / `bindWechat` 接口
- `src/shared/store/modules/user.ts`：新增短信登录、手机/微信绑定 actions，维护 `phoneBound` / `wechatBound` 绑定态
- `src/modules/user/pages/login.vue`：登录页新增「手机号验证码登录」入口与表单（手机号/验证码输入、60s 倒计时、dev 固定测试码 123456），可切回微信登录
- `src/modules/user/pages/account-security.vue`（新增）：账号与安全页——展示并绑定/解绑手机号与微信，归属冲突 409 时展示引导文案
- `src/modules/user/pages/profile.vue`：新增「账号与安全」入口
- `src/pages.json`：注册 `modules/user/pages/account-security` 路由

### 说明
- 微信老用户数据保留：手机号登录后可在账号与安全页绑回原微信；微信用户也可绑定手机号，两渠道数据归属同一账户

---

## [master] 2026-08-25 — AI 报告详情改 VIP 会员专属 + 移除导出（renderjs 导出实现一并清理）

**开发者**: Aria

### 背景
- 手机端导出 PDF 体验差、renderjs 视图层生成不稳定（预生成/导出超时），且在手机上阅读/截图即可满足需求 → 移除「导出报告」，报告改为 App 内纯阅读；同时报告详情设为 VIP 会员专属，非会员进入详情前弹窗引导开通

### 变更
- `src/modules/chat/pages/agent-report.vue`：移除导出入口（右上角「导出报告」按钮）与全部导出实现（renderjs `pdfExporter` 模块、预生成缓存、`savePdfAndShare`、`onPdfBase64/onPdfError` 等）；新增 VIP 门禁 `vipModalVisible` 弹窗，概览→详情与深层链接两条路径均校验 `userInfo.isVip`，非会员回退展示概览并引导跳转 VIP 页
- `src/modules/user/pages/vip.vue`（新增）：会员中心占位页（SubPageCard2 容器，含「开通会员」底栏与开发中提示；`isVip` 时切换为已开通态）
- `src/pages.json`：注册 `modules/user/pages/vip` 路由
- `src/shared/components/FloatingPodcast.vue`：连续播放开关改用 uni-app 原生 `<switch>`（消除「Failed to resolve component: Switch」构建警告）

### 说明
- VIP 判定沿用 `userInfo.isVip`（后端 `/users/me` 的 `is_vip` 归一化）；未登录按非会员处理

## [junliang] 2026-08-27 — 统一午尾盘异动与涨停雷达详情展示逻辑 + 候选归因板块调整

**开发者**: Aria

### 改进
- `src/modules/favorites/pages/insight-detail.vue`（涨停雷达详情）：归因明细（次要因素行）改为候选归因卡片列表，与午尾盘异动详情页同款 cand-card——统一两端展示逻辑；"主因判定"标签改为"支持性主因"；`.section-title` 与价格异动页样式对齐
- `src/modules/favorites/pages/insight-detail-move.vue`（午尾盘异动详情）：板块名称调整——"主因"→"支持性主因"、原"支持性主因"区→"候选归因"；候选归因过滤由仅 supported 扩为 supported+weak（证据不足/反向排除不展示）；移除"建议跟踪"区块（2026-08-25 决策）

---

## [master] 2026-08-25 — 发布流程文档补全 + 修复「已装 0.1.1 仍反复弹更新」

**开发者**: Aria

### 修复
- `src/shared/utils/useAppUpdate.ts`：本机 versionCode 读取改走 `plus.android.invoke(pkgInfo,'get','versionCode')`（不可直接 `pkgInfo.versionCode` 属性访问，否则读不到返回 0 被误判比线上旧而反复弹更新）；`current<=0`（读取失败）保守视为已最新，避免反复误弹

### 文档
- `docs/app-update-release-process.md`：补全第 0 节「前置条件与权限」（HBuilderX 开发版 / DCloud 云打包权限 / 正式签名证书 / SSH / 仓库访问）、第 2.0 节「打包前 git pull 最新主干」、第 3 节正式证书注意事项、第 5 节 `export PATH` 前置、自检清单与 10 步流程速览、FAQ 补充

---

## [master] 2026-08-25 — 首页简报卡片：大盘无归因时改用市场异象关键词标签

**开发者**: 协作

### 修复
- `src/modules/home/components/MorningContent.vue`：`summaryTags` 当头条为「归因结论」且结论命中降级文案（`证据不足|未确认主因|暂无明确主因`）时，改从市场异象条目（收盘复盘/市场快照）取结论切标签；新增 `isDowngradedAttribution` / `marketAnomalyText` 辅助函数
- `src/modules/home/components/MorningContent.spec.ts`：新增静态断言校验降级判定与市场异象回退逻辑

---

## [changer] 2026-08-25 — AI 投顾对话页长按菜单优化（滑动误触 + 原位浮动菜单 + 圈选复制）

**开发者**: 37588

### 改进
- 修复消息列表滑动时仍计算长按导致误弹出菜单的问题：改为手动触摸判定（按住 350ms 触发 + 位移超过 10px 取消），滚动过程不弹出。
- 底部 ActionSheet 替换为长按原位浮动菜单，无遮罩、无模糊、不跳页，贴视口边缘自动内收。

### 新增
- 长按菜单新增「选中文字」，点击后启用系统原生拖拽手柄圈选，浮出「复制已选」按钮，复制优先取选中片段、未圈选则整条复制；仅 App 生效。

---

## [changer] 2026-08-24 — 早点听新增午间报（盘中报）展示与播报

**开发者**: 37588

### 新增
- 早点听由晨报/晚报两个入口扩展为晨报/午间报/晚报三个入口，新增午间报（盘中报）入口。
- 午间报展示盘中摘要、详细解读与风险提示；当日未生成时自动回退最近可用报告并标注日期。
- 午间报音频就绪时支持播报播放，音频未生成时仅展示文字内容。

## [junliang] 2026-08-24 — 洞察页异动按最近触发时间排序 + 详情只展示支撑性主因

**开发者**: Aria

### 改进
- `src/modules/favorites/pages/insight.vue`：异动列表排序由首次触发时间改为最近触发时间（`window_end_at` 兜底 `triggered_at`），长窗口事件不再沉底
- `src/modules/favorites/pages/insight-detail-move.vue`：异动详情页候选只展示支撑性主因（supported），隐藏证据不足/偏弱候选，标题改"支撑性主因"
- `src/shared/api/modules/stockTrace.ts`：`StockTraceEvent` 新增 `window_end_at` 字段（最近触发/窗口更新时间）

## [master] 2026-08-24 — 0.1.1 发版：修复 APP 启动白屏 + 版本号保持 0.1.1（修复开发版 bug）

**开发者**: Aria

### 修复
- App 启动白屏（部分老旧 Android WebView 缺少 `TextEncoder`，PDF 导出链 fast-png 在模块顶层 `new TextEncoder()` 抛 ReferenceError）：
  - `vite.config.ts`：新增 `prependGlobalPolyfill` 插件，在发行打包时把 TextEncoder/TextDecoder polyfill 字面前插到 bundle 开头，先于 fast-png 执行。
  - `src/shared/utils/global-polyfills.ts`（新增）：TextEncoder/TextDecoder 兜底实现，作为 `main.ts` 首条 import，保障 dev（HBuilder 运行）场景按 import 顺序先定义。
  - `src/main.ts`：首行导入 `global-polyfills`。
- 循环依赖导致的分块执行顺序损坏：
  - `src/shared/components/KLineChart.vue`：`EmptyState` 从 barrel `index.ts` 改为直接导入 `./EmptyState.vue`，切断 `KLineChart → index.ts → KLineChart` 回环。
- App 端 `performance-now` 被当外部依赖导致 `require$$0$1 is not defined`：
  - `package.json`/`pnpm-lock.yaml`：显式新增 `performance-now ^2.1.0`（raf 的运行依赖），让 Rollup 能解析并打包。

### 变更
- `src/manifest.json`：`versionName` 保持 0.1.1，`versionCode` 保持 101（修复开发版 bug，正式版仍为 0.1.1）。
- `public/download/version.json`（Web 端）：`versionName` 0.1.1/`versionCode` 101，`downloadUrl` 指向 `aistock-0.1.1.apk`，文案由 APP 介绍改为本次更新内容。

---

## [master] 2026-08-24 — 0.1.1 发版：修复 HBuilder/App 打包失败 + 应用内更新弹窗 + 版本号升至 0.1.1

**开发者**: Aria

### 修复
- HBuilder/App 打包失败（`Rollup failed to resolve import "@babel/runtime/helpers/typeof"` 与 `iife ... not supported for code-splitting`）：
  - `src/modules/chat/pages/agent-report.vue`：PDF 导出 `html2canvas`/`jspdf` 改为文件顶部静态 import，移除函数内动态 `import()`（动态导入触发 code-splitting，与 App 的 iife 输出冲突）。
  - `vite.config.ts`：App(app-plus) 平台将 `jspdf` alias 到自包含的 UMD 构建（`jspdf/dist/jspdf.umd.min.js`，无动态 import）；删除与 uni `manualChunks` 冲突的 `forceInlineDynamicImports` 插件。
  - `package.json`/`pnpm-lock.yaml`：补齐 `@babel/runtime`、`fflate`、`fast-png`、`dompurify`、`canvg`、`core-js`、`stackblur-canvas`、`svg-pathdata`、`text-segmentation`、`raf`、`rgbcolor`、`iobuffer`、`pako` 到顶层依赖。

### 新增
- 应用内版本更新弹窗（更新操作入口 + 永久关闭版本标记）：
  - `src/shared/utils/useAppUpdate.ts`：启动检查移除 24h 节流，写入全局 `updatePromptState`；新增「永久关闭」标记（`app_update_never_v{versionCode}`）与 `neverUpdateStorageKey`/`isNeverUpdate`/`downloadAndInstall`。
  - `src/shared/components/UpdateModal.vue`：复用 `Modal`+`Button` 的更新弹窗，「立即更新」/「永久关闭」/仅叉掉下次仍提示。
  - `src/shared/components/MainTabs.vue`、`src/modules/user/pages/profile.vue`、`src/shared/components/index.ts`：挂载 `<UpdateModal />`。

### 变更
- `src/manifest.json`：`versionName` 0.1.0→0.1.1，`versionCode` 100→101（触发存量用户自动更新）。

---

## [master] 2026-08-24 — 恐贪指数悬浮温度计改为首页晨报头部入口按钮

**开发者**: 林晓研

### 重构
- `src/shared/components/FearGreedIndex.vue`：恐贪指数从「悬浮可拖拽温度计」重构为「头部紧凑按钮」（情绪色点 + 恐贪前缀 + 数值 + 分档标签 + 右箭头），点击跳转恐贪指数页；拉取失败保留默认值，不阻塞首页渲染
- `src/shared/components/MainTabs.vue`：`FearGreedIndex` 从 MainTabs 底部悬浮改为嵌入晨报 Tab 头部（`activeTab === 'morning'` 时显示）

---

## [master] 2026-08-24 — 投资建议仓位改为数据驱动动态计算

**开发者**: 林晓研

### 变更
- `src/modules/fear-greed/pages/index.vue`：新增 `positionRange` 计算属性，建议总仓位由「静态分档区间」改为**数据驱动动态仓位**：
  - **基准曲线**：按当前恐贪指数在各温度档锚点（各档预设区间中心）间线性插值，指数越接近中性(50)仓位越高、两端防守低仓，随指数连续变化、无跳档
  - **动态修正**：冰点区域且历史次日反弹概率 ≥70% 加 8%（超跌布局）；5日均线高于20日均线 +3、低于 -3（趋势修正）
  - 钳制在 10%-90% 区间
- `src/modules/fear-greed/pages/index.vue`：仓位条与文字改读 `positionRange.min/max`；`positionMin/positionMax` 保留为各档锚点数据

---

## [master] 2026-08-24 — 历史走势图改为每日单点折线（去掉盘中3次路径与K线影线）

**开发者**: 林晓研

### 变更
- `src/modules/fear-greed/pages/index.vue`：历史走势图主线由「每日 3 次 intraday 快照（pre→noon→post）连续路径」改为**每日单点折线**——每天一个恐贪指数值（DB 快照日均值优先，回退 `history.scores` 日级序列），数据更干净、趋势更直观
- `src/modules/fear-greed/pages/index.vue`：删除 K 线式当日区间影线（涨绿跌红）及其「日内上涨/日内下跌」图例与样式（`.fg-chart__line-wick-*`），不再展示盘中粒度
- `src/modules/fear-greed/pages/index.vue`：tooltip 简化为「日期 + 恐贪指数」两项，去掉盘前/正午/盘后三行；`chartData` / `activeDayData` 相应移除 snapshots 依赖

---

## [master] 2026-08-24 — AI 洞见字体与页面正文对齐

**开发者**: 林晓研

### 变更
- `src/modules/fear-greed/pages/index.vue`：AI 洞见正文字号/颜色对齐卡片正文风格（`$font-size-sm` + `$ink-soft`，与「投资建议」段落一致），避免 md+ink 过重破坏页面协调

---

## [master] 2026-08-24 — AI 洞见样式调整（去底色、去标签、加大加深字体）

**开发者**: 林晓研

### 变更
- `src/modules/fear-greed/pages/index.vue`：AI 洞见文本去掉「为什么：」「后续预判：」字面标签，仅保留两句式结构（第一句市场情绪总结 + 第二句后续预判）
- `src/modules/fear-greed/pages/index.vue`：删除 `fg-insight--trend` 的淡蓝底色 + 左边框样式，洞见正文不再有底色
- `src/modules/fear-greed/pages/index.vue`：`.fg-insight` 字号由 `$font-size-sm` 提升到 `$font-size-md`，颜色由 `$ink-soft`（灰）改为 `$ink`（正文深色），提升可读性

---

## [master] 2026-08-24 — 恐贪指数页删除历史参照 + AI 洞见改为"为什么+后续预判"

**开发者**: 林晓研

### 变更
- `src/modules/fear-greed/pages/index.vue`：AI 情绪洞见卡片删除「历史参照」（上次到达当前水平约 X 天前）提示条
- `src/modules/fear-greed/pages/index.vue`：历史走势图例「恐贪指数(盘中3次)」简化为「恐贪指数」（不再赘述盘中3次）
- `src/modules/fear-greed/pages/index.vue`：AI 情绪洞见逻辑重构为**「为什么 + 后续预判」一句话/两句话格式**——「为什么」由情绪档位 + 情绪总结话语 + 5/20日均线关系构成，「后续预判」基于历史走势图数据（冰点反弹概率优先，其次均线排列）；替换原静态 `zone.insight` + `trendInsight` 两段文本
- `src/modules/fear-greed/pages/index.vue`：`ZoneDef` 的 `insight`（长段静态解读）字段改为 `summary`（精炼情绪总结话语，供 AI 洞见"为什么"部分使用）
- 同步删除废弃的 `zoneStats` 计算属性及 `fg-ref` 样式

---

## [master] 2026-08-24 — 恐贪指数页删除趋势对比/关键信号/指数名展示

**开发者**: 林晓研

### 变更
- `src/modules/fear-greed/pages/index.vue`：AI 情绪洞见卡片删除「趋势对比」（较昨日/较上周/近30天同区间）区块——信息与历史走势图重复，图表已能直观呈现变化
- `src/modules/fear-greed/pages/index.vue`：AI 情绪洞见卡片删除「关键信号」（北上资金/升贴水率/避险天堂/指数波动）卡片网格，洞见区聚焦文字解读
- `src/modules/fear-greed/pages/index.vue`：hero 区删除「韭圈儿恐贪指数」名称展示，右侧仅保留更新时间
- 同步删除废弃的 `trend` / `keySignals` 计算属性及对应 `fg-trend` / `fg-signals` / `fg-hero__name` 样式

---

## [master] 2026-08-24 — 恐贪指数历史走势图新增交互 tooltip（悬停/点击查看每日数据）

**开发者**: 林晓研

### 新增
- `src/modules/fear-greed/pages/index.vue`：历史走势图新增交互热区层——每日一列透明热区（对齐 SVG 点位），H5 端 `mousemove` 悬停、App/H5 `tap`/`touchstart` 点击均可选中当日；选中日显示竖向十字线 + 高亮圆点，热区列淡蓝高亮
- `src/modules/fear-greed/pages/index.vue`：新增悬浮 tooltip——显示选中日日期、综合指数、盘前/正午/盘后三次快照值（缺失项隐藏），靠近左右边缘时自动调整对齐方向避免溢出；未选中时默认显示最新一日数据
- 配套 `fg-chart__hotzone-container` / `fg-chart__hotzone` / `fg-chart__tooltip` 系列样式（`touch-action: none` 防止热区拦截页面滚动）

### 变更
- `src/modules/fear-greed/pages/index.vue`：历史走势卡片标题提示语更新为「近 3 个月 · 滑动查看每日」，引导用户交互

---

## [master] 2026-08-24 — 恐贪指数图表改为单线+K线影线 + 卡片顺序调整

**开发者**: 林晓研

### 变更
- `src/modules/fear-greed/pages/index.vue`：历史走势图去掉中热度线（20日MA），改为单线展示每日 3 次 intraday 快照（pre→noon→post→次日pre 连续路径）；新增 K 线式当日区间影线（每日 min~max 垂直线，涨绿跌红），让每个点直观显示当日波动范围
- `src/modules/fear-greed/pages/index.vue`：图例更新——移除「短热度/中热度」双线图例，新增「恐贪指数(盘中3次)」+「日内上涨/下跌」影线图例 +「冰点日」
- `src/modules/fear-greed/pages/index.vue`：卡片顺序调整——「AI 情绪洞见」移到「投资建议」前面，让用户先看数据驱动的情绪分析再看操作建议

---

## [master] 2026-08-24 — 恐贪指数图表短线改为 intraday 3次/日 + AI 趋势研判

**开发者**: 林晓研

### 新增
- `src/shared/api/modules/fear-greed.ts`：新增 `FearGreedSnapshot` / `FearGreedHistorySnapshots` 接口；`FearGreedDashboard` 新增可选 `historySnapshots` 字段，承载后端每日 3 次（pre/noon/post）intraday 快照
- `src/modules/fear-greed/pages/index.vue`：AI 情绪洞见新增「趋势研判」——基于图表均线（5/20/60日）多空排列、当前值 vs 5日均线偏离、冰点反弹概率生成数据驱动洞见文字，蓝色左边框样式区分静态 insight

### 变更
- `src/modules/fear-greed/pages/index.vue`：历史走势图短热度线由「5日 MA」改为「每日 3 次 intraday 快照」（pre/noon/post 各一点，跨日不连接），更敏锐反映盘中情绪波动；中热度线保持 20日 MA（基于日级 composite 均值）
- `src/modules/fear-greed/pages/index.vue`：`historyChartSrc` / `movingAverages` / `icePointStats` 数据源优先使用 `historySnapshots.composite`（与图表口径一致），无 DB 快照时回退到 `history.scores`
- `src/modules/fear-greed/pages/index.vue`：图例标签更新——「短热度(5日)」→「短热度(盘中3次)」、「中热度(20日)」→「中热度(20日均线)」

---

## [master] 2026-08-24 — 恐贪指数页新增历史走势图 + 冰点反弹统计

**开发者**: 林晓研

### 新增
- `src/modules/fear-greed/pages/index.vue`：仪表盘卡片后新增「历史走势」卡片——SVG 双线折线图（短热度5日MA蓝色 + 中热度20日MA橙色）+ 五色色带背景，取近 60 交易日数据，冰点位置标记红圆点，含双线图例
- `src/modules/fear-greed/pages/index.vue`：图表下方新增均线数值区——5日/20日/60日均线当前值，颜色随热度区间变化
- `src/modules/fear-greed/pages/index.vue`：AI 情绪洞见卡片新增「冰点反弹统计」——从历史数据计算冰点出现次数、次日反弹概率、平均反弹幅度，配套数据驱动洞见文字（≥70% 高概率 / ≥50% 中等 / <50% 趋势性下跌三档解读）

---

## [master] 2026-08-24 — 自选分时图盘中实时刷新 + mini 分时视觉优化

**开发者**: Aria

### 新增
- `favorites` 分时图模式盘中实时刷新：`fenshiMode` 开启且处于 A 股交易时段内，每分钟轮询拉取全部分时覆盖缓存（`refreshMinuteData`/`syncMinuteRefresh`）；定时器由 `watch(fenshiMode)`/`onShow`/`onUnmounted` 管理，非交易时段自动停止。

### 改进
- `MiniKLine` 分时折线视觉：折线/均价线/蜡烛影线加 `vector-effect=non-scaling-stroke`，消除 `preserveAspectRatio=none` 非等比拉伸导致的线宽不均；分时不画成交量时价格区扩展至画布底部，消除底部空白带；`buildScale` 支持下边界参数。
- `favorites` 分时图尺寸：mini 高度收敛至 82rpx（与行高一致）、宽度加宽至 320rpx；新增 `showVolume`/`showAvg`/`maxLinePoints` 控制项。
- `favorites-grid` 分时图开启成交量柱。

---

## [master] 2026-08-24 — 应用内版本更新 + 报告导出 PDF + 分时图优化

**开发者**: NanyuDeer

### 新增
- 报告导出：`agent-report` 详情页"概览"按钮替换为"导出 PDF"（`isVip` 会员解锁，非会员 toast 提示）；`jspdf` + `html2canvas` 生成多页 A4 PDF，修复多页分片截断并优化单次编码性能；`UserInfo`/store 接入 `isVip`。
- 分时图：`favorites` 表头"三横线"按钮开启每行 mini 分时图（懒加载缓存、涨红跌绿、图标高亮）；`MiniKLine` 分时折线修复（面积基线修正 + 纯逻辑抽离 `miniKLineLogic.ts` + TDD 7 用例）。

### 改进
- 应用内版本更新：更新弹窗展示版本号+文件大小、安装失败引导开启"安装未知应用"、`plus.runtime.install` 失败兜底 `openFile`；记录发布 SOP。

### 文档
- 修正分时 mini 图修复范围表述，标注需真机实证。

---

## [master] 2026-08-21 — 修复温度计首帧出现在左上角后跳变到左侧中间的闪烁

**开发者**: Aria

### 修复
- `src/shared/components/FearGreedIndex.vue`：`posX/posY` 初始值由 `0,0`（左上角）改为声明时即初始化到「左侧贴边、屏幕纵向中部」（`EDGE_MARGIN_PX`、`(DESIGN_HEIGHT-240)/2`），首帧直接渲染在目标位置，消除先左上角再移动的闪烁；H5 端 winH 恒为 `DESIGN_HEIGHT` 故 onMounted 不再移动，App 端用真实窗口高度同步重算一次。

---

## [master] 2026-08-21 — 恐贪指数温度计默认位置改为界面左侧中间

**开发者**: Aria

### 改进
- `src/shared/components/FearGreedIndex.vue`：`onMounted` 初始定位改为**左侧贴边、屏幕纵向中部**（`posX = EDGE_MARGIN_PX`），替代原右侧贴边（视觉"悬空飘动"）；保留可拖拽 + 磁吸左右边缘 + 点击跳恐贪页。
- 恒显示默认值12、点击无页面的根因不在前端：后端 `/api/fear-greed` 路由漏挂，已由 aistock-app-api 侧修复（见该仓库 CHANGELOG）。

---

## [changer] 2026-08-20 — 批次4：消息长按操作菜单（复制/删除/重发）+ 引导追问胶囊升级

**开发者**: 37588

### 新增
- `src/pages-sub-app/chat/index.vue`：消息项接入 `@longpress` 长按，弹出 ActionSheet 操作菜单（复制 / 重发 / 删除，删除为危险项）；复制走 `uni.setClipboardData`，重发回填输入框（可编辑后走正常 send，规避加性历史截断），删除走 `chatStore.removeMessage`；流式生成中禁用长按。
- `src/shared/store/modules/chat.ts`：新增 `removeMessage(messageId)` 本地隐藏删除——从 `messagesBySession` 移除该条并持久化；assistant 消息反算扣减 `sessionUsage`（钳到 0）、清理对应 `feedbackRecords`；删除首条 user 消息时用剩余消息重算会话标题并同步 sessions。后端 LangGraph 加性历史不可单条删，服务端线程保持不变。
- 引导追问按钮升级为浅色胶囊（`border-radius: 999rpx` + `:active` 反馈），对齐豆包。

### 测试
- `tests/chatRemoveMessage.test.ts`（新增）：覆盖 user/assistant 消息删除、tokenUsage 反算扣减、标题重算、反馈记录清理、无副作用用例。
- `src/pages-sub-app/chat/index.spec.ts`：补充批次4长按/复制/重发/删除/胶囊按钮接线断言。

---

## [junliang] 2026-08-20 — 价格异动详情迁移 insight-detail-move + 相对昨收涨跌幅展示

**开发者**: Aria

### 重构
- `src/modules/favorites/pages/insight-detail-move.vue`：重写为 stocktrace 五层归因详情页（company/sector/market/capital/technical 候选 + 证据包 + 置信度），替代原 movement-detail 页；`movement-detail.vue` / `movement.vue` 删除
- `src/shared/utils/insightNavigation.ts`：价格异动/stocktrace mv 事件导航从 movement-detail 切到 insight-detail-move；涨停雷达保持 insight-detail
- `src/pages.json`：删除 movement/movement-detail 路由；insight / insight-detail / insight-detail-move 页改为 custom 导航样式 + disableScroll

### 改进
- `src/modules/favorites/components/AlertContent.vue`：异动卡片适配（方向/相对昨收涨跌幅/归因短语展示）
- `src/modules/favorites/pages/insight.vue` / `insight-detail.vue` / `monitor.vue`：归因状态与 primary_cause 展示适配
- `src/shared/api/modules/insight.ts`：`WatchlistInsight` 新增 `change_pct`（相对昨收涨跌幅，主判定口径）
- `src/shared/api/modules/stockTrace.ts`：`StockTraceEvent` 新增 `primary_cause`（归因短语，LLM 生成）

### 测试
- `insight-detail.spec.ts` / `monitor.spec.ts` / `AlertContent.spec.ts`：适配新增字段与详情页逻辑

### 文档
- `AGENTS.md` / `src/modules/favorites/AGENTS.md` / `src/modules/home/AGENTS.md`：详情页路由与归因展示更新

### 验证
- vitest 相关用例通过；vue-tsc 0 错误

---

## [junliang] 2026-08-15 — 自选股价格异动归因：movement 列表页/详情页与首页卡片

**开发者**: Aria

### 新增
- `src/modules/favorites/pages/movement-list.vue`：自选股尾盘价格异动列表页（展示五层归因候选列表，含股票/涨跌/归因摘要/置信度）
- `src/modules/favorites/pages/movement-detail.vue`：异动详情页（五层候选详情 tab，含 evidence 证据包展示）
- `src/modules/home/components/MovementCard.vue`：首页"异动捕手"卡片（Top5 异动事件入口，点击跳转 movement 列表页）

### 改进
- `src/shared/utils/insightNavigation.ts`：insightNavigation 分流逻辑——价格异动类型从 insight-detail 改为 movement-detail 跳转，涨停雷达保持 insight 路径

### 验证
- vitest 相关用例通过；vue-tsc 0 错误；build:h5 成功

---

## [master] 2026-08-19 — App 录音改回 amr+8k（HTML5+ 原生；后端转码 PCM 16k 送火山 V3）

**开发者**: Aria

### 修复
- `src/shared/utils/speechInput.ts`：`manager.start({ format: 'pcm', sampleRate: 16000 })` → `{ format: 'amr', sampleRate: 8000 }`。线上魔数取证 `format:'pcm'` 在 HTML5+ Android 产出「假 .pcm 实为 AMR-WB」（Android 录音只原生支持 amr/aac/3gp），V3 只支持 pcm/opus/mp3 识别为空 →「未识别到语音」；改回两端原生支持的 amr，由后端 asrController 用 ffmpeg-static 转码后识别（见 aistock-app-api）。
- `src/shared/utils/speechInput.spec.ts`：录音格式断言 pcm+16000 → amr+8000。29/29 通过。

---

## [master] 2026-08-19 — App 录音格式升级 PCM 16kHz（配合后端火山 V3 豆包流式 ASR）

**开发者**: Aria

### 变更
- `src/shared/utils/speechInput.ts`：App 录音 `manager.start({ format: 'amr', sampleRate: 8000 })` → `{ format: 'pcm', sampleRate: 16000 }`。后端 ASR 升级 V3「豆包流式语音识别大模型」（见 aistock-app-api）：V3 仅支持 pcm/wav/ogg/mp3（不支持 amr）、rate 必须 16000。
- `src/shared/utils/speechInput.spec.ts`：「录音以 amr + 8kHz 启动」用例同步改为 pcm + 16kHz；「start 同步抛错」用例错误文案 amr → pcm。29/29 通过。

---

## [master] 2026-08-19 — 修复 App 语音「语音识别服务异常」误报（res.data 未 parse 吞真实错误）

**开发者**: Aria

### 修复
- `src/shared/utils/speechInput.ts`：新增导出纯函数 `parseAsrUploadResult(data, statusCode)`——App 真机 `uni.uploadFile` success 的 `res.data` 是字符串，此前直接当对象读 `body?.message` 得到 undefined → 吞成「语音识别服务异常」笼统文案；统一 JSON.parse 兜底后透出后端真实 message。`uploadAudioFile` success 回调改走该函数。

---

## [master] 2026-08-19 — App 语音 ASR 直传文件路径（uni.uploadFile 根治真机 WebSocket is not defined）

**开发者**: Aria

### 修复
- `src/shared/utils/speechInput.ts`：App 分支 `readFileAsArrayBuffer`（plus.io.FileReader 全链路）+ `uploadAudio` 替换为 `uploadAudioFile(tempFilePath)`（`uni.uploadFile` 直传路径，底层 plus.uploader 原生上传，绕开 readFile 引擎缺陷）。
- 契约变更：`AppSpeechDeps` 由 `readFileAsArrayBuffer + uploadAudio` 改为 `uploadAudioFile(tempFilePath)`；配套后端 `/api/agent/asr` 改 multer multipart（见 aistock-app-api）。

---

## [changer] 2026-08-19 — App 语音 readFile 真机 `WebSocket is not defined`：plus.io 读取子步骤全量 try/catch + 阶段透出

**开发者**: 37588

### 修复
- `src/shared/utils/speechInput.ts`：App-PLUS 的 `readFileAsArrayBuffer` 把 `plus.io` 读取每个子步骤（`新建 FileReader` / `readAsDataURL` / `base64 转 ArrayBuffer` / `resolveLocalFileSystemURL` / `entry.file` 等）独立 try/catch + 阶段前缀透出。`new plus.io.FileReader()`/`readAsDataURL()` 属同步调用、原本跑在 plus 回调、不在 Promise 自动捕获范围，真机内核在此裸读缺失的 `WebSocket` 全局时 ReferenceError 会直抛页面；现改为受控 reject（toast 显示「读取录音文件失败（<阶段>）：<原因>」），既不崩页面又精确定位炸点。
- **硬约束不变**：App 读文件仍只用 `plus.io.FileReader.readAsDataURL`（未用标准 FileReader / getFileSystemManager）。

### 文档
- `docs/2026-08-18-app-voice-asr-troubleshooting.md`：新增第 6 轮排查记录——真机在「录音结束」页面报 `WebSocket is not defined`，判定为 plus 回调内未捕获的同步 ReferenceError，已分阶段透出、待真机复验后靶向修复。

---

## [master] 2026-08-19 — App 真机 KLineChart 改用 uCharts canvas（renderjs 真机不渲染）

**开发者**: Aria

### 修复
- `src/shared/components/KLineChart.vue`：K 线渲染分支从「H5 || APP-PLUS → renderjs+klinecharts」改为「H5 → renderjs、APP-PLUS || MP-WEIXIN → uCharts canvas」；修复 App 真机（APP-PLUS）WebView 中 renderjs+klinecharts 不渲染导致 K 线空白；H5 保留 klinecharts 交互。

---

## [master] 2026-08-19 — 风口龙头板块「净流入」展示位改为「成交额」（同花顺实时，元）

**开发者**: Aria

### 改进
- `src/shared/api/modules/stock.ts`：`WindLeaderSector` 类型 `net_inflow` → `amount`（板块当日成交额·元）。
- `src/modules/market/pages/leaders.vue`、`src/modules/market/pages/sector-detail.vue`：统计格「净流入/formatNetInflow」→「成交额/formatAmount」（元→亿/万）。

---

## [master] 2026-08-19 — 自选股编辑态 + 多股同列 + 语音输入/图标修复

**开发者**: Aria

### 新增
- 自选股编辑态（`src/modules/favorites/pages/favorites.vue`）：
  - 点击表头编辑图标进入编辑态，右上角"完成"退出；编辑态隐藏统计栏与行情列，行展示勾选框 + 名称代码 + 右侧拖拽手柄。
  - 批量删除：勾选多只（支持全选）后点底部"删除(n)"，`removeMany` 一次提交，删除后同步编辑列表。
  - 拖拽排序：右侧手柄触摸相邻交换实现排序，点"完成"时若顺序变化则 `saveOrder` 统一保存到后端。
  - 左滑删除仅普通态生效（编辑态手势被勾选/拖拽接管）。
- 多股同列（新增 `src/modules/favorites/pages/favorites-grid.vue`）：自选页表头网格图标进入，2 列宫格卡片，
  每格显示 名称+代码 / 最新价 / 涨跌幅 / 涨跌额 + 迷你 K 线图（含成交量）；顶部切换 分时/五日/日K/周K/月K，
  切换后全部卡片同步刷新；点击卡片跳个股详情；行情复用 favoritesStore，K 线按周期全部加载 + 前端 Map 缓存。
- 迷你 K 线组件（新增 `src/modules/favorites/components/MiniKLine.vue`）：纯 SVG 跨端，分时/五日折线图，
  日/周/月蜡烛图 + 成交量，涨跌色与自选页一致（涨红跌绿）。
- `src/shared/store/modules/favorites.ts`：新增 `removeMany`（批量删除）、`saveOrder`（保存排序）。
- `src/shared/api/modules/stock.ts`：
  - 新增 `saveFavoritesOrder`，调 `PUT /users/me/favorites/order`。
  - `getKLine` 扩展支持 `minute`/`five` 周期（klt=1），自动带 `startDate`（分时近 3 自然日、五日近 9 自然日）
    限定分钟数据范围，避免拉全量历史分钟数据导致超时。
- `src/pages.json`：注册 `modules/favorites/pages/favorites-grid` 路由。
- `src/modules/favorites/AGENTS.md`：补充编辑态、多股同列、MiniKLine 组件及周期加载说明。

### 改进
- `src/pages-sub-app/chat/index.vue`：麦克风图标由输入框外部内嵌到输入框右侧（绝对定位），常态灰色、录音激活蓝色圆底白图标。

### 修复
- `src/shared/components/SvgIcon.vue`：H5 下图标路径改用 `import.meta.env.BASE_URL` 拼接，解决 base `/h5/` 下硬编码 `/static` 导致 404、图标不显示。
- `src/shared/api/request.ts`：`delete` 方法修正为 luch-request 三参数签名（请求体放第二参数），解决 DELETE 请求体解析为空导致自选移除失败。
- `MiniKLine.vue` 样式 `stroke: $AVG` 修正为字面量 `#2563eb`（`$AVG` 非 SCSS 变量，原写法触发 sass 编译错误导致页面点击报错）。

### 验证
- `vue-tsc --noEmit`：新文件零错误（仅剩 event-chain 既有错误，与本次改动无关）；H5 页面模块编译通过。

---

## [feat/fear-greed-node] 2026-08-18 — 恐贪指数模块接入 Node 后端 + 情绪温度页/首页悬浮温度计

**开发者**: 林晓研

### 新增
- `src/modules/fear-greed/pages/index.vue`：情绪温度主面板（当前情绪 + 垂直圆柱温度计 + 投资建议 + AI 情绪洞见，沸点/冰点分档）
- `src/modules/fear-greed/AGENTS.md`：模块文档
- `src/shared/components/FearGreedIndex.vue`：首页悬浮温度计（沸点/冰点分档，onMounted 拉真实 API）
- `src/shared/api/modules/fear-greed.ts`：恐贪指数 API 封装（dashboard/history/refresh）

### 改进
- `vite.config.ts`：`/api/fear-greed` 代理 target 由 Python 8001 改为 Node app-api（apiTarget 3000），2026-08-15 起恐贪服务随 app-api 提供服务

---
## [changer] 2026-08-18 — 修复 App 语音输入「录音失败」根因（诊断透出 + plus.io 读取）

**开发者**: 37588

### 修复
- App 端语音输入（右侧点击麦克风 / 按住说话）真机「录音失败，请重试」跨设备复现：`start()` 同步抛错 与 录音临时文件 `readFile` 失败 两处此前把真实异常吞成固定文案，无法定位根因
- 现于两处失败分支透出真实原因（`录音启动失败：<err>` / `读取录音文件失败：<err>`）+ `console.error('[asr] …')`
- 真机确根因一：readFile 抛 `ReferenceError: nativeFileManager is not defined` —— 系 `uni.getFileSystemManager().readFile` 的 uni App 引擎框架缺陷（补 `manifest.json` 的 `FileSystem` 模块已验证无效），改用 HTML5+ `plus.io` 读取
- 真机确根因二：`plus.io` 读取首版误用标准 Web `FileReader.readAsArrayBuffer` → 报 `FileReader is not defined`（App 端无标准 FileReader）→ 改 `plus.io.FileReader.readAsDataURL`（返回 base64 DataURL）剥前缀，抽 `dataUrlToArrayBuffer` 纯函数（有单测）
- 排查经验沉淀：`docs/2026-08-18-app-voice-asr-troubleshooting.md`（4 轮失败链 + 硬约束）

### 验证
- speechInput.spec.ts 21/21 通过；vue-tsc 无新增错误（剩余 event-chain 为既有基线）
- 需重新云打包真机验证 App 端 readFile 不再报 nativeFileManager

---
## [changer] 2026-08-17 — 对话体验批次 5：深度分析降级渲染 + 滚动交互优化 + 股票卡片优化

**开发者**: 37588

### 新增
- 深度分析降级渲染：WebSocket 不可用走 HTTP 非流式时，深度分析摘要卡与结构化卡片正常展示（与 WS 主路径对齐）
- 滚动交互优化：AI 生成期间上滑翻看历史不强制钉底；发新消息统一复位跟随；从个股详情页返回对话时恢复原阅读位置
- 股票卡片优化：卡片头部信息拆两行分层（名称+代码 / 价格+涨跌幅）；点击卡片跳转个股详情页

### 修复
- 滚动贴底误判缺陷：内容高度未知（测量失败）时不再误判贴底、也不再强制拉回底部，保持当前跟随状态

### 验证
- 类型检查 0 错误；相关单测通过（含一轮发送仅触发一次贴底滚动的运行时回归断言）

---
## [master] 2026-08-18 — App 端应用内版本更新（全量 APK）
**开发者**: Aria

### 新增
- `src/shared/utils/constants.ts`：新增 `DOWNLOAD_BASE_URL`（默认 `https://gupiao.yaozhineng.com/download`，可用 `VITE_DOWNLOAD_BASE_URL` 覆盖）——Web 端 public/download/ 托管的静态资源地址，非 API 域
- `src/shared/api/modules/appUpdate.ts`：`fetchLatestVersion()` 拉取 version.json（静默降级返回 null）、`resolveDownloadUrl()` 拼接 APK 下载地址
- `src/shared/utils/useAppUpdate.ts`：`checkAppUpdate({ manual })` 版本检查——非 Android App 环境返回 not_supported；启动自动检查 24h 节流（storage key `app_update_last_check`）；有新版本弹窗 → `uni.downloadFile` 下载 → `plus.runtime.install` 安装；本机 versionCode 经 `plus.android` 原生 PackageManager 读取
- `src/App.vue`：APP-PLUS 端启动后 3s 静默执行 `checkAppUpdate()`（自动更新检查）
- `src/modules/user/pages/profile.vue`：菜单新增「版本更新」项 → `checkAppUpdate({ manual: true })` 手动检查（latest/not_supported/error 分别 toast）

### 发布新版本流程
- 打包新版 APK → 上传至 Web 端 `public/download/` + 递增 version.json 的 versionCode/versionName → 部署 Web；用户在应用内启动/手动检查即可收到更新提示

### 验证
- `npx vue-tsc --noEmit` 通过（残留 event-chain/index.vue 报错为改动前已存在，与本改动无关）

## [master] 2026-08-17 — 非交易日过滤 + 悬浮播报全局持续播放

**开发者**: Aria

### 新增（非交易日过滤）
- `src/shared/api/modules/agent.ts`：新增交易日历 API `getPreviousTradingDay` / `getNextTradingDay` / `getRecentTradingDays`
- `pages-sub-app/briefing/index.vue`、`pages-sub-app/briefing-detail/index.vue`、`modules/chat/pages/agent-report.vue`：`changeDate` 改为按交易日历跳档（跳过周末/法定节假日），接口异常回退自然日加减；早报列表页手动切换同时清除"回退最近可用报告"提示态
- `modules/home/components/MorningContent.vue`：市场洞见日期由"今天 + 前 2 自然日"改为最近 3 个交易日

### 改进（悬浮播报全局持续播放 + 贴右缘出屏修复）
- 新增 `src/shared/utils/floatingEngine.ts`（模块级全局音频引擎单例：同 src 复用不重播、切页仅解绑事件不销毁、关停真正停机）+ `floatingEngine.spec.ts`
- `src/shared/components/AudioPlayer.vue`：新增 `persist` 模式；`src/shared/components/FloatingPodcast.vue`：贴右缘出屏修复（App/小程序渲染基准改用 `uni.upx2px(750)`）并承载持久化播放；`src/shared/store/modules/podcast.ts` 在 resetPlayer/startPlayback/open/close 调用 `destroyPersistent`
- `MainTabs.vue` / `SubPageCard.vue` / `SubPageCard2.vue`：维护 activePage、移除 FP-DEBUG 探针；`vitest.config.ts` 纳入 floatingEngine.spec 与 switch 自定义元素

### 同批随带
- 其余遗留改动（favorites 自选/异动、chat 卡片与对话、AlertContent、leaders/sector-detail、Modal/PodcastCard、request/briefing/stock api 与 constants、vite.config、manifest.json、AGENTS.md）随本 commit 一并提交

### 验证
- 非交易日过滤与悬浮播报相关改动：vue-tsc 无新增错误（event-chain/index.vue 既有 placeholder 报错与本批无关）
- 测试：floatingEngine.spec 4 项 + podcast.spec 13 项 + FloatingPodcast.spec 通过

---

## [changer] 2026-08-17 — App 语音输入录音格式 wav → amr（Android 真机「录音失败」根因修复）

**开发者**: 37588

### 背景
App 真机语音输入反复「录音失败，请重试」。systematic-debugging 定位：该文案只来自设备侧 `readFile` 失败（`uploadAudio` 内部吃掉异常，不产生此文案）；「录完才报错」排除 `start()` 抛错与 `onError`。根因：uni-app App 端底层是 HTML5+ `plus.audio.getRecorder`，**Android 不真正支持 `wav` 录音**，传 wav 生成「假 .wav 实为 amr」的无效文件 → `fs.readFile(tempFilePath)` 失败。（前次 mp3→wav 修复仅过 H5 build、未真机验证 Android，方向自身错了。）

### 修复
- `src/shared/utils/speechInput.ts`：`appRecognize` 启动录音 `{ format: 'wav', sampleRate: 16000 }` → `{ format: 'amr', sampleRate: 8000 }`（AMR-NB 窄带固定 8k，Android/iOS HTML5+ 原生支持）；`uploadAudio` `Content-Type: audio/wav` → `audio/amr`；同步注释与 `AppRecorderManagerLike` 格式说明

### 验证
- `speechInput.spec.ts` 定向 19/19 通过（RED→GREEN：断言 `{format:'amr',sampleRate:8000}`），全量 vitest 相关无新增失败；vue-tsc 改动文件 0 错误（`event-chain/index.vue` 为既存无关类型错误）

### 配套（后端 app-api，同批）
- `VolcAsrService` 音频协议 `format:'wav',rate:16000` → `'amr',rate:8000`；`index.ts`/`asrController` `express.raw` 消费 `audio/amr`（见 app-api changelog）

### 待真机验证
- 重新打包 App，Android 真机语音输入应成功回填文本；后端 `/agent/asr` 收到 amr 请求并识别

---

## [master] 2026-08-17 — 风口龙头 leaders 页：短线榜改为"上榜次数-热度"排序 + 净流入 0 显示为 --

**开发者**: Aria

### 修复
- `src/modules/market/pages/leaders.vue`：
  - 短线风口榜排序由「短线持续天数 short_term_days → freq20」改为**上榜次数（近10日 freq20）→ 热度（short_heat）降序**（长线榜保持 long_term_days → frequency 不变），与后端 `applyDualRankings` 短线口径统一；修复短线档原按 AI 天数排序与"上榜次数-热度"预期不符的问题
  - `formatNetInflow`：净流入为 0 时显示 `--`（与 Web 前端一致，moneyflow 缺失时后端回填 0，避免显示误导性的"0万"）

### 验证
- vue-tsc 零新增错误（event-chain 8 个既有错误与本次无关）；用线上数据模拟新排序，顺序符合上榜次数→热度降序

### 配套（后端 app-api，同批）
- `applyDualRankings` 短线榜排序对齐 + `getLatestDailyMap` 最近交易日窗口 3→10 天（修复周一凌晨 moneyflow 取空导致净流入全 0，见 app-api changelog）

---

## [changer] 2026-08-16 — 对话卡死恢复止血（问题 20 R3）：WS 发送 idle 超时兜底

**开发者**: 37588

### 修复
- `src/shared/utils/useChatStream.ts`：WS 发送后 idle 静默段超时兜底——`_STALL_TIMEOUT_MS=1800_000`（30min 校准期，正式值按首周 P95）+ `_STALL_CHECK_INTERVAL_MS=10_000` 间隔检查 `lastActivityAt`；超时落 assistant「生成超时，请稍后重试」+ 复位 streaming + 发 `{type:"stop"}` 联动后端 finalizing 护栏（不误杀将成之轮）+ 结算 send promise；`finishRun`/`abortPendingSend`/`_testReset` 清理定时器
- `src/shared/utils/useChatStream.spec.ts`：新增 stall 超时 describe 4 用例（超阈值落超时消息/事件刷新不误触发/done 清理定时器/校准期常量断言 1800000）

### 验证
- spec 46/46 + 全量 vitest 无新增失败（8 既有=基线）+ vue-tsc 改动文件 0 错误

### 配套（后端 agent-py，同批）
- ws.py RuntimeError 捕获 + ChatTaskManager finalizing 护栏/660s 兜底（见 agent-py changelog）

---

## [changer] 2026-08-15 — App 语音输入录音格式 mp3 → wav（修复真机 start 抛错「录音失败」）

**开发者**: 37588

### 背景
云打包真机复测：点击麦克风显示「正在聆听」后立即弹「录音失败，请重试」——`manager.start({format:'mp3'})` 同步抛错（部分 Android ROM 缺 libmp3lame 编码器，mp3 录音不可靠）。

### 修复
- `src/shared/utils/speechInput.ts`：App 端录音 `format: 'mp3'` → `format: 'wav', sampleRate: 16000`（uni-app App 官方支持 wav 免额外插件；与后端火山 ASR format/rate 对齐）；上传 `Content-Type: audio/mpeg` → `audio/wav`；`AppRecorderManagerLike.start` 签名支持 `sampleRate`

### 验证
- `speechInput.spec.ts` 19/19（新增「wav + 16kHz 启动」断言）
- vue-tsc 无新增错误、`uni build -p h5` 通过

### 配套（后端 aistock-app-api，同 PR 窗口）
- `VolcAsrService` `audio.format` 'mp3' → 'wav'；`/api/agent/asr` express.raw type 'audio/mpeg' → 'audio/wav'；asrController/测试同步

---

## [changer] 2026-08-15 — 修复 App 真机语音输入不可用：manifest 补录音能力 + 壳层同步异常防护

**开发者**: 37588

### 背景
App 云打包真机测试发现：点击语音输入按钮弹系统提示后无法录音回填。正反辩论定位为两条链路叠加：
1. `manifest.json` 未配置录音能力（`modules` 缺 Record、Android permissions 缺 `RECORD_AUDIO`、iOS 缺 `NSMicrophoneUsageDescription`）→ 云打包 APK 运行时录音模块缺失弹原生提示；
2. 代码级缺陷：`handleMicTap` 在 try 外同步调用 `startSpeechRecognition()`，壳层 `getAppDeps`/`bridgeRecorder` 无异常防护 → 录音管理器抛错时按钮卡死无提示。

### 修复
- `src/manifest.json`：
  - `app-plus.modules` 新增 `"Record"`（录音模块，云打包必需）
  - Android `permissions` 新增 `android.permission.RECORD_AUDIO`
  - iOS `distribute.ios.privacyDescription` 新增 `NSMicrophoneUsageDescription`（"用于语音输入"，防 iOS 无描述直接崩溃）
- `src/shared/utils/speechInput.ts`：
  - `appRecognize` 对 `deps.getRecorderManager()` 增加 try/catch 防护（同步异常转错误态，Promise 永不 reject，不炸穿调用方）
  - `getAppDeps` 壳层整体 try/catch（`uni.getRecorderManager()` 异常时返回 null 走错误降级）

### 验证
- `speechInput.spec.ts` 18/18 通过（新增 1 个 G2 防护测试：getRecorderManager 同步抛错 → 错误态，不 reject）
- 全量 vitest 与 vue-tsc 无新增失败（insight-detail/TraceabilityPage 8 个失败为既有基线，stash 验证）
- `uni build -p h5` 构建通过

### 待办（组长）
- 重新云打包 APK（含 Record 模块 + RECORD_AUDIO）
- 后端配置 `VOLC_ASR_APPID/TOKEN/CLUSTER` 火山凭证（否则录音后上传 503）

---

## [master] 2026-08-15 — 打包 App 无后端数据修复：API/WS 地址 App 端兜底线上（条件编译）

**开发者**: Aria

### 修复
- `src/shared/utils/constants.ts`：`API_BASE_URL` / `WS_BASE_URL` / `AGENT_WS_BASE_URL` 改为条件编译——App 端（APP-PLUS）env 缺失时兜底线上地址（`https://gupiao-api.yaozhineng.com`），H5/小程序保持相对路径/本地兜底；修复 HBuilderX 云打包时 env/.env.production 未注入导致 App 内请求退化相对路径 `/api`、全部接口无数据
- `src/shared/api/request.ts`：请求 baseURL 同上加条件编译，App 端兜底线上
- `src/shared/components/FloatingPodcast.vue` / `PodcastCard.vue`：播报音频完整 URL 拼接由 `import.meta.env.VITE_API_BASE_URL || '/api'` 改为引用 `API_BASE_URL`（App 端不再拼出相对路径导致音频无法播放）
- `src/modules/favorites/pages/monitor.vue`：异动提醒 WebSocket 地址改用 `WS_BASE_URL`（App 端连线上而非 localhost）
- `src/shared/api/modules/agent.ts`：异动 AI 解读 SSE URL base 改用 `API_BASE_URL`

---

## [master] 2026-08-14 — 风口详情页层级流向图：行业板块无 related 节点布局修复（补记 05b2b7b）
**开发者**: changelog

### 修复
- `src/modules/market/pages/sector-detail.vue`：行业板块（881 前缀）经 `mapIndustryToChain` 取上下游，`flow_data` 无 related 节点时旧布局不分配节点位置导致流向图只剩主节点——`flowChartSvg` 对齐 Web 端 WindLeaderPanel：`hasRelated` 分流，无 related 时以主节点为枢纽（hubIds=`[mainNode.id]`），upstream/downstream 从主节点下方居中排列

---

## [changer] 2026-08-14 — 大盘溯源页预判卡片数据源切换为预判记录 + 已跳过状态展示

**开发者**: changelog

### 修复
- 大盘溯源页预判卡片空态（数据源从复盘报告内嵌字段切换为预判记录，按溯源报告定向查询）

### 新增
- 预判卡片空态占位（生成中提示/今日暂无预判数据）
- 预判详情页与历史列表支持"已跳过"状态展示（已跳过标签，不渲染到期档位结果）

### 改进
- 预测接口失败降级：不影响复盘报告主内容展示
- 历史列表本地统计与后端口径对齐（已跳过记录单独计数）

---

## [master] 2026-08-14 — 风口龙头：统计格 3 列（去领涨股）+ 龙头股分档展示（长线=趋势龙头/短线=短线领涨）
**开发者**: Aria

### 改进
- `src/modules/market/pages/leaders.vue`：
  - 统计格 `:columns` 4→3（今日涨幅/均涨幅/净流入），移除"领涨股"格及对应 `:deep` 第四格样式
  - 龙头股行新增档位标签 `.leader-mini-tag`（长线=「趋势龙头」/短线=「短线领涨」）
  - `getTopStocks` 分档数据源：长线档优先 `long_leader` → `leading_stock_info` → `main_stocks`（评分降序去重）；短线档优先 `leading_stock_info` → `long_leader` → `main_stocks`
- `src/modules/market/pages/sector-detail.vue`：统计格 `:columns` 4→3，移除"领涨股"格
- `src/shared/api/modules/stock.ts`：`WindLeaderSector` 接口新增 `long_leader?: WindLeaderStock | null`

---

## [changer] 2026-08-13 — 对话体验优化：回答流式显示与报告详情
**开发者**: 37588

### 新增
- 回答内容流式显示：AI 回答按内容分节渐进呈现（配合打字机动画）；生成中断时保留已生成内容并追加「已停止生成」提示
- 深度分析报告详情页：点击对话中的深度分析摘要卡「查看详情」或深度分析结果卡，进入完整报告详情（结论 + 全文 + 风险提示）；报告缺失/过期展示对应空态

### 改进
- 深度分析摘要卡保留展开/收起，新增「查看详情」入口；深度分析结果卡支持整卡点击跳转
- 生成中断后的重试入口与操作栏显示保持正确

> 代码验收通过（待生产验证）。

---

## [changer] 2026-08-13 — 对话体验优化：空态引导 / 快捷追问 / 滚动交互
**开发者**: 37588

### 新增
- 新会话空态欢迎页：进入对话时展示 AI 能力范围与示例问题（大盘/个股/资金/对比/新闻/科普），点击即发送，可一键关闭（关闭状态本地持久化）

### 改进
- 引导追问按钮化：AI 回复末尾的「你可以问我：…」引导句渲染为可点击快捷追问，点击直接发送；无法可靠解析时保持纯文本展示
- 对话滚动交互优化：AI 生成期间用户上滑可自由翻看历史（自动暂停滚动跟随），底部「回到最新」按钮一键回到最新内容并恢复跟随

---

## [junliang] 2026-08-06 — pages.json 路由重构回滚：恢复被删页面路由 + 删除死文件

**开发者**: Aria

### 修复
- `src/pages.json`：回滚非自选股洞察相关的路由重构——恢复被误删的页面路由（trend-score 系列 / reports / report-detail / traceability / sector-detail / hot-burst-report / briefing-detail）及原 style 配置，修复这些页面的跳转失效（如洞察页趋势股评分卡片、业绩页 redirectTo reports、长线风口板块详情、首页大盘溯源）；仅保留洞察改动（stock-trace 路由替换为 insight、新增 insight-detail）

### 清理
- 删除死文件：`src/modules/favorites/pages/stock-trace.vue`（路由已替换为 insight、无跳转引用）、`src/modules/user/pages/icon-gallery.vue`（无路由注册、无跳转引用）

---

## [junliang] 2026-08-06 — 异动监控接入自选股洞察 + 提醒tab更名"自选股洞察"

**开发者**: Aria

### 改进
- `src/modules/favorites/pages/monitor.vue`：异动监控数据源从已停用的 stock_trace 切换到自选股洞察 API，卡片展示主因 / 置信度（高置信/待验证）/ 日期，点击进入洞察详情页；移除"全部/大涨/大跌"筛选分栏，所有异动事件直接平铺展示；"立即检测"改为刷新列表（洞察由后端 cron 周期采集）
- `src/modules/favorites/components/AlertContent.vue`：底部"提醒"tab 的"异动捕手"模块更名为"自选股洞察"，数据源切换为洞察 API，列表展示自选股涨停雷达归因事件（股票 + 主因 + 日期），点击事件进洞察详情、点击模块标题进异动监控页

---

## [master] 2026-08-06 — 风口龙头 leaders 页面修复（短线板块截断/次数口径/移除 cycle 标签）

**开发者**: Aria

### 修复
- `leaders.vue`：`getWindLeaders(10)`→`(20)`——后端双榜（长线榜 top8 + 短线榜 top8）长线在前，limit=10 截断导致短线档只剩 2-3 个板块
- `leaders.vue`：上榜次数按档位显示（新增 `boardCount`）——短线档显示近 20 日 `freq20`、长线档显示近 60 日 `frequency`（原先统一显示 60 日 frequency，短线次数超 30 次）

### 改进
- `leaders.vue`：删除 cycle 三态标签展示（长线风口/短线风口/长线+短线 Tag），`cycle` 字段仍用于双榜分流

---

## [changer] 2026-08-06 — ChatAgent 会话用量徽标 + 单轮用量进气泡 + 气泡消失修复 + HTTP 降级 token_usage + WS 端口对齐 8080

**开发者**: Aria

### 新增
- 会话列表 token 用量徽标（`sessions.vue`）：本地 `sessionUsage` 优先 + 服务端 `getChatSessionUsage` 补足（未登录也显示本地用量）；`sessionUsageMerge.ts` 纯函数合并（本地优先，服务端仅补缺失会话，不数值相加避免翻倍）
- 聊天气泡底部单轮用量文本（`index.vue`）：左侧 N tokens · 右侧深度分析按钮；移除底部 `<UsageBar />`
- `ChatMessage` 类型扩展 `tokenUsage?`/`cards?`；`agentApi.getTokenUsageSummary()`

### 修复
- 气泡消失根因（`useChatStream.ts`）：Pinia store 实例上访问 computed 被自动解包成普通值 → 消费方单获陈旧数组快照 → v-for 永不更新；改用 `storeToRefs(chatStore)` 暴露响应式 ref
- HTTP 降级路径 token_usage 透出（`useChatStream.ts`）：降级分支 `appendMessage` 透出 `tokenUsage: result.token_usage`（此前恒 undefined）
- `sendMessage` 超时 15s→20s（非流式跑完整 graph ~50s 会超时无回复）
- `deleteSession` 同步清理 `sessionUsage` 残留（防幽灵徽标）

### 改进
- `env/.env.development` + `env/.env.example`：`VITE_AGENT_WS_BASE` 端口 `8000`→`8080` 对齐 agent-py 新端口

### 验证
- vitest 19 文件 98+ 用例全绿；vue-tsc 0 错误
- 浏览器实测气泡用量 + 会话徽标均正常显示

---

## [changer] 2026-08-12 — 语音容错输入侧（Phase 4-2 Task 2）
**开发者**: 37588

### 新增
- `src/shared/utils/speechInput.ts`：语音识别平台分流封装——H5=Web Speech API（Chrome/Edge 启用，Firefox/Safari 降级「语音输入仅支持 Chrome 浏览器」）；小程序=微信同声传译插件 WechatSI（`requirePlugin` 不可用时降级不崩溃）；App=v1 降级「当前版本暂不支持语音输入」；状态机 idle/recording/recognizing/error；`startSpeechRecognition()`（可编辑回填、不自动发送）+ `isSpeechInputSupported()` + `stopSpeechRecognition()`
- `src/pages-sub-app/chat/index.vue`：输入栏麦克风按钮（仅支持平台显示，SvgIcon mic-line）；tap 切换录制（点击开始聆听/再点结束）；识别文本回填 `inputText`（可编辑），失败 toast 轻提示不阻塞文本输入；聆听中按钮 active 高亮 + toast 指示
- 单测：`speechInput.spec.ts`（12 例，依赖注入核心：H5 成功/不支持/onerror/空文本/提前结束、MP 成功/插件缺失/tap 切换/onError/空文本、APP 降级）；`index.spec.ts` 新增 3 例源码守卫（麦克风按钮仅支持平台显示、回填不自动发送、失败提示无 TTS）

### 待办（部署）
- 小程序真机验证需在微信公众平台「设置→第三方服务→插件管理」添加 WechatSI 插件 + `manifest.json` `mp-weixin.plugins.WechatSI` 声明（version 与后台一致，社区反馈 0.3.x 较稳）；本任务不改 manifest（代码已做插件缺失降级）
- 后续增强：后端 ASR（腾讯云 0.017 元/分/讯飞 0.0133-0.0825 元/分）替代 App 端降级

> 验证：speechInput.spec 12/12 + index.spec 16/16 + vue-tsc 0 + build:h5 / build:mp-weixin 通过。

---

## [changer] 2026-08-11 — Phase 2 断点续传（问题 15）+ 打断/停止/重试 + 遗留补丁
**开发者**: 37588

### 新增
- `src/shared/utils/useChatStream.ts`：socket 模块级单例（页面 onUnmounted 不再 disconnect，后台生成继续）；`hasPendingRun()` / `resume()` / `isConnected()`（onShow 回页自动续跑，resume_status none 自动重发最后一条 user 消息兜底）；`stop()` / `retry()` / `hasStoppedRun()`；handleWsMessage 新增 resume_status / stop_status / cancelled 分支（本地兜底落消息 + 去重）
- 遗留补丁：stop_status 置 doneReceived（防后端 stop 后迟发残留 text/done）；resume 轮断连结算（模块级 resumeInFlight 标记——断连只结算 streaming、不落错误消息，保留 pending 供 onShow 再 resume）

### 改进
- `src/pages-sub-app/chat/index.vue`：onShow 自动 resume 续跑；生成中「发送」替换为「停止」（isStreaming 联动）；error/cancelled 终态气泡显示「重试」；deep-btn 守卫排除 '已停止生成'（cancelled 不渲染深度分析按钮）
- 跨仓库契约：agent-py 同批新增 resume/stop 控制消息（WS 事件协议/DONE 负载字节不变，纯增量）

### 文档
- AGENTS.md / src/modules/chat/AGENTS.md：useChatStream 断点续传 + 打断/停止/重试说明

> 验证：useChatStream.spec 24/24 + vue-tsc 0 + build:h5 ok；vitest 全量回归失败集一致（FloatingPodcast flake 重跑 2/2）；整分支 review Ready to merge。

---

## [changer] 2026-08-11 — P0 身份鉴权（Phase 1a）
**开发者**: 37588

### 改进
- `src/shared/api/modules/agent.ts`：`createAgentWebSocket` URL 追加 `?token=`（app-api 桥接握手鉴权）；`sendMessage` 删除 user_id 字段（服务端注入）；删除未使用的 useUserStore import
- `src/shared/utils/useChatStream.ts`：`send` 删除 user_id 字段；新增断连结算（4401/连接断开时结算挂起 send，走错误提示，不挂起 streaming）

### 文档
- AGENTS.md / src/modules/chat/AGENTS.md：user_id 服务端注入约束更新

> 发版约束：须在网关 WS 路由已指向 app-api 之后发布；此前前端 WS 仍直连 agent-py，删除 user_id 会导致登录态 WS 不落库不计费。

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
