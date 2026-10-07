<template>
  <view class="hot-insight">
    <view v-if="signals.length" class="stats-bar"><text class="stats-text">共 {{ signals.length }} 只热门股</text><view class="stats-right"><view class="podcast-action" @tap="openPodcast"><SvgIcon name="broadcast-line" size="30rpx" color="#0b5fff" /></view><text class="stats-time">近三天</text></view></view>
    <view v-if="signals.length" class="signal-list"><view v-for="(sig, idx) in signals.slice(0, 5)" :key="`${sig.symbol}-${sig.detectedAt || idx}`" class="signal-card" @tap="goStockDetail(sig.symbol)"><view class="signal-top"><view class="signal-stock"><view class="stock-name-row"><text class="stock-name">{{ sig.stockName || sig.symbol }}</text><Tag :type="levelTagType(sig.resonanceLevel)">{{ levelLabel(sig.resonanceLevel) }}</Tag><Tag v-if="sig.sectorInfo || sig.thsSectorName">{{ sig.sectorInfo || sig.thsSectorName }}</Tag></view><text class="stock-code">{{ sig.symbol }}</text></view><view class="signal-quote"><text v-if="sig.price != null" class="price-val">{{ Number(sig.price).toFixed(2) }}</text><text v-if="sig.changePct != null" :class="['change-val', (sig.changePct ?? 0) >= 0 ? 'up' : 'down']">{{ (sig.changePct ?? 0) >= 0 ? '+' : '' }}{{ Number(sig.changePct).toFixed(2) }}%</text></view></view><view v-if="visibleTriggerTags(sig).length" class="signal-tags"><Tag v-for="tag in visibleTriggerTags(sig)" :key="tag" size="sm">{{ tag }}</Tag></view></view><view v-if="signals.length > 5" class="view-all" @tap="goAll">查看全部 <text>›</text></view></view>
    <EmptyState v-else title="暂无机构推荐热门股数据" description="数据更新后将自动显示" />
  </view>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { stockApi, type HotBurstSignal } from '@/shared/api/modules/stock'
import { EmptyState, Tag } from '@/shared/components'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import { useReportPodcast } from '@/shared/utils/useReportPodcast'
const { loadPodcast, openPodcast: showPodcast } = useReportPodcast('hot_burst')
const signals = ref<HotBurstSignal[]>([])
function visibleTriggerTags(signal: HotBurstSignal) { const sector = (signal.sectorInfo || signal.thsSectorName || '').trim(); return (signal.triggerTags || []).filter(tag => tag && tag.trim() !== sector).slice(0, 3) }
function levelLabel(level: HotBurstSignal['resonanceLevel']) { const labels: Record<NonNullable<HotBurstSignal['resonanceLevel']>, string> = { critical: '极高', high: '高', medium: '中', low: '低' }; return labels[level || 'low'] }
function levelTagType(level: HotBurstSignal['resonanceLevel']): 'warning' | 'up' | 'neutral' | 'down' { if (level === 'critical') return 'warning'; if (level === 'high') return 'up'; if (level === 'medium') return 'neutral'; return 'down' }
function sortByChangePct(items: HotBurstSignal[]) { return [...items].sort((a, b) => (b.changePct ?? Number.NEGATIVE_INFINITY) - (a.changePct ?? Number.NEGATIVE_INFINITY)) }
function dedupeBySymbol(items: HotBurstSignal[]) { const seen = new Set<string>(); return items.filter((item) => { const symbol = item.symbol?.trim(); if (!symbol) return true; if (seen.has(symbol)) return false; seen.add(symbol); return true }) }
async function loadData() { try { signals.value = dedupeBySymbol(sortByChangePct(await stockApi.getHotBurstHistory({ days: 3, min_resonance: 2 }))) } catch { signals.value = [] } }
function goStockDetail(symbol: string) { if (symbol) uni.navigateTo({ url: `/modules/favorites/pages/detail?symbol=${symbol}` }) }
function goAll() { uni.navigateTo({ url: '/modules/market/pages/hot-burst' }) }
function openPodcast() { showPodcast('机构调研播报') }
onMounted(() => { void loadData(); void loadPodcast() })
</script>
<style lang="scss" scoped>
.hot-insight{padding:0}.stats-bar,.stats-right{display:flex;align-items:center}.stats-bar{justify-content:space-between;margin:24rpx 0}.stats-right{gap:8rpx}.stats-text{font-size:26rpx;color:$ink;font-weight:500}.podcast-action{width:44rpx;height:44rpx;display:flex;align-items:center;justify-content:center}.stats-time{font-size:22rpx;color:#9ca3af}.signal-list{display:flex;flex-direction:column;gap:20rpx}.signal-card{background:$bg-card;border:2rpx solid $line;border-left:6rpx solid $line-strong;border-radius:$r-lg;padding:24rpx 28rpx 20rpx;box-shadow:$shadow-sm}.signal-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:12rpx}.signal-stock{display:flex;flex-direction:column;gap:4rpx}.stock-name-row{display:flex;align-items:center;flex-wrap:wrap;gap:12rpx}.stock-name{font-size:30rpx;font-weight:600;color:$ink}.stock-code{font-size:22rpx;color:$ink-soft}.signal-quote{display:flex;align-items:center;gap:12rpx}.price-val{font-size:30rpx;font-weight:600;color:$ink}.change-val{font-size:24rpx;font-weight:500}.change-val.up{color:#f43f5e}.change-val.down{color:#22c55e}.signal-tags{display:flex;flex-wrap:wrap;gap:8rpx}.view-all{padding:4rpx 0 $spacing-sm;color:$text-color-tertiary;font-size:$font-size-base;text-align:center}.view-all text{margin-left:8rpx;font-size:$font-size-xl;color:$ink-faint}
</style>
