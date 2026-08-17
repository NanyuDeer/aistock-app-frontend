<template>
  <view v-if="hasData" class="cmp-card">
    <view class="cmp-header">
      <text class="cmp-title">{{ card.title }}</text>
    </view>

    <view v-if="stocks.length > 0" class="cmp-stocks">
      <view
        v-for="(s, i) in stocks"
        :key="i"
        class="cmp-stock"
        :class="{ 'cmp-stock-unavailable': s.available === false }"
      >
        <view class="cmp-stock-name-row">
          <text class="cmp-stock-name">{{ s.name }}</text>
          <text v-if="s.code" class="cmp-stock-code">{{ s.code }}</text>
        </view>
        <text class="cmp-stock-price">{{ fmtNum(s.price) }}</text>
        <text class="cmp-stock-pct" :class="trendClass(s)">{{ fmtSigned(s.change_pct) }}%</text>
      </view>
    </view>

    <view v-if="conclusion" class="cmp-conclusion">
      <text class="cmp-conclusion-label">AI 结论</text>
      <text class="cmp-conclusion-text">{{ conclusion }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ChatCard } from '@/shared/api/modules/agent'

/** 契约字典：comparison.data.stocks 元素（available=false 标的灰显） */
interface ComparisonStock {
  name?: string
  code?: string
  price?: number
  change?: number
  change_pct?: number
  available?: boolean
}

const props = defineProps<{ card: ChatCard }>()

const stocks = computed<ComparisonStock[]>(() => {
  const raw = props.card.data.stocks
  return Array.isArray(raw) ? (raw as unknown as ComparisonStock[]) : []
})
const conclusion = computed(() =>
  typeof props.card.data.conclusion === 'string' ? props.card.data.conclusion : ''
)
const hasData = computed(() => stocks.value.length > 0 || !!conclusion.value)

function trendClass(s: ComparisonStock): string {
  const pct = s.change_pct ?? 0
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

.cmp-card {
  margin-bottom: 12rpx;
  padding: 16rpx 20rpx;
  background: $bg-card;
  border-radius: $r-md;
  box-shadow: $shadow-card;
}
.cmp-header { margin-bottom: 12rpx; }
.cmp-title { font-size: 26rpx; font-weight: 600; color: $ink; }
.cmp-stocks { display: flex; gap: 8rpx; }
.cmp-stock {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  background: $bg-soft;
  border-radius: $r-xs;
  padding: 12rpx;
}
.cmp-stock-unavailable { opacity: $op-disabled; }
.cmp-stock-name-row { display: flex; align-items: baseline; gap: 6rpx; }
.cmp-stock-name { font-size: 24rpx; font-weight: 600; color: $ink; flex: 1; min-width: 0; }
.cmp-stock-code { font-size: 18rpx; color: $ink-mute; }
.cmp-stock-price { font-size: 30rpx; font-weight: 700; color: $ink; }
.cmp-stock-pct { font-size: 22rpx; }
.cmp-conclusion {
  margin-top: 12rpx;
  border-top: 1rpx solid $line-soft;
  padding-top: 12rpx;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.cmp-conclusion-label { font-size: 20rpx; color: $ink-mute; }
.cmp-conclusion-text { font-size: 24rpx; color: $ink-soft; line-height: 1.5; }
.up { color: $up; }
.down { color: $down; }
.flat { color: $flat; }
</style>
