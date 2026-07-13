# Changelog — aistock-app-frontend

> 所有修改记录按时间倒序排列。每条记录标注分支、时间区间、开发者。

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
