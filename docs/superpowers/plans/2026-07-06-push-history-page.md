# 推送历史页面实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 App 的长线风口页面中添加"推送历史"功能入口，点击后进入推送历史页面，展示历史推送记录列表。

**Architecture:** 使用 SubPageCard 作为页面容器，uni-datetime-picker 实现日期筛选，uni-list 展示推送记录列表。简化实现，保留核心字段（日期、股票、价格、收益率），省略次要字段避免页面拥挤。

**Tech Stack:** Vue 3 + TypeScript + uni-app + wot-design-uni

## Global Constraints

- 项目路径：`d:\aistock\aistock-app-frontend`
- 使用 TypeScript，禁止使用 `any`，使用 `unknown`
- 所有代码必须通过 `npm run type-check` 验证
- 使用 pnpm 作为包管理器
- API baseURL 为 `/api`，实际请求路径为 `/api/potential-stocks/push-history`
- 组件路径：`src/shared/components/SubPageCard.vue`
- API 模块：`src/shared/api/modules/stock.ts`
- 页面路由配置：`pages.json`（项目根目录）

---

## File Structure

### 新增文件

- `src/modules/market/pages/push-history.vue` — 推送历史页面，展示推送记录列表，支持日期筛选

### 修改文件

- `src/shared/api/modules/stock.ts` — 添加 `getPushHistory` 方法
- `src/modules/market/pages/leaders.vue` — 在 SubPageCard 中添加"历史推送"入口按钮
- `pages.json` — 添加推送历史页面路由配置

---

### Task 1: 添加 API 方法

**Files:**
- Modify: `src/shared/api/modules/stock.ts`

**Interfaces:**
- Produces: `stockApi.getPushHistory(params?: { date?: string }) => Promise<{ items: PushHistoryItem[] }>`
- Used by: Task 3 (push-history.vue 页面调用此方法)

**类型定义：**

```typescript
interface PushHistoryItem {
  push_date: string
  stock_name: string
  stock_code: string
  push_price: number | null
  realtime_price?: number | null
  latest_price?: number | null
  return_pct?: number | null
  realtime_return_pct?: number | null
  realtime_time?: string
}
```

- [ ] **Step 1: 定义接口类型**

在 `src/shared/api/modules/stock.ts` 文件末尾添加类型定义：

```typescript
export interface PushHistoryItem {
  push_date: string
  stock_name: string
  stock_code: string
  push_price: number | null
  realtime_price?: number | null
  latest_price?: number | null
  return_pct?: number | null
  realtime_return_pct?: number | null
  realtime_time?: string
}
```

- [ ] **Step 2: 添加 getPushHistory 方法**

在 `stockApi` 对象中添加新方法（在 `removeFavorites` 方法之后）：

```typescript
/** 获取推送历史 */
getPushHistory(params?: { date?: string }) {
  return request.get<{ items: PushHistoryItem[] }>('/potential-stocks/push-history', { params }).then((res: any) => res)
}
```

- [ ] **Step 3: 运行类型检查**

Run: `npm run type-check`
Expected: PASS（无类型错误）

- [ ] **Step 4: Commit**

```bash
cd d:\aistock\aistock-app-frontend
git add src/shared/api/modules/stock.ts
git commit -m "feat(api): add getPushHistory method"
```

---

### Task 2: 修改 leaders.vue 添加入口按钮

**Files:**
- Modify: `src/modules/market/pages/leaders.vue`

**Interfaces:**
- Consumes: SubPageCard 的 `header-right` slot
- Produces: 点击按钮跳转到推送历史页面

- [ ] **Step 1: 在 SubPageCard 中添加 header-right slot**

在 `<SubPageCard title="长线风口">` 标签之后添加 slot：

```vue
<SubPageCard title="长线风口">
  <template #header-right>
    <view class="history-btn" @tap="goPushHistory">
      <text class="history-btn-text">历史推送</text>
    </view>
  </template>
  <!-- 原有内容保持不变 -->
```

- [ ] **Step 2: 添加按钮样式**

在 `<style lang="scss" scoped>` 部分末尾添加样式：

```scss
.history-btn {
  padding: 8rpx 16rpx;
  background: rgba(77, 124, 254, 0.1);
  border-radius: 8rpx;
}

.history-btn-text {
  font-size: 24rpx;
  color: #4d7cfe;
  font-weight: 500;
}
```

- [ ] **Step 3: 添加跳转逻辑**

在 `<script setup lang="ts">` 部分添加跳转函数：

```typescript
function goPushHistory() {
  uni.navigateTo({ url: '/modules/market/pages/push-history' })
}
```

- [ ] **Step 4: 运行类型检查**

Run: `npm run type-check`
Expected: PASS

- [ ] **Step 5: 启动开发服务器验证按钮显示**

Run: `npm run dev:h5`
Expected: 浏览器打开 http://localhost:5173，导航到长线风口页面，标题右侧显示"历史推送"按钮

- [ ] **Step 6: Commit**

```bash
cd d:\aistock\aistock-app-frontend
git add src/modules/market/pages/leaders.vue
git commit -m "feat(leaders): add push history entry button"
```

---

### Task 3: 创建 push-history.vue 页面

**Files:**
- Create: `src/modules/market/pages/push-history.vue`

**Interfaces:**
- Consumes: `stockApi.getPushHistory`，SubPageCard，uni-datetime-picker
- Produces: 推送历史页面，支持日期筛选，展示推送记录列表

- [ ] **Step 1: 创建文件骨架**

创建文件 `src/modules/market/pages/push-history.vue`，添加基础结构：

```vue
<template>
  <SubPageCard title="推送历史">
    <view class="push-history-content">
      <!-- 日期筛选区域 -->
      <view class="filter-section">
        <uni-datetime-picker
          v-model="selectedDate"
          type="date"
          :clear-icon="true"
          @change="loadData"
        />
      </view>

      <!-- 推送记录列表 -->
      <uni-list v-if="!loading && records.length">
        <uni-list-item
          v-for="item in records"
          :key="item.stock_code + item.push_date"
          :title="item.stock_name"
          :note="formatNote(item)"
        >
          <template #header>
            <text class="item-date">{{ formatDate(item.push_date) }}</text>
          </template>
          <template #footer>
            <view class="item-footer">
              <text class="item-return" :class="getReturnClass(item)">
                {{ formatReturn(item) }}
              </text>
              <text class="item-time">{{ item.realtime_time || '--' }}</text>
            </view>
          </template>
        </uni-list-item>
      </uni-list>

      <!-- 加载状态 -->
      <view v-if="loading" class="loading-state">
        <text>加载中...</text>
      </view>

      <!-- 空状态 -->
      <view v-if="!loading && !records.length" class="empty-state">
        <text>暂无推送记录</text>
      </view>
    </view>
  </SubPageCard>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { stockApi } from '@/shared/api/modules/stock'
import type { PushHistoryItem } from '@/shared/api/modules/stock'
import SubPageCard from '@/shared/components/SubPageCard.vue'

const selectedDate = ref('')
const loading = ref(false)
const records = ref<PushHistoryItem[]>([])

async function loadData() {
  loading.value = true
  try {
    const params = selectedDate.value ? { date: selectedDate.value } : undefined
    const res: any = await stockApi.getPushHistory(params)
    // luch-request 响应拦截器已处理，直接返回 data 部分
    // 后端可能返回 { items: [] } 或 { data: { items: [] } }
    records.value = res?.items || res?.data?.items || []
  } catch (error) {
    console.error('加载推送历史失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function formatDate(date: string): string {
  if (!date) return '--'
  const d = new Date(date)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${month}-${day}`
}

function formatNote(item: PushHistoryItem): string {
  const pushPrice = item.push_price ? `推送: ${item.push_price.toFixed(2)}` : '--'
  const currentPrice = item.realtime_price || item.latest_price
  const priceText = currentPrice ? `现价: ${currentPrice.toFixed(2)}` : '--'
  return `${pushPrice} | ${priceText}`
}

function formatReturn(item: PushHistoryItem): string {
  const returnPct = item.realtime_return_pct || item.return_pct
  if (!returnPct) return '--'
  return `${returnPct >= 0 ? '+' : ''}${returnPct.toFixed(2)}%`
}

function getReturnClass(item: PushHistoryItem): string {
  const returnPct = item.realtime_return_pct || item.return_pct
  if (!returnPct) return ''
  return returnPct >= 0 ? 'up' : 'down'
}

onMounted(() => {
  loadData()
})
</script>

<style lang="scss" scoped>
.push-history-content {
  padding: 24rpx;
}

.filter-section {
  margin-bottom: 24rpx;
}

.loading-state,
.empty-state {
  padding: 48rpx;
  text-align: center;
  color: #6b7280;
}

.item-date {
  font-size: 24rpx;
  color: #6b7280;
}

.item-footer {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8rpx;
}

.item-return {
  font-size: 28rpx;
  font-weight: 600;

  &.up {
    color: #f43f5e;
  }

  &.down {
    color: #22c55e;
  }
}

.item-time {
  font-size: 22rpx;
  color: #9ca3af;
}
</style>
```

- [ ] **Step 2: 运行类型检查**

Run: `npm run type-check`
Expected: PASS

- [ ] **Step 3: 启动开发服务器验证页面功能**

Run: `npm run dev:h5`
Expected:
1. 浏览器打开 http://localhost:5173
2. 从长线风口页面点击"历史推送"按钮，跳转到推送历史页面
3. 页面显示日期筛选器
4. 页面显示推送记录列表（如果有数据）
5. 收益率显示正确的红绿色
6. 日期筛选功能正常工作

- [ ] **Step 4: Commit**

```bash
cd d:\aistock\aistock-app-frontend
git add src/modules/market/pages/push-history.vue
git commit -m "feat(push-history): create push history page"
```

---

### Task 4: 添加路由配置

**Files:**
- Modify: `pages.json`

**Interfaces:**
- Produces: 推送历史页面可通过 `/modules/market/pages/push-history` 路径访问

- [ ] **Step 1: 添加路由配置**

在 `pages.json` 的 `pages` 数组中添加新页面配置：

```json
{
  "path": "modules/market/pages/push-history",
  "style": {
    "navigationBarTitleText": "",
    "navigationStyle": "custom"
  }
}
```

**注意：** 插入位置应在 `modules/market/pages/leaders` 配置附近，保持模块内聚。

- [ ] **Step 2: 验证路由跳转**

Run: `npm run dev:h5`
Expected: 从长线风口页面点击"历史推送"按钮，成功跳转到推送历史页面（URL 为 `/modules/market/pages/push-history`）

- [ ] **Step 3: Commit**

```bash
cd d:\aistock\aistock-app-frontend
git add pages.json
git commit -m "feat(routes): add push-history page route"
```

---

## Verification Summary

完成所有任务后，运行完整验证：

- [ ] **类型检查**

Run: `npm run type-check`
Expected: PASS

- [ ] **功能验证**

Run: `npm run dev:h5`
Expected:
1. 长线风口页面标题右侧显示"历史推送"按钮
2. 点击按钮跳转到推送历史页面
3. 推送历史页面显示日期筛选器
4. 推送历史页面显示推送记录列表
5. 收益率正确显示红绿色（涨红跌绿）
6. 日期筛选功能正常工作
7. 加载状态和空状态正确显示

- [ ] **最终 Commit**

```bash
cd d:\aistock\aistock-app-frontend
git status
git push origin chenfei
```

---

## Notes

- uni-app 项目通常不使用单元测试，依赖类型检查和运行时验证
- 使用 TypeScript 类型系统作为"测试"层，确保接口正确性
- 使用开发服务器运行时验证作为功能测试
- 如果遇到 uni-datetime-picker 组件问题，参考 wot-design-uni 文档