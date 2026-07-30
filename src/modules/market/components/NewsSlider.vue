<template>
  <view class="as-news-slider">
    <EmptyState v-if="!news.length" text="暂无资讯" />
    <swiper v-else class="as-news-swiper" :indicator-dots="false" :autoplay="autoplay" :interval="interval" circular>
      <swiper-item v-for="(item, idx) in news" :key="idx" @tap="$emit('item-click', item)">
        <view class="as-news-item">
          <Tag type="neutral" size="sm">快讯</Tag>
          <text class="as-news-title">{{ item.title }}</text>
        </view>
      </swiper-item>
    </swiper>
  </view>
</template>

<script setup lang="ts">
import { Tag, EmptyState } from '@/shared/components'

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
.as-news-slider { background: $bg-card; border-radius: $r-sm; padding: 16rpx 24rpx; }

.as-news-swiper { height: 60rpx; }

.as-news-item { display: flex; align-items: center; gap: 12rpx; height: 60rpx; }

.as-news-title {
  font-size: $font-size-base;
  color: $ink;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
