# Changelog — aistock-app-frontend

> 所有修改记录按时间倒序排列。每条记录标注分支、时间区间、开发者。

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
