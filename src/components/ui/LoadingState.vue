<template>
  <view class="as-loading">
    <view class="as-loading-spinner" />
    <text class="as-loading-text">{{ text }}</text>
  </view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  text?: string
}>(), {
  text: '加载中...'
})
</script>

<style lang="scss" scoped>
.as-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60rpx 40rpx;
}

.as-loading-spinner {
  width: 48rpx;
  height: 48rpx;
  border: 4rpx solid #e5e7eb;
  border-top-color: #4d7cfe;
  border-radius: 50%;
  animation: as-spin 0.8s linear infinite;
  margin-bottom: 16rpx;
}

.as-loading-text {
  font-size: 26rpx;
  color: #6b7280;
}

@keyframes as-spin {
  to { transform: rotate(360deg); }
}
</style>
