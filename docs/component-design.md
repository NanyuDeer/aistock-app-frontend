# Component Design — 前端组件设计文档

> AI Stock App 前端组件设计（uni-app 多端）

---

## 核心组件

### 1. PageCard — 页面卡片容器

**用途**: 页面主容器，包含标题和内容区域

**路径**: `src/components/common/PageCard.vue`

**Props**:
- `title` (string): 页面标题
- `showBack` (boolean): 是否显示返回按钮

---

### 2. SubPageCard — 子页面卡片容器

**用途**: 子页面容器（无卡片背景）

**路径**: `src/components/common/SubPageCard.vue`

---

### 3. SvgIcon — SVG 图标组件

**用途**: 统一 SVG 图标加载

**路径**: `src/components/common/SvgIcon.vue`

**Props**:
- `name` (string): 图标名称
- `color` (string): 图标颜色

---

### 4. StockCard — 股票卡片组件

**用途**: 显示单只股票信息

**路径**: `src/components/business/StockCard.vue`

---

## 组件映射（uni-app ↔ Web）

| uni-app 组件 | Web 对应组件 |
|--------------|--------------|
| PageCard | ThePageCard |
| SubPageCard | TheSubPageCard |
| SvgIcon | SvgIcon |

---

## 更新日志

| 日期 | 版本 | 说明 |
|------|------|------|
| 2026-07-03 | 0.1.0 | 初始版本 |