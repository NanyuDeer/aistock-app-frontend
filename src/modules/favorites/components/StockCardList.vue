<template>
  <view class="as-stock-list">
    <view v-if="!stocks.length">
      <slot name="empty">
        <view class="as-stock-list-empty">
          <text class="as-stock-list-empty-text">暂无股票</text>
        </view>
      </slot>
    </view>
    <view
      v-for="stock in stocks"
      :key="stock.symbol"
      class="as-stock-list-item"
      @tap="$emit('item-click', stock.symbol)"
    >
      <view class="as-stock-list-info">
        <text class="as-stock-list-name">{{ stock.name }}</text>
        <text class="as-stock-list-code">{{ stock.symbol }}</text>
      </view>
      <view class="as-stock-list-quote">
        <text class="as-stock-list-price">{{ formatPrice(stock.price) }}</text>
        <text :class="['as-stock-list-change', changeClass(stock.changePercent)]">
          {{ formatSignedPct(stock.changePercent) }}
        </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { formatSignedPct, changeClass } from '@/shared/utils/stock'

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

function formatPrice(price?: number): string {
  if (price === undefined || price === null) return '--'
  return Number(price).toFixed(2)
}
</script>

<style lang="scss" scoped>
.as-stock-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  background: #ffffff;
  border-radius: 12rpx;
  margin-bottom: 12rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.as-stock-list-info { display: flex; flex-direction: column; gap: 6rpx; }
.as-stock-list-name { font-size: 28rpx; font-weight: 600; color: #1a1d24; }
.as-stock-list-code { font-size: 22rpx; color: #6b7280; }

.as-stock-list-quote { display: flex; flex-direction: column; align-items: flex-end; gap: 6rpx; }
.as-stock-list-price { font-size: 32rpx; font-weight: 700; color: #1a1d24; }
.as-stock-list-change { font-size: 24rpx; }

.up { color: #f43f5e; }
.down { color: #22c55e; }

.as-stock-list-empty { padding: 40rpx; text-align: center; }
.as-stock-list-empty-text { font-size: 26rpx; color: #9ca3af; }
</style>
