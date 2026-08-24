# Changelog Pending

## 2026-08-24 D-3 报告导出功能（is_vip 门禁 + PDF 导出按钮 + 会员解锁）
- 文件：`src/modules/chat/pages/agent-report.vue`
- 改动：
  - 详情页右上角「概览」按钮替换为「导出 PDF」按钮（is_detail 详情模式显示），点击走 `handleExportPdf`：非会员（`userInfo?.isVip` 假）toast「开通会员后可导出 PDF」；会员经 html2canvas 抓取 `.report-body` 生成多页 A4 PDF 并下载
  - 多页分片采用经典逐页整幅偏移算法（`heightLeft`/`position` 每页递减 `pageH`），修复旧算法（初始偏移 `-(pageH - imgH % pageH)`）导致长报告底部内容丢失、部分行重复的问题；整幅图 `toDataURL('image/jpeg', 0.95)` 只编码一次供各分页复用，避免每页重复编码的性能开销
  - 外层容纳按钮的 `v-if` 由 `canBackToOverview || podcastBriefForFloating` 改为 `isDetail || podcastBriefForFloating`，避免深层链接无 `podcast_brief` 详情时会员看不到导出按钮（播报按钮保留自身条件）；`document` 访问加 `typeof document === 'undefined'` 前置容错
- 会员门禁逻辑保持不变：非会员 toast 拦截、会员解锁导出
- 验证：`npm run type-check` 通过

## 2026-08-24 分时 mini 折线图逻辑整理（面积基线 + 纯逻辑抽离 + TDD） + favorites 表头"三横线"分时切换
- 背景：①favorites 自选页表头"三横线"按钮无事件 → 本批次新增行内 `fenshiMode` 分时折线（真实新功能，已可用）；②favorites-grid 宫格卡片"分时"档位被反馈图形不显示，初始排查后端 klt=1 实测返回 482 行完整分时数据（来源腾讯财经），数据源/解析/路由均正常 → 判定落在前端。但本批次对 MiniKLine 的改动经代码审查复核确认：`renderable` 折线判据前后（`lineGroupsRaw.some(...>=2)` vs `isLineRenderable(...)`）**语义完全等价**，面积基线 `VOL_BOTTOM→PRICE_BOTTOM` 为纯视觉修正，二者均不构成对宫格"分时不显示"的**确认性根因修复**；renderjs `:change:data` 触发链在 favorites-grid 的 daily/minute/five 切换路径上引用传递与首次挂载均核验自洽且与其他周期一致。**宫格分时显示问题保留为待真机实证**（优先核查 renderjs `:change:data` 在宿主元素 v-if 重建/引用变更场景下的实际触发时效），不擅自宣称已修复。
- 文件：`src/modules/favorites/components/MiniKLine.vue`、新增 `src/modules/favorites/components/miniKLineLogic.ts`、新增 `src/modules/favorites/components/MiniKLine.spec.ts`、`src/modules/favorites/pages/favorites.vue`、`vitest.config.ts`
- 改动：
  - 抽离 MiniKLine 纯逻辑至 `miniKLineLogic.ts`（isLinePeriod/groupByDate/buildLineGroupsRaw/isLineRenderable/buildScale），组件复用；分时/五日折线可渲染判定收敛为 `isLineRenderable`（分时最近交易日 ≥2 有效收盘价）
  - `renderable` 折线分支改用 `isLineRenderable`；分时"下方面积"基线由 `VOL_BOTTOM(96)` 修正为 `PRICE_BOTTOM(78)`，止于价格区底部（贴合同花顺分时排版）
  - 新增 `MiniKLine.spec.ts`：7 条 vitest 用例锁定分时/五日折线判定与分组/尺度（RED→GREEN），并纳入 `vitest.config.ts` include
  - favorites.vue 表头"三横线"（menu-line）按钮点击切换 `fenshiMode`：开启后每行 `.stock-right` 替换为 `MiniKLine` 分时折线（`:data="minuteCache.get(symbol) || []"` period=minute），图标高亮 `#0b5fff`；再次点击恢复 最新/涨幅/涨跌。分时数据 `shallowRef` Map 按 symbol 懒加载缓存（仅补缺失，切回不重拉）
- 验证：`npx vitest run src/modules/favorites/components/MiniKLine.spec.ts` 7 passed；`npm run type-check` 通过

## 2026-08-24 应用内版本更新闭环（发布 SOP）
- 背景：打通「新装包后用户点开即见更新提醒 → 可选下载 → 系统引导安装」闭环；补齐打包发布流程供每次发版复用
- 文件：`src/shared/utils/useAppUpdate.ts`、`src/shared/api/modules/appUpdate.ts`、`version.json` 策略、Web `public/download/version.json`
- 改动：
  - 更新弹窗内容前置版本号与文件大小：`v{versionName} · {fileSize}\n{description}`，title 精简为「发现新版本」（content 不依赖 description 为空的兜底文案）
  - `downloadAndInstall` 安装失败提示改为可操作引导：去「设置 → 应用/安全 → 安装未知应用」开启后重试，错误消息走 `console.warn`
  - `plus.runtime.install` 前加兜底：非函数时 `plus.runtime.openFile(tempFilePath)` 降级由系统文件管理器打开安装包
  - 启动自动挂载 24h 节流检测 + 手动检查入口（`checkAppUpdate({ manual })` 跳过节流）
- 应用内版本更新发布 SOP：
  1. HBuilderX 云打包新版 APK（App 开发版 + DCloud 账号）
  2. 将 APK 复制到 `aistock-frontend/public/download/`，文件名含版本（如 `aistock-0.1.0.apk`）
  3. 更新 `public/download/version.json`：`versionCode` 单调递增（> 线上最新，如 100 → 101）、`versionName`、`downloadUrl`=该 APK 文件名、`fileSize`=实际大小、`description`=更新要点
  4. 部署/重载 Web 前端静态资源，使 `version.json` + APK 生效（⚠️ 必须连 APK 一起部署到 dist/download/，否则直链 404）
  5. 用户启动 App → 检测到 versionCode 更新 → 弹窗 → 可选下载 → `plus.runtime.install`（未开启未知来源时给出引导）
- 验证：`npm run type-check` 通过

## 2026-08-21 市场洞见页新增"前一天/后一天"日期切换（对齐 agent-report）
- 文件：`src/modules/analytics/pages/traceability.vue`
- 背景：市场洞见页仅展示当天/最近复盘报告，缺少历史日期浏览入口；对齐 agent-report 概览页的日期切换
- 改动：
  - 新增 `date` ref（当前导航目标交易日，默认当天）与 `changeDate(delta)`：优先调 `getNextTradingDay`/`getPreviousTradingDay` 按交易日历跳档（自动跳周末/节假日），接口异常回退 `addCalendarDays` 自然日加减
  - `fetchData` 增加可选 `strictTarget` 参数：切日时严格只看目标日（当日无 completed 即结束回退，避免跳到更早日期）；默认仍从 `date` 起向前回退找最近 completed（保留进入页面/轮询体验）
  - 底部 `SubPageCard` 新增 `#footer` 插槽，渲染"前一天/后一天"按钮（SvgIcon arrow-left-line/arrow-right-line + 复用 agent-report 的 date-nav/date-btn 样式）
  - header-right 新增当前报告日期标签 `.date-label`
- 验证：`npm run type-check` 通过；Web 端无市场洞见页，不涉及跨端同步

## 2026-08-21 异动洞察页（move）"无数据"文案：401/404 区分修复
- 文件：`src/modules/favorites/pages/insight-detail-move.vue`
- 现象：价格异动详情访问无权限/不存在事件时统一显示"异动事件不存在或已过期"，误导（实为登录/自选归属校验拦截）
- 改动：新增 `loadError` ref；catch 中读取 `statusCode` 分流——401"请先登录查看自选股异动事件"、404"该异动事件不在你的自选范围内，或已过期"、其余"异动事件加载失败，请稍后重试"；空态渲染改用 `{{ loadError || '异动事件不存在或已过期' }}`
- 与 `insight-detail.vue`（涨停雷达页）的 401/404 分流修复保持一致

## 2026-08-21 雷达页"无数据"根因：登录+自选归属校验（401/404）文案误导修复
- 文件：`src/modules/favorites/pages/insight-detail.vue`
- 现象：用户访问真实 event_id `wi_20260807_001267_limit_up` 显示"不存在/无数据"，误以为是后端字段缺失
- 根因（隧道实测）：insight 详情接口 `GET /cn/favorites/insights/:eventId` 用 `JOIN user_stocks` 做登录+自选归属校验——无 token 返回 401、伪造 token 401、有效但该 openid 自选无 001267 返回 404。前端原先把所有失败在 catch 里吞成 `detail=null` → 统一显示"洞察不存在或已过期"，极具误导性
- 改动：新增 `loadError` ref，catch 中读取 `statusCode` 分流——401 提示"请先登录，并在自选股中添加该股票后再查看洞察详情"；404 提示"该股票不在你的自选中，或事件已过期"；其余"洞察加载失败，请稍后重试"。空态渲染改用 `{{ loadError || '洞察不存在或已过期' }}`
- 注：真实报价头字段（open_price/latest_price/change_pct 等）后端均有返回，非字段缺失；归属校验通过后正常展示

## 2026-08-21 主因卡聚合次因证据引用（行业原因入 hero-quote）
- 文件：`src/modules/favorites/pages/insight-detail.vue`
- 需求：用户发现 hero-quote 只显示 `primary_driver.evidence_quote`（"公司原因…"），而详细分析里的"行业原因/次因"未上屏，要求也放进主因卡
- 改动：新增 `driverQuotes` computed，聚合主因 + 全部 `secondary_drivers[].evidence_quote`；模板 hero-quote 改为逐条渲染 `.hq-item`（`hq-label` 标注"主因·XX / 次因·XX"），新增 `.hq-item/.hq-label/.hq-text` 样式；次因块间用 `$primary-100` 分隔线
- 注：mock 数据的 secondary_drivers 无 evidence_quote，故 mock 下行为不变；真实数据多含

## 2026-08-21 雷达页长文本"没换行/没显示完全"修复（根因：Markdown 换行被塌缩）
- 文件：`src/modules/favorites/pages/insight-detail.vue`
- 现象：`display_report.details`（详细分析，带换行的 Markdown）与 `primary_driver.evidence_quote`（证据引用）显示为一段墙、原有换行丢失，看起来"没换行、没显示完全"
- 根因：`.detail-text`/`.hero-quote` 此前用 `white-space: normal`，会把源文本中的 `\n` 全部塌缩成空格，长篇 Markdown 挤成单行流；项目已验证的长文本模式是 `white-space: pre-wrap`（见 event-article 页）
- 改动：两处 `white-space` 由 `normal` 改为 `pre-wrap`（保留源换行），并保留 `display:block; width:100%; word-break:break-all; overflow-wrap:anywhere` 兜底无空格/连续长段不横向溢出

## 2026-08-21 价格异动洞察页总装版重构（Hero 主因 + 五层矩阵 + 归因时间轴）
- 文件：`src/modules/favorites/pages/insight-detail-move.vue`（price_move 专用，stocktrace 链路）
- 背景：原页仅列出五层候选，层级与信息密度不足；用户用 pureshowwidget 对比三稿（主因聚焦/归因矩阵/归因时间轴）后多选整合
- 改动：新增置信度仪表（`confidence` computed + gauge）、主因聚焦 Hero 卡（`primaryCause` + evidenceCountLabel）、五层归因矩阵（`CAND_STYLE` bar 宽度/状态色）、归因链时间轴（`primaryChains` 逐阶段节点）、待验证/建议 chips 区块；清理 `epistemicText`、`nodeStatusText` 死代码；补齐 `confidenceText` 等级映射
- 验证：`vue-tsc --noEmit` 退出码 0，H5 浏览器无报错
- 改进（验收反馈）：五层归因矩阵每层下方新增 `verdict` 判定解释文本（`mrow` 改纵向，内层 `mrow-main` 保持横排强度条，`mdesc` 缩进与主行对齐）

## 2026-08-21 涨停雷达详情页重构（方案A：报价头+归因卡+时间线）
- 背景：`src/modules/favorites/pages/insight-detail.vue`（涨停雷达 `limit_up_radar` 专用）样式较简陋，用户要求参照组件库与其他页提升美观度与信息层级
- 字段调查：报告返回字段见 `src/shared/api/modules/insight.ts` 的 `WatchlistInsight`（symbol/stock_name/trade_date/direction/change_pct/open_price/latest_price/attribution_status/confidence/primary_driver/secondary_drivers/display_report/evidence_package/title/keywords/source_url/published_at）
- 方案：方案A（报价头+主导因素卡+次要因素列表+归因证据时间线+详细分析+原始来源），用 pureshowwidget 出图、AskUserQuestion 选型确认
- 改动：移除 `InsightResultBlock`，改用原生 view + 动态数据绑定；新增价格/涨跌幅/涨跌额格式化与因素分类、置信度、证据来源等辅助函数；`#ifdef H5` 新窗口打开原始来源、非 H5 复制链接
- 独立页确认：价格异动洞察走 `insight-detail-move.vue`（两页独立，列表按 event_type 分流），本次不涉及，未破坏

## 2026-08-21 两详情页设计统一（方案A：主因判定对齐）
- 背景：用户指出 `insight-detail`（涨停雷达）与 `insight-detail-move`（价格异动）两页设计差异过大，要求用 pureshowwidget 出方案并统一
- 选型：方案A（主因判定）——两页共用骨架：报价头 → 主因判定卡 → 归因明细 → 证据链 → 尾部区块
- 改动：
  - `insight-detail-move.vue`：头部与涨停雷达页统一（`avatar`+`q-meta`+`q-tag`+价格行+指标行，新增 `trendClass`/`fmtPrice`/`fmtPercent`/`fmtAmount`/`fmtTime`）
  - `insight-detail.vue`：主因卡改 `hero-card`（含 `hero-quote` 证据引文）、"次要因素"更名"归因明细"并改用与异动页同视觉的逐行 `dot+文本+类别+置信度`；补齐缺失的 `.dot`、`.badge`（`is-gold`/`is-blue`/`is-confirmed`）样式（此前模板引用但样式缺失导致渲染异常）
- 验证：`vue-tsc --noEmit` 退出码 0；`vitest run insight-detail.spec.ts` 6/6 通过（断言已更新为 `.hero-card`/`.rows .row`）
- 修正（验收反馈）：补各区块 `margin-bottom: $s-3` 消除组件间空隙——`insight-detail.vue` 对 `.quote`/`.hero-card`/`.rows`/`.unconfirmed`/`.timeline`/`.detail-text`/`.source`，`.sec-title` 改为仅保留下边距；`insight-detail-move.vue` 对 `.quote`

## 2026-08-21 价格异动页借鉴大盘溯源（traceability）设计语言重构
- 背景：用户建议自选股异动原因及其因果链参考 `modules/analytics/pages/traceability` 页面设计
- 调研：读取 `MarketTraceHeader/Phenomenon/Timeline/Alternatives/Rejected/PendingRisks` 子组件，提炼设计语言（蓝色归因结论横幅、垂直步骤因果链、Card+Tag 候选卡片、primary-50 未解问题卡）
- 选型（AskUserQuestion）：仅改价格异动页 insight-detail-move；主因改蓝色结论横幅；五层矩阵改为卡片列表+聚焦链
- 改动（`insight-detail-move.vue`）：
  - 主因：`hero-card` → `conclusion-banner`（`$primary` 蓝底白字 + 归因结论 label）+ 聚焦因果链 `fc-item`（圆点光晕 `box-shadow: 0 0 0 6rpx rgba(11,95,255,.15)` + 连接线 + 主色 step-label，起点/终点高亮）+ `main-meta`（层·状态 Tag + 证据数）
  - 五层矩阵 → 候选解释卡片列表（`cand-card` + `cand-tag` 状态：支撑/偏弱/已排除/证据不足）
  - 待验证+建议 → `question-card`（`primary-50` 卡 + 主色圆点 `risk-item` + 建议跟踪 chips）
  - 置信度仪表改为 `conf-row` 进度条 + 分值
  - 清理死样式：`hero-*`/`matrix.*`/`tl.*`（`t-node/t-rail/t-dot/t-line/t-card`）/`footrows/chips` 及 `candBar/candRectCls`/`CAND_STYLE`
- 验证：`vue-tsc --noEmit` 退出码 0；H5 dev server 5176 端口预览 `insight-detail-move?event_id=mock-trace-001`

## 2026-08-21 异动页主因卡片并入涨停雷达页徽标（cat-badge + hero-meta）
- 背景：用户指出价格异动页 `insight-detail-move.vue` 主因大卡片缺少涨停雷达页 `insight-detail.vue` 的归类标签与状态徽标，两页应统一
- 改动（`insight-detail-move.vue` 主因区）：
  - 标题行改 `main-title-row`：`section-title` 右侧新增徽标组 `title-right`（`cat-badge` 归类标签 + 置信度 `badge.is-gold` + 已确认 `badge.is-confirmed`；`cat-badge` 复用已有 `layerText`：公司/板块/市场/资金/技术），样式对齐涨停雷达页；新增 `isConfirmed` computed（按 `attribution_status === 'confirmed'`）
- 验证：`vue-tsc --noEmit` 退出码 0

## 2026-08-21 异动页报价头排版改为方案3（信息左·价格右）
- 背景：用户对 `insight-detail-move.vue` 报价头 `.quote` 排版不满，pureshowwidget 出三稿（纵向价格主视觉/左价格右指标/信息左价格右），选方案3
- 改动（`insight-detail-move.vue`）：
  - `.quote` 改方案3版式：`o3-top`（头像+名称/代码 左、`o3-price` 价格+涨跌幅 右上角）
  - `o3-tagrow`：涨跌标签(左) + 触发 `fmtAmount`(右)
  - `o3-metrics`：涨跌幅阈值 / 严重度(`severityText`) / 代码 三项等分横排，顶部分隔线
  - 样式：删除旧 `.q-top`/`.q-price-row`/`.q-metrics`/`.metric`/`.m-label`/`.m-val`/`.m-*`，新增 `.o3-*`
- 验证：`vue-tsc --noEmit` 退出码 0

## 2026-08-21 异动页主因横幅移除置信度文案
- 背景：主因蓝色横幅右上角 `banner-conf`（如"0.55 · 中置信"）与标题行徽标重复，用户选中该 span 要求删去
- 改动（`insight-detail-move.vue` 主因区）：`conclusion-banner` 移除 `banner-head`/`banner-conf`（置信度保留在标题行 `title-right` 徽标）；`.banner-label` 改块级并加下边距，清理 `.banner-head`/`.banner-conf` 样式
- 验证：`vue-tsc --noEmit` 退出码 0

## 2026-08-21 涨停雷达详情页卡片对齐异动页版式
- 背景：用户要求 `insight-detail.vue`（涨停雷达，5173）的行情头与主因判定卡与异动页 `insight-detail-move` 保持一致，pureshowwidget 出稿确认后落地
- 改动（`insight-detail.vue`）：
  - 报价头改"信息左·价格右 + 等分指标并上色"：`.o3-top`（头像+名称/代码 左、价格+涨跌幅 右上红）、`.o3-tagrow`（涨停雷达标签）、`.o3-metrics`（开盘中性/涨跌额红/置信度金/归因已确认绿，顶部分隔线）；删除旧 `.q-top`/`.q-meta`/`.q-price-row`/`.q-price`/`.q-chg`/`.q-metrics`/`.metric`/`.m-label`/`.m-val`
  - 主因判定卡对齐异动页：标题行"主因判定" + 右侧徽标组（`.hero-chips`：归类+置信度+已确认）；verdict 改蓝横幅 `.hero-banner`"归因结论"；证据引用保留；删除 `.hero-verdict`/`.hero-meta`，主因卡去边框改阴影
  - 涨停雷达字段无触发/阈值/严重度/代码，指标保留原有四项并上色
- 验证：`vue-tsc --noEmit` 退出码 0；spec 断言 `.hero-card` 不受影响

## 2026-08-21 涨停雷达报价头微调：标签移到名称右侧 + 开盘价常显
- 背景：按设计稿，"涨停雷达"标签应在股票名称右侧而非独立一行；指标最左侧一栏应固定显示开盘价（mock 无 open_price 时旧 `v-if` 导致该栏被隐藏，首栏错位成涨跌额）
- 改动（`insight-detail.vue` 报价头）：
  - 新增 `.q-name-row` 名称行容器，"涨停雷达"标签移入名称右侧
  - 开盘指标由 `v-if="open_price != null"` 改为常显，null 时 `fmtPrice` 回退 `--`
  - 删除不再使用的 `.o3-tagrow` 样式
- 验证：`vue-tsc --noEmit` 退出码 0

## 2026-08-21 异动页报价头对齐涨停雷达页
- 背景：用户要求 `insight-detail-move.vue` 报价头与 `insight-detail.vue` 同构——标签入名称行、删 tagrow、指标上色、最左加开盘、删代码栏、显触发
- 改动（`insight-detail-move.vue` 报价头）：
  - 新增 `.q-name-row`，"上涨/下跌异动"标签移入名称右侧（原独立 `.o3-tagrow`/`.o3-trigger` 删除）
  - `.o3-metrics` 改为四栏并对齐涨停雷达页上色：开盘（`previous_close` 中性灰）/ 涨跌幅阈值（涨跌色）/ 严重度（`o3-warn` 警示）/ 触发（涨跌色）；删除原"代码"栏
  - `.o3-v` 增加 `o3-mid`/`o3-warn` 颜色类；沿用 `is-up`/`is-down` 涨跌色
  - 数据源 `StockTraceEvent` 无 `open_price` 字段，开盘栏暂用 `previous_close` 展示（视觉与涨停雷达页对仗）；如需真实开盘价需后端补字段
- 验证：`vue-tsc --noEmit` 退出码 0

## 2026-08-21 异动页证据清单默认收起 + 涨停雷达页长文本换行
- 改动（`insight-detail-move.vue`）：
  - 证据清单改为展开列表，默认收起：新增 `eviOpen` ref，标题行 `@tap` 切换 `v-show`，`.section-title.row` 右侧加 `.evi-arrow` 旋转箭头（收起45°/展开225°）
- 改动（`insight-detail.vue`）：
  - `.hero-quote` 主因证据引用、`.detail-text` 详细分析补 `white-space: normal; word-break: break-all; overflow-wrap: break-word`，修复原因/详细分析显示不完全、不换行问题
- 验证：`vue-tsc --noEmit` 退出码 0

## 2026-08-20 事件传导模块 importance 类型错误修复
- 背景：`src/pages-sub-app/event-chain/index.vue` 8 处 `vue-tsc` 报错 `'importance' is possibly 'undefined'`，为远程 a558730 合并带入
- 根因：`EventItem.importance`（`src/modules/chat/event/types.ts` L82）为可选字段 `number | undefined`，模板与 computed 直接做 `>=` 比较和算术相减未收窄
- 修复：统一以 `?? 0` 收窄（undefined 视为 0 → 被 `>= 4` 过滤排除，排序无副作用），语义不变：
  - 模板两处 `:importance`：`headlinePositive/headlineNegative.importance ?? 0`
  - `headlinePositive` / `headlineNegative` computed：filter `(e.importance ?? 0) >= 4`、sort `(b.importance ?? 0) - (a.importance ?? 0)`
- 验证：`vue-tsc --noEmit` 退出码 0，全项目零类型错误

## 2026-08-20 恐贪指数首页温度计挂载 + 恐贪指数页路由注册
- 背景：首页悬浮温度计（`src/shared/components/FearGreedIndex.vue`，林晓研设计，commit 893f5ba）从不显示
- 根因一：组件建好后从未被 import 挂载进任何页面（全项目搜索 `FearGreedIndex` 仅在 AGENTS.md 出现）
- 根因二：恐贪指数页路由 `/modules/fear-greed/pages/index` 未在 `src/pages.json` 注册，即使挂载也无法跳转
- `src/shared/components/MainTabs.vue`：import 并挂载 `<FearGreedIndex />`（首页常驻悬浮温度计，可拖拽磁吸、点击跳恐贪页）
- `src/pages.json`：pages 数组新增 `modules/fear-greed/pages/index` 子页面路由（custom 导航、disableScroll）
- `src/modules/fear-greed/pages/index.vue`：主面板 `<template v-else>` → `v-else-if="dashboard"` 显式收窄 dashboard 非空，修复 3 处 `possibly 'null'` 类型错误
- 验证：vue-tsc 无相对本次修改的新增错误；event-chain 8 处为远程 a558730 合并引入的既有错误，非本次引入、未擅自改动

## 2026-08-20 趋势股K线真机空白根因修复：App 逻辑层不支持 Array.prototype.at
- 现象：App 真机 K 线整块空白，日志 `TypeError: points.value.at is not a function`（随后 `$t.setAttribute` 为崩溃连锁报错）
- 根因：`chartPayload` 里用了 `Array.prototype.at(-1)`，App 逻辑层旧 WebView/JSCore 不支持该方法，渲染函数直接抛错
- `src/shared/components/KLineChart.vue`、`src/modules/favorites/components/KLineChart.vue`：`.at(-1)` → `[len-1]`（同流程同步修复，防复发）；spec 跑 Node 支持 `.at` 不改
- `src/shared/components/KLineChart.vue`（高度调优）：趋势股 K 线仅价格图无成交量副图，图表高度 300px → 230px（模板 + `.kline-host` CSS 同步），真机纵向更紧凑
- `src/shared/components/KLineChart.vue`（重构）：废弃 App 端手写 SVG + 手势分支（蜡烛挤一起、窗口化/缩放/平移自实现，与 H5 差距大）。现 H5 与 App 统一走 renderjs + klinecharts（引用自选页已验证可用的 App 真机实现），两端渲染与交互完全一致，含蜡烛、MA60、价格标记、十字光标 + OHLC tooltip、缩放/平移/scrollToRealTime；模板分支 `#ifdef H5 || APP-PLUS` 单容 host，`#ifndef` 保留文本占位；删除全部 `renderSvg/bindSvgGestures/draw/makeNode/makeText/svgModel` 代码及 `#ifdef APP-PLUS` 打包段
- 验证：本文件 vue-tsc 零错误；fear-greed/event-chain 为既有错误非本次引入
- `src/shared/components/KLineChart.vue`：renderjs+klinecharts 分支条件由 `#ifdef H5` → `#ifdef H5 || APP-PLUS` 后实测 App 真机 WebView 不渲染（硬约束复现）；因**禁止使用 canvas**，App 端弃用 uCharts canvas，改走 renderjs 视图层 `createElementNS` 构建 SVG 蜡烛+MA60+最新价线+十字光标（`renderSvg/bindSvgCrosshair`），与流向图/MiniK线同机制、真机可靠；H5 保留 renderjs+klinecharts；小程序回退文本占位
- `src/shared/components/KLineChart.vue`（App SVG 分支增强）：初版"全部点一次性塞进 360px"导致蜡烛挤一起、无缩放，与 H5 差距大。现改为**窗口化渲染**：逻辑层只下发原始数据+每点 MA+日期+尺寸，renderjs 维护可见窗口，默认最近 `VISIBLE_KLINE_COUNT`(45) 根（对齐 H5），并支持**双指缩放**（改可见根数、以捏合中心为锚点）与**单指平移**（左右滑历史）；y 轴随窗口重算（同 klinecharts）
- [第二轮视觉对齐] App SVG K 线补齐与 klinecharts 一致的视觉元素：**横向网格+左侧价格轴刻度（4 档）**、**纵向网格+底部时间轴日期（MM-DD，约 6 刻度）**、十字光标升级为**横竖虚线+左上角 OHLC 提示框**（日期/开/高/低/收，涨红跌绿）；左留白 38px 放价格刻度、底部留白放日期；`makeText` 用 `textContent` 防标签空值
- `src/modules/favorites/components/MiniKLine.vue`：迷你 K 线模板内联 `<svg>`（App 无 `<svg>` 组件被当未知标签不渲染）→ renderjs 视图层 `createElementNS` 动态构建真实 SVG DOM；小程序回退占位"--"；`<script setup>` 补 `// @ts-nocheck`
- `src/modules/market/pages/sector-detail.vue`：层级流向图 `v-html` 注入 SVG（App webview 不渲染切线注入的 svg）→ renderjs 解析 SVG 字符串注入 host；非 App/H5 回退文本摘要；`<script setup>` 补 `// @ts-nocheck`
- 根因：App 端模板内联 SVG 标签不支持 → MiniKLine/流向图/KLineChart App 分支统一走 renderjs SVG DOM 注入；klinecharts 在 App 真机 WebView 不渲染 → H5 才启用 klinecharts
- 验证：相关 3 文件 `vue-tsc --noEmit` 零错误（fear-greed/event-chain 为既有错误，非本次引入）；H5 可经 renderjs 预览核对，App 需真机确认 SVG 渲染

## 2026-08-19 App 录音改回 amr+8k（HTML5+ 原生；后端转码 PCM 16k 送火山 V3）
- `src/shared/utils/speechInput.ts`：`manager.start({ format: 'pcm', sampleRate: 16000 })` → `{ format: 'amr', sampleRate: 8000 }`
- 原因：线上魔数取证 `format:'pcm'` 在 HTML5+ Android 产出「假 .pcm 实为 AMR-WB」，V3 只支持 pcm/opus/mp3 识别为空 →「未识别到语音」；改回两端原生支持的 amr，由后端 asrController 用 ffmpeg 转码（见 aistock-app-api）
- `src/shared/utils/speechInput.spec.ts`：录音格式断言 pcm+16000 → amr+8000；29/29 通过

## 2026-08-19 App 录音格式升级 PCM 16kHz（配合后端火山 V3 豆包流式 ASR）
- `src/shared/utils/speechInput.ts`：App 录音 `manager.start({ format: 'amr', sampleRate: 8000 })` → `{ format: 'pcm', sampleRate: 16000 }`
- 原因：后端 ASR 升级 V3「豆包流式语音识别大模型」（账号开通资源为 V3），V3 仅支持 pcm/wav/ogg/mp3（不支持 amr）、rate 必须 16000
- `src/shared/utils/speechInput.spec.ts`：录音格式断言 amr+8000 → pcm+16000；start 抛错用例文案 amr → pcm；29/29 通过


