<template>
  <view class="as-morning-card" @tap="$emit('play')">
    <view class="as-morning-content">
      <view class="as-morning-tag">{{ tag }}</view>
      <text class="as-morning-title">{{ title }}</text>
      <text v-if="desc" class="as-morning-desc">{{ desc }}</text>
    </view>
    <view class="as-morning-play">
      <text class="as-morning-icon">{{ playing ? '⏸' : '▶' }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  tag?: string
  title?: string
  desc?: string
  playing?: boolean
}>(), {
  tag: '今日晨报',
  title: '双人对话播报',
  desc: '',
  playing: false
})

defineEmits<{ (e: 'play'): void }>()
</script>

<style lang="scss" scoped>
.as-morning-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
  background: linear-gradient(135deg, #4d7cfe, #6366f1);
  border-radius: 16rpx;
  box-shadow: 0 8rpx 24rpx rgba(77, 124, 254, 0.25);
}

.as-morning-content { flex: 1; }

.as-morning-tag {
  display: inline-block;
  padding: 4rpx 16rpx;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 20rpx;
  font-size: 22rpx;
  color: #ffffff;
  margin-bottom: 12rpx;
}

.as-morning-title { font-size: 34rpx; font-weight: 600; color: #ffffff; display: block; }
.as-morning-desc { font-size: 24rpx; color: rgba(255, 255, 255, 0.85); margin-top: 8rpx; display: block; }

.as-morning-play {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
}

.as-morning-icon { font-size: 32rpx; color: #ffffff; margin-left: 4rpx; }
</style>
