<template>
  <view class="as-kline">
    <view class="as-kline-header">
      <text class="as-kline-title">{{ title }}</text>
      <view class="as-kline-periods">
        <text
          v-for="p in periods"
          :key="p.value"
          :class="['as-kline-period', currentPeriod === p.value ? 'active' : '']"
          @tap="switchPeriod(p.value)"
        >{{ p.label }}</text>
      </view>
    </view>
    <view v-if="loading" class="as-kline-loading">
      <text class="as-kline-loading-text">加载中...</text>
    </view>
    <view v-else-if="!klineData.length" class="as-kline-empty">
      <text class="as-kline-empty-text">暂无K线数据</text>
    </view>
    <!-- #ifdef H5 -->
    <canvas v-else ref="canvasRef" :id="canvasId" class="as-kline-canvas" />
    <!-- #endif -->
    <!-- #ifndef H5 -->
    <canvas v-else :canvas-id="canvasId" :id="canvasId" class="as-kline-canvas" @touchstart="touchChart" @touchmove="moveChart" @touchend="touchEnd" />
    <!-- #endif -->
  </view>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue'
import uCharts from '@qiun/ucharts'

interface KLineItem {
  date: string
  open: number
  close: number
  high: number
  low: number
  volume?: number
}

type Period = 'daily' | 'weekly' | 'monthly'

const props = withDefaults(defineProps<{
  klineData: KLineItem[]
  title?: string
  loading?: boolean
  period?: Period
}>(), {
  title: 'K线图',
  loading: false,
  period: 'daily'
})

const emit = defineEmits<{ (e: 'period-change', p: Period): void }>()

const periods = [
  { label: '日K', value: 'daily' as Period },
  { label: '周K', value: 'weekly' as Period },
  { label: '月K', value: 'monthly' as Period }
]

const currentPeriod = ref<Period>(props.period)
const canvasId = `kline_${Date.now()}_${Math.floor(Math.random() * 1000)}`
const canvasRef = ref<HTMLCanvasElement | null>(null)
let chartInstance: any = null

function switchPeriod(p: Period) {
  if (currentPeriod.value === p) return
  currentPeriod.value = p
  emit('period-change', p)
}

async function renderChart() {
  if (!props.klineData.length) return
  await nextTick()
  try {
    const categories = props.klineData.map(d => d.date)
    const series = [{
      name: 'K线',
      data: props.klineData.map(d => [d.open, d.close, d.low, d.high])
    }]

    const opts: any = {
      type: 'candle',
      context: getCanvasContext(),
      width: getCanvasWidth(),
      height: getCanvasHeight(),
      categories,
      series,
      animation: false,
      background: '#ffffff',
      color: ['#4d7cfe'],
      padding: [10, 10, 10, 10],
      enableScroll: true,
      legend: { show: false },
      xAxis: {
        disableGrid: false,
        labelCount: 5,
        fontColor: '#6b7280',
        fontSize: 10
      },
      yAxis: {
        disabled: false,
        position: 'right',
        fontColor: '#6b7280',
        fontSize: 10,
        splitNumber: 4
      },
      candle: {
        color: {
          upLine: '#f43f5e',
          upFill: '#f43f5e',
          downLine: '#22c55e',
          downFill: '#22c55e'
        }
      }
    }
    chartInstance = new uCharts(opts)
  } catch (e) {
    console.error('[KLineChart] render failed:', e)
  }
}

function getCanvasContext(): any {
  // #ifdef H5
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement
  if (canvas) {
    const dpr = window.devicePixelRatio || 1
    canvas.width = canvas.offsetWidth * dpr
    canvas.height = canvas.offsetHeight * dpr
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
  return canvas?.offsetWidth || 320
  // #endif
  // #ifndef H5
  return 320
  // #endif
}

function getCanvasHeight(): number {
  return 220
}

function touchChart(e: any) {
  chartInstance?.scrollStart?.(e)
}
function moveChart(e: any) {
  chartInstance?.scroll?.(e)
}
function touchEnd(e: any) {
  chartInstance?.scrollEnd?.(e)
}

watch(() => props.klineData, () => renderChart(), { deep: true })

onMounted(() => {
  if (props.klineData.length) renderChart()
})
</script>

<style lang="scss" scoped>
.as-kline { background: #ffffff; border-radius: 12rpx; padding: 24rpx; }

.as-kline-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.as-kline-title { font-size: 28rpx; font-weight: 600; color: #1a1d24; }
.as-kline-periods { display: flex; gap: 8rpx; }
.as-kline-period {
  font-size: 22rpx; color: #6b7280; padding: 4rpx 16rpx; border-radius: 12rpx;
  background: #f5f7fa;
}
.as-kline-period.active { color: #4d7cfe; background: rgba(77, 124, 254, 0.1); }

.as-kline-canvas { width: 100%; height: 440rpx; }

.as-kline-loading, .as-kline-empty { height: 440rpx; display: flex; align-items: center; justify-content: center; }
.as-kline-loading-text, .as-kline-empty-text { font-size: 26rpx; color: #9ca3af; }
</style>
