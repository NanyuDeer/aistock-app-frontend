<template>
  <view class="hot-insight">
    <view v-if="signals.length" class="stats-bar"><text class="stats-text">共 {{ signals.length }} 只热门股</text><view class="stats-right"><view class="podcast-action" @tap="openPodcast"><SvgIcon name="broadcast-line" size="30rpx" color="#0b5fff" /></view><text class="stats-time">近 3 个交易日</text></view></view>
    <view v-if="signals.length" class="signal-list"><view v-for="(sig, idx) in signals.slice(0, 5)" :key="`${sig.symbol}-${sig.detectedAt || idx}`" class="signal-card" @tap="goStockDetail(sig.symbol)"><view class="signal-top"><view class="signal-stock"><view class="stock-name-row"><text class="stock-name">{{ sig.stockName || sig.symbol }}</text><Tag :type="levelTagType(sig.resonanceLevel)">{{ levelLabel(sig.resonanceLevel) }}</Tag></view><view class="stock-meta-row"><text class="stock-code">{{ sig.symbol }}</text><text v-if="sig.sectorInfo || sig.thsSectorName" class="industry-tag">{{ sig.sectorInfo || sig.thsSectorName }}</text></view></view><view class="signal-quote"><text v-if="sig.price != null" class="price-val">{{ Number(sig.price).toFixed(2) }}</text><text v-if="sig.changePct != null" :class="['change-val', (sig.changePct ?? 0) >= 0 ? 'up' : 'down']">{{ (sig.changePct ?? 0) >= 0 ? '+' : '' }}{{ Number(sig.changePct).toFixed(2) }}%</text></view></view><view v-if="visibleTriggerTags(sig).length" class="signal-tags"><Tag v-for="tag in visibleTriggerTags(sig)" :key="tag" size="sm">{{ tag }}</Tag></view></view><view v-if="signals.length > 5" class="view-all" @tap="goAll">查看全部 <text>›</text></view></view>
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
async function loadData() { try { signals.value = dedupeBySymbol(sortByChangePct(await stockApi.getHotBurstHistory({ trading_days: 3, min_resonance: 2 }))) } catch { signals.value = [] } }
function goStockDetail(symbol: string) { if (symbol) uni.navigateTo({ url: `/modules/favorites/pages/detail?symbol=${symbol}` }) }
function goAll() { uni.navigateTo({ url: '/modules/market/pages/hot-burst' }) }
function openPodcast() { showPodcast('机构调研播报') }
onMounted(() => { void loadData(); void loadPodcast() })
</script>
<style lang="scss" scoped>
.hot-insight{padding:0}.stats-bar,.stats-right{display:flex;align-items:center}.stats-bar{justify-content:space-between;margin:$s-2 0;min-height:44rpx}.stats-right{gap:$s-1}.stats-text{font-size:$font-size-base;color:$ink;font-weight:600}.podcast-action{width:44rpx;height:44rpx;display:flex;align-items:center;justify-content:center}.stats-time{font-size:$font-size-xs;color:$ink-mute}.signal-list{display:flex;flex-direction:column;gap:$s-2}.signal-card{background:$bg-card;border:1rpx solid $line;border-radius:$r-lg;padding:$s-3;box-shadow:$shadow-sm}.signal-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:$s-1}.signal-stock{display:flex;flex-direction:column;gap:$s-1}.stock-name-row{display:flex;align-items:center;flex-wrap:wrap;gap:$s-1}.stock-meta-row{display:flex;align-items:center;gap:$s-1}.stock-name{font-size:$font-size-md;font-weight:600;color:$ink}.stock-code{font-size:$font-size-xs;color:$ink-mute;font-weight:500}.industry-tag{max-width:160rpx;overflow:hidden;padding:2rpx 10rpx;border-radius:$r-xs;color:$ink-soft;background:$bg-soft;font-size:$font-size-xs;text-overflow:ellipsis;white-space:nowrap}.signal-quote{display:flex;align-items:center;gap:$s-1}.price-val{font-size:$font-size-base;font-weight:600;color:$ink}.change-val{font-size:$font-size-xs;font-weight:500}.change-val.up{color:$up}.change-val.down{color:$down}.signal-tags{display:flex;flex-wrap:wrap;gap:$s-1}.view-all{padding:$s-1 0 $s-2;color:$ink-mute;font-size:$font-size-base;text-align:center}.view-all text{margin-left:$s-1;font-size:$font-size-xl;color:$ink-faint}
</style>
