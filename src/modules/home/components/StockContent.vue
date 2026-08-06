<template>
  <view class="stock-content">
    <view class="content-wrap">
      <!-- 股票搜索框（替代大盘概览卡片，输入实时匹配股票，与 Web 端一致） -->
      <view class="stock-search">
        <SvgIcon name="search-line" size="32rpx" color="#9ca3af" />
        <input
          :value="searchKeyword"
          class="stock-search__input"
          type="text"
          placeholder="输入股票代码或名称"
          confirm-type="search"
          @input="onSearchInput"
        />
        <SvgIcon v-if="searchKeyword" name="close-line" size="32rpx" color="#9ca3af" @tap="clearSearch" />

        <!-- 实时搜索结果（悬浮快速菜单：贴搜索框下边缘，覆盖在下方组件之上，不挤占布局） -->
        <view v-if="searchKeyword.trim()" class="search-result-list">
          <view v-if="searchLoading" class="search-result-loading">
            <LoadingState size="sm" text="搜索中..." />
          </view>
          <template v-else>
            <view
              v-for="item in searchResults"
              :key="item.symbol"
              class="search-result-item"
              @tap="goStockDetail(item.symbol)"
            >
              <view class="search-result-info">
                <text class="search-result-name">{{ item.name }}</text>
                <text class="search-result-code">{{ item.symbol }}</text>
                <text v-if="item.industry" class="search-result-industry">{{ item.industry }}</text>
              </view>
              <text class="search-result-arrow">›</text>
            </view>
            <view v-if="!searchResults.length" class="search-result-empty">
              <text class="search-result-empty-text">未找到相关股票</text>
            </view>
          </template>
        </view>
      </view>

      <!-- 趋势股评分卡片 -->
      <InsightListCard
        theme="trend"
        title="趋势股评分"
        desc="基于多维度模型对A股趋势打分"
        icon-name="bar-chart-line"
        :items="trendScoreItems"
        :status="trendScoreStatus"
        :status-text="trendScoreError || '评分数据加载中…'"
        @click="goTrendScore"
      />

      <!-- 机构调研热门股卡片 -->
      <InsightListCard
        theme="burst"
        title="机构推荐热门股"
        desc="机构调研共振检测，发现潜在机会"
        icon-name="search-eye-line"
        :items="hotBurstItems"
        :status="hotBurstStatus"
        :status-text="hotBurstError || '热门股数据加载中…'"
        @click="goHotBurst"
      />

      <!-- 业绩预测入口 -->
      <InsightListCard
        theme="forecast"
        title="业绩预测"
        desc="机构盈利预测与财报分析"
        icon-name="file-chart-line"
        :items="forecastItems"
        :status="forecastStatus"
        :status-text="forecastError || '预测数据加载中…'"
        @click="goForecast"
      />
    </view>
  </view>
</template>

<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import { InsightListCard, LoadingState, type InsightListItem } from '@/shared/components'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import { stockApi, type StockListItem, type HotBurstSignal } from '@/shared/api/modules/stock'
import { trendScoreApi, type TrendScoreListItem } from '@/shared/api/modules/trend-score'

// ===== 股票搜索（实时联想，与 Web 端一致） =====
const searchKeyword = ref('')
const searchResults = ref<StockListItem[]>([])
const searchLoading = ref(false)
let searchTimer: ReturnType<typeof setTimeout> | null = null

function onSearchInput(e: { detail?: { value?: string } }) {
  searchKeyword.value = e?.detail?.value ?? ''
}

watch(searchKeyword, (kw) => {
  const value = (kw ?? '').trim()
  if (!value) {
    searchResults.value = []
    searchLoading.value = false
    if (searchTimer) clearTimeout(searchTimer)
    return
  }
  searchLoading.value = true
  if (searchTimer) clearTimeout(searchTimer)
  // 300ms 防抖：输入停顿后再请求，避免每敲一个字都打接口
  searchTimer = setTimeout(() => {
    void doSearch(value)
  }, 300)
})

async function doSearch(kw: string) {
  try {
    const res = await stockApi.getStockList({ keyword: kw, page: 1, pageSize: 20 })
    searchResults.value = res?.list || []
  } catch {
    searchResults.value = []
  } finally {
    searchLoading.value = false
  }
}

function clearSearch() {
  searchKeyword.value = ''
  searchResults.value = []
  if (searchTimer) clearTimeout(searchTimer)
}

function goStockDetail(symbol: string) {
  uni.navigateTo({ url: `/modules/favorites/pages/detail?symbol=${symbol}` })
}

// ===== 趋势股评分预览 =====
interface TrendScorePreviewItem {
  name: string
  score: number
  trend: 'up' | 'down'
}

const trendScorePreview = ref<TrendScorePreviewItem[]>([])
const trendScoreLoading = ref(true)
const trendScoreError = ref('')

const trendScoreStatus = computed(() => {
  if (trendScoreLoading.value) return 'loading' as const
  if (trendScoreError.value) return 'error' as const
  if (trendScorePreview.value.length === 0) return 'empty' as const
  return 'ready' as const
})

const trendScoreItems = computed<InsightListItem[]>(() =>
  trendScorePreview.value.map(item => ({
    name: item.name,
    score: `${item.score}分`,
    trend: item.trend === 'up' ? '↑' : '↓',
    trendType: item.trend,
  }))
)

/**
 * 加载趋势股评分预览：取评分最高的前3只股票
 * trend 字段通过对比前后两条评分的变化方向确定（简化处理：score >= 80 视为上升）
 */
async function loadTrendScorePreview() {
  trendScoreLoading.value = true
  trendScoreError.value = ''
  try {
    const items = await trendScoreApi.getTop(10)
    const list: TrendScoreListItem[] = Array.isArray(items) ? items : (items as any)?.list ?? []
    trendScorePreview.value = list.slice(0, 3).map(item => ({
      name: item.name || item.symbol,
      score: Math.round(item.score),
      trend: (item.score >= 80 ? 'up' : 'down') as 'up' | 'down',
    }))
  } catch {
    trendScorePreview.value = []
    trendScoreError.value = '评分数据加载失败'
  } finally {
    trendScoreLoading.value = false
  }
}

// ===== 机构调研热门股预览 =====
const hotBurstPreview = ref<{ symbol: string; name: string; level: string }[]>([])
const hotBurstLoading = ref(true)
const hotBurstError = ref('')
const HOT_BURST_CACHE_KEY = 'hot_burst_preview_cache_v2'

const hotBurstStatus = computed(() => {
  if (hotBurstLoading.value) return 'loading' as const
  if (hotBurstError.value) return 'error' as const
  if (hotBurstPreview.value.length === 0) return 'empty' as const
  return 'ready' as const
})

const hotBurstItems = computed<InsightListItem[]>(() =>
  hotBurstPreview.value.map(item => ({
    name: item.name,
    tag: item.level,
  }))
)

function levelLabel(level: HotBurstSignal['resonanceLevel']): string {
  const labels: Record<NonNullable<HotBurstSignal['resonanceLevel']>, string> = {
    critical: '极高',
    high: '高',
    medium: '中',
    low: '低',
  }
  return labels[level || 'low']
}

async function loadHotBurstPreview() {
  hotBurstLoading.value = true
  hotBurstError.value = ''
  try {
    const outbreaks = await stockApi.getHotBurstHistory({ days: 3, min_resonance: 2 })
    uni.setStorageSync(HOT_BURST_CACHE_KEY, {
      cachedAt: Date.now(),
      outbreaks,
    })
    hotBurstPreview.value = [...outbreaks].sort((a, b) => {
      const aTime = a.detectedAt ? Date.parse(a.detectedAt) : 0
      const bTime = b.detectedAt ? Date.parse(b.detectedAt) : 0
      return bTime - aTime
    }).slice(0, 3).map((item) => ({
      symbol: item.symbol,
      name: item.stockName || item.symbol,
      level: levelLabel(item.resonanceLevel),
    }))
  } catch {
    hotBurstPreview.value = []
    hotBurstError.value = '热门股数据加载失败'
  } finally {
    hotBurstLoading.value = false
  }
}

// ===== 业绩预测预览 =====
interface ForecastPreviewItem {
  name: string
  label: string
  growth: string
}

const forecastPreview = ref<ForecastPreviewItem[]>([])
const forecastLoading = ref(true)
const forecastError = ref('')

const forecastStatus = computed(() => {
  if (forecastLoading.value) return 'loading' as const
  if (forecastError.value) return 'error' as const
  if (forecastPreview.value.length === 0) return 'empty' as const
  return 'ready' as const
})

const forecastItems = computed<InsightListItem[]>(() =>
  forecastPreview.value.map(item => ({
    name: item.name,
    tag: item.label,
    trend: item.growth,
    trendType: (item.growth.startsWith('+') || item.growth.startsWith('0') ? 'up' : 'down') as 'up' | 'down',
  }))
)

interface RawForecastItem {
  ['股票代码']?: string
  ['股票简称']?: string
  ['净利润预测']?: string
  ['净利润同比(%)']?: number | string
  ['EPS预测']?: string
  ['更新时间']?: string
  update_time?: string
  updateTime?: string
}

function formatGrowth(val: number | string | undefined): string {
  if (val === null || val === undefined || val === '') return '--'
  const num = typeof val === 'number' ? val : Number(val)
  if (!Number.isFinite(num)) return '--'
  const prefix = num > 0 ? '+' : ''
  return `${prefix}${num.toFixed(2)}%`
}

function getDateFromUpdateTime(timeStr: string | undefined): string {
  if (!timeStr) return ''
  return timeStr.split('T')[0]
}

/**
 * 加载业绩预测预览：
 * 1. 优先取当天更新的股票，按净利润增长降序取前3
 * 2. 如果当天不足3条，从最近更新的一天补充
 * 3. 如果仍不足3条，从更前一天补充，直到满3条或无数据
 */
async function loadForecastPreview() {
  forecastLoading.value = true
  forecastError.value = ''
  try {
    const res: any = await stockApi.getProfitForecastList({
      page: 1,
      pageSize: 200,
      sortBy: 'net_profit_growth',
      sortOrder: 'desc',
    })
    const items: RawForecastItem[] = res?.['盈利预测列表'] || res?.list || res?.items || []
    if (!items.length) {
      forecastPreview.value = []
      return
    }

    // 按更新日期分组（日期降序排列）
    const grouped = new Map<string, RawForecastItem[]>()
    for (const item of items) {
      const date = getDateFromUpdateTime(item['更新时间'] || item.update_time || item.updateTime)
      if (!date) continue
      if (!grouped.has(date)) grouped.set(date, [])
      grouped.get(date)!.push(item)
    }

    // 日期降序排列
    const sortedDates = [...grouped.keys()].sort((a, b) => b.localeCompare(a))

    // 按日期顺序取数据：每组内按净利润增长降序，直到满3条
    const selected: RawForecastItem[] = []
    for (const date of sortedDates) {
      if (selected.length >= 3) break
      const dayItems = grouped.get(date)!
        .slice()
        .sort((a, b) => {
          const av = a['净利润同比(%)'] as number | undefined
          const bv = b['净利润同比(%)'] as number | undefined
          return (bv ?? -Infinity) - (av ?? -Infinity)
        })
      for (const item of dayItems) {
        if (selected.length >= 3) break
        selected.push(item)
      }
    }

    forecastPreview.value = selected.map(item => ({
      name: item['股票简称'] || item['股票代码'] || '--',
      label: `净利润预测 ${item['净利润预测'] || '--'}`,
      growth: formatGrowth(item['净利润同比(%)']),
    }))
  } catch {
    forecastPreview.value = []
    forecastError.value = '预测数据加载失败'
  } finally {
    forecastLoading.value = false
  }
}

function goTrendScore() {
  uni.navigateTo({ url: '/modules/analytics/pages/trend-score' })
}

function goHotBurst() {
  uni.navigateTo({ url: '/modules/market/pages/hot-burst' })
}

function goForecast() {
  uni.navigateTo({ url: '/modules/analytics/pages/forecast' })
}

onMounted(() => {
  loadHotBurstPreview()
  loadTrendScorePreview()
  loadForecastPreview()
})
</script>

<style lang="scss" scoped>
.stock-content {
  background: $bg-card;
}

.content-wrap {
  padding: $s-3;
}

/* ===== 股票搜索框 ===== */
.stock-search {
  position: relative; /* 悬浮结果菜单的定位基准 */
  z-index: 10;
  display: flex;
  align-items: center;
  gap: $s-2;
  height: 80rpx;
  padding: 0 $s-3;
  background: $bg-soft;
  border-radius: $r-full;
  margin-bottom: $s-3;
}

.stock-search__input {
  flex: 1;
  height: 100%;
  font-size: $font-size-sm;
  color: $ink;
}

/* ===== 实时搜索结果（悬浮快速菜单） ===== */
.search-result-list {
  position: absolute;
  top: calc(100% + 8rpx);
  left: 0;
  right: 0;
  z-index: 10;
  background: $bg-card;
  border-radius: $r-lg;
  padding: $s-1 0;
  box-shadow: $shadow-hover;
  overflow: hidden;
}

.search-result-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $s-2 $s-3;
  border-bottom: 1rpx solid $line-soft;

  &:last-child {
    border-bottom: none;
  }
}

.search-result-info {
  display: flex;
  align-items: center;
  gap: $s-2;
  min-width: 0;
}

.search-result-name {
  font-size: $font-size-md;
  color: $ink;
  font-weight: 600;
}

.search-result-code {
  font-size: $font-size-xs;
  color: $ink-mute;
}

.search-result-industry {
  font-size: $font-size-xs;
  color: $primary;
  background: $primary-50;
  padding: 2rpx 10rpx;
  border-radius: $r-full;
}

.search-result-arrow {
  font-size: $font-size-lg;
  color: $ink-faint;
}

.search-result-loading {
  padding: $s-3 0;
}

.search-result-empty {
  padding: $s-3 0;
  text-align: center;
}

.search-result-empty-text {
  font-size: $font-size-sm;
  color: $ink-mute;
}
</style>
