# Changelog — aistock-app-frontend

> 所有修改记录按时间倒序排列。每条记录标注分支、时间区间、开发者。

## [master] 2026-08-01 — 资金流向图表重设计 + 多页面组件库样式统一 + agent-report 空页面修复

**开发者**: Aria

### 重设计
- `src/modules/favorites/components/CapitalFlowCharts.vue`：资金流向图表重设计（方案C 垂直柱形+数值网格）
  - 资金拆解：4 条独立横向条形（中心线在50%，正值向右红色，负值向左绿色）
  - 10日资金节奏：面积折线图改为垂直柱形图（柱子圆角纯色 rx=3，红正绿负，对齐资金拆解样式；最新柱 $ink 深色边框高亮）
  - 数值网格：底部 5×2 网格显示每日日期+数值，最新格白底 $bg-card + $ink 深边框高亮
  - 面板纯白底 $bg-card + $line 边框，颜色全部令牌化，删除 latestIsPositive computed
- `src/modules/analytics/pages/traceability.vue`：大盘溯源页重设计（方案C 调查推理板）
  - Hero 可信度进度条、现象快照合并卡、归因结论品牌横幅、候选解释双栏、证据 chip 云
  - 未解问题（蓝 question-line）/风险提示（琥珀 alert-line）颜色区分，删除 hero-icon
- `src/modules/analytics/pages/trend-score-report.vue`：按 hot-burst-report 样式统一（引入 LoadingState/EmptyState/Card，移除渐变）
- `src/modules/chat/event/components/AiEventReport.vue`：AI事件分析详情页重设计（Hero卡 + 左侧蓝色色条 + 评级徽章）
- `src/modules/chat/event/components/AiAnalysisSection.vue`：卡片化 + 蓝色实心编号圆 01-05（$primary 底 + 白字）
- `src/modules/chat/event/components/InvestmentSummaryCard.vue`：删除重复评级标签（已上移至 Hero 卡）
- `src/modules/favorites/pages/detail.vue`：个股详情页样式统一（卡片统一 $bg-card+$line+$r-md，间距 24rpx→16rpx，22+处硬编码 hex 令牌化）

### 修复
- `src/modules/news/pages/detail.vue` + `src/pages.json`：修复顶部多余导航栏（navigationStyle:custom + SubPageCard2 包裹）
- `src/modules/chat/pages/agent-report.vue`：长线风口空页面兜底（5个结构化Card全不渲染且 detailsText 存在时用 mp-html 渲染 details 原始 markdown）
- `src/modules/favorites/pages/detail.vue`：AI投顾入口图标改纯白 #ffffff（配合 ai-icon-wrap 蓝色背景圆形）

### 改进
- `src/modules/home/components/MorningContent.vue`：大盘溯源卡片改为多日列表（方案C，查询 today/today-1/today-2 三天报告状态）
- `src/modules/chat/event/components/EventTransmissionGraph.vue`：画布背景改浅蓝 $primary-50（#eaf2ff）

---

## [changer] 2026-07-31 — 同步 PR#30 focusEvents + GI 数据适配 + ghost 文件清理

**开发者**: 37588

### 改进
- 合并 origin/master：同步 PR#30 focusEvents + mixed type 支持 + 组件库同步
- `src/modules/chat/event`：GI 数据适配 `/event/list`，修复双排名卡片布局
- 删除 6 个 ghost 文件（组件重构后残留）：ChatBubble / SkillButton / SkillCard / StreamingText / EventTabBar / ImportanceStars

## [master] 2026-07-31 — 早点听卡片 CSS 调整 + agent-report 跳转修复
**开发者**: ARIA

### 修复
- `src/modules/chat/pages/agent-report.vue`：修复报告页跳转路径问题
- `src/modules/home/components/MorningContent.vue`：「缺失来源」标记从 briefing-top 移到「专属播报」按钮右侧；`.feature-sub` 恢复 `$font-size-xs`；新增 `.briefing-btn-row` flex 布局，优化按钮排列

## [changer] 2026-07-29 — 早报降级路径：brief 接口优先 + 降级文案优化

**开发者**: 37588

### 新增
- `briefingReport.spec.ts`：4 个回归测试覆盖 parseBriefingReport 降级路径（degraded=true 单条目、degraded=false 多条目、missing_sources 为空拒绝、brief_type 不匹配拒绝）

### 修复
- `briefing/index.vue`：`loadReport` 优先调 `agentApi.getBrief()` 获取 brief.v1 结构化数据，失败回退 `agentApi.getReport()` 兼容旧 schema 1.0/2.0 历史数据
- `briefing-detail/index.vue`：降级提示文案从"缺失来源：X"改为"部分数据源暂不可用（X），以下为可用内容"，不阻塞内容显示

---

## [master] 2026-07-28 — PR #29 合并后类型修复 + mock 清理 + 组件化
**开发者**: Aria

### 修复
- chat/index.vue: 用 MarketTraceEvidence 组件替换 94-137 行内联证据溯源代码，移除重复的 confidenceLabel/sourceKindLabel 函数和 110 行证据溯源样式
- index.spec.ts: 测试改为验证组件使用而非内联 HTML 匹配
- agent-report.vue: 移除 agentOverviewMock 导入和两处 DEV 环境降级 fallback，统一使用真实 API
- briefing/index.vue: 修复 audioPath 访问路径（report.value?.audio_path → report.value?.content?.audio_path）
- agent.ts: ChatMessage 接口添加 advisorTrace 字段，清理重复的 MarketTraceQaTrace/MarketTraceQaResponse 接口定义
- briefingAdapter.ts: 新增 ReportType 类型，通过 toBriefType() 映射到 BriefingType，解决 splitReportToCards 参数类型冲突
- vite.config.ts: 补齐 PR #29 新增的 brief/broadcast 代理路由

### 重构
- event-chain/index.vue: 移除硬编码 mockHeadlineEvents，改为从真实事件列表派生焦点事件（按 importance >= 4 和 affectedIndustries 情绪方向筛选）

### 删除
- src/modules/chat/mock/agent-overview.json（PR #29 已删除但被后续合并重新引入）

---

## [master] 2026-07-25 — PR review修复 + 个股详情页UI优化 + Agent报告页 + 趋势股评分报告页
**开发者**: Aria

### 修复
- PR #28 review 问题修复：any 类型消除（stock.ts 20处 + useStockAiAnalysis.ts）、代码去重（format.ts 提取 compactNumber/isInvalidValue/cleanValue）、KLineChart SVG 宽高比（preserveAspectRatio xMidYMid meet）、SubPageCard2 prop 化（contentPaddingBottom）
- SubPageCard2 底部留白统一：默认 contentPaddingBottom 从 220rpx 改为 148rpx（与 v1 一致）
- 个股详情页双重 padding 消除：去掉 .page-detail 重复 padding-bottom 和 min-height
- 个股详情页删除振幅字段、移除底部重复行情明细（与短线交易数据重复）
- 新闻列表分页：每页3条 + 翻页控件（‹ 当前页/总页数 ›）
- AI 投顾卡片与行情数据间距：添加 margin-top: 32rpx
- 首页重磅事件跟踪跳转改为 AI 事件分析页 + profile 删除特别提醒 + 推送设置显示真实状态
- 报告页日期时间统一用 created_at(真UTC) + formatDateTime
- 趋势股评分和业绩预测卡片替换 mock 为真实 API 数据
- uni-text 样式区分（行情红/日期绿/已更新蓝）+ 事件文本两行省略
- agent-report 概览进详情后返回键直接回首页的问题修复

### 新增
- Agent 报告概览页：双模式设计（概览模式显示4张Agent简报卡片，详情模式显示单报告）
- 趋势股评分 AI 分析报告页（trend-score-report.vue）+ 列表页入口
- 早点听播报页重构为结构化早晚报（方案四：分段式布局）
- 底部 Tab 从 4Tab 重构为 3Tab（早点听/选股/提醒）
- 异动捕手新模块页面 + 个股情报路由改名
- 长线风口接入后端 API + 板块详情子页面拆分
- H5 页面固定 9:16 长宽比

---

## [changer] 2026-07-18 — 晨报/复盘报告卡片模型重构 + 事件适配层增强
**开发者**: 37588

### 重构
- `src/shared/utils/briefingReport.ts`（新增）：从 `useBriefingCard.ts` 抽取 `BriefingReport` 类型与 `parseBriefingReport` 解析函数，新增 `sectors` 字段
- `src/shared/utils/reportCard.ts`（新增）：统一 `ReportCard[]` 卡片模型 + 晨报/复盘分段器；`splitMorningReport` 按 `##` 标题匹配 5 张晨报卡片；`splitReviewToCards` 复用复盘分段器；未匹配正文统一以"补充分析"卡片展示，禁止静默丢弃
- `src/shared/utils/useBriefingCard.ts`：改为引用 `briefingReport.ts`，移除内联类型与解析逻辑（-42 行）

### 改进
- `src/modules/chat/event/api/eventAdapter.ts`：新增 `buildSourceInfo` 从后端 source 字段构建来源展示信息（URL 解析 + 媒体域名中文映射）；新增 `MEDIA_NAME_BY_DOMAIN` 映射
- `src/modules/chat/event/components/AiEventReport.vue`：适配新数据结构
- `src/modules/chat/event/components/EventItemCard.vue`、`EventTransmissionGraph.vue`：适配
- `src/modules/chat/event/composables/useAiReasoning.ts`：精简
- `src/modules/chat/pages/event/detail.vue`：适配
- `src/modules/home/components/MorningContent.vue`、`src/pages-sub-app/briefing-detail/index.vue`、`src/shared/components/SubPageCard2.vue`：适配新卡片模型

### 测试
- `src/modules/chat/event/api/eventAdapter.spec.ts`（新增）
- `src/shared/utils/briefingReport.spec.ts`（新增）
- `src/shared/utils/reportCard.spec.ts`（新增）

---

## [master] 2026-07-17 — 跨仓库一致性修复（代理配置/emoji清理/接口路径/环境变量模板）
**开发者**: Aria

### 修复
- `vite.config.ts`：改用 `loadEnv` 加载 `env/` 目录变量；proxy 目标改读 `VITE_PROXY_API_TARGET`/`VITE_PROXY_AGENT_TARGET`/`VITE_PROXY_WS_TARGET`（原读 `process.env` 不自动加载 .env 文件，导致 dev 代理始终 fallback 到生产端口）
- `src/shared/api/modules/agent.ts`：`getEventChain` 路径修正（移除多余的 `/chain/` 段，与后端 `/api/agent/event/:eventId` 对齐）；占位接口补充 TODO 标注

### 改进
- `env/.env.development`、`env/.env.production`：新增 `VITE_PROXY_*` 代理目标变量
- `env/.env.example`：新建环境变量模板（微信密钥用占位符）
- emoji 清理（统一替换为 SvgIcon 组件）：`AiThinkingHeader.vue`（🤖→robot-line）、`EventItemCard.vue`（🤖→robot-line）、`event/detail.vue`（⚠→error-warning-line）、`event/list.vue`（📭→inbox-line、⚠→error-warning-line）、`alert-analysis.vue`（🤖/⚠️/⚡/✓/◌→robot-line/error-warning-line/flashlight-line/check-line/loader-line）、`login.vue`（⚠→error-warning-line）

---

## [master] 2026-07-17 — 彻底修复提醒页"帮我分析"按钮被挤下 + mp-html符号换行
**开发者**: Aria

### 修复
- `src/shared/components/MainTabs.vue`：移除 JS 计算 scrollHeight 方案（`footerH=rpx2px(68)` 远小于实际92rpx），`.card-content` 改为全平台 `flex:1; min-height:0`，footer 靠 `flex-shrink:0` 固定，不再被挤下
- `src/pages-sub-app/chat/index.vue`：`:deep(.bubble-html)` → `:deep(.bubble-html), :deep(.bubble-html *)` 通配符覆盖，确保 `word-break: keep-all` 应用到 mp-html 内部所有子元素
- `src/modules/chat/pages/agent-report.vue`：同上 `:deep(.report-html)` 通配符覆盖
- `src/pages-sub-app\briefing-detail\index.vue`：添加 `word-break: keep-all; overflow-wrap: break-word`（之前缺失）
- `src/modules/market/pages/alert-analysis.vue`：同上添加 keep-all

---

## [master] 2026-07-17 — APP端微信登录失败自动降级到扫码登录
**开发者**: Aria

### 修复
- `src/modules/user/pages/login.vue`：统一登录模板，移除 `#ifdef H5`/`#ifdef APP-PLUS` 条件编译分割，二维码区域改为全平台通用
- `src/modules/user/pages/login.vue`：APP端 `uni.login` 失败时（`login:fail send`）自动调用 `startScanLogin()` 降级到扫码登录，不再直接显示错误死循环
- `src/modules/user/pages/login.vue`：新增 `handleRetry()` 函数 + "使用扫码登录"备选按钮（APP-PLUS 专属）

---

## [master] 2026-07-17 — 微信登录修复 + 业绩预测卡片优化 + Markdown换行/布局溢出修复 + SubPageCard2重构
**开发者**: Aria

### 修复
- `src/manifest.json`：从后端 `.env` 获取 `WECHAT_SECRET` 填入 `appsecret`，移除空值 `UniversalLinks`（仅安卓端），修复 `login:fail 业务参数配置缺失`
- `env/.env.development` + `env/.env.production`：新增 `VITE_WX_APPID`/`VITE_WX_APPSECRET` 配置项（文档化）
- `src/modules/analytics/components/ForecastContent.vue`：移除"增持"评级标签（无后端逻辑）；`stock-col` 宽度 180→140rpx 防换行；`metric-value` 字体 26→22rpx 与 `growth-val` 一致；新增 `formatEpsGrowth()`/`formatNetProfitGrowth()` 为正数补 `+` 前缀
- `src/pages-sub-app/chat/index.vue`：`.bubble-html` 改用 `word-break: keep-all`（CJK 不在标点处断行）；`.message-list` 添加 `overflow: hidden`；`.quick-skills`+`.input-bar` 添加 `flex-shrink: 0` 防止消息过多时输入栏消失
- `src/modules/chat/pages/agent-report.vue`：`.report-html` 同上 keep-all 换行策略
- `src/modules/chat/pages/index.vue`：`.bubble-text` 同上 keep-all 换行策略 + `.message-list` overflow hidden
- `src/shared/components/MainTabs.vue`：`scrollHeight` 计算新增 `footerH` 扣减（alert 标签页底部 footer-bar 之前未计入导致内容被挤出）；`.card-content` 添加 `overflow: hidden`
- `src/modules/market/pages/hot-burst.vue`：分数显示 `得分 95`→`95分`（数值在前单位在后）；`level-tag` padding `4rpx 16rpx`→`4rpx 10rpx` 减小按钮宽度

### 重构
- `src/shared/components/SubPageCard2.vue`：移除 JS 计算 scrollHeight 逻辑（`computed`/`windowHeight`/`rpx2px`/`getChatBarHeightPx`），改用 flex 布局（`.sub-page-2-body` flex 容器 + `padding-bottom` 为 GlobalChatBar 留白），参照 SubPageCard 模式，修复底部内容被 AI 对话栏遮挡

---

## [master] 2026-07-17 — 业绩预测卡片重构 + card-header 高度对齐
**开发者**: Aria

### 修复
- `src/shared/components/MainTabs.vue`：`.card-header` 添加 `position: relative`，`.toggle-group` 改为绝对定位（`position: absolute; right: 24rpx; top: 50%; transform: translateY(-50%)`），使业绩 tab header 高度与无 toggle 的 tab（早点听/洞察）完全一致
- `src/shared/components/MainTabs.vue`：`.card-content` 移除 `padding-bottom: 24rpx` 和 `box-sizing: border-box`，与 PageCard 完全对齐
- `src/shared/components/MainTabs.vue`：`.toggle-btn` 添加 `white-space: nowrap`，修复 `<uni-text>` 文本换行导致 toggle-group 高达 85px 的问题

### 重构
- `src/modules/analytics/components/ForecastContent.vue`：业绩预测卡片模板重构 — 左侧股票信息（名称+代码+评级标签）| 右侧指标区（预测EPS+预测净利润，蓝色值+红色增长率）| 分隔线 | 更新时间+机构数
- `src/modules/analytics/components/ForecastContent.vue`：字体按 stock-name 比例(26/28)整体缩放，对标 ReportsContent.vue；排列方式栏（搜索+排序）padding/font-size/border-radius 全面对标报告卡片
- `src/modules/analytics/pages/forecast.vue`（新建）：从 `origin/gaojingwen` 分支恢复，作为独立业绩预测页面参照
- `src/pages.json`：添加 `modules/analytics/pages/forecast` 路由
- `src/manifest.json`：添加 Barcode/OAuth 模块 + 微信 OAuth appid 配置

---

## [master] 2026-07-17 — 布局系统性修复 + 业绩 Tab 重构 + 多项 UI 优化
**开发者**: Aria

### 修复
- `src/shared/components/SubPageCard2.vue`：删除基于 `getSystemInfoSync().windowWidth` 的本地 `rpx2px`，改复用 `@/shared/utils/layout` 的 `rpx2px`/`getChatBarHeightPx`，修复 H5 dev 模式 scroll-view 内容未占满
- `src/shared/utils/layout.ts`（新建）：共享布局工具，`rpx2px` 改用 `uni.upx2px`，提供 `getSafeAreaInsetBottom`/`getChatBarHeightPx`/`getTabBarBottomPx`/`getBottomFixedHeightPx`，修复 H5 dev 模式 rpx 换算严重偏大导致滚动失效
- `src/shared/components/SubPageCard.vue`：scrollHeight 改用 `getChatBarHeightPx()`，新增 `.sub-page-body` flex 容器，修复刘海屏底部约 69rpx 重叠 + H5 滚动失效
- `src/shared/components/PageCard.vue`：移除动态 `:style` 高度，改用 `flex:1; min-height:0`；新增 `footerHeight` prop 保证 footer 固定；`marginBottom` 改用 `getBottomFixedHeightPx()`
- `src/shared/components/AppBottomBar.vue`：`.as-tab-bar` 的 `bottom` 改用 `:style` 绑定 `getTabBarBottomPx()`；"业绩"tab 路径改为 `/modules/home/pages/index?tab=forecast`
- `src/modules/chat/pages/index.vue`：`.message-list` 添加 `min-height:0`，`.chat-header`/`.quick-skills`/`.input-bar` 添加 `flex-shrink:0`，修复输入框被对话内容挤没
- `src/modules/user/pages/profile.vue`：`handleLogout()` 退出后跳转首页；`DEFAULT_SETTINGS` 改回全 `false`；`getSwitchValue()` 替换 3 处 `any`
- `src/shared/utils/useAuth.ts`：`requireLogin()` 跳转路径修正为 `/modules/user/pages/login`
- `src/modules/market/pages/leaders.vue`：`onReady` 测量 `.bubble-wrap` 实际宽度更新 `containerWidth`，修复 App 端 zoom:1.2 导致泡泡图偏右
- `src/modules/market/pages/hot-burst.vue`：股票代码改垂直排列；卡片 padding 紧凑化；`.kw-tag` 字号 22rpx→20rpx
- `src/modules/favorites/pages/favorites.vue`：删除按钮改左滑揭示，新增 touch 事件处理
- `src/modules/favorites/components/AlertContent.vue`：移除内部 footer，通过 `defineExpose` 暴露状态
- `src/shared/components/MainTabs.vue`：alert tab footer 移至 scroll-view 外固定；新增"业绩"tab 预测/报告切换按钮
- `src/shared/components/GlobalChatBar.vue`：`unreadCount` 默认值 11→0，移除硬编码徽章
- `src/modules/home/components/MorningContent.vue`：`.briefing-card` 背景改为 `#f5f7fb`
- `src/modules/news/pages/detail.vue`：适配 SubPageCard 外壳
- `src/modules/analytics/pages/report-detail.vue`：改用 SubPageCard；修复 H5 canvas `getContext` 错误（取 `uni-canvas` 内部真实 canvas）；走势图高度 360→240px；修复 `ctx.scale` 与 uCharts `pixelRatio` 叠加缩放问题；类型修复 `any`→具体类型

### 重构
- `src/modules/analytics/pages/trend-score.vue` + `trend-score-detail.vue`：移除自定义 position:fixed 外壳，改用 `<SubPageCard>` 统一收敛
- `src/modules/analytics/pages/report-detail.vue`：同上，改用 SubPageCard
- `src/modules/analytics/components/ReportsContent.vue`（新建）：从 reports.vue 提取业绩报告内容组件
- `src/modules/analytics/components/ForecastContent.vue`：替换为原 forecast.vue 内容，保留卡片样式与真实 API
- `src/modules/analytics/pages/forecast.vue`：删除（功能由 MainTabs 接管）
- `src/modules/analytics/pages/reports.vue`：switchTo 路径更新
- `src/pages.json`：移除 forecast 路由

---

## [changer] 2026-07-16 — 简报卡片接入真实 API 数据
**开发者**: 37588

### 改进
- `src/modules/home/components/MorningContent.vue`：简报卡片改用真实 API 数据渲染，替换 mock 数据
- `src/pages-sub-app/briefing-detail/index.vue`：简报详情页重构，接入后端报告 API，支持双层 display_report 结构解析
- `src/shared/utils/useBriefingCard.ts`：适配真实数据格式
- `src/pages.json`：路由配置更新

### 新增
- `src/shared/utils/reportSplitter.ts`：报告内容分段工具（按标题分割文本段落）

### 文档
- `docs/superpowers/plans/2026-07-16-briefing-card-real-data.md`：实施计划
- `docs/superpowers/specs/2026-07-16-briefing-card-real-data-design.md`：设计文档

---

## [master] 2026-07-15 — 自选股双向同步合并 + 事件详情页重构 + H5扫码登录修复
**开发者**: Aria

### 合并
- 合并 PR #11《App 自选股与网页端双向同步》：统一自选股接口读写、修正扫码登录 Cookie、补充添加/删除入口、回前台自动同步、异常保留缓存
- 解决 `leaders.vue` 合并冲突（保留远程 top 10 + `??` 运算符版本）

### 改进
- `src/modules/market/pages/leaders.vue`：风口概念泡泡图横向溢出修复，动态计算容器宽度
- `src/shared/components/GlobalChatBar.vue`：下拉箭头符号改用 `‹` 旋转样式
- `src/shared/components/SubPageCard2.vue`：新建白色顶栏子页面组件
- `src/modules/chat/pages/event/detail.vue`：移除 AiThinkingHeader，改用 SubPageCard2
- `src/modules/chat/pages/agent-report.vue`：改用 SubPageCard2 组件
- `src/modules/user/pages/login.vue`：H5 保留扫码登录，APP-PLUS 改为微信 App 授权登录
- `src/shared/store/modules/user.ts`：适配后端返回 `{ token, userInfo }` 格式
- `src/pages.json`：自选页面动画改为 slide-in-bottom，禁用 agent-report H5 导航栏
- `src/manifest.json`：新增 oauth.weixin 配置

---

## [master] 2026-07-10 — 事件传导组件暗色值清理 + AI 投顾错误处理改善
**开发者**: Aria

### 修复
- 事件传导模块 8 个文件共 30+ 处硬编码暗色值改为浅色 `--ev-*` 变量：
  - `AiThinkingHeader.vue`：头部背景 `rgba(15,17,25,0.94)` → `rgba(255,255,255,0.94)`，返回按钮 `rgba(255,255,255,0.06/0.12)` → `rgba(0,0,0,0.04/0.08)`
  - `EventItemCard.vue`：卡片背景暗色渐变 → `var(--ev-bg-card)`，标题色 `#FFFFFF` → `var(--ev-text-primary)`，默认类型色 `#1E293B` → `#f0f2f5`
  - `HistoryTimeline.vue`：卡片背景 `rgba(30,35,55,0.8)` → `var(--ev-bg-card-muted)`，竖线/标签背景改为 `--ev-border` 变量
  - `EventTabBar.vue`：tab 背景 `rgba(255,255,255,0.04)` → `var(--ev-bg-card-muted)`
  - `AiTransmissionAnalysis.vue`：星星/进度条/竖线暗色值改为 `--ev-border` 变量
  - `ImportanceStars.vue`：未激活星星色 `#2A2E3F` → `var(--ev-border)`
  - `pages/event/detail.vue`：重试按钮硬编码蓝色改为 `--ev-accent` 变量，删除重复 `.error-text` 定义
  - `pages/event/list.vue`：**删除深色主题覆盖代码**（AppBottomBar 和 GlobalChatBar 的 `#161A26` 暗色背景 `:deep()` 覆盖），滚动条/重试按钮/加载更多按钮硬编码颜色改为 `--ev-*` 变量
  - `pages/news/detail.vue`：**整个页面从暗色主题改为浅色**（背景 `#0F1119` → `var(--ev-bg-page)`，标题色 `#F1F5F9` → `var(--ev-text-primary)`，正文色 `#CBD5E1` → `var(--ev-text-secondary)`，所有硬编码颜色改为 `--ev-*` 变量）
- `shared/api/request.ts`：错误回调增加 `request:ok` + `statusCode` 提取逻辑（App 端请求成功但 statusCode 非 2xx 时，error.errMsg 是 `request:ok`，之前直接显示给用户。现在提取 statusCode 和 responseData，显示如 "服务异常(502): Agent service unavailable"）

---

## [master] 2026-07-10 — 样式统一 + App 端三个 bug 修复
**开发者**: Aria

### 改进
- `shared/styles/variables.scss`：统一 design token，新增 `$brand-color`、`$brand-gradient`、`$text-color-title`、`$text-color-tertiary`、`$radius-lg`、`$spacing-base` 等变量，把硬编码的 `#4d7cfe`、`#1a1d24`、`#9ca3af`、`#6b7280` 统一为变量
- `shared/styles/global.scss`：事件传导模块 `--ev-*` 变量从暗色系（`#0F1119`）改为浅色系（`#f5f7fb`），与其他页面统一
- `AGENTS.md`：新增 4 条硬约束（Design Token、App 端 envDir、App 端错误对象、App 端状态栏）

### 修复
- `vite.config.ts`：添加 `envDir: 'env'`（**App 端所有网络请求失败的根因**：Vite 默认读取根目录 .env，但项目 env 文件在 env/ 子目录，导致 App 打包时 VITE_API_BASE_URL 为 undefined，所有 API 请求 fallback 到 /api 无法解析）
- `modules/chat/pages/agent-report.vue`：添加 `paddingTop: statusBarHeight`（App 端顶部被状态栏遮挡，用户以为"页面打不开"）
- `pages-sub-app/briefing/index.vue`：同上，添加状态栏高度处理
- `shared/store/modules/chat.ts`：catch 块错误信息改用 `e?.errMsg || e?.message`（uni-app 网络错误对象是 `{ errMsg }` 格式，没有 `message` 属性，导致显示 "undefined"）
- `modules/user/pages/login.vue`：同上，修复微信登录"获取二维码失败"的错误信息读取

---

## [master] 2026-07-10 — 重新创建 AGENTS.md（区分用途）+ README 补充
**开发者**: Aria

### 新增
- `AGENTS.md`：面向 AI 开发助手的入口地图（模块架构地图、开发规范、硬约束、API 契约、共享组件/Hooks 速查）
  - 区分 README（面向人类，介绍全貌和快速开始）和 AGENTS（面向 AI，聚焦开发规范和约束）
  - 与 2026-07-05 删除的版本不同：新版不重复 README 内容，聚焦"怎么开发、必须遵守什么"

### 改进
- `.gitignore`：移除 AGENTS.md 忽略规则（根级 AGENTS.md 需要提交到 git）
- `README.md`：顶部添加 AGENTS.md 引用说明；修正技术栈（luch-request 而非 axios）；补充环境变量说明（VITE_API_BASE_URL）；补充 Pinia 持久化插件和 vue-i18n

---

## [changer] 2026-07-05 — 移除冗余 AGENTS.md，加入 .gitignore
**开发者**: changer-collab

### 文档
- 删除 repo 根级 AGENTS.md（与 README.md 内容重叠 80%+，维护两份易漂移）
- .gitignore 新增 AGENTS.md 忽略项
- 跨仓库约定（git 分支策略等）改由项目根 AGENTS.md 和 project_memory.md 承载（不在 git 仓库内）

---

## [main] 2026-07-02 — 项目模块化重组
**开发者**: 尹辰

### 重构
- 全项目从扁平结构重组为 shared/ + modules/ 模块化架构
- 新增 6 个业务模块目录（home/favorites/chat/market/user/news）
- 新增 shared/ 共享层（api/store/styles/components/utils/types）
- 更新 pages.json 路由路径
- 新增各模块 AGENTS.md
- 新增 README.md

---
