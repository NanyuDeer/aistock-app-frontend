# AGENTS.md - aistock-app-frontend

> 本文件是 AI Agent 的入口地图，开发者与 AI 对话前必读

## 项目概述
AI Stock App 前端，基于 uni-app + Vue 3 + TypeScript + Pinia，一套代码覆盖 App/H5/小程序三端。

## 技术栈
- 框架: uni-app (Vue 3) + Vite
- 状态管理: Pinia
- UI: wot-design-uni
- 网络: Axios + @uni-helper/axios-uni
- 图表: uCharts + renderjs(ECharts)
- 语言: TypeScript

## 目录结构
```
src/
├── pages/            # 主包页面（三端共享）
├── pages-sub-app/    # App 专属分包（AI 对话/双人播报/持仓等）
├── pages-sub-mp/     # 小程序专属分包（微信智能体）
├── components/       # 全局组件
├── api/              # 接口层（modules/ 按功能拆分）
├── store/            # Pinia 状态管理
├── hooks/            # 组合式函数
├── utils/            # 工具函数
├── styles/           # 全局样式
└── static/           # 静态资源
```

## 开发规范
1. **条件编译**：App 专属功能用 `#ifdef APP-PLUS` 包裹，放在 `pages-sub-app/`
2. **API 层**：所有请求通过 `api/modules/*.ts`，禁止直接在组件中写 axios
3. **状态管理**：跨页面共享数据用 Pinia，页面内私有数据用 ref/reactive
4. **样式**：使用 SCSS + rpx 单位，深色主题（背景 #0f0f1e）
5. **类型**：所有 .ts 文件需有类型注解，禁止 any（必要时用 unknown）

## 常用命令
```bash
pnpm dev:h5          # H5 开发
pnpm dev:app         # App 开发（需 HBuilderX）
pnpm dev:mp-weixin   # 小程序开发
pnpm build:h5        # H5 构建
```

## 关键约束
- 股票行情必须通过后端 API 获取，禁止前端直连第三方
- A 股涨跌色：红涨绿跌（#FF3B30 / #34C759）
- App 专属功能（AI 对话/双人播报）不能影响 H5/小程序编译

## 参考文档
- 架构设计: ../../AI投资App架构设计文档.md
- Harness 体系: ../../Harness架构设计文档.md
