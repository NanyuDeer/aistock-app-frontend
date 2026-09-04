# changelog-pending.md（待提交修改记录）

## 2026-09-04 板块洞见卡溯源行接大盘归因链（P1 Task 6，V2 结构化角色卡；连同并行蓝色卡改动一并提交）

- 用户拍板：板块详情「大盘联动」不落独立区块，并入洞见卡溯源行（InsightCard 双子卡语义：溯源 = 大盘联动角色；板块四环内容源将被事件驱动/链式模型替换）。
- **InsightCard 结构化溯源 prop（shared，已同步 aistock-component-lib）**：新增可选 `traceStructured`，溯源蓝卡双行 —— ①大盘一句话 + 指数涨跌右对齐（A 股红涨绿跌，`--ins-up/--ins-down` 明暗随主题）②角色徽（自驱动/跟随大盘 中性描边徽）+ 驱动一句话；badge 缺省 → 仅大盘行（未入链语义）。传入优先于文本形态 `trace`，组件保持纯 UI。
- **utils/sectorInsight.ts** 新增 `SectorMarketLink`（summary/index_pct/relation/driver）、`relationLabel`（自驱动/跟随大盘/空）、`buildMarketLink(chain, sectorName)`（无链 → null；unknown/未命中 → relation=null 未入链）。
- **SectorInsightCard** 新增可选 props `marketLink`/`sectorName`：marketLink 传入 → InsightCard 结构化溯源；无链回退四环文本溯源；板块入链但四环无内容 → 仍渲染（标题兜底「{板块}为大盘主要驱动 / 随大盘联动」）。
- **sector-detail.vue**：板块研判与 `fetchAttributionChain(tradeDate)` 并行（Promise.all，失败各自兜底），`buildMarketLink` 算当前板块角色后传入。
- 类型检查：`npx vue-tsc --noEmit` 0 新增错误（全仓仅存量 RhythmCalendarPanel.vue 1 条）。
- git：commit1 = 纯并行改动（EventItemCard/收藏/恐贪页）；commit2 = T6（InsightCard.vue / SectorInsightCard.vue / sectorInsight.ts / sector-detail.vue）+ 洞见字标 png + changelog。

## 2026-09-04 归因链提升 shared 层（P1 chain-attribution 审查修复，已 commit 1420082）

- **跨模块零依赖修复（Important）**：`modules/market/api/attributionChain.ts` → `src/shared/api/modules/attributionChain.ts`（import 对齐同目录 agent.ts 相对 `../request`；文件头注释改共享封装）；`modules/market/components/AttributionChainView.vue` → `src/shared/components/AttributionChainView.vue`（结构对齐 SectorInsightCard：api/类型 import 走 `@/shared/api/modules/attributionChain`）。消除 analytics → market 单点引用（挂载页 traceability 改从 `@/shared/components/AttributionChainView.vue` 引用）。
- **date watch 重拉（Minor）**：组件由仅 onMounted 加载改为 `load(date)` + `watch(() => props.date)` 重拉（父页切日/回退报告日组件实例复用不重建时同步刷新）；mock 数据 MOCK_CHAIN 顶层 const 改为 `buildMockChain(date)` 动态构造，date 切换时内置演示 date 字段同步不残留旧日。
- **fmtPct 负零边界（Minor）**：`toFixed(1)` 对 -0.0/微小负值可能产出 '-0.0' → `Math.abs(n) < 0.05` 统一归零显示 '0.0%'；pctCls 同一归零口径判平灰（避免「显示 -0.0% 却判跌」不一致）。
- **文档同步**：根 AGENTS.md 共享组件表 + 6.2 API 表登记 attributionChain.ts/AttributionChainView.vue（标注 2026-09-04 提升）；modules/market AGENTS.md 删除组件条目与「API（模块私有）」小节、shared 依赖列表补 attributionChain（sector-detail「大盘联动」待接入）；modules/analytics AGENTS.md traceability 条目改共享组件描述。
- 类型检查：`npx vue-tsc --noEmit` 0 新增错误（全仓仅存量 rhythm RhythmCalendarPanel.vue(168,11) 1 条）。
- git：commit 1420082（6 files changed, 50 insertions, 33 deletions；rename 识别 79%/78%）。

## 2026-09-04 大盘归因链视图组件（P1 chain-attribution，app-frontend Task 5，已 commit 3fb0a93）

- **大盘归因链 API**（新建 `src/modules/market/api/attributionChain.ts`，行情模块私有）：`fetchAttributionChain(date)` → `GET /api/agent/attribution-chain/:date`（agent 代理域，`request` base 已含 `/api`），返回 `{date, chain|null}`；无链/请求失败 catch 返回 null，由组件空态承接；类型 `AttributionChain`/`AttributionChainChild`（relation ∈ self_driven|market_follow|unknown）同文件导出。
- **大盘归因链视图组件**（新建 `src/modules/market/components/AttributionChainView.vue`）：props `{ date: string; mock?: boolean }`；大盘根卡（summary + index_pct 涨跌）+ 板块分支（relation 中性描边文字徽：自驱动/跟随大盘/关系未知 + sector + pct + 一句话溯源驱动卡浅蓝底）；|pct| 降序（null 排末尾）；加载/空态/有链三态；mock=true 渲染内置演示数据（半导体材料自驱动 -3% / 券商跟随 -0.8%）；SCSS rpx + 既有 tokens（$bg-card/$line/$ink/$stock-up-color/$stock-down-color/$primary-50 等）。
- **接入大盘溯源展示页**（`modules/analytics/pages/traceability.vue`）：MarketInsightCard 与主因板块区块之间插入 `<AttributionChainView :date="displayedDate" />`（链空/失败组件内空态，不阻断报告；区块容器 chain-view-block 与卡片水平对齐）。
- 类型检查：`npx vue-tsc --noEmit` 全仓仅 1 条存量错误（`modules/rhythm/components/RhythmCalendarPanel.vue(168,11)`，与本次无关）。
- 组件为行情/市场页私有组件，不进 aistock-component-lib（跨端同步规则仅针对洞见/通用组件）。

## 2026-09-04 恐贪页 AI 情绪洞见改洞见卡（方案3）+ InsightCard 支持 slot

- **恐贪页洞见卡化**（modules/fear-greed/pages/index.vue）：自绘 `fg-card`「AI 情绪洞见」→ 组件库 `InsightCard`（`type=emotion` `tagText=情绪洞见` → 字标·情绪；`title=zone.summary` 一句话结论；`trace/forecast` 由原 `aiInsight` 两句话拆分为「溯源(为什么)」与「预判(后续)」两段，computed 改为返回 `{ why, forecast }` 结构）。

- **InsightCard 补尾部 slot**（组件库 InsightCard.vue）：卡片自定义尾部之间（`showMeta` foot 前）新增默认 `<slot/>`，用于承载量化统计块等卡片底部补充；冰点反弹统计三列（`fg-rebound` 淡绿底块，含 iceCount/reboundRate/avgRebound + 说明）经 slot 注入洞见卡底部，数据与交互零改动。

- 移除死样式 `.fg-insight`（卡片正文文案改由洞见卡承载）；新增容器间距 `.fg-insight-box`。

- 组件库同步 app shared/components/InsightCard.vue（复制覆盖）。Web 前端无恐贪页，不涉及跨端。

## 2026-09-03 洞见体系应用扩展（事件徽标 / 财报 lines / 板块上移 / 综合洞见容器化）

- **事件传导卡 AI 洞见徽标换字标**（modules/chat/event/components/EventItemCard.vue）：瞳孔 InsightTag 胶囊 → 「洞见」PNG 字标小图（import shared/components/insight-wordmark.png，无背景），与洞见卡头部字标同源。

- **财报详情优势/风险恢复**（InsightCard 补 `lines` prop 后自动生效）：report-detail.vue 传 `:lines`（优势 positive/风险 risk/建议）此前因组件不支持而被忽略 → 现渲染为多要点行；同步组件库。

- **板块详情研判卡上移**（modules/market/pages/sector-detail.vue）：SectorInsightCard（板块研判/洞见卡）调整至「AI 分析」卡之前。

- **个股详情综合洞见容器化**（modules/favorites/pages/detail.vue）：decision-card 整卡改 InsightCard（type=market tag-text=综合洞见 → 字标·综合；title=一句话结论；lines=重点/机会/风险 全文，机会 positive/风险 risk）；移除判定徽章与机会/风险"展开"交互及相关死样式/ref/函数（经设计确认方案③）。

- **综合洞见与重大异动间距**（detail.vue）：InsightCard 容器无 margin 致与下方「最新重大异动」紧贴 → major-event-alert 增加 margin-top 24rpx。

- **最新重大异动改双平面焦点卡**（detail.vue，尝试事件传导"重大机会"样式）：语义渐变顶（利好=正红渐变「重大机会」/利空=正绿渐变「重大风险」/其余=中性「重大异动」）+ 白正文（标题 + 周期/类型/时间 chips），对齐 EventHeadlineCard 双平面结构；空态 is-muted 保留。

## 2026-09-03 洞见卡头部标签换「洞见字标」设计 + 首页节奏大师卡精简

- **洞见字标标签**（InsightCard.vue，app 与组件库双端同步）：洞见卡头部由瞳孔 InsightTag 换为「洞见字标 PNG + 灰间隔号 + 彩色类型词」三段式；类型词沿用 5 类型色（event 取中调 #00a8d8 保白卡可读）；类型映射改短词（情绪/资金/事件/市场/趋势），`tag-text` 自定义词自动剥"洞见"后缀（如"板块洞见"→"板块"）；字标双图组件内 `import`（内联背景图 + `filter: drop-shadow` 右下远距投影；预览环境 image 标签不可用故不走 image）：浅色卡 `insight-wordmark.png`（深色）、深蓝研报卡 `insight-wordmark-light.png`（反白），图片随组件同目录（组件库 `src/components/`、app `src/shared/components/`；组件库 shims-vue.d.ts 补 `*.png` 声明）。InsightTag 其余调用点（通知弹窗/事件卡徽标等）保持不动。

- **首页节奏大师卡精简**（MorningContent.vue）：每行去日期、改为「仓位文案 + 档位色块」与其它功能卡"名称+Tag"同构；副标题近 5→3 个交易日（`HOME_RHYTHM_DAYS=3`），最新日期置顶（去掉 reverse）。

- **Dart Sass 弃用修复**（RhythmCard.vue）：`lighten($primary, 28%)` 弃用致 HBuilderX 打包失败 → 换 token `$primary-300`。

