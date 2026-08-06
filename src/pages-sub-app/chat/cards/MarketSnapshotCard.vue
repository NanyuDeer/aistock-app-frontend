<template>
  <view v-if="hasData" class="ms-card">
    <view class="ms-header">
      <text class="ms-title">{{ card.title }}</text>
      <text v-if="tradeDate" class="ms-date">{{ tradeDate }}</text>
    </view>

    <view v-if="mainIndex" class="ms-main">
      <view class="ms-main-left">
        <text class="ms-main-name">{{ mainIndex.index_name }}</text>
        <text class="ms-main-value" :class="trendClass(mainIndex)">{{ fmtNum(mainIndex.value) }}</text>
      </view>
      <text class="ms-main-pct" :class="trendClass(mainIndex)">{{ fmtSigned(mainIndex.change_pct) }}%</text>
    </view>

    <view v-if="restIndices.length > 0" class="ms-list">
      <view v-for="(ix, i) in restIndices" :key="i" class="ms-row">
        <text class="ms-row-name">{{ ix.index_name }}</text>
        <text class="ms-row-value">{{ fmtNum(ix.value) }}</text>
        <text class="ms-row-pct" :class="trendClass(ix)">{{ fmtSigned(ix.change_pct) }}%</text>
      </view>
    </view>

    <view v-if="hasBreadth" class="ms-breadth">
      <view class="ms-b-col up">
        <text class="ms-b-num">{{ upCount ?? '--' }}</text>
        <text class="ms-b-label">上涨</text>
      </view>
      <view class="ms-b-col flat">
        <text class="ms-b-num">{{ flatCount ?? '--' }}</text>
        <text class="ms-b-label">平盘</text>
      </view>
      <view class="ms-b-col down">
        <text class="ms-b-num">{{ downCount ?? '--' }}</text>
        <text class="ms-b-label">下跌</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ChatCard } from '@/shared/api/modules/agent'

/** 契约字典：market_snapshot.data.indices 元素 */
interface MarketIndex {
  index_name?: string
  code?: string
  value?: number
  change?: number
  change_pct?: number
}

const props = defineProps<{ card: ChatCard }>()

const indices = computed<MarketIndex[]>(() => {
  const raw = props.card.data.indices
  return Array.isArray(raw) ? (raw as unknown as MarketIndex[]) : []
})
const mainIndex = computed(() => indices.value[0] ?? null)
const restIndices = computed(() => indices.value.slice(1))

const tradeDate = computed(() =>
  typeof props.card.data.trade_date === 'string' ? props.card.data.trade_date : ''
)
const upCount = computed(() =>
  typeof props.card.data.up_count === 'number' ? props.card.data.up_count : null
)
const flatCount = computed(() =>
  typeof props.card.data.flat_count === 'number' ? props.card.data.flat_count : null
)
const downCount = computed(() =>
  typeof props.card.data.down_count === 'number' ? props.card.data.down_count : null
)
const hasBreadth = computed(() => upCount.value != null || flatCount.value != null || downCount.value != null)
const hasData = computed(() => indices.value.length > 0 || hasBreadth.value || !!tradeDate.value)

/** A 股红涨绿跌：change_pct > 0 → up（红），< 0 → down（绿），0 → flat */
function trendClass(ix: MarketIndex): string {
  const pct = ix.change_pct ?? 0
  return pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat'
}
function fmtNum(v?: number): string {
  return v == null ? '--' : v.toFixed(2)
}
function fmtSigned(v?: number): string {
  if (v == null) return '--'
  return v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2)
}
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;

.ms-card {
  margin-bottom: 12rpx;
  padding: 16rpx 20rpx;
  background: $bg-card;
  border-radius: $r-md;
  box-shadow: $shadow-card;
}
.ms-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}
.ms-title { font-size: 26rpx; font-weight: 600; color: $ink; }
.ms-date { font-size: 20rpx; color: $ink-mute; }
.ms-main {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding-bottom: 12rpx;
  border-bottom: 1rpx solid $line-soft;
}
.ms-main-name { display: block; font-size: 22rpx; color: $ink-soft; margin-bottom: 6rpx; }
.ms-main-value { display: block; font-size: 44rpx; font-weight: 700; }
.ms-main-pct { font-size: 28rpx; font-weight: 600; }
.ms-list { padding: 8rpx 0; }
.ms-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8rpx 0;
}
.ms-row-name { font-size: 24rpx; color: $ink-soft; flex: 1; }
.ms-row-value { font-size: 24rpx; color: $ink; }
.ms-row-pct { font-size: 24rpx; width: 120rpx; text-align: right; }
.ms-breadth {
  display: flex;
  margin-top: 8rpx;
  border-top: 1rpx solid $line-soft;
  padding-top: 12rpx;
}
.ms-b-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  border-radius: $r-xs;
  padding: 8rpx 0;
}
.ms-b-col.up { background: $up-bg; }
.ms-b-col.flat { background: $bg-soft; }
.ms-b-col.down { background: $down-bg; }
.ms-b-num { font-size: 30rpx; font-weight: 700; }
.ms-b-col.up .ms-b-num { color: $up; }
.ms-b-col.flat .ms-b-num { color: $flat; }
.ms-b-col.down .ms-b-num { color: $down; }
.ms-b-label { font-size: 20rpx; color: $ink-mute; }
.up { color: $up; }
.down { color: $down; }
.flat { color: $flat; }
</style>
