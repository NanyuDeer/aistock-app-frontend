<template>
  <view v-if="type === 'line'" class="as-progress">
    <view v-if="label" class="as-progress__label">
      <text class="as-progress__label-text">{{ label }}</text>
      <text class="as-progress__label-value" :class="`is-${status}`">{{ value }}%</text>
    </view>
    <view class="as-progress__track">
      <view
        class="as-progress__bar"
        :class="`is-${status}`"
        :style="{ width: `${value}%` }"
      ></view>
    </view>
  </view>
  <view
    v-else
    class="as-progress-circle"
    :class="`is-${status}`"
    :style="{
      width: `${size}rpx`,
      height: `${size}rpx`,
      background: circleBackground
    }"
  >
    <view class="as-progress-circle__inner">
      <text class="as-progress-circle__label" :class="`is-${status}`">{{ value }}%</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type ProgressType = 'line' | 'circle'
type ProgressStatus = 'primary' | 'success' | 'warning' | 'danger' | 'gold'

const props = withDefaults(defineProps<{
  value: number
  type?: ProgressType
  status?: ProgressStatus
  label?: string
  size?: number
}>(), {
  type: 'line',
  status: 'primary',
  label: '',
  size: 160
})

const statusColorMap: Record<ProgressStatus, string> = {
  primary: '#0b5fff',
  success: '#18a058',
  warning: '#f0a020',
  danger: '#e54d5e',
  gold: '#d4a843'
}

const circleBackground = computed(() => {
  const color = statusColorMap[props.status]
  const deg = (props.value / 100) * 360
  return `conic-gradient(${color} ${deg}deg, $line-soft ${deg}deg)`
})
</script>

<style lang="scss" scoped>
/* ===== Line Progress ===== */
.as-progress {
  width: 100%;
}

.as-progress__label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $s-2;
}

.as-progress__label-text {
  font-size: $font-size-sm;
  color: $ink-soft;
}

.as-progress__label-value {
  font-size: $font-size-sm;
  font-weight: 600;
  font-family: $font-mono;

  &.is-primary { color: $primary; }
  &.is-success { color: $down; }
  &.is-warning { color: $warning; }
  &.is-danger { color: $up; }
  &.is-gold { color: $gold-deep; }
}

.as-progress__track {
  height: 12rpx;
  background: $line-soft;
  border-radius: $r-full;
  overflow: hidden;
}

.as-progress__bar {
  height: 100%;
  border-radius: $r-full;
  transition: width $t-slow;

  &.is-primary { background: linear-gradient(90deg, $primary, $primary-light); }
  &.is-success { background: linear-gradient(90deg, $down, $down-deep); }
  &.is-warning { background: linear-gradient(90deg, $warning, $warning-light); }
  &.is-danger { background: linear-gradient(90deg, $up, $up-light); }
  &.is-gold { background: linear-gradient(90deg, $gold, $gold-light); }
}

/* ===== Circle Progress (CSS conic-gradient) ===== */
.as-progress-circle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.as-progress-circle__inner {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 76%;
  height: 76%;
  background: $bg-card;
  border-radius: 50%;
}

.as-progress-circle__label {
  font-size: $font-size-sm;
  font-weight: 700;
  font-family: $font-mono;
  color: $primary;

  &.is-success { color: $down; }
  &.is-warning { color: $warning; }
  &.is-danger { color: $up; }
  &.is-gold { color: $gold-deep; }
}
</style>