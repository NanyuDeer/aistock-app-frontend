<template>
  <view class="page-forecast" :style="{ paddingTop: statusBarHeight + 'px' }">
    <!-- 透明导航区域 -->
    <view class="nav-area">
      <view class="nav-avatar" @tap="goProfile">
        <SvgIcon name="bear-smile-line" size="30rpx" color="#ffffff" />
      </view>
    </view>

    <!-- 白色圆角卡片 -->
    <view class="page-card">
      <view class="card-header">
        <text class="card-title">业绩</text>
      </view>

      <!-- 固定区域：搜索栏 + 排序栏 -->
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

      <!-- 可滚动区域：列表 -->
      <scroll-view class="forecast-scroll" scroll-y :enhanced="true" :bounces="false">
        <view v-if="loading && !list.length" class="loading-state">
          <LoadingState />
        </view>

        <view v-if="!loading && !list.length" class="empty-state">
          <EmptyState tip="暂无业绩预测数据" />
        </view>

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
              <view class="info-col forecast-col">
                <text class="col-main">净利润预测 <text class="col-value forecast-val">{{ item.netProfitForecast }}</text></text>
                <text class="col-growth">同比增长 <text :class="['growth-val', item.netProfitGrowth?.startsWith('-') ? 'down' : 'up']">{{ item.netProfitGrowth }}</text></text>
              </view>
              <view class="info-col eps-col">
                <text class="col-main">EPS预测 <text class="col-value eps-val">{{ item.eps }}元</text></text>
                <text class="col-growth">同比增长 <text :class="['growth-val', item.epsGrowth?.startsWith('-') ? 'down' : 'up']">{{ item.epsGrowth }}</text></text>
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
      </scroll-view>
    </view>

    <AppBottomBar current-tab="forecast" />
    <GlobalChatBar />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { stockApi } from '@/shared/api/modules/stock'
import AppBottomBar from '@/shared/components/AppBottomBar.vue'
import GlobalChatBar from '@/shared/components/GlobalChatBar.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import LoadingState from '@/shared/components/LoadingState.vue'
import EmptyState from '@/shared/components/EmptyState.vue'

// 获取真实状态栏高度
const statusBarHeight = ref(0)
try {
  const raw = uni.getSystemInfoSync().statusBarHeight || 0
  // #ifdef APP-PLUS
  statusBarHeight.value = raw / 1.2
  // #endif
  // #ifndef APP-PLUS
  statusBarHeight.value = raw
  // #endif
} catch (e) {
  statusBarHeight.value = 0
}

function goProfile() {
  uni.navigateTo({ url: '/modules/user/pages/profile' })
}

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
  forecast_eps?: string
  ['预测EPS']?: string
  eps?: string
  eps_growth?: string
  ['EPS同比']?: string
  epsGrowth?: string
  rating?: string
  ['评级']?: string
  forecast_rating?: string
  institution_count?: number
  ['机构数量']?: number
  institutionCount?: number
  ['净利润预测']?: string
  ['净利润同比(%)']?: number
  ['更新时间']?: string
  update_time?: string
  updateTime?: string
  ['摘要']?: string
}

// API不可用时的Mock数据
const mockList: ForecastItem[] = [
  { code: '600519', name: '贵州茅台', netProfitForecast: '88.5亿', netProfitGrowth: '+18.50%', eps: '68.50', epsGrowth: '+15.20%', rating: '买入', institutionCount: 45, updateTime: '2026-07-07 08:30' },
  { code: '000858', name: '五粮液', netProfitForecast: '42.3亿', netProfitGrowth: '+12.30%', eps: '8.92', epsGrowth: '+10.80%', rating: '买入', institutionCount: 38, updateTime: '2026-07-07 08:15' },
  { code: '601318', name: '中国平安', netProfitForecast: '120.5亿', netProfitGrowth: '+8.75%', eps: '6.75', epsGrowth: '+7.20%', rating: '增持', institutionCount: 42, updateTime: '2026-07-06 16:45' },
  { code: '600036', name: '招商银行', netProfitForecast: '95.8亿', netProfitGrowth: '+6.22%', eps: '5.88', epsGrowth: '+5.50%', rating: '买入', institutionCount: 36, updateTime: '2026-07-06 14:20' },
  { code: '000333', name: '美的集团', netProfitForecast: '65.2亿', netProfitGrowth: '+10.15%', eps: '5.12', epsGrowth: '+9.30%', rating: '增持', institutionCount: 31, updateTime: '2026-07-06 11:00' },
  { code: '600276', name: '恒瑞医药', netProfitForecast: '28.6亿', netProfitGrowth: '+22.80%', eps: '1.85', epsGrowth: '+18.60%', rating: '买入', institutionCount: 28, updateTime: '2026-07-05 09:45' },
  { code: '002415', name: '海康威视', netProfitForecast: '35.4亿', netProfitGrowth: '+5.46%', eps: '2.24', epsGrowth: '+4.80%', rating: '增持', institutionCount: 25, updateTime: '2026-07-05 08:30' },
  { code: '601899', name: '紫金矿业', netProfitForecast: '52.1亿', netProfitGrowth: '+35.20%', eps: '1.36', epsGrowth: '+28.50%', rating: '买入', institutionCount: 22, updateTime: '2026-07-04 17:00' },
  { code: '300750', name: '宁德时代', netProfitForecast: '78.3亿', netProfitGrowth: '+28.60%', eps: '12.45', epsGrowth: '+25.30%', rating: '买入', institutionCount: 40, updateTime: '2026-07-04 15:30' },
  { code: '000568', name: '泸州老窖', netProfitForecast: '32.7亿', netProfitGrowth: '+15.90%', eps: '9.36', epsGrowth: '+13.70%', rating: '增持', institutionCount: 29, updateTime: '2026-07-03 10:10' },
  { code: '002230', name: '科大讯飞', netProfitForecast: '15.6亿', netProfitGrowth: '-8.30%', eps: '0.68', epsGrowth: '-12.50%', rating: '减持', institutionCount: 15, updateTime: '2026-07-03 14:20' },
  { code: '601012', name: '隆基绿能', netProfitForecast: '118.6亿', netProfitGrowth: '-35.60%', eps: '-0.24', epsGrowth: '-42.10%', rating: '卖出', institutionCount: 18, updateTime: '2026-07-02 16:00' },
]

const keyword = ref('')
const activeSort = ref('net_profit_forecast')
const sortOrder = ref('desc')
const loading = ref(false)
const loadingMore = ref(false)
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

/** 搜索：从Mock数据中按股票代码或名称过滤 */
function filterMockByKeyword(kw: string): ForecastItem[] {
  let result = mockList
  // 关键词过滤
  if (kw.trim()) {
    const q = kw.trim().toLowerCase()
    result = result.filter(item =>
      item.code.toLowerCase().includes(q) || item.name.toLowerCase().includes(q)
    )
  }
  // 排序
  result = [...result].sort((a, b) => {
    let cmp = 0
    const sk = activeSort.value
    if (sk === 'update_time') {
      cmp = a.updateTime.localeCompare(b.updateTime)
    } else if (sk === 'net_profit_forecast') {
      const va = parseFloat(a.netProfitForecast) || 0
      const vb = parseFloat(b.netProfitForecast) || 0
      cmp = va - vb
    } else if (sk === 'eps_forecast') {
      const va = parseFloat(a.eps) || 0
      const vb = parseFloat(b.eps) || 0
      cmp = va - vb
    } else if (sk === 'net_profit_growth') {
      const va = parseFloat(a.netProfitGrowth) || 0
      const vb = parseFloat(b.netProfitGrowth) || 0
      cmp = va - vb
    } else if (sk === 'eps_growth') {
      const va = parseFloat(a.epsGrowth) || 0
      const vb = parseFloat(b.epsGrowth) || 0
      cmp = va - vb
    }
    return sortOrder.value === 'desc' ? -cmp : cmp
  })
  return result
}

async function fetchData(append = false) {
  if (!append) {
    loading.value = true
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

    // 如果API返回null或空，视为失败，走Mock数据
    if (!res) throw new Error('API returned empty')

    const data = res?.data || res || {}
    const items = data.list || data.items || []
    total.value = data.total || data.totalCount || 0

    const mapped = items.map((item: RawForecastItem) => ({
      code: item.symbol || item.code || item['股票代码'] || '',
      name: item.name || item['股票简称'] || item['股票名称'] || '',
      netProfitForecast: formatNetProfitForecast(item['净利润预测']),
      netProfitGrowth: formatNetProfitGrowth(item['净利润同比(%)']),
      eps: item.forecast_eps || item['预测EPS'] || item.eps || '--',
      epsGrowth: item.eps_growth || item['EPS同比'] || item.epsGrowth || '--',
      rating: item.rating || item['评级'] || item.forecast_rating || '--',
      institutionCount: item.institution_count || item['机构数量'] || item.institutionCount || 0,
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
    // API不可用时降级到Mock数据，支持搜索过滤
    const kw = keyword.value.trim()
    const filtered = filterMockByKeyword(kw)
    if (append) {
      // 追加模式从mock继续取
    } else {
      list.value = filtered
      total.value = filtered.length
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

function ratingClass(rating?: string): string {
  if (!rating) return ''
  if (rating.includes('买入') || rating.includes('增持') || rating.includes('推荐')) return 'rating-buy'
  if (rating.includes('持有') || rating.includes('中性')) return 'rating-hold'
  if (rating.includes('卖出') || rating.includes('减持')) return 'rating-sell'
  return ''
}

function formatNetProfitForecast(val: any): string {
  if (val === null || val === undefined || val === '') return '--'
  return String(val)
}

function formatNetProfitGrowth(val: any): string {
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
  // 直接显示Mock数据，API请求在后台尝试
  list.value = mockList
  total.value = mockList.length
  fetchData(false)
})
</script>

<style lang="scss" scoped>
/* 页面外层：与 PageCard 一致 */
.page-forecast {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f5f7fb;
  overscroll-behavior: none;
  touch-action: none;
}

/* 透明导航区域 */
.nav-area {
  flex-shrink: 0;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 24rpx;
  background: transparent;
}

.nav-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #4d7cfe, #6366f1);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 12rpx rgba(77, 124, 254, 0.3);
}

/* 白色圆角卡片 */
.page-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin: 0 24rpx;
  background: #ffffff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
  min-height: 0;
  margin-bottom: 207rpx;
}

.card-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  border-bottom: 1rpx solid #f0f2f5;
}

.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1d24;
}

/* 固定区域：搜索+排序 */
.forecast-fixed {
  flex-shrink: 0;
  padding: 16rpx 24rpx 0;
}

/* 可滚动区域：列表 */
.forecast-scroll {
  flex: 1;
  padding: 0 24rpx 24rpx;
  min-height: 0;
  touch-action: auto;
  overscroll-behavior: contain;
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

/* 加载/空状态 */
.loading-state,
.empty-state {
  padding: 200rpx 0;
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
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.stock-col {
  flex: 1;
}

.forecast-col {
  align-items: flex-start;
  flex: 1.1;
  min-width: 180rpx;
}

.eps-col {
  align-items: flex-start;
  flex: 1;
  min-width: 150rpx;
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
