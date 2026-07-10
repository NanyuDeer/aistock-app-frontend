# 事件传导模块 (Event Transmission)

## 概述

事件传导模块是 AI 聊天下的独立业务功能，负责展示金融事件及其对行业的传导影响。

## 目录结构

```
event/
├── components/          # UI 组件（纯展示+交互）
│   ├── EventHeader.vue         # 页面顶部导航
│   ├── EventItemCard.vue       # 事件卡片
│   ├── EventTabBar.vue         # 分类Tab栏
│   ├── ImportanceStars.vue     # 重要性星级
│   ├── IndustryImpactList.vue  # 行业影响列表（已废弃，由 transmission/ 替代）
│   ├── AiSummaryCard.vue       # AI总结卡片
│   ├── AiImpactCards.vue       # AI推演横向滚动卡片
│   ├── ImpactCard.vue          # 单张推演卡片
│   ├── EventFlowGraph.vue      # 传导关系图谱容器（被 transmission/TransmissionGraph 复用）
│   ├── GraphNode.vue           # 图谱节点
│   ├── GraphEdge.vue           # 图谱连线
│   ├── GraphStrength.vue       # 传导强度标签
│   ├── AiChatBubble.vue        # AI对话气泡
│   ├── ImpactVariableGrid.vue  # 影响变量网格（已废弃，由 transmission/ 替代）
│   ├── HistoryTimeline.vue     # 历史事件时间线
│   ├── TimelineItem.vue        # 单条历史事件
│   ├── WatchButton.vue         # 盯盘按钮
│   ├── FollowButton.vue        # 关注按钮
│   └── EmptyState.vue          # 空状态
│
├── composables/         # 业务逻辑
│   ├── useEventList.ts         # 事件列表逻辑
│   ├── useEventDetail.ts       # 事件详情逻辑
│   ├── useGraphInteraction.ts  # 图谱交互逻辑
│   ├── useEventFollow.ts       # 关注逻辑
│   └── useEventWatch.ts        # 盯盘逻辑
│
├── api/
│   └── eventApi.ts             # 后端接口封装
│
├── types.ts             # TypeScript 类型定义
├── mock-data.ts         # 开发阶段模拟数据
├── constants.ts         # 常量定义
└── README.md            # 本文件
```

## 使用方式

### 从页面引用

```typescript
// list.vue
import EventItemCard from '@/modules/chat/event/components/EventItemCard.vue'
import { useEventList } from '@/modules/chat/event/composables/useEventList'
```

### 路由

- 事件列表页: `/modules/chat/pages/event/list`
- 事件详情页: `/modules/chat/pages/event/detail?id={eventId}`

## 开发阶段

当前处于**文件结构创建阶段**，所有组件仅有基础骨架。

### 后续开发步骤

1. 完善 types.ts（接入 API 后可能需要调整）
2. 完善 mock-data.ts（补充更多模拟数据）
3. 实现 composables 中的业务逻辑
4. 实现组件 UI 和交互
5. 组装 list.vue 和 detail.vue 页面
6. 注册 pages.json 路由
7. 接入首页入口
8. 接入后端 API（替换 mock）

## 架构约束

- 所有文件限制在 `src/modules/chat/event/` 和 `src/modules/chat/pages/event/` 内
- 禁止修改其他业务模块代码
- 使用 Vue3 Composition API + `<script setup lang="ts">`
- 使用 TypeScript 类型
- 使用 scoped CSS
