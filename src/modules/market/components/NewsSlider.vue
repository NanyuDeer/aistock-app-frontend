<template>
  <view class="as-news-slider">
    <view v-if="!news.length" class="as-news-empty">
      <text class="as-news-empty-text">暂无资讯</text>
    </view>
    <swiper v-else class="as-news-swiper" :indicator-dots="false" :autoplay="autoplay" :interval="interval" circular>
      <swiper-item v-for="(item, idx) in news" :key="idx" @tap="$emit('item-click', item)">
        <view class="as-news-item">
          <text class="as-news-tag">快讯</text>
          <text class="as-news-title">{{ item.title }}</text>
        </view>
      </swiper-item>
    </swiper>
  </view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  news: Array<{ title: string; content?: string; time?: string }>
  autoplay?: boolean
  interval?: number
}>(), {
  autoplay: true,
  interval: 5000
})

defineEmits<{ (e: 'item-click', item: any): void }>()
</script>

<style lang="scss" scoped>
.as-news-slider { background: #ffffff; border-radius: 12rpx; padding: 16rpx 24rpx; }

.as-news-swiper { height: 60rpx; }

.as-news-item { display: flex; align-items: center; gap: 12rpx; height: 60rpx; }

.as-news-tag {
  flex-shrink: 0;
  font-size: 20rpx;
  color: #4d7cfe;
  background: rgba(77, 124, 254, 0.1);
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
}

.as-news-title {
  font-size: 26rpx;
  color: #1a1d24;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.as-news-empty { padding: 24rpx 0; text-align: center; }
.as-news-empty-text { font-size: 24rpx; color: #9ca3af; }
</style>
