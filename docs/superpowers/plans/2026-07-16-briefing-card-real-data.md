# 晨报/晚报卡片接入真实数据 - 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将首页 briefing-card 从硬编码 mock 改为接入 morning/review agent 真实报告数据，并新建详情页展示完整报告。

**Architecture:** Composable（`useBriefingCard`）封装时间判断、API 调用和数据解析；MorningContent.vue 消费 composable 替换卡片区域；新建 `briefing-detail` 详情页用 mp-html 渲染 Markdown 正文。

**Tech Stack:** uni-app + Vue 3 + TypeScript + Pinia + mp-html + luch-request

## Global Constraints

- 禁止 `any`，用 `unknown` 或具体类型
- 禁止 emoji，用 SvgIcon 组件
- 颜色用 `shared/styles/variables.scss` 变量，禁止硬编码（已有遗留硬编码逐步替换）
- 使用 SCSS + rpx 单位
- 布局用 `position: fixed`，禁止 `100vh`
- 模块间零直接依赖，通过 `shared/` 共享
- App 专属页面放 `pages-sub-app/`，用条件编译包裹 App 专属逻辑
- H5 必须具备完整功能

---

### Task 1: 创建 useBriefingCard composable

**Files:**
- Create: `src/shared/utils/useBriefingCard.ts`

**Interfaces:**
- Consumes: `agentApi.getReport(intent: string, date: string)` from `@/shared/api/modules/agent`
- Produces: `useBriefingCard(type?, date?)` returning `{ type, typeLabel, summary, report, loading, status, refresh }`

- [ ] **Step 1: 创建 composable 文件**

创建 `src/shared/utils/useBriefingCard.ts`：

```typescript
/**
 * 晨报/晚报卡片组合式 Hook
 * 封装时间判断、API 调用、数据解析和状态管理
 */
import { ref, computed } from 'vue'
import { agentApi } from '@/shared/api/modules/agent'

/** 双层报告结构（schema_version 2.0） */
export interface BriefingReport {
  summary: string
  details: string
  stocks: string[]
  risks: string[]
  podcast_brief: string
  schema_version: string
}

export type BriefingType = 'morning' | 'review'
export type BriefingStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error'

export interface BriefingCardState {
  type: ReturnType<typeof ref<BriefingType>>
  date: ReturnType<typeof ref<string>>
  typeLabel: ReturnType<typeof computed<string>>
  summary: ReturnType<typeof ref<string>>
  report: ReturnType<typeof ref<BriefingReport | null>>
  loading: ReturnType<typeof ref<boolean>>
  status: ReturnType<typeof ref<BriefingStatus>>
  refresh: () => Promise<void>
}

/** 根据当前时间判断报告类型：15:30 前为晨报，之后为晚报 */
function autoDetectType(): BriefingType {
  const now = new Date()
  const hour = now.getHours()
  const minute = now.getMinutes()
  if (hour < 15 || (hour === 15 && minute < 30)) {
    return 'morning'
  }
  return 'review'
}

/** 从 API 响应中解析双层报告 */
function parseReport(content: unknown): BriefingReport | null {
  if (!content || typeof content !== 'object') return null

  const obj = content as Record<string, unknown>
  const display = obj.display_report
  if (!display || typeof display !== 'object') {
    // 兼容 schema 1.0 纯文本
    const text = typeof obj.text === 'string' ? obj.text : ''
    if (!text) return null
    return {
      summary: '',
      details: text,
      stocks: [],
      risks: [],
      podcast_brief: '',
      schema_version: '1.0',
    }
  }

  const d = display as Record<string, unknown>
  return {
    summary: typeof d.summary === 'string' ? d.summary : '',
    details: typeof d.details === 'string' ? d.details : '',
    stocks: Array.isArray(d.stocks) ? d.stocks.filter((s): s is string => typeof s === 'string') : [],
    risks: Array.isArray(d.risks) ? d.risks.filter((r): r is string => typeof r === 'string') : [],
    podcast_brief: typeof obj.podcast_brief === 'string' ? obj.podcast_brief : '',
    schema_version: typeof obj.schema_version === 'string' ? obj.schema_version : '2.0',
  }
}

/** 获取今天日期字符串 YYYY-MM-DD */
function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

export function useBriefingCard(
  fixedType?: BriefingType,
  fixedDate?: string,
): BriefingCardState {
  const type = ref<BriefingType>(fixedType ?? autoDetectType())
  const date = ref<string>(fixedDate ?? todayStr())
  const summary = ref('')
  const report = ref<BriefingReport | null>(null)
  const loading = ref(false)
  const status = ref<BriefingStatus>('idle')

  const typeLabel = computed(() => (type.value === 'morning' ? '晨报' : '晚报'))

  async function fetchData() {
    loading.value = true
    status.value = 'loading'
    try {
      const res: unknown = await agentApi.getReport(type.value, date.value)
      // 兼容两种响应格式：{ data: { content } } 或 { content }
      const data = (res as Record<string, unknown>)?.data ?? res
      if (!data) {
        status.value = 'empty'
        summary.value = ''
        report.value = null
        return
      }
      const record = data as Record<string, unknown>
      const content = record.content
      const parsed = parseReport(content)
      if (!parsed) {
        status.value = 'empty'
        summary.value = ''
        report.value = null
        return
      }
      report.value = parsed
      summary.value = parsed.summary
      status.value = 'ready'
    } catch {
      status.value = 'error'
      summary.value = ''
      report.value = null
    } finally {
      loading.value = false
    }
  }

  return {
    type,
    date,
    typeLabel,
    summary,
    report,
    loading,
    status,
    refresh: fetchData,
  }
}
```

- [ ] **Step 2: 类型检查**

Run: `cd d:\ai_stock_app\aistock-app-frontend && npx vue-tsc --noEmit`
Expected: 无新增错误（可能有历史遗留错误，确认不引入新错误即可）

- [ ] **Step 3: Commit**

```bash
cd d:\ai_stock_app\aistock-app-frontend
git add src/shared/utils/useBriefingCard.ts
git commit -m "feat: add useBriefingCard composable for morning/review briefing data"
```

---

### Task 2: 改造 MorningContent.vue 晨报卡片

**Files:**
- Modify: `src/modules/home/components/MorningContent.vue`

**Interfaces:**
- Consumes: `useBriefingCard()` from Task 1
- Produces: 卡片点击跳转 `briefing-detail?type=morning|review`

- [ ] **Step 1: 替换 script 中的硬编码数据**

在 `MorningContent.vue` 的 `<script setup>` 中，替换 `briefingPeriod` 和 `briefingHighlight` 为 composable：

```typescript
// 删除以下硬编码：
// const briefingPeriod = ref('晚报 ⌄')
// const briefingHighlight = ref({
//   stock: '山西焦化',
//   reason: '主力抢筹',
//   sub: '或存反弹机会'
// })

// 替换为：
import { useBriefingCard } from '@/shared/utils/useBriefingCard'

const {
  typeLabel: briefingTypeLabel,
  summary: briefingSummary,
  status: briefingStatus,
  loading: briefingLoading,
} = useBriefingCard()

// 卡片描述文案（根据状态）
function getBriefingDesc(): string {
  switch (briefingStatus.value) {
    case 'empty':
      return briefingTypeLabel.value === '晨报'
        ? '晨报生成中，9:00 后查看'
        : '晚报生成中，15:30 后查看'
    case 'error':
      return '暂不可用，点击重试'
    case 'loading':
      return '加载中...'
    default:
      return ''
  }
}

// 卡片点击
function goBriefingDetail() {
  if (briefingStatus.value === 'ready') {
    const type = briefingTypeLabel.value === '晨报' ? 'morning' : 'review'
    uni.navigateTo({ url: `/pages-sub-app/briefing-detail/index?type=${type}` })
  } else if (briefingStatus.value === 'error') {
    // 触发重试
    location.reload()
  } else {
    uni.showToast({
      title: getBriefingDesc(),
      icon: 'none',
    })
  }
}
```

保留 `leaderStocks`、`topEvent`、`eventStocks`、`trackEvent`、`chainEvents`、`aiReports` 等其他 ref 不变。

同时保留现有的 `goBriefing` 函数（双人播报页跳转），供播报按钮使用。

- [ ] **Step 2: 替换 template 中的 briefing-card 区域**

将模板中的 `briefing-card` 区域替换为：

```html
<!-- 今日专属晨报卡片 -->
<view class="briefing-card" @tap="goBriefingDetail">
  <view class="briefing-left">
    <view class="briefing-top">
      <text class="briefing-tag">今日专属</text>
      <text class="briefing-period">{{ briefingTypeLabel }}</text>
    </view>
    <!-- 有数据时：展示摘要 -->
    <view v-if="briefingStatus === 'ready'" class="briefing-highlight">
      <text class="highlight-prefix">重点看</text>
      <text class="highlight-stock">{{ briefingSummary }}</text>
    </view>
    <!-- 空状态/错误/加载时：展示提示 -->
    <view v-else class="briefing-highlight">
      <text class="highlight-prefix">{{ getBriefingDesc() }}</text>
    </view>
    <view v-if="briefingStatus === 'ready'" class="briefing-desc">
      <text>查看完整报告</text>
      <text class="desc-arrow">›</text>
    </view>
    <view class="briefing-btn" @tap.stop="goBriefing">
      <text class="btn-icon">◉</text>
      <text class="btn-text">专属播报</text>
    </view>
  </view>
  <view class="briefing-right">
    <view class="ai-avatar-wrap" :class="{ 'ai-avatar-loading': briefingLoading }">
      <SvgIcon name="headphone-line" size="40rpx" color="#4d7cfe" />
    </view>
    <view class="ai-avatar-ring ring-1"></view>
    <view class="ai-avatar-ring ring-2"></view>
  </view>
</view>
```

- [ ] **Step 3: 添加 loading 动画样式**

在 `<style>` 中添加：

```scss
.ai-avatar-loading {
  animation: pulse 1.2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

- [ ] **Step 4: 类型检查**

Run: `cd d:\ai_stock_app\aistock-app-frontend && npx vue-tsc --noEmit`
Expected: 无新增错误

- [ ] **Step 5: 浏览器验证**

1. 确认 H5 dev server 在 `http://localhost:5173/` 运行
2. 打开首页，确认 briefing-card 展示 "晨报" 或 "晚报" 标签
3. 确认卡片显示 summary（如果报告已生成）或 "生成中" 提示
4. 确认点击卡片跳转（ready 状态时）或 toast 提示（empty 状态时）
5. 确认控制台无报错

- [ ] **Step 6: Commit**

```bash
cd d:\ai_stock_app\aistock-app-frontend
git add src/modules/home/components/MorningContent.vue
git commit -m "feat: connect briefing card to morning/review agent data"
```

---

### Task 3: 新建晨报/晚报详情页

**Files:**
- Create: `src/pages-sub-app/briefing-detail/index.vue`
- Modify: `src/pages.json` (注册路由)

**Interfaces:**
- Consumes: `useBriefingCard(type, date)` from Task 1, `agentApi` from `@/shared/api/modules/agent`
- Produces: 详情页路由 `/pages-sub-app/briefing-detail/index`

- [ ] **Step 1: 注册路由**

在 `src/pages.json` 的 `pages-sub-app` 分包 `pages` 数组中，在 `briefing/index` 条目后添加：

```json
{
  "path": "briefing-detail/index",
  "style": {
    "navigationBarTitleText": "晨报详情",
    "disableScroll": true,
    "app-plus": { "bounce": "none", "animationType": "slide-in-right", "animationDuration": 250 }
  }
}
```

- [ ] **Step 2: 创建详情页组件**

创建 `src/pages-sub-app/briefing-detail/index.vue`：

```vue
<template>
  <view class="briefing-detail-page" :style="{ paddingTop: statusBarHeight + 'px' }">
    <!-- 顶部标题栏 -->
    <view class="detail-header">
      <view class="header-back" @tap="goBack">
        <SvgIcon name="arrow-left-line" size="32rpx" color="#ffffff" />
      </view>
      <text class="header-title">{{ typeLabel }}</text>
      <text class="header-date">{{ currentDate }}</text>
    </view>

    <!-- 内容区 -->
    <scroll-view scroll-y class="detail-content">
      <!-- 播报入口（置顶） -->
      <view
        v-if="report?.podcast_brief"
        class="podcast-entry"
        @tap="goBriefing"
      >
        <SvgIcon name="headphone-line" size="32rpx" color="#4d7cfe" />
        <text class="podcast-text">收听播报</text>
        <text class="podcast-arrow">›</text>
      </view>

      <!-- 摘要卡片 -->
      <view v-if="report?.summary" class="summary-card">
        <text class="summary-text">{{ report.summary }}</text>
      </view>

      <!-- 完整分析（Markdown 渲染） -->
      <view v-if="report?.details" class="details-section">
        <text class="section-title">完整分析</text>
        <mp-html :content="report.details" />
      </view>

      <!-- 关联股票 -->
      <view v-if="report?.stocks?.length" class="stocks-section">
        <text class="section-title">关联股票</text>
        <view class="stocks-list">
          <view
            v-for="stock in report.stocks"
            :key="stock"
            class="stock-item"
            @tap="goStockDetail(stock)"
          >
            <text class="stock-code">{{ stock }}</text>
            <text class="stock-arrow">›</text>
          </view>
        </view>
      </view>

      <!-- 风险提示 -->
      <view v-if="report?.risks?.length" class="risks-section">
        <text class="section-title">风险提示</text>
        <view class="risks-list">
          <view v-for="(risk, idx) in report.risks" :key="idx" class="risk-item">
            <text class="risk-dot">·</text>
            <text class="risk-text">{{ risk }}</text>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="status === 'empty'" class="empty-state">
        <SvgIcon name="file-line" size="80rpx" color="#9ca3af" />
        <text class="empty-text">{{ typeLabel }}尚未生成</text>
        <text class="empty-hint">{{ typeLabel === '晨报' ? '请在 9:00 后查看' : '请在 15:30 后查看' }}</text>
      </view>

      <!-- 错误状态 -->
      <view v-if="status === 'error'" class="empty-state">
        <SvgIcon name="file-line" size="80rpx" color="#9ca3af" />
        <text class="empty-text">加载失败</text>
        <view class="retry-btn" @tap="refresh">
          <text class="retry-text">重试</text>
        </view>
      </view>

      <!-- 日期切换 -->
      <view class="date-nav">
        <view class="date-btn" @tap="changeDate(-1)">
          <SvgIcon name="arrow-left-line" size="32rpx" color="#4d7cfe" />
          <text class="date-btn-text">前一天</text>
        </view>
        <view class="date-btn" @tap="changeDate(1)">
          <text class="date-btn-text">后一天</text>
          <SvgIcon name="arrow-right-line" size="32rpx" color="#4d7cfe" />
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import { useBriefingCard, type BriefingType } from '@/shared/utils/useBriefingCard'

// 状态栏高度
const statusBarHeight = ref(0)
try {
  const raw = uni.getSystemInfoSync().statusBarHeight || 0
  // #ifdef APP-PLUS
  statusBarHeight.value = raw / 1.2
  // #endif
  // #ifndef APP-PLUS
  statusBarHeight.value = raw
  // #endif
} catch {
  statusBarHeight.value = 0
}

const pageType = ref<BriefingType>('morning')

// 先用默认值初始化 composable，onLoad 中再设置实际值并 refresh
const {
  type: briefingType,
  date: briefingDate,
  typeLabel,
  report,
  status,
  refresh,
} = useBriefingCard()

const currentDate = ref('')

function goBack() {
  uni.navigateBack()
}

function goBriefing() {
  uni.navigateTo({ url: '/pages-sub-app/briefing/index' })
}

function goStockDetail(symbol: string) {
  uni.navigateTo({ url: `/modules/favorites/pages/detail?symbol=${symbol}` })
}

function changeDate(delta: number) {
  const d = new Date(currentDate.value)
  d.setDate(d.getDate() + delta)
  currentDate.value = d.toISOString().split('T')[0]
  briefingDate.value = currentDate.value
  refresh()
}

onLoad((options) => {
  const type = (options as Record<string, string> | undefined)?.type
  if (type === 'morning' || type === 'review') {
    pageType.value = type
    briefingType.value = type
  }
  currentDate.value = new Date().toISOString().split('T')[0]
  briefingDate.value = currentDate.value
  refresh()
})
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;

.briefing-detail-page {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: $bg-color;
  overscroll-behavior: none;
  touch-action: none;
}

.detail-header {
  padding: $spacing-lg;
  background: $brand-gradient;
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.header-back {
  display: flex;
  align-items: center;
}

.header-title {
  font-size: $font-size-xl;
  font-weight: 600;
  color: #ffffff;
}

.header-date {
  font-size: $font-size-sm;
  color: rgba(255, 255, 255, 0.8);
  margin-left: auto;
}

.detail-content {
  flex: 1;
  padding: $spacing-base;
}

.podcast-entry {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  padding: $spacing-sm $spacing-base;
  background: $bg-color-grey;
  border-radius: $radius-sm;
  margin-bottom: $spacing-sm;
  box-shadow: $shadow-base;
}

.podcast-text {
  flex: 1;
  font-size: $font-size-base;
  color: $brand-color;
  font-weight: 500;
}

.podcast-arrow {
  font-size: $font-size-lg;
  color: $text-color-tertiary;
}

.summary-card {
  background: $bg-color-grey;
  border-radius: $radius-base;
  padding: $spacing-base;
  margin-bottom: $spacing-sm;
  box-shadow: $shadow-base;
}

.summary-text {
  font-size: $font-size-base;
  color: $text-color-title;
  line-height: 1.6;
  font-weight: 500;
}

.details-section {
  background: $bg-color-grey;
  border-radius: $radius-base;
  padding: $spacing-base;
  margin-bottom: $spacing-sm;
  box-shadow: $shadow-base;
}

.section-title {
  font-size: $font-size-base;
  font-weight: 600;
  color: $text-color-title;
  display: block;
  margin-bottom: $spacing-xs;
}

.stocks-section,
.risks-section {
  background: $bg-color-grey;
  border-radius: $radius-base;
  padding: $spacing-base;
  margin-bottom: $spacing-sm;
  box-shadow: $shadow-base;
}

.stocks-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.stock-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $spacing-xs 0;
}

.stock-code {
  font-size: $font-size-sm;
  color: $brand-color;
}

.stock-arrow {
  font-size: $font-size-lg;
  color: $text-color-tertiary;
}

.risks-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.risk-item {
  display: flex;
  align-items: flex-start;
  gap: $spacing-xs;
}

.risk-dot {
  font-size: $font-size-base;
  color: $error-color;
  flex-shrink: 0;
}

.risk-text {
  font-size: $font-size-sm;
  color: $text-color-secondary;
  line-height: 1.5;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
}

.empty-text {
  font-size: $font-size-base;
  color: $text-color-secondary;
  margin-top: $spacing-base;
  margin-bottom: $spacing-xs;
}

.empty-hint {
  font-size: $font-size-sm;
  color: $text-color-tertiary;
}

.retry-btn {
  margin-top: $spacing-base;
  padding: $spacing-xs $spacing-lg;
  background: $brand-color;
  border-radius: $radius-pill;
}

.retry-text {
  font-size: $font-size-sm;
  color: #ffffff;
}

.date-nav {
  display: flex;
  justify-content: space-between;
  padding: $spacing-lg $spacing-base;
  gap: $spacing-base;
}

.date-btn {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  padding: $spacing-sm $spacing-lg;
  background: $bg-color-grey;
  border-radius: $radius-sm;
  box-shadow: $shadow-base;
}

.date-btn-text {
  font-size: $font-size-base;
  color: $brand-color;
  font-weight: 500;
}
</style>
```

- [ ] **Step 3: 类型检查**

Run: `cd d:\ai_stock_app\aistock-app-frontend && npx vue-tsc --noEmit`
Expected: 无新增错误

- [ ] **Step 4: 浏览器验证**

1. 确认 H5 dev server 在 `http://localhost:5173/` 运行
2. 从首页点击 briefing-card 进入详情页
3. 确认页面展示：播报入口（如有）、摘要、完整分析（Markdown）、关联股票、风险提示
4. 确认日期切换功能正常
5. 确认返回按钮回到首页
6. 确认控制台无报错

- [ ] **Step 5: Commit**

```bash
cd d:\ai_stock_app\aistock-app-frontend
git add src/pages-sub-app/briefing-detail/index.vue src/pages.json
git commit -m "feat: add briefing detail page with full report display"
```
