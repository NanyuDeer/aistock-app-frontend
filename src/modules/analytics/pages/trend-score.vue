<template>
  <view class="trend-page" :style="{ paddingTop: statusBarHeight + 'px' }">
    <view class="trend-nav">
      <view class="nav-button" @tap="goBack">
        <SvgIcon name="arrow-left-s-line" size="44rpx" color="#1a1d24" />
      </view>
      <text class="nav-title">趋势股评分</text>
      <view class="nav-button" @tap="loadTopStocks">
        <SvgIcon name="refresh-line" size="34rpx" color="#4d7cfe" />
      </view>
    </view>

    <view class="search-wrap">
      <SvgIcon name="search-line" size="32rpx" color="#9ca3af" />
      <input
        v-model="keyword"
        class="search-input"
        placeholder="搜索股票名称或代码"
        placeholder-class="search-placeholder"
        confirm-type="search"
      />
    </view>

    <view class="list-meta">
      <text class="list-title">趋势股列表</text>
      <view class="list-meta-right">
        <text v-if="latestDate" class="updated-date">{{ latestDate }}</text>
        <text class="stock-count">{{ filteredStocks.length }} 只</text>
      </view>
    </view>

    <scroll-view scroll-y class="trend-scroll" :enhanced="true" :bounces="false">
      <LoadingState v-if="loading" text="正在加载趋势评分" />
      <view v-else-if="errorMessage" class="state-panel">
        <SvgIcon name="error-warning-line" size="64rpx" color="#f59e0b" />
        <text class="state-title">趋势评分暂时无法加载</text>
        <text class="state-desc">{{ errorMessage }}</text>
        <button class="retry-button" @tap="loadTopStocks">重新加载</button>
      </view>
      <EmptyState v-else-if="!filteredStocks.length" icon="search-eye-line" text="没有找到匹配的趋势股" />
      <view v-else class="stock-list">
        <view
          v-for="stock in filteredStocks"
          :key="stock.symbol"
          class="stock-row"
          @tap="openDetail(stock)"
        >
          <view class="stock-main">
            <text class="stock-name">{{ stock.name || stock.symbol }}</text>
            <view class="stock-meta">
              <text class="stock-symbol">{{ stock.symbol }}</text>
              <text v-if="stock.industry" class="industry-tag">{{ stock.industry }}</text>
            </view>
          </view>
          <view class="score-block">
            <text class="total-score">{{ stock.score }}</text>
          </view>
          <text :class="['grade', `grade-${stock.label.toLowerCase()}`]">{{ stock.label }}</text>
          <SvgIcon name="arrow-right-s-line" size="30rpx" color="#c6cad2" />
        </view>
        <view class="list-footnote">评分基于公开数据与模型测算，仅供参考，不构成投资建议。</view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { trendScoreApi, type TrendScoreListItem } from '@/shared/api/modules/trend-score'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import LoadingState from '@/shared/components/LoadingState.vue'
import EmptyState from '@/shared/components/EmptyState.vue'

const stocks = ref<TrendScoreListItem[]>([])
const keyword = ref('')
const loading = ref(false)
const errorMessage = ref('')

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

const filteredStocks = computed(() => {
  const query = keyword.value.trim().toLowerCase()
  if (!query) return stocks.value
  return stocks.value.filter((stock) =>
    stock.symbol.toLowerCase().includes(query)
      || stock.name.toLowerCase().includes(query)
      || stock.industry?.toLowerCase().includes(query),
  )
})

const latestDate = computed(() => formatDate(stocks.value[0]?.scoreDate))

function formatDate(value?: string): string {
  if (!value) return ''
  return String(value).slice(0, 10)
}

async function loadTopStocks() {
  loading.value = true
  errorMessage.value = ''
  try {
    const result = await trendScoreApi.getTop(30)
    stocks.value = Array.isArray(result) ? result : []
  } catch (error: unknown) {
    const message = (error as { errMsg?: string; message?: string })?.errMsg
      || (error as { message?: string })?.message
    errorMessage.value = message || '请稍后重试'
  } finally {
    loading.value = false
  }
}

function openDetail(stock: TrendScoreListItem) {
  const name = encodeURIComponent(stock.name || stock.symbol)
  uni.navigateTo({
    url: `/modules/analytics/pages/trend-score-detail?symbol=${stock.symbol}&name=${name}`,
  })
}

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) uni.navigateBack()
  else uni.redirectTo({ url: '/modules/analytics/pages/index' })
}

onShow(() => {
  if (!stocks.value.length) loadTopStocks()
})
</script>

<style lang="scss" scoped>
@import '@/shared/styles/variables.scss';

.trend-page {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: $bg-color;
}

.trend-nav {
  height: 88rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 0 $spacing-base;
}

.nav-button {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-title {
  flex: 1;
  text-align: center;
  color: $text-color-title;
  font-size: $font-size-xl;
  font-weight: 650;
}

.search-wrap {
  height: 76rpx;
  margin: 0 $spacing-base $spacing-sm;
  padding: 0 $spacing-base;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  border: 1rpx solid $border-color-light;
  border-radius: $radius-base;
  background: $bg-color-grey;
  box-shadow: $shadow-base;
}

.search-input {
  flex: 1;
  height: 100%;
  color: $text-color;
  font-size: $font-size-base;
}

.search-placeholder { color: $text-color-tertiary; }

.list-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $spacing-sm $spacing-base;
}

.list-title {
  color: $text-color-title;
  font-size: $font-size-base;
  font-weight: 650;
}

.list-meta-right { display: flex; align-items: center; gap: $spacing-sm; }
.updated-date { color: $text-color-tertiary; font-size: $font-size-xs; }
.stock-count {
  padding: 4rpx 14rpx;
  border-radius: $radius-xs;
  color: $brand-color;
  background: rgba(77, 124, 254, 0.08);
  font-size: $font-size-xs;
  font-weight: 600;
}

.trend-scroll { flex: 1; min-height: 0; }

.stock-list {
  margin: 0 $spacing-base $spacing-lg;
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.stock-row {
  min-height: 116rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 18rpx $spacing-base;
  border: 1rpx solid transparent;
  border-radius: $radius-base;
  background: $bg-color-grey;
  box-shadow: $shadow-base;
  transition: background-color 0.16s ease, border-color 0.16s ease, transform 0.16s ease;
}

.stock-row:active {
  border-color: rgba(77, 124, 254, 0.22);
  background: rgba(77, 124, 254, 0.04);
  transform: scale(0.99);
}

.stock-main { flex: 1; min-width: 0; }
.stock-name {
  display: block;
  overflow: hidden;
  color: $text-color-title;
  font-size: $font-size-lg;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.stock-meta { margin-top: 8rpx; display: flex; align-items: center; gap: $spacing-xs; }
.stock-symbol { color: $text-color-tertiary; font-size: $font-size-xs; letter-spacing: 0.5rpx; }
.industry-tag {
  max-width: 132rpx;
  overflow: hidden;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  color: $text-color-secondary;
  background: $bg-color-muted;
  font-size: 20rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.score-block {
  width: 64rpx;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
.total-score { color: $brand-color; font-size: 38rpx; font-weight: 750; line-height: 1; }
.grade {
  width: 56rpx;
  height: 56rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $radius-sm;
  color: #ffffff;
  background: $brand-color;
  box-shadow: 0 6rpx 14rpx rgba(77, 124, 254, 0.2);
  font-size: $font-size-lg;
  font-weight: 750;
}
.grade-s { background: $stock-up-color; }
.grade-a { background: $brand-color; }
.grade-b, .grade-c, .grade-d { background: $text-color-secondary; }

.list-footnote {
  padding: $spacing-base $spacing-sm;
  color: $text-color-tertiary;
  font-size: $font-size-xs;
  line-height: 1.6;
  text-align: center;
}

.state-panel {
  margin: $spacing-base;
  padding: 80rpx $spacing-lg;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-radius: $radius-lg;
  background: $bg-color-grey;
}

.state-title { margin-top: $spacing-sm; color: $text-color-title; font-size: $font-size-lg; font-weight: 600; }
.state-desc { margin-top: $spacing-xs; color: $text-color-secondary; font-size: $font-size-sm; text-align: center; }
.retry-button {
  margin-top: $spacing-base;
  padding: 0 $spacing-lg;
  border: 0;
  border-radius: $radius-pill;
  background: $brand-color;
  color: $bg-color-grey;
  font-size: $font-size-sm;
  line-height: 64rpx;
}
.retry-button::after { border: 0; }
</style>
