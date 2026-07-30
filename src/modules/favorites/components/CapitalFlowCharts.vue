<template>
  <view class="capital-flow-charts">
    <view v-if="orders.length" class="flow-chart-panel">
      <view class="chart-head">
        <text class="chart-title">资金拆解</text>
        <Tag type="neutral" size="sm">亿元</Tag>
      </view>
      <view class="split-chart-stage">
        <view class="split-axis-col">
          <view class="split-axis-text">{{ compactNumber(splitModel.maxAbs) }}</view>
          <view class="split-axis-text">0</view>
          <view class="split-axis-text">{{ compactNumber(-splitModel.maxAbs) }}</view>
        </view>
        <svg class="split-svg" viewBox="0 0 360 172" preserveAspectRatio="none">
          <line :x1="splitModel.left" :y1="splitModel.top" :x2="splitModel.right" :y2="splitModel.top" stroke="#eef2f7" stroke-width="1" />
          <line :x1="splitModel.left" :y1="splitModel.zeroY" :x2="splitModel.right" :y2="splitModel.zeroY" stroke="#94a3b8" stroke-width="1" />
          <line :x1="splitModel.left" :y1="splitModel.bottom" :x2="splitModel.right" :y2="splitModel.bottom" stroke="#eef2f7" stroke-width="1" />
          <line :x1="splitModel.left" :y1="splitModel.top" :x2="splitModel.left" :y2="splitModel.bottom" stroke="#d1d5db" stroke-width="1" />
          <g v-for="bar in splitModel.bars" :key="bar.key">
            <rect :x="bar.x - splitModel.barWidth / 2" :y="bar.y" :width="splitModel.barWidth" :height="bar.height" :fill="bar.color" rx="4" />
          </g>
        </svg>
      </view>
      <view class="order-legend-grid">
        <view v-for="item in orders" :key="item.label" class="order-legend-item">
          <view :class="['order-dot', item.value >= 0 ? 'is-up' : 'is-down']"></view>
          <text class="order-label">{{ item.label }}</text>
          <text :class="['order-value', item.value >= 0 ? 'is-up' : 'is-down']">{{ formatSigned(item.value) }}</text>
        </view>
      </view>
    </view>

    <view v-if="trendModel.points.length" class="flow-chart-panel">
      <view class="chart-head">
        <view class="chart-title-wrap">
          <text class="chart-title">10日资金趋势</text>
          <Badge v-if="trendBadge" type="gold">{{ trendBadge }}</Badge>
        </view>
        <Tag type="neutral" size="sm">亿元</Tag>
      </view>
      <view class="trend-chart">
        <view class="trend-axis-col">
          <text v-for="tick in trendModel.ticks" :key="`axis-${tick.label}`" class="trend-axis-text">{{ tick.label }}</text>
        </view>
        <svg class="trend-svg" viewBox="0 0 360 236" preserveAspectRatio="none">
          <g v-for="tick in trendModel.ticks" :key="`tick-${tick.label}`">
            <line :x1="trendModel.plotLeft" :y1="tick.y" :x2="trendModel.plotRight" :y2="tick.y" stroke="#eef2f7" stroke-width="1" />
          </g>
          <line :x1="trendModel.plotLeft" :y1="trendModel.top" :x2="trendModel.plotLeft" :y2="trendModel.bottom" stroke="#d1d5db" stroke-width="1" />
          <line :x1="trendModel.plotLeft" :y1="trendModel.bottom" :x2="trendModel.plotRight" :y2="trendModel.bottom" stroke="#d1d5db" stroke-width="1" />
          <line :x1="trendModel.plotLeft" :y1="trendModel.zeroY" :x2="trendModel.plotRight" :y2="trendModel.zeroY" stroke="#94a3b8" stroke-width="1" />
          <polyline :points="trendModel.linePoints" fill="none" stroke="#f97316" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
          <g v-for="point in trendModel.points" :key="point.key">
            <circle :cx="point.x" :cy="point.y" r="5" fill="#f97316" stroke="#fff" stroke-width="2" />
          </g>
        </svg>
      </view>
      <view class="trend-value-grid">
        <view v-for="point in trendModel.points" :key="`detail-${point.key}`" class="trend-value-item">
          <text class="trend-value-date">{{ point.date }}</text>
          <text :class="['trend-value-number', point.raw >= 0 ? 'is-up' : 'is-down']">{{ point.text }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Tag, Badge } from '@/shared/components'
import { compactNumber } from '@/shared/utils/format'

interface FlowOrder {
  label: string
  value: number
}

const props = defineProps<{
  orders?: FlowOrder[]
  trend?: number[]
  trendDates?: string[]
  trendBadge?: string
}>()

const UP_COLOR = '#ef4444'
const DOWN_COLOR = '#22c55e'
const orders = computed(() => (props.orders || []).filter(item => item.label && item.value !== null && item.value !== undefined))
const trend = computed(() => props.trend || [])
const trendDates = computed(() => props.trendDates?.length ? props.trendDates : trend.value.map((_, idx) => `${idx + 1}`))
const splitMaxAbs = computed(() => Math.max(0.01, ...orders.value.map(item => Math.abs(Number(item.value) || 0))))

const splitModel = computed(() => {
  const values = orders.value.map(item => Number(item.value) || 0)
  const left = 16
  const right = 338
  const top = 18
  const bottom = 150
  const zeroY = (top + bottom) / 2
  const maxAbs = Math.max(0.01, ...values.map(value => Math.abs(value)))
  const slot = (right - left) / Math.max(1, values.length)
  const barWidth = Math.min(28, Math.max(18, slot * 0.36))
  const bars = values.map((value, idx) => {
    const height = Math.max(4, Math.abs(value) / maxAbs * ((bottom - top) / 2 - 12))
    const isUp = value >= 0
    return {
      key: `${orders.value[idx]?.label || idx}-${value}`,
      x: left + slot * idx + slot / 2,
      y: isUp ? zeroY - height : zeroY,
      height,
      color: isUp ? UP_COLOR : DOWN_COLOR,
    }
  })
  return { bars, maxAbs, left, right, top, bottom, zeroY, barWidth }
})

const trendModel = computed(() => {
  const values = trend.value.map(value => Number(value) || 0)
  const left = 16
  const right = 338
  const top = 24
  const bottom = 188
  if (!values.length) return { points: [], ticks: [], zeroY: 106, linePoints: '', left, right, plotLeft: left, plotRight: right, top, bottom }
  const max = Math.max(0, ...values)
  const min = Math.min(0, ...values)
  const pad = Math.max(0.3, (max - min) * 0.16)
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
    const labelY = value < 0 ? Math.min(214, y + 18) : Math.max(14, y - 10)
    return {
      key: `${idx}-${value}`,
      x,
      y,
      raw: value,
      labelX,
      labelY,
      dateY: Math.min(230, labelY + 18),
      anchor,
      text: formatSigned(value),
      date: formatDateLabel(trendDates.value[idx] || `${idx + 1}`),
      showDate: idx === 0 || idx === values.length - 1 || idx === Math.floor((values.length - 1) / 2),
    }
  })
  const ticks = [domainMax, 0, domainMin].map(value => ({
    label: compactNumber(value),
    y: yFor(value),
  }))
  return { points, ticks, zeroY, linePoints: points.map(point => `${point.x},${point.y}`).join(' '), left, right, plotLeft: left, plotRight: right, top, bottom }
})

function formatSigned(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${compactNumber(value)}`
}

function formatDateLabel(value: string): string {
  const text = String(value || '')
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(5, 10)
  if (/^\d{8}$/.test(text)) return `${text.slice(4, 6)}/${text.slice(6, 8)}`
  return text.slice(0, 5)
}
</script>

<style lang="scss" scoped>
.capital-flow-charts {
  display: flex;
  flex-direction: column;
  gap: 28rpx;
}

.flow-chart-panel {
  padding: 18rpx 0 2rpx;
}

.chart-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
  padding: 0 4rpx;
  margin-bottom: 10rpx;
}

.chart-title-wrap {
  min-width: 0;
}

.chart-title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: $ink;
}

.split-chart-stage {
  display: grid;
  grid-template-columns: 46px 1fr;
  column-gap: 4rpx;
  height: 172px;
  margin-top: 4rpx;
  box-sizing: border-box;
  background: $bg-card;
}

.split-axis-col {
  height: 150px;
  padding-top: 18px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-end;
  box-sizing: border-box;
}

.split-axis-text {
  font-size: 21rpx;
  line-height: 1;
  color: $ink-mute;
}

.split-svg {
  display: block;
  width: 100%;
  height: 172px;
  overflow: visible;
}

.order-legend-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10rpx 16rpx;
  margin-top: 12rpx;
  padding: 0 4rpx;
}

.order-legend-item {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 8rpx;
  padding: 8rpx 10rpx;
  border-radius: 8rpx;
  background: $bg-soft;
}

.order-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 999rpx;
  flex-shrink: 0;

  &.is-up { background: $up; }
  &.is-down { background: $down; }
}

.order-label {
  flex: 1;
  min-width: 0;
  font-size: 22rpx;
  color: $ink-soft;
}

.order-value {
  flex-shrink: 0;
  font-size: 22rpx;
  font-weight: 700;

  &.is-up { color: $up; }
  &.is-down { color: $down; }
}

.trend-chart {
  display: grid;
  grid-template-columns: 46px 1fr;
  column-gap: 4rpx;
  width: 100%;
  height: 236px;
  overflow: visible;
}

.trend-axis-col {
  height: 188px;
  padding-top: 20px;
  padding-bottom: 28px;
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
  height: 236px;
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
