<template>
  <view class="page-index">
    <!-- 顶栏 -->
    <view class="header">
      <text class="title">☀️ 早点听</text>
      <!-- #ifdef APP-PLUS -->
      <view class="chat-entry" @tap="goChat">🎙️ AI 对话</view>
      <!-- #endif -->
    </view>

    <!-- 今日晨报卡片 -->
    <view class="card briefing-card" @tap="goBriefing">
      <view class="briefing-title">📻 今日晨报</view>
      <view class="briefing-desc">双人对话播报 · 8 分钟</view>
      <view class="briefing-play">▶️ 播放</view>
    </view>

    <!-- 核心入口 -->
    <view class="entry-grid">
      <view class="entry-item" @tap="goEvent">
        <text class="entry-icon">📰</text>
        <text class="entry-label">重磅消息</text>
      </view>
      <view class="entry-item" @tap="goSectors">
        <text class="entry-icon">🚀</text>
        <text class="entry-label">长线风口</text>
      </view>
    </view>

    <!-- 自选股异动 -->
    <view class="card">
      <view class="card-title">📌 自选股异动</view>
      <view v-if="favorites.length === 0" class="empty">暂无自选股</view>
      <view v-else class="stock-list">
        <view v-for="stock in favorites" :key="stock.symbol" class="stock-item" @tap="goStockDetail(stock.symbol)">
          <text class="stock-name">{{ stock.name }}</text>
          <text class="stock-price">{{ stock.price || '--' }}</text>
        </view>
      </view>
    </view>

    <!-- #ifdef H5 -->
    <view class="download-tip">下载 App 体验完整 AI 投顾功能 →</view>
    <!-- #endif -->
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useFavoritesStore } from '@/store/modules/favorites'

const favoritesStore = useFavoritesStore()
const favorites = computed(() => favoritesStore.stocks)

onShow(() => {
  favoritesStore.fetchFavorites()
})

function goChat() {
  // #ifdef APP-PLUS
  uni.navigateTo({ url: '/pages-sub-app/chat/index' })
  // #endif
}

function goBriefing() {
  // #ifdef APP-PLUS
  uni.navigateTo({ url: '/pages-sub-app/briefing/index' })
  // #endif
}

function goEvent() {
  uni.navigateTo({ url: '/pages/news/wechat-message' })
}

function goSectors() {
  uni.navigateTo({ url: '/pages/tag/leaders' })
}

function goStockDetail(symbol: string) {
  uni.navigateTo({ url: `/pages/stock/detail?symbol=${symbol}` })
}
</script>

<style lang="scss" scoped>
.page-index { padding: 20rpx; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx; }
.title { font-size: 36rpx; font-weight: bold; }
.chat-entry { color: #007AFF; font-size: 28rpx; }

.briefing-card {
  background: linear-gradient(135deg, #1a1a2e, #252540);
  .briefing-title { font-size: 32rpx; font-weight: bold; }
  .briefing-desc { color: #999; font-size: 24rpx; margin-top: 8rpx; }
  .briefing-play { color: #007AFF; margin-top: 16rpx; }
}

.entry-grid { display: flex; gap: 20rpx; margin-bottom: 20rpx; }
.entry-item {
  flex: 1; background: #1a1a2e; border-radius: 12rpx; padding: 30rpx;
  display: flex; flex-direction: column; align-items: center;
}
.entry-icon { font-size: 48rpx; }
.entry-label { margin-top: 12rpx; font-size: 28rpx; }

.card { background: #1a1a2e; border-radius: 12rpx; padding: 24rpx; margin-bottom: 20rpx; }
.card-title { font-size: 30rpx; font-weight: bold; margin-bottom: 16rpx; }
.empty { color: #666; text-align: center; padding: 40rpx 0; }
.stock-list { display: flex; flex-direction: column; gap: 16rpx; }
.stock-item { display: flex; justify-content: space-between; }
.stock-name { color: #fff; }
.stock-price { color: #007AFF; }
.download-tip { text-align: center; color: #666; padding: 40rpx 0; }
</style>
