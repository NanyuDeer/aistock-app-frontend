<template>
  <view class="as-market-overview">
    <view class="as-market-header">
      <text class="as-market-title">大盘概览</text>
      <text class="as-market-status">{{ status }}</text>
    </view>
    <view v-if="indices.length" class="as-market-list">
      <view v-for="item in indices" :key="item.code" class="as-market-item">
        <text class="as-market-name">{{ item.name }}</text>
        <text class="as-market-price">{{ formatPrice(item.price) }}</text>
        <text :class="['as-market-change', item.changePercent >= 0 ? 'up' : 'down']">
          {{ formatSignedPct(item.changePercent) }}
        </text>
      </view>
    </view>
    <view v-else class="as-market-empty">
      <text class="as-market-empty-text">暂无行情</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { formatSignedPct } from '@/utils/stock'

defineProps<{
  indices: Array<{ name: string; code: string; price: number; changePercent: number }>
  status?: string
}>()

function formatPrice(price: number): string {
  return Number(price || 0).toFixed(2)
}
</script>

<style lang="scss" scoped>
.as-market-overview {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.as-market-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.as-market-title { font-size: 30rpx; font-weight: 600; color: #1a1d24; }
.as-market-status { font-size: 22rpx; color: #6b7280; }

.as-market-list { display: flex; gap: 24rpx; }

.as-market-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}

.as-market-name { font-size: 22rpx; color: #6b7280; }
.as-market-price { font-size: 30rpx; font-weight: 600; color: #1a1d24; }
.as-market-change { font-size: 22rpx; }

.up { color: #f43f5e; }
.down { color: #22c55e; }

.as-market-empty { padding: 24rpx 0; text-align: center; }
.as-market-empty-text { font-size: 24rpx; color: #9ca3af; }
</style>
