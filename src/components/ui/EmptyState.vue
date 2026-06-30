<template>
  <view class="as-empty">
    <text class="as-empty-icon">{{ icon }}</text>
    <text class="as-empty-text">{{ text }}</text>
    <view v-if="$slots.action" class="as-empty-action">
      <slot name="action" />
    </view>
  </view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  icon?: string
  text?: string
}>(), {
  icon: '📭',
  text: '暂无数据'
})
</script>

<style lang="scss" scoped>
.as-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 40rpx;
}

.as-empty-icon {
  font-size: 80rpx;
  margin-bottom: 16rpx;
}

.as-empty-text {
  font-size: 26rpx;
  color: #9ca3af;
}

.as-empty-action {
  margin-top: 24rpx;
}
</style>
