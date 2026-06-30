<template>
  <view class="as-footer">
    <text class="as-footer-text">{{ text }}</text>
  </view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  text?: string
}>(), {
  text: 'AI Stock · 智能投顾'
})
</script>

<style lang="scss" scoped>
.as-footer {
  padding: 32rpx 24rpx;
  text-align: center;
  margin-top: 40rpx;
}

.as-footer-text {
  font-size: 22rpx;
  color: #9ca3af;
}
</style>
