/**
 * StockCardList 自选股列表
 * 视觉层：基于组件库 StockItem + EmptyState（同步时间：2026-07-28）
 * 保留业务逻辑：stocks 列表渲染 + item-click 事件
 *
 * 字段映射：stock.name→name, stock.symbol→code, stock.price→price,
 * stock.changePercent→change/changePercent（change 取 changePercent 用于涨跌方向着色）
 */
<template>
  <view class="as-stock-list">
    <EmptyState v-if="!stocks.length" title="暂无股票" description="还没有添加自选股" />
    <template v-else>
      <StockItem
        v-for="stock in stocks"
        :key="stock.symbol"
        class="as-stock-list-item"
        :name="stock.name"
        :code="stock.symbol"
        :price="stock.price ?? 0"
        :change="stock.changePercent ?? 0"
        :change-percent="stock.changePercent ?? 0"
        @click="$emit('item-click', stock.symbol)"
      />
    </template>
  </view>
</template>

<script setup lang="ts">
import StockItem from '@/shared/components/StockItem.vue'
import EmptyState from '@/shared/components/EmptyState.vue'

interface StockLike {
  symbol: string
  name: string
  price?: number
  changePercent?: number | null
}

defineProps<{
  stocks: StockLike[]
}>()

defineEmits<{ (e: 'item-click', symbol: string): void }>()
</script>

<style lang="scss" scoped>
.as-stock-list {
  display: flex;
  flex-direction: column;
  gap: $s-2;
}

.as-stock-list-item {
  width: 100%;
}
</style>
