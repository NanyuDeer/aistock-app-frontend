# AGENTS.md - aistock-app-frontend

> 本文档是 **AI 开发助手的入口地图**，开发时 AI 必读。
>
> **与 README.md 的分工**：
> - `README.md` 面向人类开发者，介绍项目全貌、快速开始、技术栈（"是什么、怎么跑起来"）
> - `AGENTS.md`（本文件）面向 AI 开发助手，聚焦模块架构地图、开发规范、硬约束、扩展流程和 API 契约（"怎么开发、开发时必须遵守什么"）
>
> **新增模块 / 页面 / API 时必读**：本文件第 4 节（开发规范）和第 5 节（关键约束）。
> 各子模块有独立的 `AGENTS.md`（`src/modules/<模块>/AGENTS.md`），说明该模块的功能、页面、组件和依赖。

## 1. 项目概述

AiStock App 前端，基于 uni-app + Vue 3 + TypeScript，一套代码覆盖 App / H5 / 小程序三端。后端为 aistock-app-api。H5 用于 App 预览，必须具备完整的 App 功能（无功能阉割）。

## 2. 模块架构地图

### 三层结构 + 分包

| 层 | 目录 | 职责 | 维护规则 |
|----|------|------|---------|
| 共享层 | `src/shared/` | API 接口、Pinia Store、全局组件、工具 hooks、类型定义、全局样式 | 组长维护，模块只读引用 |
| 业务模块层 | `src/modules/` | 各业务功能模块，每人负责一个 | 模块间解耦，禁止互相引用 |
| App 分包 | `src/pages-sub-app/` | App 专属功能（早点听、持仓、事件链、估值、复盘、晨报、AI 对话） | `#ifdef APP-PLUS` 包裹 |
| 小程序分包 | `src/pages-sub-mp/` | 小程序专属功能（微信智能体） | `#ifdef MP-WEIXIN` 包裹 |

### 业务模块

| 模块 | 目录 | 功能范围 | 子模块 AGENTS.md |
|------|------|---------|-----------------|
| 首页 | `modules/home` | 早点听、市场概览、长线风口、异动捕手 | [home/AGENTS.md](./src/modules/home/AGENTS.md) |
| 自选股 | `modules/favorites` | 自选股列表、特别提醒、股票详情、搜索、异动监控 | [favorites/AGENTS.md](./src/modules/favorites/AGENTS.md) |
| AI 对话 | `modules/chat` | 聊天页、Skill 按钮、流式对话、分析报告展示、会话管理（P9 多会话） | [chat/AGENTS.md](./src/modules/chat/AGENTS.md) |
| 行情 | `modules/market` | 龙头股、重磅消息、板块标签、异动捕手、长线风口 | [market/AGENTS.md](./src/modules/market/AGENTS.md) |
| 业绩分析 | `modules/analytics` | 业绩预测、业绩报告列表、财报详情 | — |
| 用户 | `modules/user` | 个人中心、登录设置、更新日志 | [user/AGENTS.md](./src/modules/user/AGENTS.md) |
| 资讯 | `modules/news` | 公告、新闻详情 | [news/AGENTS.md](./src/modules/news/AGENTS.md) |

### App 专属分包（pages-sub-app/）

| 页面 | 文件 | 说明 |
|------|------|------|
| 早点听 | `briefing/index.vue` | 结构化早晚报（音频入口 + 3-5条结构化洞见，点击音频卡片进入详情页）。非交易日/当日无报告时自动向前回退最近可用报告（最多 7 天）并标注日期。音频纳入全局播报互斥（podcast store acquireExternal）：播放前注册、暂停/结束/卸载注销 |
| 持仓管理 | `portfolio/index.vue` | 持仓分析 |
| 事件传导链 | `event-chain/index.vue` | 事件传导链路可视化 |
| 估值分析 | `valuation/index.vue` | 个股估值 |
| 交易复盘 | `review/index.vue` | 复盘归因 |
| AI 对话 | `chat/index.vue` | App 专属 AI 对话（含 AI 思考过程卡片 ReasoningCard，P3-fix；流式过程实时思考链渲染 `streamingReasoning`，P3-fix-2；标题旁「会话」入口 + onLoad 自动建会话 + 首次用户消息 fire-and-forget upsert，P9） |
| 会话管理 | `chat/sessions.vue` | 会话列表页（P9，pages.json 注册于 chat/index 后）：新建/切换/删除 + 相对时间 + 当前会话高亮 + 空态；仅登录时 onShow 拉 server 列表合并（`syncSessionsFromServer`） |

> 分包页面除 `briefing/index.vue`（已实现）外，其余为占位实现，待后端 Agent/Skills 完成后对接。
> 主包 `modules/chat/pages/agent-report.vue` 为通用分析报告展示页，被 leaders.vue 和 hot-burst.vue 跳转调用。

## 3. 目录结构速览

```
src/
├── main.ts              # 入口文件
├── App.vue              # 根组件
├── env.d.ts             # 环境变量类型声明
├── pages.json           # uni-app 页面路由配置（主包 + 分包）
├── shared/              # 共享层（组长维护）
│   ├── api/
│   │   ├── request.ts   # HTTP 请求封装（基于 luch-request，兼容 axios API）
│   │   └── modules/     # API 模块（按功能拆分）
│   │       ├── agent.ts    # Agent 反代（/api/agent/*）
│   │       ├── auth.ts     # 认证
│   │       ├── briefing.ts # 早晚报结构化
│   │       ├── event.ts    # 事件传导链
│   │       ├── news.ts     # 新闻资讯
│   │       ├── portfolio.ts # 持仓
│   │       ├── prediction.ts # 历史预测跟踪（B2.1）
│   │       ├── push.ts     # 推送
│   │       ├── stock.ts    # 股票行情
│   │       └── valuation.ts # 估值
│   ├── store/           # Pinia 状态管理
│   │   ├── index.ts     # Store 入口
│   │   └── modules/     # Store 模块（按功能拆分）
│   │       ├── app.ts       # 应用状态
│   │       ├── chat.ts      # 对话状态（P9 多会话：sessions 列表 + messagesBySession 分桶）
│   │       ├── favorites.ts # 自选股状态
│   │       ├── market.ts    # 行情状态
│   │       ├── portfolio.ts # 持仓状态
│   │       └── user.ts      # 用户状态
│   ├── components/      # 全局组件
│   │   ├── SvgIcon.vue     # SVG 图标组件（统一图标方案）
│   │   ├── PageCard.vue    # 页面卡片容器（主tab页用）
│   │   ├── SubPageCard.vue # 子页面卡片容器（子页用，含返回+scroll+ChatBar）
│   │   ├── GlobalChatBar.vue # 全局聊天栏
│   │   ├── AppBottomBar.vue # 底部导航栏
│   │   ├── Card.vue / Button.vue / Avatar.vue # 基础组件
│   │   ├── RadarChart.vue  # 雷达图
│   │   ├── RelationGraph.vue # 关系图谱
│   │   ├── LoadingState.vue / EmptyState.vue # 状态组件
│   │   └── svg-cache.ts    # SVG 缓存
│   ├── utils/           # 工具函数和 hooks
│   │   ├── layout.ts        # 布局工具（底部固定栏高度计算，含安全区补偿）
│   │   ├── useAuth.ts         # 认证 hook
│   │   ├── useFavorites.ts    # 自选股 hook
│   │   ├── useChatStream.ts  # 对话流 hook（WS 为主，HTTP 降级；send 支持 forceDeep，DONE 重组 execSteps/lastDeepReport，P3；订阅 reasoning 事件按节点聚合为 reasoningSteps，P3-fix；currentRunReasoning 改 ref + return 新增 streamingReasoning 流式实时思考链，P3-fix-2）
│   │   ├── buildExecTree.ts  # WS 事件流 → 执行细节层级树纯函数（D21，P3）
│   │   ├── useStockCycle.ts   # 股票周期 hook
│   │   ├── useWebSocket.ts    # WebSocket hook
│   │   ├── useTimer.ts        # 定时器 hook
│   │   ├── usePushNotification.ts # 推送通知 hook
│   │   ├── constants.ts       # 常量（AGENT_WS_BASE_URL 本地开发 fallback，P3-fix-2）
│   │   ├── stock.ts           # 股票工具
│   │   ├── tradingTime.ts     # 交易时间
│   │   ├── datetime.ts        # 日期时间
│   │   ├── platform.ts        # 平台判断
│   │   ├── cache.ts           # 缓存
│   │   └── storage.ts         # 存储
│   ├── types/           # 全局类型定义
│   └── styles/          # 全局样式变量和主题
├── modules/             # 业务模块层（每人负责一个）
│   ├── home/            # 首页（pages/ + components/）
│   ├── favorites/       # 自选股
│   ├── chat/            # AI 对话
│   ├── market/          # 行情
│   ├── user/            # 用户
│   └── news/            # 资讯
├── pages-sub-app/       # App 专属分包
├── pages-sub-mp/        # 小程序专属分包
├── assets/icons/        # SVG 图标库（大量预置图标）
└── static/              # 静态资源
```

## 4. 开发规范

### 4.1 模块依赖规则

- ✅ `modules/*` → `shared/`（允许，通过共享层通信）
- ❌ `modules/A` → `modules/B`（禁止，模块间零直接依赖）
- ✅ 共享层由组长维护，模块负责人只修改自己的模块目录

### 4.2 新增模块流程

1. 在 `src/modules/` 下新建目录，包含 `pages/` 和 `components/`（如需要）
2. 创建 `src/modules/<模块名>/AGENTS.md`，说明功能、页面、组件、依赖
3. 在 `src/pages.json` 中添加页面路由
4. 更新本文件第 2 节的模块表

### 4.3 新增页面流程

1. 在对应模块的 `pages/` 下新建 `.vue` 文件
2. 在 `src/pages.json` 中注册页面路径
3. 更新对应模块的 `AGENTS.md`
4. App 专属页面放到 `pages-sub-app/`，小程序专属页面放到 `pages-sub-mp/`

### 4.4 新增 API 流程

1. 在 `src/shared/api/modules/` 下新增或修改 `.ts` 文件
2. 通过 `shared/api/request.ts` 的 http 实例发送请求
3. 禁止直接在组件中写请求代码，必须通过 `shared/api/modules/*.ts`
4. 更新对应模块的 `AGENTS.md`

### 4.5 新增 Pinia Store 流程

1. 在 `src/shared/store/modules/` 下新增 `.ts` 文件
2. 在 `src/shared/store/index.ts` 中注册
3. 使用 `pinia-plugin-unistorage` 实现持久化（如需要）

### 4.6 条件编译

| 指令 | 说明 |
|------|------|
| `#ifdef APP-PLUS` | App 专属代码 |
| `#ifdef H5` | H5 专属代码 |
| `#ifdef MP-WEIXIN` | 微信小程序专属代码 |
| `#ifndef APP-PLUS` | 非App环境 |

> App 专属功能用 `#ifdef APP-PLUS` 包裹，放在 `pages-sub-app/`，不能影响 H5/小程序编译。

### 4.7 页面路由配置

- 所有页面路由在 `src/pages.json` 中配置（uni-app 标准）
- 主包页面在 `pages` 数组中
- 分包页面在 `subPackages` 数组中
- 页面路径对应 `src/modules/<模块>/pages/<页面>.vue`

### 4.8 组件库优先原则（重要）

> **组件库位置**：`../aistock-component-lib/`（与本项目同级目录，仅开发时参考）
>
> **组件库定位**：设计系统参考 + 组件开发沙盒 + 预览环境。**App 前端不依赖组件库目录，可独立编译和部署。**
>
> **组件清单**：见 `aistock-component-lib/README.md`，当前 41 个组件，涵盖基础、反馈、交互、导航布局、金融业务、数据可视化、金融数据展示、AI 对话与媒体 8 大类。
>
> **设计系统**：`aistock-component-lib/design/FinDesign System · 蓝白金融设计系统.html`
>
> **Design Token**：以组件库 `src/tokens/tokens.json` 为设计真源，`pnpm sync` 会自动同步 `variables.scss` 到 app 前端 `shared/styles/variables.scss`

#### 开发新页面或新组件时的强制流程

```
1. 先查组件库 → 2. 有则复制使用 → 3. 无则先建组件库组件 → 4. 复制到前端使用
```

**Step 1 — 查组件库**：开发任何新页面前，先查看 `aistock-component-lib/README.md` 的组件清单，确认所需 UI 组件是否已存在于组件库中。

**Step 2 — 有则复制使用**：如果组件库中有对应组件，将 `.vue` 文件从组件库**复制**到 app 前端 `shared/components/`（或模块 `components/`），然后通过 `@/shared/components` 引入使用。**禁止在 app 前端重复造轮子。**

```vue
<script setup lang="ts">
// ✅ 正确：从 app 前端 shared/components 引入（组件已从组件库复制过来）
import Button from '@/shared/components/Button.vue'
import Card from '@/shared/components/Card.vue'
// 或从统一入口引入（index.ts 导出后可用）
// import { Button, Card } from '@/shared/components'
</script>
```

> **注意**：复制组件时需处理 SCSS 变量引用。推荐在 `vite.config.ts` 中配置 `css.preprocessorOptions.scss.additionalData` 全局注入 `variables.scss`，这样复制过来的组件无需逐个修改 `@import` 路径。

**Step 3 — 无则先建组件库组件**：如果组件库中没有所需组件，**必须先在组件库中创建**，按设计系统规范设计，在组件库预览环境中验证通过后，再复制到 app 前端使用。**禁止跳过组件库直接在 app 前端创建通用组件。**

创建组件库组件的规范（见 `aistock-component-lib/AGENTS.md`）：
- 标签用 `view`/`text`/`image`/`scroll-view`，禁用 `div`/`span`/`img`
- 单位用 `rpx`，禁用 `px`
- 事件用 `@tap`，禁用 `@click`
- 类名统一 `as-` 前缀
- Props 用 `withDefaults(defineProps<{}>(), {})` 写法
- 样式用 `<style lang="scss" scoped>`，首行 `@import '@/styles/variables.scss';`
- 颜色必须用 variables.scss 变量，禁用硬编码
- 图标用 SvgIcon 组件，禁用 emoji
- 组件必须是**纯 UI 组件**（props/events/slots），不含业务逻辑

**Step 4 — 复制到前端使用**：组件库组件验证通过后，通过同步脚本自动复制到 app 前端 `shared/components/`。同步脚本会自动处理文件重命名、import 路径改写和 variables.scss 同步。

#### 组件同步流程（自动化）

```
1. 在组件库中设计/修改组件
2. 运行 `pnpm sync:dry-run` 预览变更（不实际写入）
3. 运行 `pnpm sync` 执行同步（自动重命名 + 路径改写 + variables.scss 同步）
4. 在 App 前端运行 `npx tsc --noEmit` 验证类型
```

- 同步方式为「复制」而非「引用」，同步后 App 前端可独立编译部署，不依赖组件库目录
- 同步配置由组件库 `scripts/sync.config.json` 统一管理（重命名映射、排除列表、路径改写）
- Wrapper 组件（AppBottomBar/MainTabs/PageCard/SubPageCard/SubPageCard2/GlobalChatBar）和 SvgIcon 不参与自动同步，需手动维护
- 设计令牌变更时，`sync` 会自动同步 `variables.scss` 到 `shared/styles/variables.scss`
- 也可在 App 前端直接运行 `pnpm sync` / `pnpm sync:dry-run`（内部 cd 到组件库执行）

#### 组件库 vs App 前端组件的职责划分

| 层级 | 位置 | 职责 | 可含业务逻辑 |
|------|------|------|------------|
| 组件库组件 | `aistock-component-lib/src/components/` | 纯 UI 组件，可跨项目复用 | ❌ 禁止 |
| App wrapper 组件 | `shared/components/` | 包裹组件库组件 + 注入业务逻辑 | ✅ 允许 |
| 模块业务组件 | `modules/*/components/` | 模块专属业务组件 | ✅ 允许 |

#### 何时在组件库建组件 vs 在 App 前端建组件

| 场景 | 建在哪里 | 示例 |
|------|---------|------|
| 可跨项目复用的纯 UI 组件 | 组件库 | Button、Card、Modal、Tag |
| 需要跨模块复用但含 app 业务逻辑 | App shared wrapper | PageCard、GlobalChatBar |
| 仅单个模块使用的业务组件 | 模块 components | MorningCard、StockCardList |
| 特定页面的布局片段 | 页面内联 | 无需独立组件 |

#### 现有组件迁移说明

本项目正在将自定义组件逐步对齐组件库设计系统（迁移计划见 `aistock-component-lib/docs/app-frontend-migration-plan.md`）。迁移期间：
- 旧组件保持可用，不做破坏性删除
- 新页面/新功能必须使用从组件库复制过来的组件
- 修改旧页面时，顺手将引用的旧组件替换为组件库对应组件（复制到 `shared/components/` 后引用）
- **App 前端独立性**：组件库仅作为设计参考和开发沙盒，app 前端通过复制组件（非引用）保持完全独立，可脱离组件库目录独立编译和部署

## 5. 关键约束（硬约束）

| 约束 | 说明 |
|------|------|
| 股票数据获取 | 必须通过后端 API，禁止前端直连第三方 |
| A 股涨跌色 | 红涨绿跌（红色 `#f43f5e` / 绿色 `#22c55e`） |
| 禁用 emoji | 禁止使用 emoji 图标，统一用 SvgIcon 组件 |
| App 专属功能 | 不能影响 H5/小程序编译，用条件编译包裹 |
| H5 完整性 | H5 用于 App 预览，必须具备完整 App 功能（无阉割） |
| 布局 | 用 `position:fixed`，禁止 `100vh` |
| 样式单位 | 使用 SCSS + rpx 单位 |
| 浅色主题 | 背景 `#f5f7fb`，卡片白色 `#ffffff` |
| Design Token | 所有颜色/字号/圆角必须用 `shared/styles/variables.scss` 中的变量，禁止硬编码（如 `#4d7cfe` 用 `$brand-color`） |
| App 端 envDir | `vite.config.ts` 必须配置 `envDir: 'env'`，否则 App 打包时 env 文件不加载，所有 API 请求失败 |
| App 端错误对象 | catch 块中读取错误信息用 `e?.errMsg || e?.message`，因为 uni-app 网络错误对象是 `{ errMsg }` 格式，没有 `message` 属性 |
| App 端状态栏 | 自定义导航栏的页面必须设置 `paddingTop: statusBarHeight + 'px'`，否则顶部内容被状态栏遮挡 |
| 类型安全 | 所有 .ts 文件需有类型注解，禁止 any（用 unknown） |
| 模块解耦 | 模块间零直接依赖，组件解耦可插拔 |
| 组件库优先 | 新页面/新组件必须先查组件库，有则复制到 `shared/components/` 使用，无则先在组件库建好再复制过来。禁止在 app 前端重复造通用组件。App 前端不依赖组件库目录，可独立编译部署 |
| 登录非必须 | 未登录用户可看核心功能，仅自选股需登录 |
| 未登录 Mock | 未登录用户展示 Mock 股票数据（贵州茅台、宁德时代、平安银行、中国平安、五粮液） |
| App 打包 | 需要 HBuilderX App 开发版 + DCloud 账号云打包 |

## 6. API 契约（与后端 aistock-app-api）

### 6.1 HTTP 请求封装

- 基于 `luch-request`（uni-app 生态标准请求库），提供兼容 axios 的 API
- 封装在 `shared/api/request.ts`
- baseURL 来自环境变量 `VITE_API_BASE_URL`（默认 `/api`）
- 请求拦截器自动注入 `Authorization: Bearer <token>`
- 响应拦截器统一错误处理

### 6.2 API 模块（shared/api/modules/）

| 模块文件 | 说明 | 后端路径 |
|---------|------|---------|
| `agent.ts` | Agent 反代（SSE 流式对话、分析报告查询、音频服务；P3-fix 新增 `ReasoningStep` 类型 + `ChatMessage.reasoningSteps`，WS reasoning 协议契约；P9 会话管理：`ChatSessionMeta` 类型 + `listChatSessions`/`upsertChatSession`/`deleteChatSession`；**P0 身份鉴权：`createAgentWebSocket` URL 带 `?token=`（app-api 桥接验签）、`sendMessage` 不再携带 `user_id`（服务端注入）**） | `/api/agent/*`；P9 会话 `/api/chat/sessions` |
| `auth.ts` | 认证（登录、用户信息） | `/api/auth/wechat/*` |
| `briefing.ts` | 早晚报结构化（BriefingItem/BriefingSummary 类型 + 降级解析适配器） | `/api/briefing/*` |
| `event.ts` | 事件传导链 | `/api/event-chain/*` |
| `news.ts` | 新闻资讯 | `/api/news/*` |
| `portfolio.ts` | 持仓管理 | `/api/portfolio/*` |
| `prediction.ts` | 历史预测跟踪（B2.1：列表+统计/详情） | `/api/predictions`、`/api/predictions/:id` |
| `push.ts` | 推送 | `/api/push/*` |
| `stock.ts` | 股票行情 | `/api/cn/stock-quote/*` |
| `valuation.ts` | 估值分析 | `/api/valuation/*` |

### 6.3 WebSocket

- 通过 `shared/utils/useWebSocket.ts` hook 使用
- 频道按功能拆分：quote（行情）、alert（异动）、chat（对话）
- 连接管理和事件分发在后端 `core/ws/` 处理
- **P0 身份鉴权（chat 频道）**：`createAgentWebSocket` 连接 `{AGENT_WS_BASE_URL}/chat`（路径不变）时带 `?token=`（`uni.getStorageSync('token')`）；app-api 桥接验签——非法/过期 token 服务端拒绝（close 4401），未登录（无 token）放行但 `user_id=None`；`user_id` 由服务端注入，客户端消息体不再携带

## 7. 共享组件速查

> **组件库优先**：以下组件中标注 `[组件库]` 的已从 `aistock-component-lib` 复制到 `shared/components/`，通过 `@/shared/components` 引入。标注 `[App 专属]` 的含业务逻辑，保留在 `shared/components/` 作为 wrapper。完整组件清单见 `aistock-component-lib/README.md`（41 个组件）。

| 组件 | 来源 | 说明 |
|------|------|------|
| `SvgIcon.vue` | App 专属 | SVG 图标组件（从 `assets/icons/` 文件加载，支持大量预置图标） |
| `PageCard.vue` | App 专属 | 页面卡片容器（主 tab 页用，含小熊头像 + GlobalChatBar + 动态底部高度） |
| `SubPageCard.vue` | App 专属 | 子页面卡片容器 v1（含返回 + scroll + ChatBar），逐步迁移到 SubPageCard2 |
| `SubPageCard2.vue` | App 专属 | 子页面卡片容器 v2（白色导航栏 + 副标题 + 可选 ChatBar） |
| `GlobalChatBar.vue` | App 专属 | 全局聊天栏（交易/自选按钮 + 语音输入） |
| `AppBottomBar.vue` | App 专属 | 底部导航栏（3 Tab + 动态 bottom 偏移） |
| `MainTabs.vue` | App 专属 | 首页三 Tab 容器（MorningContent / StockContent / AlertContent） |
| `Card.vue` | [组件库] | 基础卡片（标题 + 副标题 + 内容区，支持 clickable/flat） |
| `Button.vue` | [组件库] | 按钮（primary/secondary/ghost/accent/gold/danger 6 种类型） |
| `Tag.vue` | [组件库] | 标签（up/down/neutral/warning 4 种语义 + sm/md 尺寸） |
| `Badge.vue` | [组件库] | 徽标（primary/warning 2 种类型 + 可选圆点） |
| `Collapse.vue` | [组件库] | 折叠面板（支持 accordion + 具名插槽） |
| `Input.vue` | [组件库] | 输入框（支持 search-icon / clearable / model-value） |
| `Segmented.vue` | [组件库] | 分段选择器（items + v-model + @change） |
| `BottomSheet.vue` | [组件库] | 底部弹窗（v-model:visible + title + 具名插槽） |
| `Avatar.vue` | [组件库] | 头像（文字头像，4 种尺寸 + 4 种配色） |
| `LoadingState.vue` | [组件库] | 加载状态（3 种尺寸 + 水平/垂直布局） |
| `EmptyState.vue` | [组件库] | 空状态（对应组件库 `Empty.vue`） |
| `RadarChart.vue` | [组件库] | 雷达图（多维度评分可视化） |
| `RelationGraph.vue` | [组件库] | 关系图谱（径向布局 + 上下游/关联节点） |
| `TheNavbar.vue` | [组件库] | 导航栏（对应组件库 `NavBar.vue`） |
| `TheFooter.vue` | [组件库] | 页脚（对应组件库 `Footer.vue`） |
| `KLineChart.vue` | [组件库] 无对应，从 analytics 提升 | 通用 K 线渲染（H5/APP-PLUS renderjs+klinecharts，MP-WEIXIN uCharts 画布），Props `{ title: string; data: TrendKLineData }` |
| `AudioPlayer.vue` | [组件库] | 通用音频播放器（H5 HTMLAudioElement / App+小程序 InnerAudioContext 运行时分流），Props `{ src; title?; cover?; autoplay?; initialTime? }`，Emits `play`/`pause`/`ended`/`timeupdate`；卸载/换源时先 stop 再 destroy 确保音频立即停止（全局互斥抢占依赖此行为） |
| `FloatingPodcast.vue` | App 专属 | 播报悬浮球/播放条（页面容器 MainTabs/SubPageCard/SubPageCard2 内渲染），消费 podcast store；渲染权跟随 `store.activePage === pageKey`（仅当前前台页面实例渲染 AudioPlayer，避免多实例双播放）。**注意：uni-app 的 onShow/onHide 是页面实例级钩子，子组件注册的永不触发——页面容器必须用 Vue 的 `onActivated`/`onDeactivated`（KeepAlive 缓存树内子组件可触发）维护 activePage，失活用 `clearActivePage(pageKey)` 防止旧页事件覆盖新页** |

**已引入但尚未在生产页面使用的组件**（已存在于 `shared/components/` 并通过 barrel export 导出，需要时直接 `import { ... } from '@/shared/components'`）：
`Switch` `Rate` `Progress` `Skeleton` `Toast` `ActionSheet` `Modal` `Steps` `StatCard` `ListCell` `QuoteHeader` `Gauge` `Sparkline` `DataTable` `IndexCard` `Timeline` `ChatBubble` `StreamingText` `InsightListCard` `StockItem`

> **布局约束**: 所有需要预留底部空间的组件必须使用 `@/shared/utils/layout.ts` 中的函数（`getChatBarHeightPx` / `getBottomFixedHeightPx` / `getTabBarBottomPx`），禁止硬编码 rpx 值，以避免刘海屏设备底部内容被遮挡。

## 8. 共享 Hooks 速查

| Hook | 说明 |
|------|------|
| `useAuth` | 认证状态和登录/登出 |
| `useFavorites` | 自选股增删改查 |
| `useChatStream` | 对话流（WS 为主，HTTP 降级；`send(content, { forceDeep })`；DONE 写 `execSteps`/`lastDeepReport`，P3；订阅 reasoning 聚合 `reasoningSteps` + `_testHandleWsMessage` 测试钩子，P3-fix；return `streamingReasoning` 流式实时思考链，P3-fix-2；**P0：send 不再携带 user_id（服务端注入）；连接断开/4401 时结算挂起 send（不卡死 streaming）**；**Phase 4-2：`confirm_request` 终态处理（doneReceived 置位 + pendingConfirm ref + 结算 send promise）+ `sendConfirmResponse(request_id, choice)` 发送成功后 re-arm（doneReceived=false/streaming=true/清 progressSteps/streamingText/currentRunReasoning/currentRunEvents）**） |
| `chatSuggestions` | 自选股联动（Phase 4-2）：`buildFavoritesQuestion`（≤5 只拼接「我的自选股里 XX、YY 怎么样」/ >5 截断提示「仅展示前 5 只」/ 空列表回退）+ `buildStockQuestion` 问 AI 跳转预填 |
| `speechInput` | 语音容错输入侧（Phase 4-2）：`#ifdef` 平台分流（H5=Web Speech API 仅 Chrome/Edge、MP=WechatSI 插件代码就绪待真机、APP=降级提示）、判别联合 `SpeechRecognitionResult`、`isSpeechInputSupported()`、依赖注入核心供单测 |
| `useStockCycle` | 股票周期切换 |
| `useWebSocket` | WebSocket 连接管理 |
| `useTimer` | 定时器管理 |
| `usePushNotification` | 推送通知 |

## 9. 常用命令

```bash
pnpm install              # 安装依赖
pnpm dev:h5               # H5 开发预览（推荐开发阶段使用）
pnpm dev:app              # App 开发（需 HBuilderX）
pnpm dev:mp-weixin        # 小程序开发
pnpm build:h5             # H5 构建
pnpm build:app            # App 构建（需 HBuilderX 云打包）
pnpm build:mp-weixin      # 小程序构建
pnpm type-check           # TypeScript 类型检查（vue-tsc --noEmit）
pnpm sync                 # 从组件库同步组件到 shared/components（复制方式）
pnpm sync:dry-run         # 预览同步变更，不实际写入文件
```

## 10. 相关项目

- [aistock-app-api](../aistock-app-api) — 后端 API
- [aistock-frontend](../aistock-frontend) — PC Web 前端（Vue 2）
- [aistock-api](../aistock-api) — 原 PC Web 后端
