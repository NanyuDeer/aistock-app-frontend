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
| App 分包 | `src/pages-sub-app/` | App 专属功能（双人播报、持仓、事件链、估值、复盘、晨报、AI 对话） | `#ifdef APP-PLUS` 包裹 |
| 小程序分包 | `src/pages-sub-mp/` | 小程序专属功能（微信智能体） | `#ifdef MP-WEIXIN` 包裹 |

### 业务模块

| 模块 | 目录 | 功能范围 | 子模块 AGENTS.md |
|------|------|---------|-----------------|
| 首页 | `modules/home` | 早点听、市场概览、长线风口、异动捕手 | [home/AGENTS.md](./src/modules/home/AGENTS.md) |
| 自选股 | `modules/favorites` | 自选股列表、特别提醒、股票详情、搜索、异动监控 | [favorites/AGENTS.md](./src/modules/favorites/AGENTS.md) |
| AI 对话 | `modules/chat` | 聊天页、Skill 按钮、流式对话、分析报告展示 | [chat/AGENTS.md](./src/modules/chat/AGENTS.md) |
| 行情 | `modules/market` | 龙头股、重磅消息、板块标签、异动捕手、长线风口 | [market/AGENTS.md](./src/modules/market/AGENTS.md) |
| 业绩分析 | `modules/analytics` | 业绩预测、业绩报告列表、财报详情 | — |
| 用户 | `modules/user` | 个人中心、登录设置、更新日志 | [user/AGENTS.md](./src/modules/user/AGENTS.md) |
| 资讯 | `modules/news` | 公告、新闻详情 | [news/AGENTS.md](./src/modules/news/AGENTS.md) |

### App 专属分包（pages-sub-app/）

| 页面 | 文件 | 说明 |
|------|------|------|
| 双人播报 | `briefing/index.vue` | 双人对话播报（音频播放 + 对话文本展示，已实现） |
| 持仓管理 | `portfolio/index.vue` | 持仓分析 |
| 事件传导链 | `event-chain/index.vue` | 事件传导链路可视化 |
| 估值分析 | `valuation/index.vue` | 个股估值 |
| 交易复盘 | `review/index.vue` | 复盘归因 |
| AI 对话 | `chat/index.vue` | App 专属 AI 对话 |

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
│   │       ├── briefing.ts # 晨报
│   │       ├── event.ts    # 事件传导链
│   │       ├── news.ts     # 新闻资讯
│   │       ├── portfolio.ts # 持仓
│   │       ├── push.ts     # 推送
│   │       ├── stock.ts    # 股票行情
│   │       └── valuation.ts # 估值
│   ├── store/           # Pinia 状态管理
│   │   ├── index.ts     # Store 入口
│   │   └── modules/     # Store 模块（按功能拆分）
│   │       ├── app.ts       # 应用状态
│   │       ├── chat.ts      # 对话状态
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
│   │   ├── useStreamingChat.ts # 流式对话 hook
│   │   ├── useStockCycle.ts   # 股票周期 hook
│   │   ├── useWebSocket.ts    # WebSocket hook
│   │   ├── useTimer.ts        # 定时器 hook
│   │   ├── usePushNotification.ts # 推送通知 hook
│   │   ├── constants.ts       # 常量
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
| `agent.ts` | Agent 反代（SSE 流式对话、分析报告查询、音频服务） | `/api/agent/*` |
| `auth.ts` | 认证（登录、用户信息） | `/api/auth/wechat/*` |
| `briefing.ts` | 晨报 | `/api/briefing/*` |
| `event.ts` | 事件传导链 | `/api/event-chain/*` |
| `news.ts` | 新闻资讯 | `/api/news/*` |
| `portfolio.ts` | 持仓管理 | `/api/portfolio/*` |
| `push.ts` | 推送 | `/api/push/*` |
| `stock.ts` | 股票行情 | `/api/cn/stock-quote/*` |
| `valuation.ts` | 估值分析 | `/api/valuation/*` |

### 6.3 WebSocket

- 通过 `shared/utils/useWebSocket.ts` hook 使用
- 频道按功能拆分：quote（行情）、alert（异动）、chat（对话）
- 连接管理和事件分发在后端 `core/ws/` 处理

## 7. 共享组件速查

| 组件 | 说明 |
|------|------|
| `SvgIcon.vue` | SVG 图标组件（统一图标方案，从 `assets/icons/` 加载） |
| `PageCard.vue` | 页面卡片容器（主 tab 页用，含动态底部高度计算） |
| `SubPageCard.vue` | 子页面卡片容器（子页用，含返回按钮 + scroll-view + GlobalChatBar） |
| `GlobalChatBar.vue` | 全局聊天栏（悬浮入口） |
| `AppBottomBar.vue` | 底部导航栏（bottom 动态绑定 ChatBar 高度） |
| `Card.vue` / `Button.vue` / `Avatar.vue` | 基础 UI 组件 |
| `RadarChart.vue` | 雷达图 |
| `RelationGraph.vue` | 关系图谱 |
| `LoadingState.vue` | 加载状态 |
| `EmptyState.vue` | 空状态 |

> **布局约束**: 所有需要预留底部空间的组件必须使用 `@/shared/utils/layout.ts` 中的函数（`getChatBarHeightPx` / `getBottomFixedHeightPx` / `getTabBarBottomPx`），禁止硬编码 rpx 值，以避免刘海屏设备底部内容被遮挡。

## 8. 共享 Hooks 速查

| Hook | 说明 |
|------|------|
| `useAuth` | 认证状态和登录/登出 |
| `useFavorites` | 自选股增删改查 |
| `useStreamingChat` | 流式对话（SSE） |
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
```

## 10. 相关项目

- [aistock-app-api](../aistock-app-api) — 后端 API
- [aistock-frontend](../aistock-frontend) — PC Web 前端（Vue 2）
- [aistock-api](../aistock-api) — 原 PC Web 后端
