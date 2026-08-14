# CHANGELOG.md — aistock-app-frontend 变更记录

> 所有修改记录按时间倒序排列。每条记录标注分支、时间、开发者。

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
