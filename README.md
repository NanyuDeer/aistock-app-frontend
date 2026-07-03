# AI Stock App 前端

> AI 投资助手 App 前端，基于 uni-app + Vue 3 + TypeScript，一套代码覆盖 App/H5/小程序三端。

## 快速开始

```bash
# 安装依赖
pnpm install

# H5 开发预览（推荐开发阶段使用）
pnpm dev:h5

# App 开发（需 HBuilderX）
pnpm dev:app

# 小程序开发
pnpm dev:mp-weixin

# TypeScript 类型检查
npx tsc --noEmit
```

## 项目架构

### 三层模块化设计

```
src/
├── shared/              # 共享层（组长维护）
│   ├── api/             # API 接口层（按功能模块拆分）
│   ├── store/           # Pinia 全局状态
│   ├── styles/          # 全局样式变量和主题
│   ├── components/      # 全局组件（PageCard, GlobalChatBar, SvgIcon 等）
│   ├── utils/           # 工具函数和 hooks
│   └── types/           # 全局类型定义
├── modules/             # 业务模块层（每人负责一个模块）
│   ├── home/            # 首页模块（早点听、市场概览）
│   ├── favorites/       # 自选股模块（自选股列表、特别提醒）
│   ├── chat/            # AI 对话模块（聊天页、Skill 按钮）
│   ├── market/          # 行情模块（龙头股、重磅消息、标签页）
│   ├── user/            # 用户模块（个人中心、设置）
│   └── news/            # 资讯模块（公告、新闻）
└── pages.json           # 路由配置（统一管理）
```

### 模块负责人

| 模块 | 目录 | 功能范围 |
|------|------|---------|
| 首页 | modules/home | 早点听、市场概览、长线风口、异动捕手 |
| 自选股 | modules/favorites | 自选股列表、特别提醒、股票详情 |
| AI 对话 | modules/chat | 聊天页、Skill 按钮、流式对话 |
| 行情 | modules/market | 龙头股、重磅消息、板块标签 |
| 用户 | modules/user | 个人中心、登录设置 |
| 资讯 | modules/news | 公告、新闻列表 |

## 开发规范

### 模块依赖规则
- ✅ modules/* → shared/（允许，通过共享层通信）
- ❌ modules/A → modules/B（禁止，模块间零直接依赖）
- ✅ 共享层由组长维护，模块负责人只修改自己的模块目录

### 前端硬约束
- 浅色主题：背景 #f5f7fb，卡片白色 #ffffff
- A 股涨跌色：红涨绿跌（#f43f5e / #22c55e）
- 布局用 position:fixed，禁止 100vh
- 禁止 emoji 图标，用 SvgIcon 组件
- API 请求通过 shared/api/，禁止组件内写 axios
- 禁止 any，用 unknown

### 条件编译
- `#ifdef APP-PLUS` — App 专属代码
- `#ifdef H5` — H5 专属代码
- `#ifdef MP-WEIXIN` — 微信小程序专属代码

## Vibecoding 工作流

本项目使用 aistock-workflow rules 规范 AI 辅助开发流程。在 Trae IDE 中开发时，AI 自动执行 9 步流程：上下文加载→需求确认→编码→跨端同步检查→验证→文档维护→用户验收→技能缺口记录→修改记录。

详见：[Vibecoding 工作流文档](../docs/vibecoding-workflow.md)

## 相关项目

- [aistock-app-api](../aistock-app-api) — 后端 API
- [aistock-frontend](../aistock-frontend) — PC Web 前端（原项目）
- [aistock-api](../aistock-api) — 原 PC Web 后端
