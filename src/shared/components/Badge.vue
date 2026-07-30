<template>
  <view
    class="as-badge"
    :class="[`as-badge--${type}`, size && `as-badge--${size}`, dot && 'as-badge--dot']"
  >
    <text v-if="!dot" class="as-badge__text">
      <slot />
    </text>
  </view>
</template>

<script setup lang="ts">
type BadgeType = 'primary' | 'success' | 'warning' | 'danger' | 'gold' | 'info'
type BadgeSize = 'sm' | 'md' | 'lg'

withDefaults(defineProps<{
  type?: BadgeType
  size?: BadgeSize
  dot?: boolean
}>(), {
  type: 'primary',
  size: 'md',
  dot: false
})
</script>

<style lang="scss" scoped>
.as-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: $s-1;
  padding: 4rpx 16rpx;
  border-radius: $r-full;
  font-size: $font-size-xs;
  font-weight: 600;
  line-height: $lh-tight;
}

.as-badge__text {
  font-size: inherit;
  line-height: inherit;
}

/* ===== Types ===== */
.as-badge--primary {
  background: $primary-50;
  color: $primary;
}

.as-badge--success {
  background: $down-soft;
  color: $down;
}

.as-badge--warning {
  background: $warning-soft;
  color: $warning;
}

.as-badge--danger {
  background: $up-soft;
  color: $up;
}

.as-badge--gold {
  background: $gold-soft;
  color: $gold-deep;
}

.as-badge--info {
  background: $bg-deep;
  color: $ink-soft;
}

/* ===== Sizes ===== */
.as-badge--sm {
  padding: 2rpx 12rpx;
  font-size: 20rpx;
}

.as-badge--lg {
  padding: 6rpx 20rpx;
  font-size: $font-size-sm;
}

/* ===== Dot ===== */
.as-badge--dot {
  width: 16rpx;
  height: 16rpx;
  padding: 0;
  border-radius: 50%;
  min-width: 16rpx;
}
</style>