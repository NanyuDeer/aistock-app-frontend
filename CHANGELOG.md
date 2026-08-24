# CHANGELOG.md — aistock-app-frontend 变更记录

> 所有修改记录按时间倒序排列。每条记录标注分支、时间、开发者。

## [changer] 2026-08-24 — 早点听新增午间报（盘中报）展示与播报

**开发者**: 37588

### 新增
- 早点听由晨报/晚报两个入口扩展为晨报/午间报/晚报三个入口，新增午间报（盘中报）入口。
- 午间报展示盘中摘要、详细解读与风险提示；当日未生成时自动回退最近可用报告并标注日期。
- 午间报音频就绪时支持播报播放，音频未生成时仅展示文字内容。

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
