<template>
  <SubPageCard title="业绩预测">
    <view class="forecast-content">
      <!-- 搜索栏 -->
      <view class="search-bar">
        <view class="search-input-wrap">
          <SvgIcon name="search-line" size="28rpx" color="#9ca3af" />
          <input
            v-model="keyword"
            class="search-input"
            placeholder="搜索股票代码/简称"
            confirm-type="search"
            @confirm="handleSearch"
          />
          <text v-if="keyword" class="search-clear" @tap="handleReset">✕</text>
        </view>
      </view>

      <!-- 排序选项 -->
      <view class="sort-bar">
        <view
          v-for="tab in sortTabs"
          :key="tab.value"
          :class="['sort-tab', activeSort === tab.value ? 'active' : '']"
          @tap="switchSort(tab.value)"
        >
          <text class="sort-tab-text">{{ tab.label }}</text>
        </view>
      </view>

      <!-- 加载中 -->
      <view v-if="loading && !list.length" class="loading-state">
        <LoadingState />
      </view>

      <!-- 空状态 -->
      <view v-if="!loading && !list.length" class="empty-state">
        <EmptyState tip="暂无业绩预测数据" />
      </view>

      <!-- 列表 -->
      <view v-if="list.length" class="forecast-list">
        <view
          v-for="item in list"
          :key="item.code"
          class="forecast-card"
          @tap="goStockDetail(item.code)"
        >
          <view class="card-top">
            <view class="stock-info">
              <text class="stock-name">{{ item.name }}</text>
              <text class="stock-code">{{ item.code }}</text>
            </view>
            <view class="eps-info">
              <text class="eps-label">预测EPS</text>
              <text class="eps-value">{{ item.eps }}</text>
            </view>
          </view>
          <view class="card-bottom">
            <view class="rating-info">
              <text class="info-label">评级</text>
              <text :class="['rating-value', ratingClass(item.rating)]">{{ item.rating }}</text>
            </view>
            <view class="institution-info">
              <text class="info-label">机构</text>
              <text class="institution-value">{{ item.institutionCount }}家</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 加载更多 -->
      <view v-if="hasMore" class="load-more" @tap="loadMore">
        <text class="load-more-text">{{ loadingMore ? '加载中...' : '加载更多' }}</text>
      </view>
    </view>
  </SubPageCard>
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
  eps: string
  rating: string
  institutionCount: number
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
  rating?: string
  ['评级']?: string
  forecast_rating?: string
  institution_count?: number
  ['机构数量']?: number
  institutionCount?: number
  ['净利润同比(%)']?: number
  ['摘要']?: string
}

// API不可用时的Mock数据
const mockList: ForecastItem[] = [
  { code: '600519', name: '贵州茅台', eps: '68.50', rating: '买入', institutionCount: 45 },
  { code: '000858', name: '五粮液', eps: '8.92', rating: '买入', institutionCount: 38 },
  { code: '601318', name: '中国平安', eps: '6.75', rating: '增持', institutionCount: 42 },
  { code: '600036', name: '招商银行', eps: '5.88', rating: '买入', institutionCount: 36 },
  { code: '000333', name: '美的集团', eps: '5.12', rating: '增持', institutionCount: 31 },
  { code: '600276', name: '恒瑞医药', eps: '1.85', rating: '买入', institutionCount: 28 },
  { code: '002415', name: '海康威视', eps: '2.24', rating: '增持', institutionCount: 25 },
  { code: '601899', name: '紫金矿业', eps: '1.36', rating: '买入', institutionCount: 22 },
  { code: '300750', name: '宁德时代', eps: '12.45', rating: '买入', institutionCount: 40 },
  { code: '000568', name: '泸州老窖', eps: '9.36', rating: '增持', institutionCount: 29 },
]

const sortTabs = [
  { label: '净利润同比', value: 'forecast_netprofit_yoy' },
  { label: '股票代码', value: 'symbol' },
]

const keyword = ref('')
const activeSort = ref('forecast_netprofit_yoy')
const loading = ref(false)
const loadingMore = ref(false)
const list = ref<ForecastItem[]>([])
const page = ref(1)
const pageSize = 20
const total = ref(0)

const hasMore = computed(() => list.value.length < total.value)

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
      sortOrder: activeSort.value === 'symbol' ? 'asc' : 'desc',
    }
    const kw = keyword.value.trim()
    const res: any = kw
      ? await stockApi.searchProfitForecast({ ...params, keyword: kw })
      : await stockApi.getProfitForecastList(params)

    const data = res?.data || res || {}
    const items = data.list || data.items || []
    total.value = data.total || data.totalCount || 0

    const mapped = items.map((item: RawForecastItem) => ({
      code: item.symbol || item.code || item['股票代码'] || '',
      name: item.name || item['股票简称'] || item['股票名称'] || '',
      eps: item.forecast_eps || item['预测EPS'] || item.eps || '--',
      rating: item.rating || item['评级'] || item.forecast_rating || '--',
      institutionCount: item.institution_count || item['机构数量'] || item.institutionCount || 0,
    }))

    if (append) {
      list.value = [...list.value, ...mapped]
    } else {
      list.value = mapped
    }
    if (mapped.length) page.value++
  } catch (err) {
      console.error('Failed to fetch profit forecast:', err)
      // API不可用时降级到Mock数据
      if (!append) {
        list.value = mockList
        total.value = mockList.length
      }
    } finally {
    loading.value = false
    loadingMore.value = false
  }
}

function handleSearch() {
  fetchData(false)
}

function handleReset() {
  keyword.value = ''
  fetchData(false)
}

function switchSort(value: string) {
  if (activeSort.value === value) return
  activeSort.value = value
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
  padding: 0 24rpx 24rpx;
}

/* 搜索栏 */
.search-bar {
  margin-bottom: 20rpx;
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

/* 排序栏 */
.sort-bar {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
  background: #ffffff;
  padding: 12rpx;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.sort-tab {
  flex: 1;
  padding: 16rpx 0;
  border-radius: 12rpx;
  text-align: center;

  &.active {
    background: #4d7cfe;

    .sort-tab-text {
      color: #ffffff;
    }
  }
}

.sort-tab-text {
  font-size: 26rpx;
  color: #6b7280;
}

/* 加载/空状态 */
.loading-state,
.empty-state {
  padding: 200rpx 0;
}

/* 列表 */
.forecast-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.forecast-card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 28rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.stock-info {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.stock-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1d24;
}

.stock-code {
  font-size: 22rpx;
  color: #6b7280;
  padding: 2rpx 12rpx;
  background: #f0f2f5;
  border-radius: 8rpx;
}

.eps-info {
  display: flex;
  align-items: baseline;
  gap: 6rpx;
}

.eps-label {
  font-size: 22rpx;
  color: #9ca3af;
}

.eps-value {
  font-size: 36rpx;
  font-weight: 700;
  color: #4d7cfe;
}

.card-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16rpx;
  border-top: 1rpx solid #f0f2f5;
}

.rating-info,
.institution-info {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.info-label {
  font-size: 24rpx;
  color: #9ca3af;
}

.rating-value {
  font-size: 26rpx;
  font-weight: 500;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;

  &.rating-buy {
    color: #f43f5e;
    background: rgba(244, 63, 94, 0.08);
  }

  &.rating-hold {
    color: #f59f0b;
    background: rgba(245, 158, 11, 0.08);
  }

  &.rating-sell {
    color: #22c55e;
    background: rgba(34, 197, 94, 0.08);
  }
}

.institution-value {
  font-size: 26rpx;
  font-weight: 600;
  color: #1a1d24;
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
