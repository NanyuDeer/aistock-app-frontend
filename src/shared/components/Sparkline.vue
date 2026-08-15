<template>
  <svg
    :class="['as-sparkline', useCustom ? '' : 'is-' + trend]"
    viewBox="0 0 160 40"
    preserveAspectRatio="none"
    :style="{ width: computedWidth, height: computedHeight }"
  >
    <defs>
      <linearGradient :id="gradId" x1="0" y1="0" x2="0" y2="1">
        <stop
          class="as-sparkline__stop-top"
          offset="0%"
          :style="useCustom ? { stopColor: color } : null"
        />
        <stop class="as-sparkline__stop-bottom" offset="100%" />
      </linearGradient>
    </defs>
    <polygon
      v-if="type === 'area' && points.area"
      class="as-sparkline__area"
      :points="points.area"
      :fill="`url(#${gradId})`"
    />
    <polyline
      v-if="points.line"
      class="as-sparkline__line"
      :style="useCustom ? { stroke: color } : null"
      :points="points.line"
      vector-effect="non-scaling-stroke"
    />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { rpxToPx } from '@/shared/utils/rpx'

const props = withDefaults(defineProps<{
  data: number[]
  type?: 'line' | 'area'
  color?: string
  width?: string
  height?: string
}>(), {
  type: 'area',
  color: '',
  width: '100%',
  height: '80rpx'
})

/** rpx → 固定 px 转换（按项目 390px 设计基准；height 为固定设计尺寸，不随视口缩放；width '100%' 原样透传） */
const computedWidth = computed(() => rpxToPx(props.width))
const computedHeight = computed(() => rpxToPx(props.height))

// 每个实例独立的渐变 id，避免多实例共用同一 id 导致渐变引用错乱
const gradId = 'as-spark-' + Math.random().toString(36).slice(2, 9)

const useCustom = computed(() => !!props.color)

// 涨跌色自动判断：末值 > 首值用 $up(红)，反之 $down(绿)，相等 $flat
const trend = computed<'up' | 'down' | 'flat'>(() => {
  const d = props.data
  if (d.length < 2) return 'flat'
  const first = d[0]
  const last = d[d.length - 1]
  if (last > first) return 'up'
  if (last < first) return 'down'
  return 'flat'
})

const points = computed<{ line: string; area: string }>(() => {
  const d = props.data
  const n = d.length
  if (n < 2) return { line: '', area: '' }

  const W = 160
  const H = 40
  const pad = 3
  const min = Math.min(...d)
  const max = Math.max(...d)
  const range = max - min

  const coords = d.map((v, i) => {
    const x = (i / (n - 1)) * W
    // 极值相等时画在中线，避免除零
    const y = range === 0 ? H / 2 : pad + (1 - (v - min) / range) * (H - 2 * pad)
    return { x: +x.toFixed(2), y: +y.toFixed(2) }
  })

  const line = coords.map(c => `${c.x},${c.y}`).join(' ')
  // 区域 = 折线点 + 右下角 + 左下角，闭合到底部
  const area = `${line} ${W},${H} 0,${H}`
  return { line, area }
})
</script>

<style lang="scss" scoped>
.as-sparkline {
  display: block;
  overflow: visible;
}

.as-sparkline__line {
  fill: none;
  stroke-width: 1.5;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.as-sparkline__area {
  stroke: none;
}

/* 渐变上端：涨跌色 opacity 0.3；下端 opacity 0 */
.as-sparkline__stop-top {
  stop-opacity: 0.3;
}

.as-sparkline__stop-bottom {
  stop-opacity: 0;
}

/* 自动涨跌色 —— 折线 */
.as-sparkline.is-up .as-sparkline__line {
  stroke: $up;
}

.as-sparkline.is-down .as-sparkline__line {
  stroke: $down;
}

.as-sparkline.is-flat .as-sparkline__line {
  stroke: $flat;
}

/* 自动涨跌色 —— 渐变上端 */
.as-sparkline.is-up .as-sparkline__stop-top {
  stop-color: $up;
}

.as-sparkline.is-down .as-sparkline__stop-top {
  stop-color: $down;
}

.as-sparkline.is-flat .as-sparkline__stop-top {
  stop-color: $flat;
}
</style>
