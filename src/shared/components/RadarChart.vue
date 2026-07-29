/** RadarChart 组件 — 同步自 aistock-component-lib/src/components/RadarChart.vue | 同步时间：2026-07-28 */
<template>
  <view class="as-radar-chart">
    <view v-if="title" class="as-radar-chart__title">
      <text class="as-radar-chart__title-text">{{ title }}</text>
    </view>

    <!-- 空态 -->
    <view v-if="!dimensions.length" class="as-radar-chart__empty">
      <view class="as-radar-chart__empty-icon"></view>
      <text class="as-radar-chart__empty-text">暂无评分数据</text>
    </view>

    <template v-else>
      <!-- 雷达图主体 -->
      <view class="as-radar-chart__chart">
        <svg class="as-radar-chart__svg" viewBox="0 0 200 200">
          <!-- 三层网格多边形 -->
          <polygon
            v-for="r in gridRadii"
            :key="'grid-' + r"
            class="as-radar-chart__grid"
            :class="{ 'is-outer': r === maxRadius }"
            :points="ringPoints(r)"
          />
          <!-- 轴线 -->
          <line
            v-for="(p, i) in axisPoints"
            :key="'axis-' + i"
            class="as-radar-chart__axis"
            :x1="center"
            :y1="center"
            :x2="p.x"
            :y2="p.y"
          />
          <!-- 数据多边形 -->
          <polygon class="as-radar-chart__data" :points="dataRingPoints" />
          <!-- 数据顶点 -->
          <circle
            v-for="(p, i) in dataVertexPoints"
            :key="'vertex-' + i"
            class="as-radar-chart__vertex"
            :cx="p.x"
            :cy="p.y"
            :r="3.2"
          />
          <!-- 维度标签 -->
          <text
            v-for="(p, i) in labelPoints"
            :key="'label-' + i"
            class="as-radar-chart__label"
            :x="p.x"
            :y="p.y"
            :text-anchor="p.anchor"
            dominant-baseline="middle"
            font-size="10"
            font-weight="600"
          >{{ dimensions[i].label }}</text>
        </svg>
      </view>

      <!-- 综合评分 -->
      <view v-if="score != null" class="as-radar-chart__score">
        <text class="as-radar-chart__score-value">{{ scoreText }}</text>
        <text class="as-radar-chart__score-label">综合评分</text>
      </view>

      <!-- 维度明细条形图 -->
      <view class="as-radar-chart__details">
        <view
          v-for="(dim, i) in dimensions"
          :key="'dim-' + i"
          class="as-radar-chart__detail"
        >
          <text class="as-radar-chart__detail-label">{{ dim.label }}</text>
          <view class="as-radar-chart__detail-track">
            <view
              class="as-radar-chart__detail-bar"
              :style="{ width: clampScore(dim.score) + '%' }"
            ></view>
          </view>
          <text class="as-radar-chart__detail-score">{{ Math.round(dim.score) }}</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Dimension {
  label: string
  score: number // 0-100
}

const props = withDefaults(defineProps<{
  dimensions: Dimension[]
  title?: string
  score?: number
}>(), {
  title: '',
  score: undefined
})

const center = 100
const maxRadius = 80
// 三层同心网格：内、中、外环；外环加粗作为满刻度
const gridRadii = [27, 53, 80]
const labelRadius = 93

const count = computed(() => Math.max(props.dimensions.length, 1))

function clampScore(s: number): number {
  return Math.max(0, Math.min(100, s))
}

// 计算指定半径上第 index 个顶点的坐标
// 起始角度 -90°（正上方），顺时针分布
function pointAt(radius: number, index: number, n: number): { x: number; y: number } {
  const angle = (-90 + (360 / n) * index) * Math.PI / 180
  return {
    x: center + radius * Math.cos(angle),
    y: center + radius * Math.sin(angle)
  }
}

// 网格多边形顶点串
function ringPoints(radius: number): string {
  const n = count.value
  const pts: string[] = []
  for (let i = 0; i < n; i++) {
    const p = pointAt(radius, i, n)
    pts.push(`${p.x.toFixed(2)},${p.y.toFixed(2)}`)
  }
  return pts.join(' ')
}

// 轴线终点（满刻度处）
const axisPoints = computed(() => {
  const n = count.value
  const pts: { x: number; y: number }[] = []
  for (let i = 0; i < n; i++) {
    pts.push(pointAt(maxRadius, i, n))
  }
  return pts
})

// 数据多边形顶点串（按各维度得分映射半径）
const dataRingPoints = computed(() => {
  const n = count.value
  const pts: string[] = []
  for (let i = 0; i < n; i++) {
    const r = (clampScore(props.dimensions[i].score) / 100) * maxRadius
    const p = pointAt(r, i, n)
    pts.push(`${p.x.toFixed(2)},${p.y.toFixed(2)}`)
  }
  return pts.join(' ')
})

// 数据顶点坐标
const dataVertexPoints = computed(() => {
  const n = count.value
  const pts: { x: number; y: number }[] = []
  for (let i = 0; i < n; i++) {
    const r = (clampScore(props.dimensions[i].score) / 100) * maxRadius
    pts.push(pointAt(r, i, n))
  }
  return pts
})

// 标签位置与对齐方式（根据顶点方位调整 text-anchor）
const labelPoints = computed(() => {
  const n = count.value
  const pts: { x: number; y: number; anchor: string }[] = []
  for (let i = 0; i < n; i++) {
    const p = pointAt(labelRadius, i, n)
    const angle = (-90 + (360 / n) * i) * Math.PI / 180
    const cos = Math.cos(angle)
    let anchor = 'middle'
    if (cos > 0.3) anchor = 'start'
    else if (cos < -0.3) anchor = 'end'
    pts.push({ x: p.x, y: p.y, anchor })
  }
  return pts
})

const scoreText = computed(() => {
  if (props.score == null) return ''
  return props.score % 1 === 0 ? String(props.score) : props.score.toFixed(1)
})
</script>

<style lang="scss" scoped>
.as-radar-chart {
  width: 100%;
}

.as-radar-chart__title {
  margin-bottom: $s-3;
}

.as-radar-chart__title-text {
  font-size: $font-size-md;
  font-weight: 700;
  color: $ink;
}

/* ===== 空态 ===== */
.as-radar-chart__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: $s-10 $s-6;
}

.as-radar-chart__empty-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: $bg-deep;
  margin-bottom: $s-3;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 40rpx;
    height: 40rpx;
    border: 4rpx solid $line-strong;
    border-radius: 50%;
  }
}

.as-radar-chart__empty-text {
  font-size: $font-size-sm;
  color: $ink-mute;
}

/* ===== 雷达图 ===== */
.as-radar-chart__chart {
  width: 100%;
  max-width: 460rpx;
  margin: 0 auto;
  padding: 0 $s-6;
  box-sizing: border-box;
}

.as-radar-chart__svg {
  width: 100%;
  height: auto;
  display: block;
  // 标签可能略超 viewBox 边界，放行避免被裁切
  overflow: visible;
}

.as-radar-chart__grid {
  fill: none;
  stroke: $line;
  stroke-width: 1;

  &.is-outer {
    stroke: $line-strong;
    stroke-width: 1.5;
  }
}

.as-radar-chart__axis {
  stroke: $line;
  stroke-width: 1;
}

.as-radar-chart__data {
  fill: $primary;
  fill-opacity: 0.18;
  stroke: $primary;
  stroke-width: 2;
  stroke-linejoin: round;
}

.as-radar-chart__vertex {
  fill: $primary;
}

.as-radar-chart__label {
  font-family: $font-sans;
  fill: $ink;
}

/* ===== 综合评分 ===== */
.as-radar-chart__score {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: $s-2;
}

.as-radar-chart__score-value {
  font-family: $font-mono;
  font-size: $font-size-2xl;
  font-weight: 800;
  color: $primary;
  line-height: $lh-tight;
}

.as-radar-chart__score-label {
  font-size: $font-size-xs;
  color: $ink-mute;
  margin-top: $s-1;
}

/* ===== 维度明细条形图 ===== */
.as-radar-chart__details {
  margin-top: $s-4;
  display: flex;
  flex-direction: column;
  gap: $s-2;
}

.as-radar-chart__detail {
  display: flex;
  align-items: center;
  gap: $s-2;
}

.as-radar-chart__detail-label {
  width: 120rpx;
  flex-shrink: 0;
  font-size: $font-size-sm;
  color: $ink-soft;
}

.as-radar-chart__detail-track {
  flex: 1;
  height: 12rpx;
  background: $bg-soft;
  border-radius: $r-full;
  overflow: hidden;
}

.as-radar-chart__detail-bar {
  height: 100%;
  background: linear-gradient(90deg, $primary, $primary-light);
  border-radius: $r-full;
  transition: width $t-slow;
}

.as-radar-chart__detail-score {
  width: 56rpx;
  flex-shrink: 0;
  text-align: right;
  font-family: $font-mono;
  font-size: $font-size-sm;
  font-weight: 600;
  color: $primary;
}
</style>
