<template>
  <view class="forecast-content">
    <!-- 搜索栏 + 排序栏 -->
    <view class="forecast-fixed">
      <view class="search-bar">
        <Input
          :model-value="keyword"
          search-icon
          clearable
          placeholder="搜索股票代码/简称"
          @update:model-value="handleSearchInput"
          @clear="handleReset"
        />
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
            <SvgIcon name="arrow-down-s" size="24rpx" color="#4b5a7a" />
          </view>
        </picker>
        <Segmented
          :items="[{ label: '降序', value: 'desc' }, { label: '升序', value: 'asc' }]"
          :model-value="sortOrder"
          @change="onOrderChange"
        />
      </view>
    </view>

    <!-- 加载中 -->
    <view v-if="loading" class="loading-state">
      <LoadingState />
    </view>

    <!-- API 请求失败 -->
    <EmptyState
      v-else-if="error"
      title="数据获取失败"
      description="网络异常或服务暂时不可用，请稍后重试"
      icon="cloud-off-line"
    >
      <Button type="primary" size="sm" @click="retry">重试</Button>
    </EmptyState>

    <!-- 搜索无结果 -->
    <EmptyState v-else-if="!list.length" :text="keyword ? '未搜索到相关股票' : '暂无业绩预测数据'" />

    <!-- 列表 -->
    <view v-if="list.length" class="forecast-list">
      <Card
        v-for="item in list"
        :key="item.code"
        clickable
        class="forecast-card"
        @click="goStockDetail(item.code)"
      >
        <view class="info-row">
          <view class="stock-col">
            <text class="stock-name">{{ item.name }}</text>
            <Tag type="neutral" size="sm">{{ item.code }}</Tag>
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
          <text class="update-time">更新时间：{{ formatShanghaiClock(item.updateTime) }}</text>
          <view class="institution-info">
            <text class="info-label">机构</text>
            <text class="institution-value">{{ item.institutionCount }}家</text>
          </view>
        </view>
      </Card>
    </view>

    <view v-if="hasMore" class="load-more">
      <Button type="ghost" size="sm" :loading="loadingMore" @click="loadMore">加载更多</Button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { stockApi } from '@/shared/api/modules/stock'
import { formatShanghaiClock } from '@/shared/utils/datetime'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import { Input, Segmented, Card, Tag, EmptyState, Button, LoadingState } from '@/shared/components'

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

function onOrderChange(val: string | number) {
  switchOrder(val as 'asc' | 'desc')
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

function handleSearchInput(val: string) {
  keyword.value = val
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    fetchData(false)
  }, 300)
}

function handleReset() {
  keyword.value = ''
  if (searchTimer) clearTimeout(searchTimer)
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
  background: $bg-card;
}

/* 搜索+排序区域 */
.forecast-fixed {
  padding: $s-2 $s-3 0;
}

/* 搜索栏 */
.search-bar {
  margin-bottom: $s-2;
}

/* 排序方式栏 */
.sort-bar {
  display: flex;
  align-items: center;
  gap: $s-1;
  margin-bottom: $s-2;
  padding: $s-1 $s-2;
  background: $bg-card;
  border-radius: $r-md;
  box-shadow: $shadow-sm;
}

.sort-label {
  font-size: $font-size-xs;
  color: $ink-mute;
  flex-shrink: 0;
}

.sort-picker {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 6rpx 12rpx;
  border-radius: $r-xs;
  background: $bg-deep;
}

.sort-picker-text {
  font-size: $font-size-xs;
  color: $primary;
  font-weight: 500;
  white-space: nowrap;
}

/* 加载状态 */
.loading-state {
  padding: 200rpx 0;
}

/* ===== 卡片 ===== */
.forecast-list {
  display: flex;
  flex-direction: column;
  gap: $s-2;
  padding: 0 $s-3 $s-3;
}

/* 信息行：股票信息(左) + 指标区(右) */
.info-row {
  display: flex;
  align-items: center;
  gap: $s-2;
}

.stock-col {
  flex-shrink: 0;
  width: 140rpx;
  display: flex;
  flex-direction: column;
  gap: $s-1;
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
  gap: $s-1;
  min-width: 0;
}

.metric-label {
  font-size: 20rpx;
  color: $ink-mute;
  flex-shrink: 0;
}

.metric-value {
  font-size: $font-size-xs;
  font-weight: 600;
  color: $primary;
}

.stock-name {
  font-size: $font-size-base;
  font-weight: 600;
  color: $ink;
}

.growth-val {
  font-size: $font-size-xs;
  font-weight: 600;
  flex-shrink: 0;

  &.up { color: $up; }
  &.down { color: $down; }
}

/* 分隔线 */
.divider {
  height: 1rpx;
  background: $line-soft;
  margin: $s-2 0;
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
  gap: $s-1;
}

.info-label {
  font-size: $font-size-xs;
  color: $ink-mute;
}

.institution-value {
  font-size: $font-size-xs;
  font-weight: 600;
  color: $ink;
}

.update-time {
  font-size: 20rpx;
  color: $ink-mute;
}

/* 加载更多 */
.load-more {
  text-align: center;
  padding: $s-4 0;
}
</style>
