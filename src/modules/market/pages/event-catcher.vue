<template>
  <SubPageCard title="个股情报">
    <view class="event-catcher-content">
      <!-- 周期筛选 -->
      <view class="filter-bar">
        <Segmented :items="cycleTabs" v-model="activeCycle" fullWidth @change="onCycleChange" />
      </view>

      <!-- 加载中 -->
      <view v-if="loading && !events.length" class="loading">
        <LoadingState />
      </view>

      <!-- 事件列表 -->
      <view v-if="events.length" class="event-list">
        <Card
          v-for="evt in events"
          :key="evt.event_id"
          clickable
          @click="goStockDetail(evt.stock_code)"
        >
          <view class="event-top">
            <view class="event-stock">
              <text class="stock-name">{{ evt.stock_name }}</text>
              <text class="stock-code">{{ evt.stock_code }}</text>
              <text v-if="evt.industry" class="stock-industry">{{ evt.industry }}</text>
            </view>
            <Tag :type="impactTagType(evt.ai_impact)">{{ evt.ai_impact || '中性' }}</Tag>
          </view>
          <text class="event-title">{{ evt.title }}</text>
          <text v-if="evt.summary" class="event-summary">{{ evt.summary }}</text>
          <view v-if="evt.ai_keywords && evt.ai_keywords.length" class="keyword-row">
            <Tag
              v-for="(kw, idx) in evt.ai_keywords.slice(0, 4)"
              :key="idx"
              size="sm"
            >{{ kw }}</Tag>
          </view>
          <view class="event-bottom">
            <view class="meta-left">
              <Badge :type="cycleBadgeType(evt.cycle)">{{ evt.cycle }}</Badge>
              <text class="meta-text">{{ evt.change_type_name || evt.info_type }}</text>
            </view>
            <view class="meta-right">
              <Button size="sm" @click.stop="goAlertAnalysis(evt.stock_code, evt.cycle)">AI解读</Button>
              <text class="meta-time">{{ formatTime(evt.event_time) }}</text>
            </view>
          </view>
        </Card>
        <Button v-if="hasMore" type="ghost" size="sm" @click="loadMore">
          {{ loadingMore ? '加载中...' : '加载更多' }}
        </Button>
      </view>

      <!-- 空状态（API 无数据/失败均不展示 mock） -->
      <EmptyState
        v-if="!loading && !events.length"
        title="暂无情报"
        :description="apiFailed ? '情报加载失败，请稍后重试' : (activeCycle === 'all' ? '当前暂无情报数据' : '该周期暂无情报数据')"
      />
    </view>
  </SubPageCard>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { stockApi } from '@/shared/api/modules/stock'
import SubPageCard from '@/shared/components/SubPageCard.vue'
import { LoadingState, Tag, Badge, Button, Card, Segmented, EmptyState } from '@/shared/components'

interface TrendEvent {
  event_id: string
  symbol: string
  stock_code: string
  stock_name: string
  industry?: string
  change_type?: string
  change_type_name?: string
  level?: string
  cycle: string
  event_time: string
  title: string
  summary?: string
  detail_url?: string
  info_type?: string
  ai_impact?: string
  ai_horizon?: string
  ai_keywords?: string[]
  source?: string
}

const cycleTabs = [
  { label: '全部', value: 'all' },
  { label: '短期', value: 'short' },
  { label: '中期', value: 'mid' },
  { label: '长期', value: 'long' },
]

const loading = ref(false)
const loadingMore = ref(false)
const events = ref<TrendEvent[]>([])
const activeCycle = ref('all')
const total = ref(0)
const page = ref(0)
const pageSize = 20
/** API 是否调用失败（仅失败时才用 mock 兜底，空数据不兜底） */
const apiFailed = ref(false)

const hasMore = computed(() => events.value.length < total.value)

async function loadEvents(append = false) {
  if (!append) {
    loading.value = true
    page.value = 0
  } else {
    loadingMore.value = true
  }
  try {
    const offset = page.value * pageSize
    const res: any = await stockApi.getTrendEvents({
      cycle: activeCycle.value,
      limit: pageSize,
      offset,
    })
    const rawList = res?.events || res?.data?.events || []
    // 过滤中性消息：仅保留利好/利空事件（登录前后行为一致）
    const list = rawList.filter((evt: Record<string, unknown>) => {
      const impact = String(evt?.ai_impact ?? '')
      return impact.includes('利好') || impact.includes('利空')
    })
    total.value = res?.total || res?.data?.total || 0
    if (append) {
      events.value = [...events.value, ...list]
    } else {
      events.value = list
    }
    if (list.length) page.value++
    apiFailed.value = false
  } catch (err) {
    if (!append) events.value = []
    apiFailed.value = true
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

function onCycleChange() {
  loadEvents(false)
}

function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  loadEvents(true)
}

function impactTagType(impact?: string): 'up' | 'down' | 'neutral' {
  if (!impact) return 'neutral'
  if (impact.includes('重大利好') || impact.includes('利好')) return 'up'
  if (impact.includes('重大利空') || impact.includes('利空')) return 'down'
  return 'neutral'
}

function cycleBadgeType(cycle?: string): 'danger' | 'warning' | 'success' | 'info' {
  switch (cycle) {
    case 'short': return 'danger'
    case 'mid': return 'warning'
    case 'long': return 'success'
    default: return 'info'
  }
}

function formatTime(t?: string): string {
  if (!t) return ''
  const d = new Date(t)
  if (isNaN(d.getTime())) return t.replace('T', ' ').slice(0, 16)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  if (sameDay) return `${hh}:${mm}`
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${mo}-${dd} ${hh}:${mm}`
}

function goStockDetail(symbol: string) {
  if (!symbol) return
  uni.navigateTo({ url: `/modules/favorites/pages/detail?symbol=${symbol}` })
}

function goAlertAnalysis(symbol: string, cycle: string) {
  if (!symbol) return
  uni.navigateTo({ url: `/modules/market/pages/alert-analysis?symbol=${symbol}&cycle=${cycle}` })
}

onShow(() => {
  loadEvents(false)
})
</script>

<style lang="scss" scoped>
.event-catcher-content {
  padding: 0 24rpx 24rpx;
}

/* 周期筛选 */
.filter-bar {
  margin-bottom: 24rpx;
}

/* 加载状态 */
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 0;
  gap: 16rpx;
}

/* 事件列表 */
.event-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.event-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.event-stock {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex: 1;
  overflow: hidden;
}

.stock-name {
  font-size: 30rpx;
  font-weight: 600;
  color: $ink;
}

.stock-code {
  font-size: 22rpx;
  color: $ink-soft;
  padding: 2rpx 12rpx;
  background: #f0f2f5;
  border-radius: 8rpx;
}

.stock-industry {
  font-size: 22rpx;
  color: $primary;
  padding: 2rpx 12rpx;
  background: rgba(77, 124, 254, 0.08);
  border-radius: 8rpx;
}

.event-title {
  font-size: 28rpx;
  font-weight: 500;
  color: $ink;
  line-height: 1.5;
  display: block;
  margin-bottom: 12rpx;
}

.event-summary {
  font-size: 26rpx;
  color: $ink-soft;
  line-height: 1.6;
  display: block;
  margin-bottom: 16rpx;
}

.keyword-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-bottom: 16rpx;
}

.event-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16rpx;
  border-top: 1rpx solid #f0f2f5;
}

.meta-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.meta-text {
  font-size: 22rpx;
  color: #9ca3af;
}

.meta-time {
  font-size: 22rpx;
  color: #9ca3af;
}

.meta-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
</style>
