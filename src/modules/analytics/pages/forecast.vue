<template>
  <view class="page-forecast">
    <SubPageCard title="业绩预测">
      <!-- 标题右侧切换按钮 -->
      <template #header-right>
        <view class="toggle-group">
          <text
            :class="['toggle-btn', 'active']"
            @tap="switchTo('forecast')"
          >预测</text>
          <text
            class="toggle-btn"
            @tap="switchTo('reports')"
          >报告</text>
        </view>
      </template>

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
            <view class="info-col stock-col">
              <text class="stock-name">{{ item.name }}</text>
              <view class="code-rating-row">
                <text class="stock-code">{{ item.code }}</text>
                <text :class="['rating-tag', ratingClass(item.rating)]">{{ item.rating }}</text>
              </view>
            </view>
            <view class="data-cols">
              <view class="info-col forecast-col">
                <text class="col-main">净利润预测 <text class="col-value forecast-val">{{ item.netProfitForecast }}</text></text>
                <text class="col-growth">同比增长 <text :class="['growth-val', item.netProfitGrowth?.startsWith('-') ? 'down' : 'up']">{{ item.netProfitGrowth }}</text></text>
              </view>
              <view class="info-col eps-col">
                <text class="col-main">EPS预测 <text class="col-value eps-val">{{ item.eps }}元</text></text>
                <text class="col-growth">同比增长 <text :class="['growth-val', item.epsGrowth?.startsWith('-') ? 'down' : 'up']">{{ item.epsGrowth }}</text></text>
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
    </SubPageCard>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { stockApi } from '@/shared/api/modules/stock'
import SubPageCard from '@/shared/components/SubPageCard.vue'
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

function onSortFieldChange(e: any) {
  const idx = e.detail.value
  const key = sortFields[idx]?.key
  if (key) switchSort(key)
}

// 搜索结果缓存，避免每次输入都重新过滤
let searchTimer: ReturnType<typeof setTimeout> | null = null

const hasMore = computed(() => list.value.length < total.value)

function switchSort(key: string) {
  if (activeSort.value === key) {
    sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
  } else {
    activeSort.value = key
    sortOrder.value = 'desc'
  }
  // 切换排序后刷新数据
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
    const params: any = {
      page: page.value,
      pageSize,
      sortBy: activeSort.value,
      sortOrder: sortOrder.value,
    }
    const kw = keyword.value.trim()
    const res: any = kw
      ? await stockApi.searchProfitForecast({ ...params, keyword: kw })
      : await stockApi.getProfitForecastList(params)

    // 如果API返回null或空，视为失败，展示失败状态
    if (!res) throw new Error('API returned empty')

    // 响应拦截器已提取 data，res 即为数据对象
    const items = res['盈利预测列表'] || res.list || res.items || []
    total.value = res['总数量'] || res.total || res.totalCount || 0

    const mapped = items.map((item: RawForecastItem) => ({
      code: item['股票代码'] || item.symbol || item.code || '',
      name: item['股票简称'] || item.name || item['股票名称'] || '',
      netProfitForecast: item['净利润预测'] || '--',
      netProfitGrowth: formatNetProfitGrowth(item['净利润同比(%)']),
      eps: item['EPS预测'] || '--',
      epsGrowth: item['EPS同比'] || '--',
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
  // 输入时立即搜索（防抖300ms）
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

function ratingClass(rating?: string): string {
  if (!rating) return ''
  if (rating.includes('买入') || rating.includes('增持') || rating.includes('推荐')) return 'rating-buy'
  if (rating.includes('持有') || rating.includes('中性')) return 'rating-hold'
  if (rating.includes('卖出') || rating.includes('减持')) return 'rating-sell'
  return ''
}

function formatNetProfitGrowth(val: any): string {
  if (val === null || val === undefined || val === '') return '--'
  const num = typeof val === 'number' ? val : Number(val)
  if (!Number.isFinite(num)) return '--'
  const prefix = num > 0 ? '+' : ''
  return `${prefix}${num.toFixed(2)}%`
}

function switchTo(tab: string) {
  if (tab === 'reports') {
    uni.redirectTo({ url: '/modules/analytics/pages/reports' })
  }
}

function goStockDetail(code: string) {
  if (!code) return
  uni.navigateTo({ url: `/modules/favorites/pages/detail?symbol=${code}` })
}

onShow(() => {
  // 加载业绩预测数据，失败时展示失败状态页并提供重试
  fetchData(false)
})
</script>

<style lang="scss" scoped>
.page-forecast {
  height: 100%;
  background: #f5f7fb;
}

/* 切换按钮组 */
.toggle-group {
  display: flex;
  background: #f0f2f5;
  border-radius: 12rpx;
  padding: 4rpx;
}

.toggle-btn {
  font-size: 24rpx;
  color: #6b7280;
  padding: 8rpx 24rpx;
  border-radius: 10rpx;
  font-weight: 500;

  &.active {
    color: #ffffff;
    background: #4d7cfe;
  }
}

/* 搜索+排序区域 */
.forecast-fixed {
  padding: 16rpx 24rpx 0;
}

/* 搜索栏 */
.search-bar {
  margin-bottom: 24rpx;
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
  margin-bottom: 24rpx;
  padding: 12rpx 16rpx;
  background: #ffffff;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.sort-label {
  font-size: 24rpx;
  color: #9ca3af;
  flex-shrink: 0;
}

.sort-picker {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 10rpx 20rpx;
  border-radius: 10rpx;
  background: #f0f2f5;
  min-width: 140rpx;
}

.sort-picker-text {
  font-size: 24rpx;
  color: #4d7cfe;
  font-weight: 500;
}

.sort-order {
  display: flex;
  gap: 0;
  flex-shrink: 0;
  border-radius: 10rpx;
  overflow: hidden;
  border: 1rpx solid #e0e3e8;
}

.order-btn {
  font-size: 22rpx;
  color: #6b7280;
  padding: 8rpx 16rpx;
  background: #f9fafb;
  font-weight: 500;

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
}

.forecast-card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 28rpx;
  border: 1rpx solid #e5e7eb;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

/* 三列信息行 */
.info-row {
  display: flex;
  align-items: flex-start;
  gap: 4rpx;
}

.info-col {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.stock-col {
  flex-shrink: 0;
  width: 190rpx;
}

.data-cols {
  display: flex;
  flex: 1;
  align-items: flex-start;
  gap: 12rpx;
  min-width: 0;
}

.forecast-col {
  flex: 1;
  min-width: 0;
  align-items: flex-start;
}

.eps-col {
  flex: 1;
  min-width: 0;
  align-items: flex-start;
}

.stock-name {
  font-size: 26rpx;
  font-weight: 600;
  color: #1a1d24;
}

.stock-code {
  font-size: 22rpx;
  color: #6b7280;
  background: #f0f2f5;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
}

.code-rating-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 2rpx;
}

.rating-tag {
  font-size: 18rpx;
  font-weight: 500;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;

  &.rating-buy { color: #f43f5e; background: rgba(244, 63, 94, 0.1); }
  &.rating-hold { color: #f59f0b; background: rgba(245, 158, 11, 0.1); }
  &.rating-sell { color: #22c55e; background: rgba(34, 197, 94, 0.1); }
}

.col-main {
  font-size: 20rpx;
  color: #1a1d24;
  white-space: nowrap;
}

.col-value {
  font-size: 20rpx;
  font-weight: 700;
  color: #1a1d24;
}

.eps-val {
  color: #4d7cfe;
}

.forecast-val {
  color: #4d7cfe;
}

.col-growth {
  font-size: 18rpx;
  color: #9ca3af;
  font-weight: 400;
}

.growth-val {
  font-weight: 500;

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
  font-size: 24rpx;
  color: #9ca3af;
}

.institution-value {
  font-size: 24rpx;
  font-weight: 600;
  color: #1a1d24;
}

.update-time {
  font-size: 22rpx;
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
