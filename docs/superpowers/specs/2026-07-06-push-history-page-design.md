# 推送历史页面设计文档

## 概述

在 App 的长线风口页面中添加"推送历史"功能入口，点击后进入推送历史页面，展示历史推送记录列表。

## 背景

- Web 端已有推送历史页面（`PotentialStockPushHistoryView.vue`）
- App 端长线风口页面需要同样的功能
- 用户需要查看历史推送股票的收益表现

## 设计决策

### 1. 容器组件选择

**决策**：使用 `SubPageCard` 组件

**理由**：
- 推送历史页面是从长线风口页面跳转进入的子页面
- SubPageCard 提供返回按钮，符合子页面导航模式
- 与现有 App 页面结构保持一致

### 2. 入口按钮设计

**位置**：长线风口页面标题右侧

**样式**：文字按钮，显示"历史推送"

**实现**：
- 在 `leaders.vue` 的 SubPageCard 中使用 `header-right` slot
- 添加文字按钮，点击跳转到推送历史页面

### 3. 字段显示策略

**保留字段**：
- 推送日期（`push_date`）
- 股票名称 + 股票代码（`stock_name` + `stock_code`）
- 推送价 + 实时价（`push_price` + `realtime_price` / `latest_price`）
- 收益率（`return_pct` / `realtime_return_pct`）
- 行情更新时间（`realtime_time`）

**省略字段**（避免页面拥挤）：
- 风口/题材（`theme`）
- 推荐分（`score`）
- 链路位置（`chain_position`）
- 推荐理由（`reason`）

**理由**：移动端屏幕空间有限，保留核心信息（日期、股票、价格、收益率）足够满足用户需求。

### 4. 日期筛选设计

**实现**：使用 uni-datetime-picker 组件

**功能**：
- 日期选择（单选）
- 清除筛选按钮
- 选择后自动加载数据

### 5. 实现方案选择

**决策**：采用简化实现（方案 A）

**理由**：
- 快速交付，符合 uni-app 开发习惯
- 代码简洁，易于维护
- 性能好，数据加载快
- 后续可根据用户反馈迭代优化

## 页面结构

### 文件位置

- 新增页面：`src/modules/market/pages/push-history.vue`
- 修改页面：`src/modules/market/pages/leaders.vue`
- 路由配置：需要在 `pages.json` 中添加页面路由

### 页面结构

```
push-history.vue
├── SubPageCard
│   ├── title: "推送历史"
│   ├── 内容区域
│   │   ├── 日期筛选区域
│   │   │   ├── uni-datetime-picker
│   │   │   └── 清除筛选按钮
│   │   ├── 推送记录列表
│   │   │   ├── uni-list
│   │   │   │   ├── uni-list-item（每条记录）
│   │   │   │   │   ├── 推送日期
│   │   │   │   │   ├── 股票名称 + 股票代码
│   │   │   │   │   ├── 推送价 + 实时价
│   │   │   │   │   ├── 收益率（涨跌颜色）
│   │   │   │   │   └── 行情时间
│   │   │   ├── 加载状态
│   │   │   └── 空状态提示
│   └── GlobalChatBar（自动包含）
```

## 数据流

### API 接口

- **接口路径**：`/potential-stocks/push-history`（App 端 baseURL 为 `/api`，实际请求路径为 `/api/potential-stocks/push-history`）
- **请求参数**：
  - `date`：筛选日期（可选，格式 YYYY-MM-DD）
- **响应数据**：
  - `items`：推送记录数组

### 数据加载逻辑

1. 页面加载时自动调用 API
2. 日期筛选变化时重新调用 API
3. 显示 loading 状态
4. 处理空数据状态

## 组件设计

### 入口按钮（leaders.vue）

**位置**：SubPageCard 的 header-right slot

**样式**：
- 文字按钮
- 字体大小：24rpx
- 主题色：#4d7cfe
- 轻微背景色提升点击感

**交互**：
- 点击跳转到推送历史页面
- 使用 `uni.navigateTo`

### 推送记录列表项

**布局**：
- 使用 uni-list-item
- 横向排列关键信息
- 主要信息优先显示

**字段显示顺序**：
1. 推送日期（顶部左侧）
2. 股票名称 + 股票代码（顶部右侧）
3. 推送价 + 实时价（价格对比）
4. 收益率（涨跌红绿色显示）
5. 行情时间（底部右侧）

**样式设计**：
- 日期：灰色，小字体
- 股票名称：黑色，粗体
- 收益率：涨红色（#f43f5e），跌绿色（#22c55e）
- 价格：黑色，正常字体

## 技术实现

### 依赖

- uni-list / uni-list-item：列表展示
- uni-datetime-picker：日期选择
- SubPageCard：页面容器
- stockApi：API 调用（需要添加新方法）

### API 添加

在 `src/shared/api/modules/stock.ts` 中添加：

```typescript
/** 获取推送历史 */
getPushHistory(params?: { date?: string }) {
  return request.get('/potential-stocks/push-history', { params }).then((res: any) => res)
}
```

### 路由配置

在 `pages.json` 中添加：

```json
{
  "path": "modules/market/pages/push-history",
  "style": {
    "navigationBarTitleText": "",
    "navigationStyle": "custom"
  }
}
```

## 验收标准

1. 长线风口页面标题右侧显示"历史推送"按钮
2. 点击按钮跳转到推送历史页面
3. 推送历史页面显示历史推送记录列表
4. 支持按日期筛选
5. 收益率正确显示涨跌颜色
6. 加载状态和空状态正确处理

## 后续优化

如果用户反馈需要更多信息，可以考虑：
1. 添加搜索功能（按股票名称搜索）
2. 添加更多字段显示（如推荐理由）
3. 添加收益榜单 Tab（类似 Web 版）
4. 添加实时行情刷新功能

## 参考资源

- Web 版推送历史：`aistock-frontend/src/modules/analytics/views/PotentialStockPushHistoryView.vue`
- 长线风口页面：`aistock-app-frontend/src/modules/market/pages/leaders.vue`
- SubPageCard 组件：`aistock-app-frontend/src/shared/components/SubPageCard.vue`