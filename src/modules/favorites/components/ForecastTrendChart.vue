<template>
  <view class="forecast-trend-chart">
    <view class="chart-head">
      <view class="chart-title-wrap">
        <text class="chart-title">趋势指标</text>
        <view class="chart-subtitle">
          <view class="metric-dot" :style="{ background: activeColor }"></view>
          <text>{{ activeSeries?.name || '实际 + 预测' }}</text>
        </view>
      </view>
      <Tag type="neutral" size="sm">实际 + 预测</Tag>
    </view>
    <Segmented
      :model-value="activeIndex"
      :items="metricItems"
      full-width
      class="metric-segmented"
      @change="onMetricChange"
    />
    <view class="trend-chart-body">
      <view class="trend-axis-col">
        <text v-for="tick in lineModel.ticks" :key="`axis-${tick.label}`" class="trend-axis-text">{{ tick.label }}</text>
      </view>
      <svg class="trend-svg" viewBox="0 0 360 230" preserveAspectRatio="none">
        <g v-for="tick in lineModel.ticks" :key="tick.label">
          <line :x1="lineModel.plotLeft" :y1="tick.y" :x2="lineModel.plotRight" :y2="tick.y" stroke="#eef2f7" stroke-width="1" />
        </g>
        <line :x1="lineModel.plotLeft" :y1="lineModel.top" :x2="lineModel.plotLeft" :y2="lineModel.bottom" stroke="#d1d5db" stroke-width="1" />
        <line :x1="lineModel.plotLeft" :y1="lineModel.bottom" :x2="lineModel.plotRight" :y2="lineModel.bottom" stroke="#d1d5db" stroke-width="1" />
        <line :x1="lineModel.plotLeft" :y1="lineModel.zeroY" :x2="lineModel.plotRight" :y2="lineModel.zeroY" stroke="#cbd5e1" stroke-width="1" />
        <polyline :points="lineModel.linePoints" fill="none" :stroke="activeColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
        <g v-for="point in lineModel.points" :key="point.key">
          <circle :cx="point.x" :cy="point.y" r="5" :fill="activeColor" stroke="#fff" stroke-width="2" />
        </g>
      </svg>
    </view>
    <view class="trend-value-grid">
      <view v-for="point in lineModel.points" :key="`detail-${point.key}`" class="trend-value-item">
        <text class="trend-value-date">{{ point.date }}</text>
        <text :class="['trend-value-number', point.raw >= 0 ? 'is-up' : 'is-down']">{{ point.text }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Segmented, Tag } from '@/shared/components'
import { compactNumber } from '@/shared/utils/format'

interface SeriesItem {
  name: string
  data: number[]
}

const props = defineProps<{
  categories: string[]
  series: SeriesItem[]
  visible?: boolean
}>()

const activeIndex = ref(0)
const chartColors = ['#e6a23c', '#67c23a', '#f56c6c', '#909399']

const categories = computed(() => props.categories || [])
const visibleSeries = computed(() => (props.series || []).filter(item => item.data?.some(v => Number.isFinite(Number(v)))))
const activeSeries = computed(() => visibleSeries.value[activeIndex.value] || visibleSeries.value[0])
const activeColor = computed(() => chartColors[activeIndex.value % chartColors.length])
const metricItems = computed(() => visibleSeries.value.map((item, index) => ({
  label: item.name,
  value: index,
})))

const lineModel = computed(() => {
  const values = (activeSeries.value?.data || []).map(value => Number(value) || 0)
  const left = 16
  const right = 338
  const top = 24
  const bottom = 180
  if (!values.length) return { points: [], ticks: [], zeroY: 102, linePoints: '', left, right, plotLeft: left, plotRight: right, top, bottom }
  const max = Math.max(0, ...values)
  const min = Math.min(0, ...values)
  const pad = Math.max(2, (max - min) * 0.18)
  const domainMax = max + pad
  const domainMin = min - pad
  const range = Math.max(1, domainMax - domainMin)
  const yFor = (value: number) => top + ((domainMax - value) / range) * (bottom - top)
  const zeroY = yFor(0)
  const points = values.map((value, idx) => {
    const x = values.length === 1 ? (left + right) / 2 : left + (idx / (values.length - 1)) * (right - left)
    const y = yFor(value)
    const isEdgeLeft = idx === 0
    const isEdgeRight = idx === values.length - 1
    const labelX = isEdgeLeft ? x + 2 : isEdgeRight ? x - 2 : x
    const anchor = isEdgeLeft ? 'start' : isEdgeRight ? 'end' : 'middle'
    const labelY = value < 0 ? Math.min(208, y + 18) : Math.max(14, y - 10)
    return {
      key: `${idx}-${value}`,
      x,
      y,
      raw: value,
      labelX,
      labelY,
      dateY: Math.min(224, labelY + 18),
      anchor,
      text: compactNumber(value),
      date: String(categories.value[idx] || '').slice(-4),
      showDate: idx === 0 || idx === values.length - 1 || idx % 2 === 0,
    }
  })
  const ticks = [domainMax, 0, domainMin].map(value => ({ label: compactNumber(value), y: yFor(value) }))
  return { points, ticks, zeroY, linePoints: points.map(point => `${point.x},${point.y}`).join(' '), left, right, plotLeft: left, plotRight: right, top, bottom }
})

function onMetricChange(value: string | number) {
  activeIndex.value = Number(value)
}

watch(() => props.series, () => {
  activeIndex.value = Math.min(activeIndex.value, Math.max(0, visibleSeries.value.length - 1))
}, { deep: true })
</script>

<style lang="scss" scoped>
.forecast-trend-chart {
  padding: 22rpx 0 4rpx;
  margin-bottom: 18rpx;
}

.chart-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 16rpx;
  padding: 0 4rpx;
}

.chart-title-wrap {
  min-width: 0;
}

.chart-title {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: $ink;
}

.chart-subtitle {
  display: flex;
  align-items: center;
  gap: $s-1;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: $ink-mute;
}

.metric-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: $r-full;
  flex-shrink: 0;
}

.metric-segmented {
  width: 100%;
  margin-bottom: 12rpx;
}

.trend-chart-body {
  display: grid;
  grid-template-columns: 46px 1fr;
  column-gap: 4rpx;
  width: 100%;
  height: 230px;
  overflow: visible;
}

.trend-axis-col {
  height: 180px;
  padding-top: 20px;
  padding-bottom: 26px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-end;
  box-sizing: border-box;
}

.trend-axis-text {
  font-size: 21rpx;
  line-height: 1;
  color: $ink-mute;
}

.trend-svg {
  display: block;
  width: 100%;
  height: 230px;
  overflow: visible;
}

.trend-value-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8rpx;
  padding: 0 4rpx 8rpx;
}

.trend-value-item {
  min-width: 0;
  padding: 8rpx 4rpx;
  border-radius: 8rpx;
  background: $bg-soft;
  text-align: center;
}

.trend-value-date {
  display: block;
  font-size: 19rpx;
  line-height: 1.2;
  color: $ink-mute;
}

.trend-value-number {
  display: block;
  margin-top: 4rpx;
  font-size: 20rpx;
  line-height: 1.2;
  font-weight: 700;

  &.is-up { color: $up; }
  &.is-down { color: $down; }
}
</style>
