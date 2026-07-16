<template>
  <view class="trend-kline">
    <view class="chart-heading">
      <text class="chart-title">{{ title }}</text>
      <text v-if="dateRange" class="chart-range">{{ dateRange }}</text>
    </view>
    <view v-if="!points.length" class="chart-empty">暂无K线数据</view>
    <!-- #ifdef H5 -->
    <canvas v-else :id="canvasId" class="chart-canvas" />
    <!-- #endif -->
    <!-- #ifndef H5 -->
    <canvas
      v-else
      :id="canvasId"
      :canvas-id="canvasId"
      class="chart-canvas"
      @touchstart="touchStart"
      @touchmove="touchMove"
      @touchend="touchEnd"
    />
    <!-- #endif -->
  </view>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, watch } from 'vue'
import uCharts from '@qiun/ucharts'
import type { TrendKLineData } from '@/shared/api/modules/trend-score'

const props = defineProps<{
  title: string
  data: TrendKLineData
}>()

const canvasId = `trend_kline_${Date.now()}_${Math.floor(Math.random() * 10000)}`
let chart: any = null

const points = computed(() => {
  const length = Math.min(props.data?.dates?.length || 0, props.data?.ohlc?.length || 0)
  return Array.from({ length }, (_, index) => ({
    date: props.data.dates[index],
    value: props.data.ohlc[index],
  }))
})

const dateRange = computed(() => {
  if (!points.value.length) return ''
  const first = formatDate(points.value[0].date)
  const last = formatDate(points.value[points.value.length - 1].date)
  return `${first} - ${last}`
})

function formatDate(value: string): string {
  const text = String(value || '').replace(/-/g, '')
  return text.length >= 8 ? `${text.slice(4, 6)}-${text.slice(6, 8)}` : value
}

function getWidth(): number {
  // #ifdef H5
  const host = document.getElementById(canvasId) as HTMLElement | null
  const canvas = host instanceof HTMLCanvasElement ? host : host?.querySelector('canvas')
  return host?.offsetWidth || canvas?.offsetWidth || 320
  // #endif
  // #ifndef H5
  try {
    return Math.max(280, (uni.getSystemInfoSync().windowWidth || 360) - 48)
  } catch {
    return 320
  }
  // #endif
}

function getContext(): any {
  // #ifdef H5
  const host = document.getElementById(canvasId) as HTMLElement | null
  const canvas = host instanceof HTMLCanvasElement ? host : host?.querySelector('canvas')
  if (!canvas) return null
  const dpr = window.devicePixelRatio || 1
  canvas.width = canvas.offsetWidth * dpr
  canvas.height = 190 * dpr
  const context = canvas.getContext('2d')
  context?.scale(dpr, dpr)
  return context
  // #endif
  // #ifndef H5
  return uni.createCanvasContext(canvasId)
  // #endif
}

async function renderChart() {
  if (!points.value.length) return
  await nextTick()
  const context = getContext()
  if (!context) return

  chart = new uCharts({
    type: 'candle',
    context,
    width: getWidth(),
    height: 190,
    categories: points.value.map((item) => formatDate(item.date)),
    series: [{ name: titleSafe(), data: points.value.map((item) => item.value) }],
    animation: false,
    background: '#ffffff',
    padding: [8, 8, 4, 2],
    enableScroll: points.value.length > 45,
    legend: { show: false },
    xAxis: {
      disableGrid: false,
      gridColor: '#f0f2f5',
      itemCount: Math.min(40, points.value.length),
      scrollAlign: 'right',
      labelCount: 4,
      fontColor: '#9ca3af',
      fontSize: 10,
    },
    yAxis: {
      position: 'right',
      gridColor: '#f0f2f5',
      fontColor: '#9ca3af',
      fontSize: 10,
      splitNumber: 4,
      data: [{ tofix: 2 }],
    },
    candle: {
      color: {
        upLine: '#f43f5e',
        upFill: '#f43f5e',
        downLine: '#22c55e',
        downFill: '#22c55e',
      },
    },
    extra: { candle: { average: { show: false } } },
  } as any)
}

function titleSafe(): string {
  return props.title || 'K线'
}

function touchStart(event: any) { chart?.scrollStart?.(event) }
function touchMove(event: any) { chart?.scroll?.(event) }
function touchEnd(event: any) { chart?.scrollEnd?.(event) }

watch(() => props.data, renderChart, { deep: true })
onMounted(renderChart)
</script>

<style lang="scss" scoped>
@import '@/shared/styles/variables.scss';

.trend-kline {
  padding: $spacing-base;
  border-bottom: 1rpx solid $border-color-light;
}

.chart-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-sm;
  margin-bottom: $spacing-sm;
}

.chart-title {
  color: $text-color-title;
  font-size: $font-size-base;
  font-weight: 600;
}

.chart-range {
  color: $text-color-tertiary;
  font-size: $font-size-xs;
}

.chart-canvas {
  width: 100%;
  height: 380rpx;
}

.chart-empty {
  height: 240rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $text-color-tertiary;
  font-size: $font-size-sm;
}
</style>
