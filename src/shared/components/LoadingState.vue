/**
 * LoadingState 组件 — 同步自 aistock-component-lib/src/components/LoadingState.vue
 * 同步时间：2026-07-28
 * 向后兼容：默认 layout 改为 vertical，display 改为 flex（旧版为垂直居中布局）
 */
<template>
  <view class="as-loading" :class="`as-loading--${layout}`">
    <view class="as-loading__spinner" :class="[`as-loading__spinner--${size}`]"></view>
    <text v-if="text" class="as-loading__text">{{ text }}</text>
  </view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  text?: string
  size?: 'sm' | 'md' | 'lg'
  layout?: 'horizontal' | 'vertical'
}>(), {
  text: '加载中...',
  size: 'md',
  // 向后兼容：旧版默认垂直布局
  layout: 'vertical'
})
</script>

<style lang="scss" scoped>
.as-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $s-2;
}

.as-loading--vertical {
  flex-direction: column;
  gap: $s-3;
}

.as-loading__spinner {
  display: inline-block;
  border-radius: 50%;
  border: 4rpx solid $line-strong;
  border-top-color: $primary;
  animation: as-loading-spin 0.8s linear infinite;
}

.as-loading__spinner--sm {
  width: 32rpx;
  height: 32rpx;
  border-width: 3rpx;
}

.as-loading__spinner--md {
  width: 40rpx;
  height: 40rpx;
  border-width: 4rpx;
}

.as-loading__spinner--lg {
  width: 64rpx;
  height: 64rpx;
  border-width: 6rpx;
}

.as-loading__text {
  font-size: $font-size-sm;
  color: $ink-soft;
}

@keyframes as-loading-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
