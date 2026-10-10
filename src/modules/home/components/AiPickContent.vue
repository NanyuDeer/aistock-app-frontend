<template>
  <view class="ai-pick-list">
    <view v-if="pageState !== 'ready'" class="ai-pick-state">
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
        <view :class="['reason-text', { expanded: isReasonExpanded(item.symbol) }]">{{ item.reason }}</view>
        <view v-if="isLongReason(item.reason)" class="reason-toggle"><text>{{ isReasonExpanded(item.symbol) ? '⌃' : '⌄' }}</text></view>
      </view>
    </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { aiStockSelectionApi, type AiStockSelectionItem } from '@/shared/api/modules/ai-stock-selection'
import { useFavoritesStore } from '@/shared/store'

type Recommendation = Omit<AiStockSelectionItem, 'reason' | 'sparkline'> & { reason: string; sparkline: number[] }
const favoritesStore = useFavoritesStore()
const pageState = ref<'loading' | 'generating' | 'ready' | 'empty' | 'failed'>('loading')
const items = ref<AiStockSelectionItem[]>([])
const expandedReasons = ref<Set<string>>(new Set())
const recommendations = computed<Recommendation[]>(() => items.value.map((item) => ({
  ...item,
  reason: item.reason.filter(Boolean).join('；') || '暂无推荐理由',
  sparkline: item.sparkline || [],
})))
const stateText = computed(() => ({
  loading: '正在加载 AI 选股结果…',
  generating: '今日 AI 选股正在生成，请稍后查看。',
  empty: '暂无 AI 选股结果，等待每日定时任务生成。',
  failed: '今日 AI 选股生成失败，暂无 AI 选股结果。',
  ready: '',
}[pageState.value]))

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
onMounted(loadSelection)
function openDetail(symbol: string) { uni.navigateTo({ url: `/modules/favorites/pages/detail?symbol=${symbol}` }) }
async function toggleFavorite(item: Recommendation) {
  if (favoritesStore.isPending(item.symbol)) return
  // 已自选 → 取消；未自选 → 加入（同一按钮双向切换）
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
.ai-pick-list{display:flex;flex-direction:column;gap:$s-2;background:$bg-card}.ai-pick-state{padding:56rpx 24rpx;color:$ink-soft;font-size:25rpx;text-align:center}.ai-pick-row{box-sizing:border-box;padding:$s-3;border:1rpx solid $line;border-radius:$r-lg;background:$bg-card;box-shadow:$shadow-sm}.stock-summary{display:flex;align-items:center;justify-content:space-between;min-height:108rpx}.stock-info{flex:1;min-width:0;padding-right:$s-1}.stock-title-line{display:flex!important;align-items:center;gap:10rpx;min-height:34rpx;white-space:nowrap}.stock-name,.stock-symbol,.stock-price,.stock-change,.favorite-button{display:block;flex:0 0 auto}.stock-name{max-width:160rpx;overflow:hidden;color:#111827;font-size:28rpx;font-weight:700;line-height:34rpx;text-overflow:ellipsis}.stock-symbol{padding:3rpx 9rpx;border-radius:$r-xs;color:$ink-mute;background:$bg-soft;font-size:19rpx;line-height:1.25}.market-line{display:flex;align-items:baseline;gap:12rpx;margin-top:9rpx}.stock-price{font-size:34rpx;font-weight:750;line-height:40rpx}.stock-change{font-size:23rpx;font-weight:600}.stock-price.is-up,.stock-change.is-up{color:$up}.stock-price.is-down,.stock-change.is-down{color:$down}.favorite-button{width:26rpx;height:26rpx;border:2rpx solid $primary;border-radius:$r-full;background:$primary-50;text-align:center;line-height:23rpx}.favorite-button text{color:$primary;font-size:22rpx;font-weight:650}.favorite-button.added{border-color:$primary;background:$primary}.favorite-button.added text{color:#fff}.favorite-button.disabled{opacity:.5}.mini-chart{width:280rpx;height:78rpx;flex:0 0 280rpx}.mini-chart polyline{vector-effect:non-scaling-stroke}.reason-line{display:flex!important;align-items:flex-start;gap:6rpx;padding-top:$s-2;border-top:1rpx solid $line-soft}.reason-label{display:block;flex:0 0 auto;margin-top:1rpx;padding:3rpx 7rpx;color:$primary;background:$primary-50;font-size:20rpx;line-height:1.25}.reason-text{display:-webkit-box;overflow:hidden;flex:1;color:$ink-soft;font-size:22rpx;line-height:1.5;-webkit-box-orient:vertical;-webkit-line-clamp:2}.reason-text.expanded{display:block;overflow:visible}.reason-toggle{width:26rpx;flex:0 0 26rpx;margin-top:2rpx;color:$ink-soft;font-size:24rpx;line-height:30rpx;text-align:center}
</style>
