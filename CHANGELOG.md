# Changelog — aistock-app-frontend

> 所有修改记录按时间倒序排列。每条记录标注分支、时间区间、开发者。

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
