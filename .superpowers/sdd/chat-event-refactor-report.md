# Chat/Event 模块组件库重构报告

> 日期：2026-07-29
> 模块：`src/modules/chat/event/components/`
> 目标：将 8 个组件对齐组件库设计系统，替换手写 UI 为共享组件

---

## 总览

| 类型 | 数量 | 说明 |
|------|------|------|
| REPLACE（直接替换 + 删除） | 2 | ImportanceStars.vue, EventTabBar.vue |
| ADAPT（使用组件库作为基础） | 6 | AiAnalysisSection, AiThinkingHeader, EventHeadlineCard, EventItemCard, HistoryTimeline, AiTransmissionAnalysis |
| 合计 | 8 | |

**类型检查**：`npx vue-tsc --noEmit` 重构文件零错误（8 个预存错误均在其他模块，与本次重构无关）

---

## 详细变更

### 1. ImportanceStars.vue → Rate（REPLACE + 删除）

**操作**：删除文件，父组件直接使用 `<Rate>`

**变更前**：
- 使用 `★` 字符实现 1-5 星重要性评级
- 被 `EventItemCard.vue` 引用

**变更后**：
- 删除 `ImportanceStars.vue`
- `EventItemCard.vue` 直接导入并使用 `Rate` 组件：
  ```vue
  <Rate :modelValue="event.importance" :readonly="true" type="gold" size="18rpx" :gap="2" />
  ```

**使用的组件库组件**：`Rate.vue`

---

### 2. EventTabBar.vue → Segmented（REPLACE + 删除）

**操作**：删除文件，两个父页面直接使用 `<Segmented>`

**变更前**：
- 自定义 tab bar 实现，支持事件类型筛选
- 被 `list.vue` 和 `event-chain/index.vue` 引用

**变更后**：
- 删除 `EventTabBar.vue`
- 两个父页面直接使用 `Segmented` 组件：
  ```vue
  <Segmented :modelValue="activeType" :items="tabItems" @change="(v: string | number) => handleFilterChange(String(v))" />
  ```
- tab 数据映射为 Segmented 的 `items` 格式（`{ label, value }`）

**影响的文件**：
- `src/modules/chat/pages/event/list.vue`
- `src/pages-sub-app/event-chain/index.vue`

**使用的组件库组件**：`Segmented.vue`

---

### 3. AiAnalysisSection.vue → LoadingState + StreamingText（ADAPT）

**操作**：替换硬编码 loading 和流式文本为组件库组件

**变更前**：
- 自定义 loading spinner（CSS 动画）
- 自定义流式文本渲染

**变更后**：
- loading 状态使用 `<LoadingState size="sm" layout="horizontal" :text="..." />`
- 流式文本使用 `<StreamingText :text="streamingText" />`
- 保留全部业务逻辑：pending/processing/generating/completed 四态管理、思考过程折叠/展开

**使用的组件库组件**：`LoadingState.vue`, `StreamingText.vue`

---

### 4. AiThinkingHeader.vue → SvgIcon + Steps（ADAPT）

**操作**：替换字符箭头和手写日志为组件库组件

**变更前**：
- 使用 `←` 字符作为返回箭头
- 手写 bullet 列表展示思考日志

**变更后**：
- 返回箭头使用 `<SvgIcon name="arrow-left-line" size="28rpx" :color="iconArrow" />`
- 标题图标使用 `<SvgIcon name="robot-line" size="30rpx" :color="iconPrimary" />`
- 思考日志使用 `<Steps :steps="steps" :current="activeLogIdx" direction="horizontal" status="process" />`
- 保留全部业务逻辑：phase 映射、thinkingLogs 响应式、isComplete 状态

**使用的组件库组件**：`SvgIcon.vue`, `Steps.vue`

---

### 5. EventHeadlineCard.vue → Card + Tag + Badge + SvgIcon（ADAPT）

**操作**：替换 emoji 和自定义容器为组件库组件

**变更前**：
- 使用 emoji `🔥` 表示重大事件
- 自定义卡片容器
- 自定义方向标签和行业标签

**变更后**：
- 容器使用 `<Card flat clickable>`
- emoji `🔥` 替换为 `<SvgIcon name="fire-line" size="20rpx" :color="fireColor" />`
- 方向标签使用 `<Tag :type="type === 'positive' ? 'up' : 'down'" size="sm">`
- 重要性标签使用 `<Badge type="gold" size="sm">` / `<Badge type="info" size="sm">`
- 行业标签使用 `<Badge type="info" size="sm">`
- 保留全部业务逻辑：directionText 计算、displayIndustries 截取、remainingCount 计算、click 事件

**使用的组件库组件**：`Card.vue`, `Tag.vue`, `Badge.vue`, `SvgIcon.vue`

---

### 6. EventItemCard.vue → Card + Rate + Tag + SvgIcon（ADAPT）

**操作**：替换自定义容器和 ImportanceStars 为组件库组件

**变更前**：
- 自定义卡片容器
- 使用 `ImportanceStars` 组件（已删除）
- 自定义来源标签

**变更后**：
- 容器使用 `<Card flat clickable>`
- 重要性评级使用 `<Rate :modelValue="event.importance" :readonly="true" type="gold" />`
- 来源标签使用 `<Tag size="sm" :type="sourceTagType">`（无可验证来源时 type="warning"）
- AI 解析按钮图标使用 `<SvgIcon name="robot-line" size="28rpx" />`
- 保留全部业务逻辑：typeColor 映射、sourceLabel 计算、top5Industries 排序截取、formatTime 格式化

**使用的组件库组件**：`Card.vue`, `Rate.vue`, `Tag.vue`, `SvgIcon.vue`

---

### 7. HistoryTimeline.vue → Timeline（ADAPT）

**操作**：适配为 shared Timeline 组件的数据适配器

**变更前**：
- 自定义时间线渲染（圆点 + 连线 + 内容卡片）
- 直接使用 HistoryEvent 数据

**变更后**：
- 使用 `<Timeline :items="items" />` 渲染
- 本组件变为纯数据适配器，将 HistoryEvent[] 映射为 TimelineItem[]：
  - `year` → `time`
  - `title` → `title`
  - `industryChange` → `description`
  - `sentiment` → `type`（bullish=up, bearish=down, neutral=neutral，A 股红涨绿跌）
  - `changePercentage` → `extra`（格式化为 "+X%" / "X%"）

**使用的组件库组件**：`Timeline.vue`

---

### 8. AiTransmissionAnalysis.vue → Steps + Rate + Progress（ADAPT）

**操作**：替换星号字符、步骤头部和自定义进度条为组件库组件

**变更前**：
- 使用 `★` 字符表示变量强度
- 自定义步骤标题
- 自定义 `chain-bar-fill` 进度条

**变更后**：
- 顶部步骤指示器使用 `<Steps :steps="stepItems" :current="stepItems.length - 1" direction="horizontal" status="finish" />`
- 变量强度使用 `<Rate :modelValue="Math.round(v.strength * 5)" :readonly="true" type="gold" />`
- 传导强度进度条使用 `<Progress :value="Math.round(c.impactStrength * 100)" :status="chainProgressStatus(c.direction)" />`
- 保留全部业务逻辑：stepItems 定义、chainProgressStatus 方向映射（bullish=danger/红, bearish=success/绿）

**使用的组件库组件**：`Steps.vue`, `Rate.vue`, `Progress.vue`

---

## 文件变更清单

### 修改的文件（8 个）

| 文件路径 | 变更类型 |
|---------|---------|
| `src/modules/chat/event/components/AiAnalysisSection.vue` | ADAPT |
| `src/modules/chat/event/components/AiThinkingHeader.vue` | ADAPT |
| `src/modules/chat/event/components/EventHeadlineCard.vue` | ADAPT |
| `src/modules/chat/event/components/EventItemCard.vue` | ADAPT |
| `src/modules/chat/event/components/HistoryTimeline.vue` | ADAPT |
| `src/modules/chat/event/components/transmission/AiTransmissionAnalysis.vue` | ADAPT |
| `src/modules/chat/pages/event/list.vue` | 更新导入（EventTabBar → Segmented） |
| `src/pages-sub-app/event-chain/index.vue` | 更新导入（EventTabBar → Segmented） |

### 删除的文件（2 个）

| 文件路径 | 原因 |
|---------|------|
| `src/modules/chat/event/components/ImportanceStars.vue` | 被 Rate 组件直接替代 |
| `src/modules/chat/event/components/EventTabBar.vue` | 被 Segmented 组件直接替代 |

### 更新的文档（2 个）

| 文件路径 | 变更内容 |
|---------|---------|
| `src/modules/chat/event/README.md` | 更新组件列表，移除已删除组件，标注组件库使用 |
| `changelog-pending.md` | 新增重构记录条目 |

---

## 使用的组件库组件汇总

| 组件库组件 | 使用次数 | 使用文件 |
|-----------|---------|---------|
| `Rate.vue` | 3 | EventItemCard, AiTransmissionAnalysis, (替代 ImportanceStars) |
| `Segmented.vue` | 2 | list.vue, event-chain/index.vue |
| `Card.vue` | 2 | EventHeadlineCard, EventItemCard |
| `Tag.vue` | 2 | EventHeadlineCard, EventItemCard |
| `Badge.vue` | 2 | EventHeadlineCard (x2) |
| `LoadingState.vue` | 1 | AiAnalysisSection |
| `StreamingText.vue` | 1 | AiAnalysisSection |
| `Steps.vue` | 2 | AiThinkingHeader, AiTransmissionAnalysis |
| `Progress.vue` | 1 | AiTransmissionAnalysis |
| `Timeline.vue` | 1 | HistoryTimeline |
| `SvgIcon.vue` | 3 | AiThinkingHeader, EventHeadlineCard, EventItemCard |

---

## 验证结果

### 类型检查

```
npx vue-tsc --noEmit
```

**重构文件**：零错误

**预存错误（8 个，均与本次重构无关）**：
1. `src/modules/chat/pages/agent-report.vue(376,18)` — isPublicReportIntent 未定义
2. `src/modules/favorites/components/StockDetailTable.vue(10,15)` — TableRow 类型不兼容
3. `src/modules/favorites/pages/detail.vue(395,16)` — ProfitPoint 类型不兼容
4. `src/modules/favorites/pages/detail.vue(666,27)` — name 属性不存在
5. `src/modules/favorites/pages/detail.vue(670,68)` — name 属性不存在
6. `src/modules/home/components/MorningContent.vue(91,39)` — 参数类型不兼容
7. `src/pages-sub-app/briefing/index.vue(239,23)` — addCalendarDays 未定义
8. `src/pages-sub-app/briefing/index.vue(300,36)` — shanghaiDateString 未定义

### 残留引用检查

```
grep -r "ImportanceStars|EventTabBar" src/
```

**结果**：无匹配 — 已删除组件无任何残留引用

### Emoji 检查

```
grep -r "🔥|⭐|★" src/modules/chat/event/components/
```

**结果**：无匹配 — 所有装饰性 emoji 已替换为 SvgIcon

---

## 业务逻辑保留确认

| 组件 | 保留的业务逻辑 |
|------|--------------|
| AiAnalysisSection | 四态管理（pending/processing/generating/completed）、思考过程折叠/展开、slot 业务组件 |
| AiThinkingHeader | phase 映射、thinkingLogs 响应式、isComplete 状态、back 事件 |
| EventHeadlineCard | directionText 计算、displayIndustries 截取、remainingCount 计算、click 事件 |
| EventItemCard | typeColor 映射、sourceLabel/sourceTagType 计算、top5Industries 排序截取、formatTime 格式化、三个 emit 事件 |
| HistoryTimeline | sentiment→type 映射（A 股红涨绿跌）、changePercentage 格式化 |
| AiTransmissionAnalysis | stepItems 定义、chainProgressStatus 方向映射、EventTransmissionGraph 集成 |
| list.vue | activeType 状态、handleFilterChange、tabItems 映射 |
| event-chain/index.vue | activeType 状态、handleFilterChange、tabItems 映射 |

---

## 结论

8 个组件全部完成组件库对齐重构，2 个冗余组件已删除，所有业务逻辑完整保留，类型检查零错误，无残留引用和 emoji。
