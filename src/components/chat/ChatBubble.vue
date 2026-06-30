<template>
  <view :class="['as-chat-bubble', role]">
    <text v-if="role === 'user'" class="as-bubble-content user">{{ content }}</text>
    <view v-else class="as-bubble-wrap">
      <text class="as-bubble-avatar">{{ avatar }}</text>
      <view class="as-bubble-body">
        <text v-if="content" class="as-bubble-content">{{ content }}</text>
        <slot name="card" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  role: 'user' | 'assistant'
  content?: string
  avatar?: string
}>(), {
  content: '',
  avatar: '🤖'
})
</script>

<style lang="scss" scoped>
.as-chat-bubble { margin-bottom: 24rpx; }
.as-chat-bubble.user { display: flex; justify-content: flex-end; }

.as-bubble-content.user {
  background: #4d7cfe; color: #fff;
  border-radius: 16rpx 16rpx 4rpx 16rpx;
  padding: 16rpx 24rpx; max-width: 70%;
  font-size: 28rpx; line-height: 1.5;
}

.as-bubble-wrap { display: flex; gap: 12rpx; }
.as-bubble-avatar { font-size: 40rpx; }
.as-bubble-body {
  background: #ffffff;
  border-radius: 16rpx 16rpx 16rpx 4rpx;
  padding: 16rpx 24rpx;
  max-width: 80%;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}
.as-bubble-content { font-size: 28rpx; color: #1a1d24; line-height: 1.5; display: block; }
</style>
