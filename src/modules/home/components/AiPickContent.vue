<template>
  <view class="ai-pick">
    <view class="filter-panel">
    <view class="filter-heading">
      <text class="filter-title">设置选股策略</text>
      <view class="filter-meta">
        <text v-if="selectedHorizon === 'ai'">当前：{{ currentHorizonName }}</text>
        <text v-if="currentMethods.length">方法可多选</text>
      </view>
    </view>
    <view class="horizon-track">
      <view
        v-for="option in horizons"
        :key="option.code"
        :class="['horizon-chip', { active: selectedHorizon === option.code }]"
        @tap="selectHorizon(option.code)"
      >
        <text>{{ option.name }}</text>
        <view class="horizon-mark"></view>
      </view>
    </view>
    <scroll-view v-if="currentMethods.length" class="method-scroll" scroll-x :show-scrollbar="false">
      <view class="method-row">
        <view
          v-for="method in currentMethods"
          :key="method.code"
          :class="['method-chip', { active: selectedMethods.includes(method.code) }]"
          @tap="toggleMethod(method.code)"
        >
          <text>{{ method.name }}</text>
          <view v-if="selectedMethods.includes(method.code)" class="method-remove" aria-label="再次点击取消选择">
            <SvgIcon name="close-line" size="18rpx" color="currentColor" />
          </view>
        </view>
      </view>
    </scroll-view>
    </view>

    <view class="ai-pick-list">
      <view v-if="selectedHorizon !== 'ai' || pageState !== 'ready'" class="ai-pick-state">
        {{ stateText }}
      </view>
      <template v-else>
        <view v-for="item in recommendations" :key="item.symbol" class="ai-pick-row" @tap="openDetail(item.symbol)">
          <view class="stock-summary">
            <view class="stock-info">
              <view class="stock-title-line">
                <view class="stock-name">{{ item.name }}</view>
                <view class="stock-symbol">{{ item.symbol }}</view>
                <view :class="['favorite-button', { added: favoritesStore.isFavorite(item.symbol), disabled: favoritesStore.isPending(item.symbol) }]" @tap.stop="toggleFavorite(item)"><text>{{ favoritesStore.isFavorite(item.symbol) ? '✓' : '＋' }}</text></view>
              </view>
              <view class="market-line">
                <view class="stock-price" :class="(item.changePct ?? 0) < 0 ? 'is-down' : 'is-up'">{{ formatPrice(item.price) }}</view>
                <view class="stock-change" :class="(item.changePct ?? 0) < 0 ? 'is-down' : 'is-up'">{{ formatChange(item.changePct) }}</view>
              </view>
            </view>
            <svg v-if="item.sparkline.length > 1" class="mini-chart" viewBox="0 0 120 64" preserveAspectRatio="none">
              <polyline :points="sparklinePoints(item.sparkline)" fill="none" :stroke="(item.changePct ?? 0) < 0 ? '#22a65a' : '#ff4057'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              <line x1="0" y1="62" x2="120" y2="62" stroke="#edf0f5" stroke-width="1" />
            </svg>
          </view>
          <view class="reason-line" @tap.stop="toggleReason(item.symbol, item.reason)">
            <view class="reason-label">推荐理由</view>
            <view v-if="selectedMethods.length > 1 && item.matchedTags.length" class="match-tags">
              <text v-for="tag in item.matchedTags" :key="tag" class="match-tag">{{ tag }}</text>
            </view>
            <view :class="['reason-text', { expanded: isReasonExpanded(item.symbol) }]">{{ item.reason }}</view>
            <view v-if="isLongReason(item.reason)" class="reason-toggle"><text>{{ isReasonExpanded(item.symbol) ? '⌃' : '⌄' }}</text></view>
          </view>
        </view>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { aiStockSelectionApi, type AiStockSelectionItem } from '@/shared/api/modules/ai-stock-selection'
import { useFavoritesStore } from '@/shared/store'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import { horizons, methodsByHorizon, legacyMethodCodes, type HorizonCode } from './aiPickStrategies'

type Recommendation = Omit<AiStockSelectionItem, 'reason' | 'sparkline'> & { reason: string; sparkline: number[]; matchedTags: string[] }
const STRATEGY_PREFERENCE_KEY = 'ai_stock_selection_strategy_preference'
const favoritesStore = useFavoritesStore()
const pageState = ref<'loading' | 'generating' | 'ready' | 'empty' | 'failed'>('loading')
const items = ref<AiStockSelectionItem[]>([])
const expandedReasons = ref<Set<string>>(new Set())
const selectedHorizon = ref<HorizonCode>('ai')
const selectedMethods = ref<string[]>([])

const currentMethods = computed(() => selectedHorizon.value === 'ai' ? [] : methodsByHorizon[selectedHorizon.value])
const currentHorizonName = computed(() => horizons.find((option) => option.code === selectedHorizon.value)?.name || 'AI综合')

function methodCodes(horizon: HorizonCode): string[] {
  return horizon === 'ai' ? [] : methodsByHorizon[horizon].map((method) => method.code)
}

function defaultMethods(horizon: HorizonCode): string[] {
  const codes = methodCodes(horizon)
  return codes.length ? [codes[0]] : []
}

function persistPreference() {
  uni.setStorageSync?.(STRATEGY_PREFERENCE_KEY, {
    v: 3,
    horizon: selectedHorizon.value,
    methods: selectedMethods.value,
  })
}

function restorePreference() {
  const stored = uni.getStorageSync?.(STRATEGY_PREFERENCE_KEY) as { v?: number; horizon?: string; methods?: string[]; method?: string } | '' | null
  if (!stored || typeof stored !== 'object') return
  const horizon = horizons.find((item) => item.code === stored.horizon)?.code
  if (!horizon) return
  selectedHorizon.value = horizon
  if (stored.v !== 2 && stored.v !== 3) {
    selectedMethods.value = defaultMethods(horizon)
    return
  }
  const allowed = new Set(methodCodes(horizon))
  const requested = Array.isArray(stored.methods) ? stored.methods : stored.method ? [stored.method] : []
  const migrated = stored.v === 2 ? requested.map((code) => legacyMethodCodes[code] || code) : requested
  const picked = [...new Set(migrated.filter((code) => allowed.has(code)))]
  selectedMethods.value = Array.isArray(stored.methods) ? picked : picked.length ? picked : defaultMethods(horizon)
}

function selectHorizon(code: HorizonCode) {
  if (selectedHorizon.value === code) return
  selectedHorizon.value = code
  selectedMethods.value = defaultMethods(code)
  persistPreference()
}

function toggleMethod(code: string) {
  if (!selectedMethods.value.includes(code)) {
    selectedMethods.value = [...selectedMethods.value, code]
    persistPreference()
    return
  }
  selectedMethods.value = selectedMethods.value.filter((item) => item !== code)
  persistPreference()
}

function byChangePctDesc(left: Recommendation, right: Recommendation): number {
  const leftChange = left.changePct ?? Number.NEGATIVE_INFINITY
  const rightChange = right.changePct ?? Number.NEGATIVE_INFINITY
  if (leftChange === rightChange) return 0
  return rightChange > leftChange ? 1 : -1
}

const recommendations = computed<Recommendation[]>(() => {
  if (selectedHorizon.value !== 'ai') return []
  const rows = items.value.map((item) => ({
    ...item,
    reason: item.reason.filter(Boolean).join('；') || '暂无推荐理由',
    sparkline: item.sparkline || [],
    matchedTags: [] as string[],
  }))
  return rows.sort(byChangePctDesc)
})
const stateText = computed(() => {
  if (selectedHorizon.value !== 'ai') {
    return selectedMethods.value.length ? '暂无所选方法的选股结果' : '请选择选股方法'
  }
  return ({
  loading: '正在加载 AI 选股结果…',
  generating: '今日 AI 选股正在生成，请稍后查看。',
  empty: '暂无 AI 选股结果，等待每日定时任务生成。',
  failed: '今日 AI 选股生成失败，暂无 AI 选股结果。',
  ready: '',
  }[pageState.value])
})

function formatPrice(value?: number | null): string { return value == null ? '--' : Number(value).toFixed(2) }
function formatChange(value?: number | null): string {
  if (value == null) return '--'
  return `${value > 0 ? '+' : ''}${Number(value).toFixed(2)}%`
}
function isLongReason(reason: string): boolean { return reason.length > 34 }
function isReasonExpanded(symbol: string): boolean { return expandedReasons.value.has(symbol) }
function toggleReason(symbol: string, reason: string) {
  if (!isLongReason(reason)) return
  const next = new Set(expandedReasons.value)
  if (next.has(symbol)) next.delete(symbol)
  else next.add(symbol)
  expandedReasons.value = next
}
/** 将服务端真实收盘价序列映射为 SVG 坐标；不补造任何行情点。 */
function sparklinePoints(values: number[]): string {
  const valid = values.filter((value) => Number.isFinite(value))
  if (valid.length < 2) return ''
  const min = Math.min(...valid)
  const max = Math.max(...valid)
  const range = max - min || 1
  return valid.map((value, index) => {
    const x = (index / (valid.length - 1)) * 118 + 1
    const y = 58 - ((value - min) / range) * 52
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
}
async function loadSelection() {
  pageState.value = 'loading'
  try {
    const result = await aiStockSelectionApi.getLatest()
    items.value = result.stocks || []
    pageState.value = result.status === 'ready' && items.value.length ? 'ready' : result.status === 'generating' ? 'generating' : result.status === 'failed' ? 'failed' : 'empty'
  } catch (error) {
    const code = (error as { code?: number; statusCode?: number }).code ?? (error as { statusCode?: number }).statusCode
    pageState.value = code === 404 ? 'empty' : 'failed'
  }
}
restorePreference()
onMounted(loadSelection)
function openDetail(symbol: string) { uni.navigateTo({ url: `/modules/favorites/pages/detail?symbol=${symbol}` }) }
async function toggleFavorite(item: Recommendation) {
  if (favoritesStore.isPending(item.symbol)) return
  if (favoritesStore.isFavorite(item.symbol)) {
    const removed = await favoritesStore.remove(item.symbol)
    if (removed) uni.showToast({ title: '已移除自选', icon: 'none' })
    return
  }
  const added = await favoritesStore.add(item.symbol, item.name)
  if (added) uni.showToast({ title: '已加入自选', icon: 'success' })
}
</script>

<style lang="scss" scoped>
.ai-pick { display: flex; flex-direction: column; gap: $s-3; }
.filter-panel { padding: 20rpx 16rpx 16rpx; border: 1rpx solid $line; border-radius: $r-lg; background: $bg-soft; }
.filter-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: $s-2; margin-bottom: $s-3; }
.filter-title { flex-shrink: 0; color: $ink; font-size: $font-size-sm; font-weight: 600; line-height: 1.5; }
.filter-meta { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: $s-1 $s-2; color: $ink-soft; font-size: $font-size-xs; line-height: 1.5; }
.horizon-track { display: flex; align-items: flex-end; border-bottom: 2rpx solid $line-strong; }
.horizon-chip { position: relative; flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; padding: 4rpx 0 $s-2; color: $ink-mute; font-size: 24rpx; font-weight: 600; line-height: 1.2; }
.horizon-chip.active { color: $ink; font-weight: 750; }
.horizon-mark { position: absolute; right: 0; bottom: -2rpx; left: 0; height: 4rpx; background: transparent; }
.horizon-chip.active .horizon-mark { background: $ink-soft; }
.method-scroll { width: 100%; margin-top: 8rpx; white-space: nowrap; }
.method-row { display: inline-flex; gap: 8rpx; padding: $s-1 4rpx 0 0; }
.method-chip { position: relative; flex: 0 0 auto; padding: 8rpx 16rpx; border: 2rpx dashed $ink-mute; border-radius: $r-full; background: $bg-card; color: $ink-soft; font-size: 22rpx; line-height: 1.3; }
.method-chip.active { border-style: solid; border-color: $primary; background: $primary-50; color: $primary; font-weight: 700; }
.method-remove { position: absolute; top: -8rpx; right: -4rpx; display: flex; align-items: center; justify-content: center; width: 22rpx; height: 22rpx; border: 1rpx solid $primary; border-radius: $r-full; background: $bg-card; color: $primary; }
.ai-pick-list { display: flex; flex-direction: column; gap: $s-2; background: $bg-card; }
.ai-pick-state { padding: 56rpx 24rpx; color: $ink-soft; font-size: 25rpx; text-align: center; }
.ai-pick-row { box-sizing: border-box; padding: $s-3; border: 1rpx solid $line; border-radius: $r-lg; background: $bg-card; box-shadow: $shadow-sm; }
.stock-summary { display: flex; align-items: center; justify-content: space-between; min-height: 108rpx; }
.stock-info { flex: 1; min-width: 0; padding-right: $s-1; }
.stock-title-line { display: flex !important; align-items: center; gap: 10rpx; min-height: 34rpx; white-space: nowrap; }
.stock-name, .stock-symbol, .stock-price, .stock-change, .favorite-button { display: block; flex: 0 0 auto; }
.stock-name { max-width: 160rpx; overflow: hidden; color: #111827; font-size: 28rpx; font-weight: 700; line-height: 34rpx; text-overflow: ellipsis; }
.stock-symbol { padding: 3rpx 9rpx; border-radius: $r-xs; color: $ink-mute; background: $bg-soft; font-size: 19rpx; line-height: 1.25; }
.market-line { display: flex; align-items: baseline; gap: 12rpx; margin-top: 9rpx; }
.stock-price { font-size: 34rpx; font-weight: 750; line-height: 40rpx; }
.stock-change { font-size: 23rpx; font-weight: 600; }
.stock-price.is-up, .stock-change.is-up { color: $up; }
.stock-price.is-down, .stock-change.is-down { color: $down; }
.match-tags { display: flex; flex: 0 0 auto; gap: 6rpx; margin-top: 2rpx; }
.match-tag { color: $ink-mute; font-size: 20rpx; line-height: 1.3; }
.favorite-button { width: 26rpx; height: 26rpx; border: 2rpx solid $primary; border-radius: $r-full; background: $primary-50; text-align: center; line-height: 23rpx; }
.favorite-button text { color: $primary; font-size: 22rpx; font-weight: 650; }
.favorite-button.added { border-color: $primary; background: $primary; }
.favorite-button.added text { color: #fff; }
.favorite-button.disabled { opacity: .5; }
.mini-chart { width: 280rpx; height: 78rpx; flex: 0 0 280rpx; }
.mini-chart polyline { vector-effect: non-scaling-stroke; }
.reason-line { display: flex !important; align-items: flex-start; gap: 6rpx; padding-top: $s-2; border-top: 1rpx solid $line-soft; }
.reason-label { display: block; flex: 0 0 auto; margin-top: 1rpx; padding: 3rpx 7rpx; color: $primary; background: $primary-50; font-size: 20rpx; line-height: 1.25; }
.reason-text { display: -webkit-box; overflow: hidden; flex: 1; color: $ink-soft; font-size: 22rpx; line-height: 1.5; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.reason-text.expanded { display: block; overflow: visible; }
.reason-toggle { width: 26rpx; flex: 0 0 26rpx; margin-top: 2rpx; color: $ink-soft; font-size: 24rpx; line-height: 30rpx; text-align: center; }
</style>
