<template>
  <view class="as-stock-card" @tap="onClick">
    <view class="as-stock-info">
      <text class="as-stock-name">{{ stock.name }}</text>
      <text class="as-stock-code">{{ stock.symbol }}</text>
    </view>
    <view class="as-stock-quote">
      <text class="as-stock-price">{{ formatPrice(stock.price) }}</text>
      <text :class="['as-stock-change', changeClass(stock.changePercent)]">
        {{ formatSignedPct(stock.changePercent) }}
      </text>
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

const props = defineProps<{
  stock: StockLike
}>()

const emit = defineEmits<{ (e: 'click', symbol: string): void }>()

function formatPrice(price?: number): string {
  if (price === undefined || price === null) return '--'
  return Number(price).toFixed(2)
}

function onClick() {
  emit('click', props.stock.symbol)
}
</script>

<style lang="scss" scoped>
.as-stock-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  background: #ffffff;
  border-radius: 12rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.as-stock-info {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.as-stock-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #1a1d24;
}

.as-stock-code {
  font-size: 22rpx;
  color: #6b7280;
}

.as-stock-quote {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6rpx;
}

.as-stock-price {
  font-size: 32rpx;
  font-weight: 700;
  color: #1a1d24;
}

.as-stock-change {
  font-size: 24rpx;
}

/* 涨跌色 */
.up { color: #f43f5e; }
.down { color: #22c55e; }
</style>
