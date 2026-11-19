<template>
  <SubPageCard title="个股情报">
    <view class="event-catcher-content">
      <!-- 周期筛选 -->
      <view class="filter-bar">
        <Segmented :items="cycleTabs" v-model="activeCycle" fullWidth @change="onCycleChange" />
      </view>

      <!-- 股票筛选：就地下拉框（不跳页），视觉与交互同自选消息面板；未登录隐藏 -->
      <view v-if="loggedIn" class="stock-filter">
        <view class="stock-filter__bar" @tap="toggleStockPicker">
          <SvgIcon name="filter-3-line" size="26rpx" color="#8a94a6" />
          <text class="stock-filter__label">{{ stockFilterLabel }}</text>
          <SvgIcon
            name="arrow-down-s-line"
            size="26rpx"
            color="#8a94a6"
            :class="['stock-filter__caret', stockPickerOpen ? 'is-open' : '']"
          />
        </view>
        <view v-if="stockPickerOpen" class="stock-filter__dropdown">
          <scroll-view scroll-y class="stock-filter__options">
            <view
              v-for="option in stockOptions"
              :key="option.symbol || '__all__'"
              :class="['stock-option', selectedStockCode === option.symbol ? 'is-active' : '']"
              @tap="selectStock(option.symbol)"
            >
              <text class="stock-option__name">{{ option.name }}</text>
              <text v-if="option.symbol" class="stock-option__code">{{ option.symbol }}</text>
              <SvgIcon v-if="selectedStockCode === option.symbol" name="check-line" size="30rpx" color="#0b5fff" />
            </view>
          </scroll-view>
        </view>
      </view>
      <!-- 下拉展开时点击遮罩收起 -->
      <view v-if="stockPickerOpen" class="stock-filter__backdrop" @tap="closeStockPicker" />

      <!-- 加载中 -->
      <view v-if="loading && !events.length" class="loading">
        <LoadingState />
      </view>

      <!-- 事件列表 -->
      <view v-if="events.length" class="event-list">
        <Card
          v-for="evt in events"
          :key="evt.event_id"
          clickable
          @click="goStockDetail(evt.stock_code)"
        >
          <view class="event-top">
            <view class="event-stock">
              <text class="stock-name">{{ evt.stock_name }}</text>
              <text class="stock-code">{{ evt.stock_code }}</text>
              <text v-if="evt.industry" class="stock-industry">{{ evt.industry }}</text>
            </view>
            <Tag :type="impactTagType(evt.ai_impact)">{{ evt.ai_impact || '中性' }}</Tag>
          </view>
          <text class="event-title">{{ evt.title }}</text>
          <text v-if="evt.summary" class="event-summary">{{ evt.summary }}</text>
          <view v-if="evt.ai_keywords && evt.ai_keywords.length" class="keyword-row">
            <Tag
              v-for="(kw, idx) in evt.ai_keywords.slice(0, 4)"
              :key="idx"
              size="sm"
            >{{ kw }}</Tag>
          </view>
          <view class="event-bottom">
            <view class="meta-left">
              <Badge :type="cycleBadgeType(evt.cycle)">{{ evt.cycle }}</Badge>
              <text class="meta-text">{{ evt.change_type_name || evt.info_type }}</text>
            </view>
            <view class="meta-right">
              <Button size="sm" @click.stop="goAlertAnalysis(evt.stock_code, evt.cycle)">AI解读</Button>
              <text class="meta-time">{{ formatTime(evt.event_time) }}</text>
            </view>
          </view>
        </Card>
        <Button v-if="hasMore" type="ghost" size="sm" @click="loadMore">
          {{ loadingMore ? '加载中...' : '加载更多' }}
        </Button>
      </view>

      <!-- 空状态（API 无数据/失败均不展示 mock） -->
      <EmptyState
        v-if="!loading && !events.length"
        title="暂无情报"
        :description="emptyDescription"
      >
        <!-- 股票筛选下空态：提供快捷清除筛选，避免误读为整体无数据 -->
        <Button v-if="selectedStockCode && !apiFailed" type="ghost" size="sm" @click="clearStockFilter">查看全部</Button>
      </EmptyState>
    </view>
  </SubPageCard>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { stockApi } from '@/shared/api/modules/stock'
import { useUserStore } from '@/shared/store/modules/user'
import { storage, STORAGE_KEYS } from '@/shared/utils/storage'
import SubPageCard from '@/shared/components/SubPageCard.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import { LoadingState, Tag, Badge, Button, Card, Segmented, EmptyState } from '@/shared/components'

interface TrendEvent {
  event_id: string
  symbol: string
  stock_code: string
  stock_name: string
  industry?: string
  change_type?: string
  change_type_name?: string
  level?: string
  cycle: string
  event_time: string
  title: string
  summary?: string
  detail_url?: string
  info_type?: string
  ai_impact?: string
  ai_horizon?: string
  ai_keywords?: string[]
  source?: string
}

const cycleTabs = [
  { label: '全部', value: 'all' },
  { label: '短期', value: 'short' },
  { label: '中期', value: 'mid' },
  { label: '长期', value: 'long' },
]

const loading = ref(false)
const loadingMore = ref(false)
const events = ref<TrendEvent[]>([])
const activeCycle = ref('all')
const total = ref(0)
const page = ref(0)
const pageSize = 20
/** API 是否调用失败（仅失败时才用 mock 兜底，空数据不兜底） */
const apiFailed = ref(false)

const userStore = useUserStore()
const loggedIn = computed(() => userStore.isLoggedIn())

// ── 股票筛选（仅登录后可用）──────────────────────────────────
/** 当前筛选的股票代码；空串 = 全部股票（持久化，下次进入恢复） */
const selectedStockCode = ref<string>(storage.get<string>(STORAGE_KEYS.STOCK_INTEL_STOCK_FILTER) || '')
const stockPickerOpen = ref(false)
/** 自选股选项（页面无自选股数据源，进入时下拉自选股接口获取） */
const favoriteStocks = ref<Array<{ symbol: string; name: string }>>([])
/** 自选股是否已成功拉取：失败时只显示「全部股票」，且不据此判定筛选是否失效 */
const favoritesReady = ref(false)
let favoritesRequest: Promise<void> | null = null

/** 下拉选项：首项「全部股票」+ 每只自选股 */
const stockOptions = computed(() => [
  { symbol: '', name: '全部股票' },
  ...favoriteStocks.value,
])

/** 入口展示的当前选择（全部股票 / 名称 代码） */
const stockFilterLabel = computed(() => {
  if (!selectedStockCode.value) return '全部股票'
  const matched = favoriteStocks.value.find(item => item.symbol === selectedStockCode.value)
  return matched ? `${matched.name} ${matched.symbol}` : selectedStockCode.value
})

/** 空态文案随「股票筛选」与周期变化，避免筛选中误读为整体无资讯 */
const emptyDescription = computed(() => {
  if (apiFailed.value) return '情报加载失败，请稍后重试'
  if (selectedStockCode.value) return '该股票暂无相关资讯'
  return activeCycle.value === 'all' ? '当前暂无情报数据' : '该周期暂无情报数据'
})

/** 拉取自选股选项（并发去重；force 用于 onShow 校正时刷新；失败静默降级为仅「全部股票」） */
function loadFavoriteStocks(force = false): Promise<void> {
  if (!force && favoritesReady.value) return Promise.resolve()
  if (favoritesRequest) return favoritesRequest
  favoritesRequest = (async () => {
    try {
      const list = await stockApi.getFavorites()
      favoriteStocks.value = list.map(item => ({ symbol: item.symbol, name: item.name }))
      favoritesReady.value = true
    } catch {
      // 失败时下拉只保留「全部股票」，并标记未就绪（下次展开/进入重试；不据此清空用户的筛选）
      favoriteStocks.value = []
      favoritesReady.value = false
    } finally {
      favoritesRequest = null
    }
  })()
  return favoritesRequest
}

/** 从本地存储恢复上次选择（其它页面/端可能已改写） */
function restoreStockFilter() {
  selectedStockCode.value = storage.get<string>(STORAGE_KEYS.STOCK_INTEL_STOCK_FILTER) || ''
}

/** 校正持久化筛选：代码已不在自选股列表中 → 回退「全部股票」并重拉 */
async function validateStockFilter(force = false) {
  if (!loggedIn.value) return
  await loadFavoriteStocks(force)
  // 拉取失败时无法判断，保留用户选择（下拉仍只显示「全部股票」）
  if (!favoritesReady.value || !selectedStockCode.value) return
  if (favoriteStocks.value.some(item => item.symbol === selectedStockCode.value)) return
  applyStockFilter('')
  await loadEvents(false)
}

/** 写状态 + 持久化（分页重置由 loadEvents(false) 完成） */
function applyStockFilter(symbol: string) {
  selectedStockCode.value = symbol
  storage.set(STORAGE_KEYS.STOCK_INTEL_STOCK_FILTER, symbol)
}

/** 就地展开/收起股票下拉（展开时静默补拉自选股） */
function toggleStockPicker() {
  stockPickerOpen.value = !stockPickerOpen.value
  if (stockPickerOpen.value) void loadFavoriteStocks()
}

function closeStockPicker() {
  stockPickerOpen.value = false
}

/** 选择股票：持久化 + 重置分页重拉 */
function selectStock(symbol: string) {
  stockPickerOpen.value = false
  if (selectedStockCode.value === symbol) return
  applyStockFilter(symbol)
  void loadEvents(false)
}

/** 空态「查看全部」：清除股票筛选并恢复全部资讯 */
function clearStockFilter() {
  stockPickerOpen.value = false
  if (!selectedStockCode.value) return
  applyStockFilter('')
  void loadEvents(false)
}

const hasMore = computed(() => events.value.length < total.value)

/** 请求序号：筛选/周期切换会并发触发重拉，晚到的旧响应不得覆盖新结果 */
let loadSeq = 0

async function loadEvents(append = false) {
  const seq = ++loadSeq
  if (!append) {
    loading.value = true
    page.value = 0
  } else {
    loadingMore.value = true
  }
  try {
    const offset = page.value * pageSize
    // 登录后仅展示自选股资讯（/favorites/news 按 user_stocks 过滤，stock_code 为股票筛选）；
    // 未登录展示全市场，且不携带股票筛选（筛选条此时不展示）
    const res: any = loggedIn.value
      ? await stockApi.getFavoritesNews({
          cycle: activeCycle.value,
          limit: pageSize,
          offset,
          stock_code: selectedStockCode.value || undefined,
        })
      : await stockApi.getTrendEvents({
          cycle: activeCycle.value,
          limit: pageSize,
          offset,
        })
    if (seq !== loadSeq) return
    const rawList = res?.events || res?.data?.events || []
    // 过滤中性消息：仅保留利好/利空事件（登录前后行为一致）
    const list = rawList.filter((evt: Record<string, unknown>) => {
      const impact = String(evt?.ai_impact ?? '')
      return impact.includes('利好') || impact.includes('利空')
    })
    total.value = res?.total || res?.data?.total || 0
    if (append) {
      events.value = [...events.value, ...list]
    } else {
      events.value = list
    }
    if (list.length) page.value++
    apiFailed.value = false
  } catch (err) {
    if (seq !== loadSeq) return
    if (!append) events.value = []
    apiFailed.value = true
  } finally {
    if (seq === loadSeq) {
      loading.value = false
      loadingMore.value = false
    }
  }
}

/** 切换周期：保留当前股票筛选（selectedStockCode 不变），loadEvents(false) 内部重置分页 offset */
function onCycleChange() {
  loadEvents(false)
}

function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  loadEvents(true)
}

function impactTagType(impact?: string): 'up' | 'down' | 'neutral' {
  if (!impact) return 'neutral'
  if (impact.includes('重大利好') || impact.includes('利好')) return 'up'
  if (impact.includes('重大利空') || impact.includes('利空')) return 'down'
  return 'neutral'
}

function cycleBadgeType(cycle?: string): 'danger' | 'warning' | 'success' | 'info' {
  switch (cycle) {
    case 'short': return 'danger'
    case 'mid': return 'warning'
    case 'long': return 'success'
    default: return 'info'
  }
}

function formatTime(t?: string): string {
  if (!t) return ''
  const d = new Date(t)
  if (isNaN(d.getTime())) return t.replace('T', ' ').slice(0, 16)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  if (sameDay) return `${hh}:${mm}`
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${mo}-${dd} ${hh}:${mm}`
}

function goStockDetail(symbol: string) {
  if (!symbol) return
  uni.navigateTo({ url: `/modules/favorites/pages/detail?symbol=${symbol}` })
}

function goAlertAnalysis(symbol: string, cycle: string) {
  if (!symbol) return
  uni.navigateTo({ url: `/modules/market/pages/alert-analysis?symbol=${symbol}&cycle=${cycle}` })
}

onShow(() => {
  // 每次进入先恢复持久化的股票筛选；登录后用最新自选股校正该代码是否仍在列表中
  restoreStockFilter()
  if (loggedIn.value) void validateStockFilter(true)
  loadEvents(false)
})
</script>

<style lang="scss" scoped>
.event-catcher-content {
  padding: 0 24rpx 24rpx;
}

/* 周期筛选 */
.filter-bar {
  margin-bottom: 24rpx;
}

/* 股票筛选入口 + 就地下拉（视觉/交互对齐自选消息面板 notification-stockbar） */
.stock-filter {
  position: relative;
  z-index: 3;
  margin-bottom: 24rpx;
}

.stock-filter__bar {
  display: flex;
  align-items: center;
  gap: $s-2;
  padding: $s-2 $s-3;
  border-bottom: 2rpx solid $line-soft;
  background: $bg-soft;
}

.stock-filter__label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: $ink-soft;
  font-size: $font-size-xs;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stock-filter__caret {
  transition: transform 0.2s;
}

.stock-filter__caret.is-open {
  transform: rotate(180deg);
}

.stock-filter__dropdown {
  position: absolute;
  z-index: 3;
  top: 100%;
  left: 0;
  right: 0;
  overflow: hidden;
  border: 2rpx solid $line;
  border-top: none;
  border-radius: 0 0 $r-lg $r-lg;
  background: $bg-card;
  box-shadow: $shadow-card;
}

.stock-filter__options {
  max-height: 44vh;
}

/* 下拉展开时的透明遮罩：点击列表等空白区域收起（层级低于下拉、高于列表） */
.stock-filter__backdrop {
  position: fixed;
  z-index: 2;
  inset: 0;
}

.stock-option {
  display: flex;
  align-items: center;
  gap: $s-2;
  padding: $s-2 $s-3;
  border-bottom: 2rpx solid $line-soft;
}

.stock-option.is-active {
  background: $primary-50;
}

.stock-option__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: $ink;
  font-size: $font-size-sm;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stock-option.is-active .stock-option__name {
  color: $primary;
  font-weight: 600;
}

.stock-option__code {
  color: $ink-mute;
  font-size: $font-size-xs;
}

/* 加载状态 */
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 0;
  gap: 16rpx;
}

/* 事件列表 */
.event-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.event-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.event-stock {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex: 1;
  overflow: hidden;
}

.stock-name {
  font-size: 30rpx;
  font-weight: 600;
  color: $ink;
}

.stock-code {
  font-size: 22rpx;
  color: $ink-soft;
  padding: 2rpx 12rpx;
  background: #f0f2f5;
  border-radius: 8rpx;
}

.stock-industry {
  font-size: 22rpx;
  color: $primary;
  padding: 2rpx 12rpx;
  background: rgba(77, 124, 254, 0.08);
  border-radius: 8rpx;
}

.event-title {
  font-size: 28rpx;
  font-weight: 500;
  color: $ink;
  line-height: 1.5;
  display: block;
  margin-bottom: 12rpx;
}

.event-summary {
  font-size: 26rpx;
  color: $ink-soft;
  line-height: 1.6;
  display: block;
  margin-bottom: 16rpx;
}

.keyword-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-bottom: 16rpx;
}

.event-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16rpx;
  border-top: 1rpx solid #f0f2f5;
}

.meta-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.meta-text {
  font-size: 22rpx;
  color: #9ca3af;
}

.meta-time {
  font-size: 22rpx;
  color: #9ca3af;
}

.meta-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
</style>
