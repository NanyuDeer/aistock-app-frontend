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

        <!-- 筛选 + 排序 单行：自选股放最前，排序字段按钮均匀分布 -->
        <view class="filter-sort-bar">
          <!-- 自选股筛选 -->
          <text
            :class="['fav-btn', favoritesOnly ? 'active' : '']"
            @tap="toggleFavoritesOnly"
          >自选股</text>

          <!-- 排序字段：选中项放大（其他项滑动缩小），选中项显示上下双三角 -->
          <view class="sort-field-group">
            <view
              v-for="f in sortFields"
              :key="f.key"
              :class="['sort-field-item', activeSort === f.key ? 'active' : '']"
              @tap="setSortField(f.key)"
            >
              <text class="sort-field-text">{{ f.label }}</text>
              <!-- 选中项显示上下三角：上=从低到高，下=从高到低 -->
              <view v-if="activeSort === f.key" class="sort-arrows">
                <view
                  class="sort-arrow-up"
                  :class="{ active: sortAsc }"
                  @tap.stop="setSortField(f.key, true)"
                />
                <view
                  class="sort-arrow-down"
                  :class="{ active: !sortAsc }"
                  @tap.stop="setSortField(f.key, false)"
                />
              </view>
            </view>
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
        <EmptyState :text="emptyText" />
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
            <text class="update-time">更新时间：{{ formatShanghaiClock(item.updateTime) }}</text>
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
import { formatShanghaiClock } from '@/shared/utils/datetime'
import { useFavoritesStore, useUserStore } from '@/shared/store'
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
const activeSort = ref('update_time')
const sortAsc = ref(false)      // true=从低到高（上箭头）, false=从高到低（下箭头）
const loading = ref(false)
const loadingMore = ref(false)
const error = ref(false)
const list = ref<ForecastItem[]>([])
const page = ref(1)
const pageSize = 20
const total = ref(0)

// 自选股筛选
const favoritesStore = useFavoritesStore()
const favoritesOnly = ref(false)
const favoritesSymbols = computed(() => favoritesStore.stocks.map(s => s.symbol).filter(Boolean))

const emptyText = computed(() => {
  if (keyword.value) return '未搜索到相关股票'
  return favoritesOnly.value ? '自选股中暂无业绩预测数据' : '暂无业绩预测数据'
})

// 排序字段按钮配置（均匀分布展示，更新时间放自选股后第一位）
const sortFields = [
  { key: 'update_time', label: '更新时间' },
  { key: 'net_profit_forecast', label: '净利润预测' },
  { key: 'eps_forecast', label: 'EPS预测' },
  { key: 'net_profit_growth', label: '净利润增长' },
  { key: 'eps_growth', label: 'EPS增长' },
]

// 搜索结果缓存，避免每次输入都重新过滤
let searchTimer: ReturnType<typeof setTimeout> | null = null

const hasMore = computed(() => list.value.length < total.value)

/** 设置排序字段；asc 参数存在表示点击箭头（同时设置升降序方向） */
function setSortField(key: string, asc?: boolean) {
  if (asc !== undefined) {
    activeSort.value = key
    sortAsc.value = asc
  } else {
    // 点击文字：仅切换字段，保持当前方向
    if (activeSort.value === key) return
    activeSort.value = key
  }
  // 切换排序后刷新数据
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
      sortOrder: sortAsc.value ? 'asc' : 'desc',
    }
    if (favoritesOnly.value) {
      params.symbols = favoritesSymbols.value.join(',')
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

/** 切换自选股筛选：未登录时提示登录；已登录先确保自选股已加载，再带 symbols 参数重新拉取 */
async function toggleFavoritesOnly() {
  if (favoritesOnly.value) {
    favoritesOnly.value = false
    fetchData(false)
    return
  }
  if (!useUserStore().isLoggedIn()) {
    uni.showToast({ title: '登录后查看自选股信息', icon: 'none' })
    return
  }
  await favoritesStore.fetchFavorites({ silent: true })
  favoritesOnly.value = true
  fetchData(false)
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
  color: $ink-soft;
  padding: 8rpx 24rpx;
  border-radius: 10rpx;
  font-weight: 500;

  &.active {
    color: #ffffff;
    background: $primary;
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
  color: $ink;
  height: 40rpx;
}

.search-clear {
  font-size: 28rpx;
  color: #9ca3af;
  padding: 8rpx;
}

/* 筛选+排序单行：自选股 + 排序字段按钮 */
.filter-sort-bar {
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
  padding: 12rpx 16rpx;
  background: #ffffff;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.fav-btn {
  font-size: 22rpx;
  color: $ink-soft;
  padding: 8rpx 16rpx;
  border-radius: 10rpx;
  border: 1rpx solid #e0e3e8;
  background: #f9fafb;
  font-weight: 500;
  flex-shrink: 0;

  &.active {
    color: #fff;
    background: $primary;
    border-color: $primary;
  }
}

/* 排序字段组：占满剩余空间，五项分布（无方框） */
.sort-field-group {
  flex: 1;
  display: flex;
  align-items: center;
  margin-left: 12rpx;
  min-width: 0;
}

/* 未选中：flex:1 均匀分布；选中：flex-grow 放大，带动其他项滑动缩小 */
.sort-field-item {
  flex: 1 1 0%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  padding: 8rpx 0;
  min-width: 0;
  transition: flex-grow 0.3s ease;

  &.active {
    flex-grow: 1.6;
  }
}

/* 未选中：小号灰色文字 */
.sort-field-text {
  font-size: 20rpx;
  color: #9ca3af;
  font-weight: 400;
  white-space: nowrap;
  transition: font-size 0.3s ease, color 0.3s ease;
}

/* 选中：放大、主色 */
.sort-field-item.active .sort-field-text {
  font-size: 26rpx;
  color: $primary;
  font-weight: 600;
}

/* 选中项上下双三角：上=从低到高，下=从高到低 */
.sort-arrows {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3rpx;
  flex-shrink: 0;
}

.sort-arrow-up,
.sort-arrow-down {
  width: 0;
  height: 0;
  border-left: 5rpx solid transparent;
  border-right: 5rpx solid transparent;
}

.sort-arrow-up {
  border-bottom: 6rpx solid #9ca3af;

  &.active {
    border-bottom-color: $primary;
  }
}

.sort-arrow-down {
  border-top: 6rpx solid #9ca3af;

  &.active {
    border-top-color: $primary;
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
  border: 1rpx solid $line;
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
  /* 406px H5 预览中对应 70px；保留 rpx 以便不同端等比例适配。 */
  width: 140rpx;
}

.data-cols {
  display: flex;
  flex: 1;
  align-items: flex-start;
  gap: 12rpx;
  min-width: 0;
}

.forecast-col {
  flex: 5;
  min-width: 0;
  align-items: flex-start;
}

.eps-col {
  flex: 4;
  min-width: 0;
  align-items: flex-start;
}

.stock-name {
  font-size: 26rpx;
  font-weight: 600;
  color: $ink;
}

.stock-code {
  font-size: 22rpx;
  color: $ink-soft;
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

.col-main {
  font-size: 24rpx;
  color: $ink;
  white-space: nowrap;
}

.col-value {
  font-size: 24rpx;
  font-weight: 700;
  color: $ink;
}

.eps-val {
  color: $primary;
}

.forecast-val {
  color: $primary;
}

.col-growth {
  font-size: 20rpx;
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
  color: $ink;
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
  color: $primary;
}
</style>
