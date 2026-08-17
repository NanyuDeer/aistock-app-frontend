<template>
  <view v-if="hasCards" class="card-renderer">
    <MarketSnapshotCard v-for="(c, i) in byType.market_snapshot" :key="`m${i}`" :card="c" />
    <StockSnapshotCard v-for="(c, i) in byType.stock_snapshot" :key="`s${i}`" :card="c" />
    <CapitalFlowCard v-for="(c, i) in byType.capital_flow" :key="`f${i}`" :card="c" />
    <DeepAnalysisCard v-for="(c, i) in byType.deep" :key="`d${i}`" :card="c" />
    <ComparisonCard v-for="(c, i) in byType.comparison" :key="`c${i}`" :card="c" />
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ChatCard } from '@/shared/api/modules/agent'
import MarketSnapshotCard from './MarketSnapshotCard.vue'
import StockSnapshotCard from './StockSnapshotCard.vue'
import CapitalFlowCard from './CapitalFlowCard.vue'
import DeepAnalysisCard from './DeepAnalysisCard.vue'
import ComparisonCard from './ComparisonCard.vue'

const props = defineProps<{ cards?: ChatCard[] }>()

/**
 * P11：按 card_type 分组路由。
 * 不用 <component :is> 动态组件（uni-app 小程序端不支持）——具名组件 + 静态 v-for，
 * 未知类型自然落空不渲染（fallback markdown），空/undefined/全未知 → 容器不渲染。
 */
const groups: Record<ChatCard['card_type'], ChatCard[]> = {
  market_snapshot: [],
  stock_snapshot: [],
  capital_flow: [],
  deep: [],
  comparison: [],
}

const byType = computed(() => {
  const result: Record<ChatCard['card_type'], ChatCard[]> = {
    market_snapshot: [],
    stock_snapshot: [],
    capital_flow: [],
    deep: [],
    comparison: [],
  }
  for (const c of props.cards ?? []) {
    if (c && result[c.card_type]) result[c.card_type].push(c)
  }
  return result
})

const hasCards = computed(() =>
  (props.cards ?? []).some(c => c && Object.keys(groups).includes(c.card_type))
)
</script>

<style lang="scss" scoped>
.card-renderer { margin-top: 4rpx; }
</style>
