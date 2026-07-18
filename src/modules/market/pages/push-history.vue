<template>
  <SubPageCard title="历史表现">
    <view class="push-history-content">
      <!-- 统计信息区域 -->
      <view v-if="!loading && allRecords.length" class="summary-section">
        <view class="summary-grid">
          <view class="summary-card">
            <text class="summary-label">推送股票数量</text>
            <text class="summary-value">{{ summary.total || 0 }}</text>
            <text class="summary-sub">{{ historyDateRange }}</text>
          </view>
          <view class="summary-card">
            <text class="summary-label">上涨股票数量</text>
            <text class="summary-value">{{ summary.winners || 0 }}</text>
            <text class="summary-sub summary-metrics">
              盈亏比 {{ formatRatio(profitLossRatio) }} | 胜率 {{ formatWinRate(summary.win_rate) }}
            </text>
          </view>
          <view class="summary-card">
            <text class="summary-label">平均收益</text>
            <text class="summary-value" :class="returnClass(summary.average_return_pct)">
              {{ formatPercent(summary.average_return_pct) }}
            </text>
            <text class="summary-sub">更新 {{ latestUpdateDate }}</text>
          </view>
          <view class="summary-card">
            <text class="summary-label">最高收益</text>
            <text class="summary-value" :class="returnClass(summary.best ? displayReturn(summary.best) : null)">
              {{ summary.best ? formatPercent(displayReturn(summary.best)) : '--' }}
            </text>
            <text class="summary-sub">{{ summary.best?.stock_name || '--' }}</text>
          </view>
        </view>
      </view>

      <!-- 标签栏 + 日期筛选合并行 -->
      <view class="tabs-filter-row">
        <view class="history-tabs">
          <view
            class="history-tab"
            :class="{ active: activeTab === 'history' }"
            @tap="activeTab = 'history'"
          >
            <text>历史表现</text>
          </view>
          <view
            class="history-tab"
            :class="{ active: activeTab === 'ranking' }"
            @tap="activeTab = 'ranking'"
          >
            <text>收益榜单</text>
          </view>
        </view>
        <view class="filter-section">
          <picker mode="date" :value="selectedDate" fields="day" @change="onDateChange">
            <view class="date-picker-trigger">
              <text class="date-picker-value">{{ selectedDate || '筛选日期' }}</text>
            </view>
          </picker>
          <view v-if="selectedDate" class="date-clear-btn" @tap="clearDate">
            <text class="clear-icon">×</text>
          </view>
        </view>
      </view>

      <!-- 推送记录列表 -->
      <view v-if="!loading && records.length && activeTab === 'history'" class="record-list">
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
            <view class="item-name-wrap">
              <text class="item-name">{{ item.stock_name }}</text>
              <text class="item-code">{{ item.stock_code }}</text>
            </view>
            <text class="item-return" :class="getReturnClass(item)">
              {{ formatReturn(item) }}
            </text>
          </view>
          <view class="item-footer">
            <text class="item-note">{{ formatNote(item) }}</text>
            <text class="item-time">更新 {{ formatUpdateDate(item) }}</text>
          </view>
        </view>
      </view>

      <view v-if="!loading && records.length && activeTab === 'ranking'" class="ranking-section">
        <view class="ranking-card">
          <text class="ranking-title">累计涨幅榜</text>
          <view
            v-for="(item, index) in closeRanking.top_gainers"
            :key="`gain-${item.stock_code}-${item.push_date}`"
            class="ranking-item"
          >
            <text class="ranking-position">{{ index + 1 }}</text>
            <view class="ranking-stock">
              <text class="ranking-name">{{ item.stock_name }}</text>
              <text class="ranking-code">{{ item.stock_code }}</text>
            </view>
            <text class="ranking-return" :class="getReturnClass(item)">{{ formatReturn(item) }}</text>
          </view>
          <view v-if="!closeRanking.top_gainers.length" class="ranking-empty">暂无可计算样本</view>
        </view>

        <view class="ranking-card">
          <text class="ranking-title">累计跌幅榜</text>
          <view
            v-for="(item, index) in closeRanking.top_losers"
            :key="`loss-${item.stock_code}-${item.push_date}`"
            class="ranking-item"
          >
            <text class="ranking-position">{{ index + 1 }}</text>
            <view class="ranking-stock">
              <text class="ranking-name">{{ item.stock_name }}</text>
              <text class="ranking-code">{{ item.stock_code }}</text>
            </view>
            <text class="ranking-return" :class="getReturnClass(item)">{{ formatReturn(item) }}</text>
          </view>
          <view v-if="!closeRanking.top_losers.length" class="ranking-empty">暂无可计算样本</view>
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
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { stockApi } from '@/shared/api/modules/stock'
import type { PushHistoryItem } from '@/shared/api/modules/stock'
import SubPageCard from '@/shared/components/SubPageCard.vue'

const selectedDate = ref('')
const loading = ref(false)
const activeTab = ref<'history' | 'ranking'>('history')
const allRecords = ref<PushHistoryItem[]>([])

const records = computed(() => {
  if (!selectedDate.value) return allRecords.value
  return allRecords.value.filter(item => normalizeDate(item.push_date) === selectedDate.value)
})

const historyDateRange = computed(() => {
  if (selectedDate.value) return selectedDate.value.replace(/^\d{4}-/, '')
  const dates = records.value
    .map(item => normalizeDate(item.push_date))
    .filter(Boolean)
    .sort()
  if (!dates.length) return '--'
  const fmt = (d: string) => d.replace(/^\d{4}-/, '')
  return `${fmt(dates[0])}至${fmt(dates[dates.length - 1])}`
})

const latestUpdateDate = computed(() => {
  const dates = records.value
    .map(r => normalizeDate(r.latest_trade_date || r.push_date))
    .filter((date): date is string => Boolean(date))
    .sort()
    .reverse()
  return dates[0] || '--'
})

function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}

function displayReturn(item: PushHistoryItem): number | null {
  const returnPct = toFiniteNumber(item.return_pct)
  if (returnPct !== null) return returnPct
  const pushPrice = toFiniteNumber(item.push_price)
  const latestPrice = toFiniteNumber(item.latest_price)
  if (!pushPrice || pushPrice <= 0 || latestPrice === null) return null
  return Number((((latestPrice - pushPrice) / pushPrice) * 100).toFixed(2))
}

const summary = computed(() => {
  const evaluated = records.value
    .map(item => ({ item, returnPct: displayReturn(item) }))
    .filter((entry): entry is { item: PushHistoryItem; returnPct: number } => entry.returnPct !== null)
  const winners = evaluated.filter(entry => entry.returnPct > 0)
  const sorted = evaluated.slice().sort((a, b) => b.returnPct - a.returnPct)
  const averageReturn = evaluated.length
    ? evaluated.reduce((sum, entry) => sum + entry.returnPct, 0) / evaluated.length
    : 0

  return {
    total: records.value.length,
    evaluated: evaluated.length,
    winners: winners.length,
    win_rate: evaluated.length ? Number(((winners.length / evaluated.length) * 100).toFixed(2)) : 0,
    average_return_pct: Number(averageReturn.toFixed(2)),
    best: sorted[0]?.item || null
  }
})

const profitLossRatio = computed(() => {
  const returns = records.value
    .map(item => displayReturn(item))
    .filter((value): value is number => value !== null)
  const gains = returns.filter(value => value > 0)
  const losses = returns.filter(value => value < 0)
  if (!losses.length) return null

  const totalGain = gains.reduce((sum, value) => sum + value, 0)
  const totalLoss = Math.abs(losses.reduce((sum, value) => sum + value, 0))
  return totalLoss > 0 ? Number((totalGain / totalLoss).toFixed(2)) : null
})

const closeRanking = computed(() => {
  const evaluated = records.value.filter(item => displayReturn(item) !== null)
  return {
    top_gainers: evaluated.slice().sort((a, b) => Number(displayReturn(b)) - Number(displayReturn(a))).slice(0, 10),
    top_losers: evaluated.slice().sort((a, b) => Number(displayReturn(a)) - Number(displayReturn(b))).slice(0, 10)
  }
})

async function loadData() {
  loading.value = true
  try {
    const res: any = await stockApi.getPushHistory()
    // luch-request 响应拦截器已处理，直接返回 data 部分
    // 后端可能返回 { items: [], summary: {} } 或 { data: { items: [], summary: {} } }
    allRecords.value = res?.items || res?.data?.items || []
  } catch (error) {
    console.error('加载推送历史失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function onDateChange(e: any) {
  const newDate = e?.detail?.value || e?.value || e || ''
  selectedDate.value = newDate
}

function clearDate() {
  selectedDate.value = ''
}

function normalizeDate(value?: string): string {
  if (!value) return ''
  const text = String(value).trim()
  if (/^\d{8}$/.test(text)) {
    return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`
  }
  const normalized = text.replace(/\//g, '-')
  const match = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (match) {
    const [, year, month, day] = match
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }
  return text
}

function formatDate(date: string): string {
  return normalizeDate(date) || '--'
}

function formatUpdateDate(item: PushHistoryItem): string {
  return normalizeDate(item.latest_trade_date || item.push_date) || '--'
}

function formatNote(item: PushHistoryItem): string {
  // 防御：后端 NUMERIC 列可能返回字符串，必须经 toFiniteNumber 转换后再 toFixed，
  // 否则字符串.toFixed() 抛 TypeError 导致 App 端渲染崩溃（一闪而过空白根因）。
  const pushPrice = toFiniteNumber(item.push_price)
  const priceText = pushPrice !== null ? `推送价: ${pushPrice.toFixed(2)}` : '--'
  const currentPrice = toFiniteNumber(item.latest_price)
  const latestText = currentPrice !== null ? `现价: ${currentPrice.toFixed(2)}` : '--'
  return `${priceText} | ${latestText}`
}

function formatReturn(item: PushHistoryItem): string {
  const returnPct = displayReturn(item)
  if (returnPct !== null) {
    return `${returnPct >= 0 ? '+' : ''}${returnPct.toFixed(2)}%`
  }
  return '--'
}

function getReturnClass(item: PushHistoryItem): string {
  const returnPct = displayReturn(item)
  if (returnPct !== null) {
    return returnPct >= 0 ? 'up' : 'down'
  }
  return ''
}

function formatPercent(value: number | undefined | null): string {
  if (value === undefined || value === null) return '--'
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

function formatRatio(value: number | undefined | null): string {
  if (value === undefined || value === null) return '暂无可计算样本'
  return value.toFixed(2)
}

function formatWinRate(value: number | undefined | null): string {
  if (value === undefined || value === null) return '--'
  return `${value.toFixed(2)}%`
}

function returnClass(value: number | undefined | null): string {
  if (value === undefined || value === null) return ''
  return value >= 0 ? 'up' : 'down'
}

onLoad(() => {
  loadData()
})
</script>

<style lang="scss" scoped>
.push-history-content {
  padding: 24rpx;
}

.summary-section {
  margin-bottom: 24rpx;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}

.summary-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 16rpx;
  padding: 18rpx 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(15, 23, 42, 0.06);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 96rpx;
}

.summary-label {
  color: #6b7280;
  font-size: 24rpx;
  margin-bottom: 6rpx;
}

.summary-value {
  color: #111827;
  font-size: 36rpx;
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
  margin-top: 4rpx;
}

.summary-metrics {
  width: 100%;
  text-align: center;
  white-space: nowrap;
}

.tabs-filter-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  border-bottom: 1px solid #e5e7eb;
}

.filter-section {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding-bottom: 12rpx;
}

.date-picker-trigger {
  height: 48rpx;
  padding: 0 14rpx;
  border-radius: 10rpx;
  border: 1px solid #d1d5db;
  background: #fff;
  display: flex;
  align-items: center;
  box-sizing: border-box;
}

.date-picker-value {
  color: #6b7280;
  font-size: 24rpx;
  white-space: nowrap;
}

.date-clear-btn {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.clear-icon {
  color: #6b7280;
  font-size: 28rpx;
  line-height: 1;
}

.history-tabs {
  display: flex;
}

.history-tab {
  position: relative;
  padding: 20rpx 28rpx;
  color: #6b7280;
  font-size: 28rpx;
}

.history-tab.active {
  color: #3b82f6;
  font-weight: 600;
}

.history-tab.active::after {
  content: '';
  position: absolute;
  right: 20rpx;
  bottom: -1px;
  left: 20rpx;
  height: 4rpx;
  border-radius: 4rpx;
  background: #3b82f6;
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

.item-name-wrap {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}

.item-name {
  color: #111827;
  font-size: 32rpx;
  font-weight: bold;
}

.item-code {
  font-size: 20rpx;
  color: #6b7280;
  background: #f0f2f5;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
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

.ranking-section {
  margin-top: 32rpx;
}

.ranking-card {
  margin-bottom: 24rpx;
  padding: 28rpx 24rpx;
  border: 1px solid #e5e7eb;
  border-radius: 16rpx;
  background: #fff;
  box-shadow: 0 8rpx 24rpx rgba(15, 23, 42, 0.06);
}

.ranking-title {
  display: block;
  margin-bottom: 16rpx;
  color: #1f2937;
  font-size: 30rpx;
  font-weight: 700;
}

.ranking-item {
  display: flex;
  align-items: center;
  min-height: 88rpx;
  border-bottom: 1px solid #eef2f7;
}

.ranking-item:last-child {
  border-bottom: 0;
}

.ranking-position {
  width: 48rpx;
  color: #9ca3af;
  font-size: 24rpx;
}

.ranking-stock {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.ranking-name {
  overflow: hidden;
  color: #111827;
  font-size: 28rpx;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ranking-code {
  margin-top: 4rpx;
  color: #9ca3af;
  font-size: 22rpx;
}

.ranking-return {
  margin-left: 20rpx;
  font-size: 28rpx;
  font-weight: 700;
}

.ranking-return.up {
  color: #ef4444;
}

.ranking-return.down {
  color: #16a34a;
}

.ranking-empty {
  padding: 40rpx 0;
  color: #9ca3af;
  font-size: 26rpx;
  text-align: center;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 80rpx 0;
  color: #9ca3af;
  font-size: 28rpx;
}
</style>
