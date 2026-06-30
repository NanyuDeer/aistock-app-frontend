<template>
  <view class="as-radar">
    <view v-if="title" class="as-radar-header">
      <text class="as-radar-title">{{ title }}</text>
      <text v-if="score !== undefined" class="as-radar-score">综合 {{ score }} 分</text>
    </view>
    <view v-if="!dimensions.length" class="as-radar-empty">
      <text class="as-radar-empty-text">暂无评分数据</text>
    </view>
    <!-- #ifdef H5 -->
    <canvas v-else ref="canvasRef" :id="canvasId" class="as-radar-canvas" />
    <!-- #endif -->
    <!-- #ifndef H5 -->
    <canvas v-else :canvas-id="canvasId" :id="canvasId" class="as-radar-canvas" />
    <!-- #endif -->
    <view v-if="dimensions.length" class="as-radar-list">
      <view v-for="(dim, idx) in dimensions" :key="idx" class="as-radar-item">
        <text class="as-radar-label">{{ dim.label }}</text>
        <view class="as-radar-bar-wrap">
          <view class="as-radar-bar" :style="{ width: dim.score + '%' }" />
        </view>
        <text class="as-radar-value">{{ dim.score }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue'
import uCharts from '@qiun/ucharts'

interface Dimension {
  label: string
  score: number
  comment?: string
}

const props = withDefaults(defineProps<{
  dimensions: Dimension[]
  title?: string
  score?: number
}>(), {
  title: '',
  score: undefined
})

const canvasId = `radar_${Date.now()}_${Math.floor(Math.random() * 1000)}`
const canvasRef = ref<HTMLCanvasElement | null>(null)
let chartInstance: any = null

async function renderChart() {
  if (!props.dimensions.length) return
  await nextTick()
  try {
    const categories = props.dimensions.map(d => d.label)
    const series = [{
      name: '评分',
      data: props.dimensions.map(d => d.score)
    }]

    const opts: any = {
      type: 'radar',
      context: getCanvasContext(),
      width: getCanvasWidth(),
      height: 220,
      categories,
      series,
      animation: true,
      background: '#ffffff',
      padding: [10, 10, 10, 10],
      legend: { show: false },
      extra: {
        radar: {
          max: 100,
          opacity: 0.6,
          border: true
        }
      }
    }
    chartInstance = new uCharts(opts)
  } catch (e) {
    console.error('[RadarChart] render failed:', e)
  }
}

function getCanvasContext(): any {
  // #ifdef H5
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement
  if (canvas) {
    const dpr = window.devicePixelRatio || 1
    canvas.width = canvas.offsetWidth * dpr
    canvas.height = 220 * dpr
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)
    return ctx
  }
  return null
  // #endif
  // #ifndef H5
  return uni.createCanvasContext(canvasId)
  // #endif
}

function getCanvasWidth(): number {
  // #ifdef H5
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement
  return canvas?.offsetWidth || 300
  // #endif
  // #ifndef H5
  return 300
  // #endif
}

watch(() => props.dimensions, () => renderChart(), { deep: true })

onMounted(() => {
  if (props.dimensions.length) renderChart()
})
</script>

<style lang="scss" scoped>
.as-radar { background: #ffffff; border-radius: 12rpx; padding: 24rpx; }

.as-radar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.as-radar-title { font-size: 28rpx; font-weight: 600; color: #1a1d24; }
.as-radar-score { font-size: 24rpx; color: #4d7cfe; font-weight: 600; }

.as-radar-canvas { width: 100%; height: 440rpx; }

.as-radar-empty { height: 200rpx; display: flex; align-items: center; justify-content: center; }
.as-radar-empty-text { font-size: 26rpx; color: #9ca3af; }

.as-radar-list { margin-top: 16rpx; }
.as-radar-item { display: flex; align-items: center; gap: 12rpx; margin-bottom: 12rpx; }
.as-radar-label { font-size: 24rpx; color: #6b7280; width: 120rpx; flex-shrink: 0; }
.as-radar-bar-wrap { flex: 1; height: 12rpx; background: #f5f7fa; border-radius: 6rpx; overflow: hidden; }
.as-radar-bar { height: 100%; background: linear-gradient(90deg, #4d7cfe, #6366f1); border-radius: 6rpx; transition: width 0.3s; }
.as-radar-value { font-size: 22rpx; color: #1a1d24; font-weight: 600; width: 48rpx; text-align: right; }
</style>
