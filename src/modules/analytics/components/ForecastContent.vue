<template>
  <view class="forecast-content">
    <!-- 搜索栏 + 排序栏 -->
    <view class="forecast-fixed">
      <view class="search-bar">
        <view class="search-input-wrap">
          <SvgIcon name="search-line" size="28rpx" color="#9ca3af" />
          <input
            v-model="keyword"
            class="search-input"
            placeholder="搜索股票代码/简称"
            confirm-type="search"
            @input="handleSearchInput"
            @confirm="handleSearch"
          />
          <text v-if="keyword" class="search-clear" @tap="handleReset">✕</text>
        </view>
      </view>

      <view class="sort-bar">
        <text class="sort-label">排序方式</text>
        <picker
          mode="selector"
          :range="sortFieldLabels"
          :value="sortFieldIndex"
          @change="onSortFieldChange"
        >
          <view class="sort-picker">
            <text class="sort-picker-text">{{ currentSortLabel }}</text>
            <SvgIcon name="arrow-down-s" size="24rpx" color="#6b7280" />
          </view>
        </picker>
        <view class="sort-order">
          <text
            :class="['order-btn', sortOrder === 'desc' ? 'active' : '']"
            @tap="switchOrder('desc')"
          >降序</text>
          <text
            :class="['order-btn', sortOrder === 'asc' ? 'active' : '']"
            @tap="switchOrder('asc')"
          >升序</text>
        </view>
      </view>
    </view>

    <!-- 加载中 -->
    <view v-if="loading" class="loading-state">
      <LoadingState />
    </view>

    <!-- API 请求失败 -->
    <view v-else-if="error" class="error-state">
      <SvgIcon name="cloud-off-line" size="80rpx" color="#d1d5db" />
      <text class="error-text">数据获取失败</text>
      <text class="error-desc">网络异常或服务暂时不可用，请稍后重试</text>
      <view class="retry-btn" @tap="retry">重试</view>
    </view>

    <!-- 搜索无结果 -->
    <view v-else-if="!list.length" class="empty-state">
      <EmptyState :text="keyword ? '未搜索到相关股票' : '暂无业绩预测数据'" />
    </view>

    <!-- 列表 -->
    <view v-if="list.length" class="forecast-list">
      <view
        v-for="item in list"
        :key="item.code"
        class="forecast-card"
        @tap="goStockDetail(item.code)"
      >
        <view class="info-row">
          <view class="stock-col">
            <text class="stock-name">{{ item.name }}</text>
            <text class="stock-code">{{ item.code }}</text>
          </view>
          <view class="metrics-area">
            <view class="metric-line">
              <view class="metric-info">
                <text class="metric-label">预测EPS</text>
                <text class="metric-value">{{ item.eps }}</text>
              </view>
              <text :class="['growth-val', item.epsGrowth?.startsWith('-') ? 'down' : 'up']">{{ item.epsGrowth }}</text>
            </view>
            <view class="metric-line">
              <view class="metric-info">
                <text class="metric-label">预测净利润</text>
                <text class="metric-value">{{ item.netProfitForecast }}</text>
              </view>
              <text :class="['growth-val', item.netProfitGrowth?.startsWith('-') ? 'down' : 'up']">{{ item.netProfitGrowth }}</text>
            </view>
          </view>
        </view>

        <view class="divider" />

        <view class="meta-row">
          <text class="update-time">更新时间：{{ item.updateTime }}</text>
          <view class="institution-info">
            <text class="info-label">机构</text>
            <text class="institution-value">{{ item.institutionCount }}家</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="hasMore" class="load-more" @tap="loadMore">
      <text class="load-more-text">{{ loadingMore ? '加载中...' : '加载更多' }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { stockApi } from '@/shared/api/modules/stock'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import LoadingState from '@/shared/components/LoadingState.vue'
import EmptyState from '@/shared/components/EmptyState.vue'

interface ForecastItem {
  code: string
  name: string
  netProfitForecast: string
  netProfitGrowth: string
  eps: string
  epsGrowth: string
  rating: string
  institutionCount: number
  updateTime: string
}

interface RawForecastItem {
  symbol?: string
  code?: string
  ['股票代码']?: string
  name?: string
  ['股票简称']?: string
  ['股票名称']?: string
  ['净利润预测']?: string
  ['净利润同比(%)']?: number
  ['EPS预测']?: string
  ['EPS同比']?: string
  ['机构数量']?: number
  ['更新时间']?: string
  update_time?: string
  updateTime?: string
  ['摘要']?: string
}

const keyword = ref('')
const activeSort = ref('net_profit_forecast')
const sortOrder = ref('desc')
const loading = ref(false)
const loadingMore = ref(false)
const error = ref(false)
const list = ref<ForecastItem[]>([])
const page = ref(1)
const pageSize = 20
const total = ref(0)

const sortFields = [
  { key: 'net_profit_forecast', label: '净利润预测' },
  { key: 'eps_forecast', label: 'EPS预测' },
  { key: 'net_profit_growth', label: '净利润增长' },
  { key: 'eps_growth', label: 'EPS增长' },
  { key: 'update_time', label: '更新时间' },
]

const sortFieldLabels = computed(() => sortFields.map(f => f.label))

const sortFieldIndex = computed(() => {
  const idx = sortFields.findIndex(f => f.key === activeSort.value)
  return idx >= 0 ? idx : 0
})

const currentSortLabel = computed(() => {
  const f = sortFields.find(f => f.key === activeSort.value)
  return f ? f.label : '净利润预测'
})

function onSortFieldChange(e: unknown) {
  const detail = (e as { detail?: { value?: number } })?.detail
  const idx = detail?.value ?? 0
  const key = sortFields[idx]?.key
  if (key) switchSort(key)
}

let searchTimer: ReturnType<typeof setTimeout> | null = null

const hasMore = computed(() => list.value.length < total.value)

function switchSort(key: string) {
  if (activeSort.value === key) {
    sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
  } else {
    activeSort.value = key
    sortOrder.value = 'desc'
  }
  fetchData()
}

function switchOrder(order: 'asc' | 'desc') {
  if (sortOrder.value === order) return
  sortOrder.value = order
  fetchData()
}

async function fetchData(append = false) {
  if (!append) {
    loading.value = true
    error.value = false
    list.value = []
    total.value = 0
    page.value = 1
  } else {
    loadingMore.value = true
  }
  try {
    const params: Record<string, unknown> = {
      page: page.value,
      pageSize,
      sortBy: activeSort.value,
      sortOrder: sortOrder.value,
    }
    const kw = keyword.value.trim()
    const res = kw
      ? await stockApi.searchProfitForecast({ ...params, keyword: kw })
      : await stockApi.getProfitForecastList(params)

    if (!res) throw new Error('API returned empty')

    const items = res['盈利预测列表'] || res.list || res.items || []
    total.value = res['总数量'] || res.total || res.totalCount || 0

    const mapped = items.map((item: RawForecastItem) => ({
      code: item['股票代码'] || item.symbol || item.code || '',
      name: item['股票简称'] || item.name || item['股票名称'] || '',
      netProfitForecast: item['净利润预测'] || '--',
      netProfitGrowth: formatNetProfitGrowth(item['净利润同比(%)']),
      eps: item['EPS预测'] || '--',
      epsGrowth: formatEpsGrowth(item['EPS同比']),
      rating: '--',
      institutionCount: item['机构数量'] || 0,
      updateTime: item['更新时间'] || item.update_time || item.updateTime || '--',
    }))

    if (append) {
      list.value = [...list.value, ...mapped]
    } else {
      list.value = mapped
    }
    if (mapped.length) page.value++
  } catch (err) {
    console.error('Failed to fetch profit forecast:', err)
    if (!append) {
      error.value = true
      list.value = []
      total.value = 0
    }
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

function handleSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    fetchData(false)
  }, 300)
}

function handleSearch() {
  fetchData(false)
}

function handleReset() {
  keyword.value = ''
  fetchData(false)
}

function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  fetchData(true)
}

function retry() {
  error.value = false
  fetchData(false)
}

function formatEpsGrowth(val: unknown): string {
  if (val === null || val === undefined || val === '') return '--'
  const str = String(val).trim()
  // 已带 % 或 + / - 前缀的字符串，补加号
  if (str.includes('%')) {
    const numStr = str.replace('%', '').trim()
    const num = Number(numStr)
    if (!Number.isFinite(num)) return str
    const prefix = num > 0 && !str.startsWith('+') && !str.startsWith('-') ? '+' : ''
    return `${prefix}${num.toFixed(2)}%`
  }
  const num = Number(str)
  if (!Number.isFinite(num)) return str
  const prefix = num > 0 ? '+' : ''
  return `${prefix}${num.toFixed(2)}%`
}

function formatNetProfitGrowth(val: unknown): string {
  if (val === null || val === undefined || val === '') return '--'
  const num = typeof val === 'number' ? val : Number(val)
  if (!Number.isFinite(num)) return '--'
  const prefix = num > 0 ? '+' : ''
  return `${prefix}${num.toFixed(2)}%`
}

function goStockDetail(code: string) {
  if (!code) return
  uni.navigateTo({ url: `/modules/favorites/pages/detail?symbol=${code}` })
}

onShow(() => {
  fetchData(false)
})
</script>

<style lang="scss" scoped>
.forecast-content {
  background: #ffffff;
}

/* 搜索+排序区域 */
.forecast-fixed {
  padding: 16rpx 24rpx 0;
}

/* 搜索栏 */
.search-bar {
  margin-bottom: 16rpx;
}

.search-input-wrap {
  display: flex;
  align-items: center;
  gap: 12rpx;
  background: #ffffff;
  border-radius: 16rpx;
  padding: 16rpx 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.search-input {
  flex: 1;
  font-size: 26rpx;
  color: #1a1d24;
  height: 40rpx;
}

.search-clear {
  font-size: 28rpx;
  color: #9ca3af;
  padding: 8rpx;
}

/* 排序方式栏 */
.sort-bar {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
  padding: 12rpx 16rpx;
  background: #ffffff;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.sort-label {
  font-size: 22rpx;
  color: #9ca3af;
  flex-shrink: 0;
}

.sort-picker {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 6rpx 12rpx;
  border-radius: 8rpx;
  background: #f0f2f5;
}

.sort-picker-text {
  font-size: 22rpx;
  color: #4d7cfe;
  font-weight: 500;
  white-space: nowrap;
}

.sort-order {
  display: flex;
  gap: 0;
  flex-shrink: 0;
  border-radius: 8rpx;
  overflow: hidden;
  border: 1rpx solid #e0e3e8;
}

.order-btn {
  font-size: 20rpx;
  color: #6b7280;
  padding: 6rpx 12rpx;
  background: #f9fafb;
  font-weight: 500;
  white-space: nowrap;

  &.active {
    color: #fff;
    background: #4d7cfe;
  }

  &:first-child {
    border-right: 1rpx solid #e0e3e8;
  }
}

/* 加载/空/失败状态 */
.loading-state,
.empty-state,
.error-state {
  padding: 200rpx 0;
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.error-text {
  font-size: 28rpx;
  color: #374151;
  margin-top: 24rpx;
  font-weight: 500;
}

.error-desc {
  font-size: 24rpx;
  color: #9ca3af;
  margin-top: 12rpx;
}

.retry-btn {
  margin-top: 40rpx;
  padding: 16rpx 56rpx;
  font-size: 26rpx;
  color: #ffffff;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  border-radius: 40rpx;
  text-align: center;
}

/* ===== 卡片 ===== */
.forecast-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding: 0 24rpx 24rpx;
}

.forecast-card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 28rpx;
  border: 1rpx solid #e5e7eb;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

/* 信息行：股票信息(左) + 指标区(右) */
.info-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.stock-col {
  flex-shrink: 0;
  width: 140rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

/* 指标区：两行，每行 = 标签+值(左) + 增长率(右) */
.metrics-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  min-width: 0;
}

.metric-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.metric-info {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
  min-width: 0;
}

.metric-label {
  font-size: 20rpx;
  color: #9ca3af;
  flex-shrink: 0;
}

.metric-value {
  font-size: 22rpx;
  font-weight: 600;
  color: #4d7cfe;
}

.stock-name {
  font-size: 26rpx;
  font-weight: 600;
  color: #1a1d24;
}

.stock-code {
  font-size: 20rpx;
  color: #6b7280;
  background: #f0f2f5;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  align-self: flex-start;
}

.growth-val {
  font-size: 22rpx;
  font-weight: 600;
  flex-shrink: 0;

  &.up { color: #f43f5e; }
  &.down { color: #22c55e; }
}

/* 分隔线 */
.divider {
  height: 1rpx;
  background: #f0f2f5;
  margin: 16rpx 0;
}

/* 机构行 */
.meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.institution-info {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.info-label {
  font-size: 22rpx;
  color: #9ca3af;
}

.institution-value {
  font-size: 22rpx;
  font-weight: 600;
  color: #1a1d24;
}

.update-time {
  font-size: 20rpx;
  color: #9ca3af;
}

/* 加载更多 */
.load-more {
  text-align: center;
  padding: 32rpx 0;
}

.load-more-text {
  font-size: 26rpx;
  color: #4d7cfe;
}
</style>
