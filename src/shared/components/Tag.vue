<template>
  <view
    class="as-tag"
    :class="[
      `as-tag--${type}`,
      size && `as-tag--${size}`
    ]"
  >
    <text class="as-tag__text">
      <slot />
    </text>
  </view>
</template>

<script setup lang="ts">
type TagType = 'up' | 'down' | 'neutral' | 'warning' | 'gold' | 'gray'
type TagSize = 'sm' | 'md' | 'lg'

withDefaults(defineProps<{
  type?: TagType
  size?: TagSize
}>(), {
  type: 'neutral',
  size: 'md'
})
</script>

<style lang="scss" scoped>
.as-tag {
  display: inline-flex;
  align-items: center;
  gap: $s-1;
  padding: 4rpx 16rpx;
  border-radius: $r-xs;
  font-size: $font-size-xs;
  font-weight: 600;
  line-height: $lh-tight;
}

.as-tag__text {
  font-size: inherit;
  line-height: inherit;
}

/* ===== Types ===== */
.as-tag--up {
  background: $up-soft;
  color: $up;
}

.as-tag--down {
  background: $down-soft;
  color: $down;
}

.as-tag--neutral {
  background: rgba(11, 95, 255, 0.08);
  color: $primary;
}

.as-tag--warning {
  background: $warning-soft;
  color: $warning;
}

.as-tag--gold {
  background: $gold-soft;
  color: $gold-deep;
}

.as-tag--gray {
  background: $bg-soft;
  color: $ink-soft;
}

/* ===== Sizes ===== */
.as-tag--sm {
  padding: 2rpx 12rpx;
  font-size: 20rpx;
}

.as-tag--lg {
  padding: 6rpx 20rpx;
  font-size: $font-size-sm;
}
</style>