<template>
  <view class="page-favorites">
    <view class="header">
      <text class="title">自选股</text>
    </view>

    <view v-if="stocks.length === 0" class="empty">
      <text>暂无自选股</text>
    </view>

    <view v-else class="stock-list">
      <view v-for="stock in stocks" :key="stock.symbol" class="stock-card" @tap="goDetail(stock.symbol)">
        <view class="stock-info">
          <text class="stock-name">{{ stock.name }}</text>
          <text class="stock-symbol">{{ stock.symbol }}</text>
        </view>
        <view class="stock-quote">
          <text class="stock-price">{{ stock.price || '--' }}</text>
          <text class="stock-change" :class="changeClass(stock.changePercent)">
            {{ formatChange(stock.changePercent) }}
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { useFavoritesStore } from '@/store/modules/favorites'

const favoritesStore = useFavoritesStore()
const stocks = computed(() => favoritesStore.stocks)

onShow(() => favoritesStore.fetchFavorites())

onPullDownRefresh(async () => {
  await favoritesStore.fetchFavorites()
  uni.stopPullDownRefresh()
})

function goDetail(symbol: string) {
  uni.navigateTo({ url: `/pages/stock/detail?symbol=${symbol}` })
}

function changeClass(percent?: number) {
  if (!percent) return ''
  return percent > 0 ? 'text-up' : 'text-down'
}

function formatChange(percent?: number) {
  if (percent === undefined) return '--'
  return `${percent > 0 ? '+' : ''}${percent.toFixed(2)}%`
}
</script>

<style lang="scss" scoped>
.page-favorites { padding: 20rpx; }
.header { margin-bottom: 20rpx; }
.title { font-size: 36rpx; font-weight: bold; }
.empty { text-align: center; padding: 100rpx 0; color: #666; }
.stock-list { display: flex; flex-direction: column; gap: 16rpx; }
.stock-card {
  display: flex; justify-content: space-between; align-items: center;
  background: #1a1a2e; border-radius: 12rpx; padding: 24rpx;
}
.stock-info { display: flex; flex-direction: column; gap: 8rpx; }
.stock-name { font-size: 30rpx; color: #fff; }
.stock-symbol { font-size: 24rpx; color: #666; }
.stock-quote { text-align: right; }
.stock-price { font-size: 32rpx; color: #fff; }
.stock-change { display: block; font-size: 24rpx; margin-top: 4rpx; }
.text-up { color: #FF3B30; }
.text-down { color: #34C759; }
</style>
