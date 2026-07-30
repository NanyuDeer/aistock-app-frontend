<template>
  <view class="as-gauge" :class="'is-' + size">
    <svg
      class="as-gauge__svg"
      :class="'is-' + size"
      viewBox="0 0 160 100"
    >
      <!-- 背景轨道 -->
      <path
        class="as-gauge__track"
        d="M 10 90 A 70 70 0 0 1 150 90"
      />
      <!-- 进度弧 -->
      <path
        class="as-gauge__progress"
        :class="colorClass"
        d="M 10 90 A 70 70 0 0 1 150 90"
        stroke-dasharray="220"
        :style="{ strokeDashoffset: dashOffset }"
      />
      <!-- 分数 -->
      <text
        class="as-gauge__value"
        :class="colorClass"
        x="80"
        y="62"
        text-anchor="middle"
        dominant-baseline="central"
        font-size="30"
        font-weight="800"
      >{{ displayValue }}</text>
      <!-- 标签 -->
      <text
        v-if="label"
        class="as-gauge__label"
        x="80"
        y="82"
        text-anchor="middle"
        dominant-baseline="central"
        font-size="10"
      >{{ label }}</text>
    </svg>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type GaugeSize = 'sm' | 'md' | 'lg'

const props = withDefaults(defineProps<{
  value: number
  max?: number
  label?: string
  size?: GaugeSize
}>(), {
  max: 100,
  label: '',
  size: 'md'
})

function clamp(v: number, min: number, maxVal: number): number {
  return Math.max(min, Math.min(maxVal, v))
}

// 弧长 ≈ π * 70 ≈ 219.9，取 220 作为满刻度
const ARC_LENGTH = 220

const clampedValue = computed(() => clamp(props.value, 0, props.max))

// dashoffset = 总弧长 * (1 - 进度比)
const dashOffset = computed(() => ARC_LENGTH * (1 - clampedValue.value / props.max))

// 色带按分数区间变化：高分 $up(红/积极)，中高 $gold，中 $warning，低 $down(绿/消极)
const colorClass = computed(() => {
  const v = clampedValue.value
  if (v >= 80) return 'is-high'
  if (v >= 60) return 'is-mid-high'
  if (v >= 40) return 'is-mid'
  return 'is-low'
})

const displayValue = computed(() => {
  const v = clampedValue.value
  return v % 1 === 0 ? String(Math.round(v)) : v.toFixed(1)
})
</script>

<style lang="scss" scoped>
.as-gauge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.as-gauge__svg {
  display: block;
  overflow: visible;

  &.is-sm {
    width: 120rpx;
    height: 75rpx;
  }

  &.is-md {
    width: 160rpx;
    height: 100rpx;
  }

  &.is-lg {
    width: 200rpx;
    height: 125rpx;
  }
}

.as-gauge__track {
  fill: none;
  stroke: $line;
  stroke-width: 12;
  stroke-linecap: round;
}

.as-gauge__progress {
  fill: none;
  stroke-width: 12;
  stroke-linecap: round;
  transition: stroke-dashoffset $t-slow, stroke $t-base;

  &.is-high {
    stroke: $up;
  }

  &.is-mid-high {
    stroke: $gold;
  }

  &.is-mid {
    stroke: $warning;
  }

  &.is-low {
    stroke: $down;
  }
}

.as-gauge__value {
  font-family: $font-mono;

  &.is-high {
    fill: $up;
  }

  &.is-mid-high {
    fill: $gold-deep;
  }

  &.is-mid {
    fill: $warning;
  }

  &.is-low {
    fill: $down;
  }
}

.as-gauge__label {
  font-family: $font-sans;
  fill: $ink-mute;
}
</style>
