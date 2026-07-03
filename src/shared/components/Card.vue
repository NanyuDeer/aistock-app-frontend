<template>
  <view :class="['as-card', { 'as-card--flat': flat }]">
    <view v-if="title || $slots.header" class="as-card-header">
      <slot name="header">
        <text class="as-card-title">{{ title }}</text>
        <text v-if="subtitle" class="as-card-subtitle">{{ subtitle }}</text>
      </slot>
      <view v-if="$slots.action" class="as-card-action">
        <slot name="action" />
      </view>
    </view>
    <view class="as-card-body">
      <slot />
    </view>
    <view v-if="$slots.footer" class="as-card-footer">
      <slot name="footer" />
    </view>
  </view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  title?: string
  subtitle?: string
  flat?: boolean
}>(), {
  flat: false
})
</script>

<style lang="scss" scoped>
.as-card {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);

  &--flat {
    box-shadow: none;
    border: 1rpx solid #e5e7eb;
  }
}

.as-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.as-card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1d24;
}

.as-card-subtitle {
  font-size: 24rpx;
  color: #6b7280;
  margin-left: 12rpx;
}

.as-card-action {
  display: flex;
  align-items: center;
}

.as-card-footer {
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #f0f1f3;
}
</style>
