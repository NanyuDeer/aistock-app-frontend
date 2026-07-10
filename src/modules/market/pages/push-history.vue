<template>
  <SubPageCard title="历史表现">
    <view class="push-history-content">
      <!-- 统计信息区域 -->
      <view v-if="!loading && records.length" class="summary-section">
        <view class="summary-grid">
          <view class="summary-card">
            <text class="summary-label">推送股票数量</text>
            <text class="summary-value">{{ summary.total || 0 }}</text>
            <text class="summary-sub">当前筛选范围</text>
          </view>
          <view class="summary-card">
            <text class="summary-label">上涨股票数量</text>
            <text class="summary-value">{{ summary.winners || 0 }}</text>
            <text class="summary-sub">胜率 {{ formatPercent(summary.win_rate) }}</text>
          </view>
          <view class="summary-card">
            <text class="summary-label">平均收益</text>
            <text class="summary-value" :class="returnClass(summary.average_return_pct)">
              {{ formatPercent(summary.average_return_pct) }}
            </text>
            <text class="summary-sub">实时 {{ latestUpdateTime }}</text>
          </view>
          <view class="summary-card">
            <text class="summary-label">最高收益</text>
            <text class="summary-value" :class="returnClass(summary.best ? summary.best.return_pct : null)">
              {{ summary.best ? formatPercent(summary.best.return_pct) : '--' }}
            </text>
            <text class="summary-sub">{{ summary.best?.stock_name || '--' }}</text>
          </view>
        </view>
      </view>

      <!-- 日期筛选区域 -->
      <view class="filter-section">
        <uni-datetime-picker
          v-model="selectedDate"
          type="date"
          :clear-icon="true"
          @change="onDateChange"
        />
      </view>

      <!-- 推送记录列表 -->
      <view v-if="!loading && records.length" class="record-list">
        <view
          v-for="item in records"
          :key="item.stock_code + item.push_date"
          class="record-item"
        >
          <view class="item-date-row">
            <text class="item-date-label">推送日期</text>
            <text class="item-date">{{ formatDate(item.push_date) }}</text>
          </view>
          <view class="item-main">
            <text class="item-name">{{ item.stock_name }}</text>
            <text class="item-return" :class="getReturnClass(item)">
              {{ formatReturn(item) }}
            </text>
          </view>
          <view class="item-footer">
            <text class="item-note">{{ formatNote(item) }}</text>
            <text class="item-time">{{ formatUpdateTime(item.realtime_time) }}</text>
          </view>
        </view>
      </view>

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
import { ref, computed, onMounted } from 'vue'
import { stockApi } from '@/shared/api/modules/stock'
import type { PushHistoryItem } from '@/shared/api/modules/stock'
import SubPageCard from '@/shared/components/SubPageCard.vue'

const selectedDate = ref('')
const loading = ref(false)
const records = ref<PushHistoryItem[]>([])
const summary = ref<{
  total?: number
  evaluated?: number
  winners?: number
  losers?: number
  win_rate?: number
  average_return_pct?: number
  best?: { stock_name?: string; return_pct?: number }
}>({})

const latestUpdateTime = computed(() => {
  const times = records.value
    .map(r => r.realtime_time)
    .filter(Boolean)
    .sort()
    .reverse()
  if (!times.length) return '--'
  try {
    const d = new Date(times[0])
    const h = String(d.getHours()).padStart(2, '0')
    const m = String(d.getMinutes()).padStart(2, '0')
    const s = String(d.getSeconds()).padStart(2, '0')
    return `${h}:${m}:${s}`
  } catch {
    return '--'
  }
})

async function loadData(date?: string) {
  loading.value = true
  try {
    const params = date ? { date } : undefined
    const res: any = await stockApi.getPushHistory(params)
    // luch-request 响应拦截器已处理，直接返回 data 部分
    // 后端可能返回 { items: [], summary: {} } 或 { data: { items: [], summary: {} } }
    records.value = res?.items || res?.data?.items || []
    summary.value = res?.summary || res?.data?.summary || {}
  } catch (error) {
    console.error('加载推送历史失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function onDateChange(e: any) {
  // uni-datetime-picker 的 change 事件参数格式：
  // 单选模式: e = { value: '2026-07-09' } 或 e = '2026-07-09'
  // 清除后: e = { value: '' } 或 e = '' 或 null
  const newDate = e?.value || e || ''
  selectedDate.value = newDate
  loadData(newDate)
}

function formatDate(date: string): string {
  if (!date) return '--'
  if (/^\d{8}$/.test(date)) {
    return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`
  }
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatUpdateTime(time: string): string {
  if (!time) return '--'
  try {
    const d = new Date(time)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hour = String(d.getHours()).padStart(2, '0')
    const minute = String(d.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hour}:${minute}`
  } catch {
    return '--'
  }
}

function formatNote(item: PushHistoryItem): string {
  const pushPrice = item.push_price ? `推送价: ${item.push_price.toFixed(2)}` : '--'
  const currentPrice = item.latest_price
  const priceText = currentPrice ? `现价: ${currentPrice.toFixed(2)}` : '--'
  return `${pushPrice} | ${priceText}`
}

function formatReturn(item: PushHistoryItem): string {
  // return_pct 为 null 说明价格未更新，显示 --
  const returnPct = item.return_pct
  if (returnPct !== undefined && returnPct !== null) {
    return `${returnPct >= 0 ? '+' : ''}${returnPct.toFixed(2)}%`
  }
  return '--'
}

function getReturnClass(item: PushHistoryItem): string {
  const returnPct = item.return_pct
  if (returnPct !== undefined && returnPct !== null) {
    return returnPct >= 0 ? 'up' : 'down'
  }
  return ''
}

function formatPercent(value: number | undefined | null): string {
  if (value === undefined || value === null) return '--'
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

function returnClass(value: number | undefined | null): string {
  if (value === undefined || value === null) return ''
  return value >= 0 ? 'up' : 'down'
}

onMounted(() => {
  loadData()
})
</script>

<style lang="scss" scoped>
.push-history-content {
  padding: 24rpx;
}

.summary-section {
  margin-bottom: 32rpx;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.summary-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 16rpx;
  padding: 28rpx 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(15, 23, 42, 0.06);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 140rpx;
}

.summary-label {
  color: #6b7280;
  font-size: 24rpx;
  margin-bottom: 12rpx;
}

.summary-value {
  color: #111827;
  font-size: 44rpx;
  font-weight: bold;
  line-height: 1.2;
}

.summary-value.up {
  color: #ef4444;
}

.summary-value.down {
  color: #16a34a;
}

.summary-note {
  display: none;
}

.summary-sub {
  color: #9ca3af;
  font-size: 22rpx;
  margin-top: 8rpx;
}

.filter-section {
  margin-bottom: 32rpx;
}

.record-list {
  margin-top: 32rpx;
}

.record-item {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(15, 23, 42, 0.06);
}

.item-date-row {
  margin-bottom: 12rpx;
}

.item-date-label {
  color: #9ca3af;
  font-size: 24rpx;
  margin-right: 8rpx;
}

.item-date {
  color: #6b7280;
  font-size: 26rpx;
}

.item-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.item-name {
  color: #111827;
  font-size: 32rpx;
  font-weight: bold;
}

.item-return {
  font-size: 28rpx;
  font-weight: bold;
}

.item-return.up {
  color: #ef4444;
}

.item-return.down {
  color: #16a34a;
}

.item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-note {
  color: #6b7280;
  font-size: 24rpx;
}

.item-time {
  color: #9ca3af;
  font-size: 22rpx;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 80rpx 0;
  color: #9ca3af;
  font-size: 28rpx;
}
</style>