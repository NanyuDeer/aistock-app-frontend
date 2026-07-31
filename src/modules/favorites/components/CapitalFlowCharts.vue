<template>
  <view class="capital-flow-charts">
    <view class="flow-overview">
      <text class="flow-overview-note">{{ summaryNote }}</text>
    </view>

    <view v-if="orders.length" class="flow-chart-panel">
      <view class="chart-head">
        <text class="chart-title">资金拆解</text>
        <Tag type="neutral" size="sm">亿元</Tag>
      </view>
      <view class="balance-axis">
        <text>流出</text>
        <text>流入</text>
      </view>
      <view class="balance-track">
        <view class="balance-center-line"></view>
        <view
          v-for="seg in splitSegments"
          :key="seg.key"
          class="balance-seg"
          :class="seg.isPositive ? 'is-up' : 'is-down'"
          :style="seg.style"
        ></view>
      </view>
      <view class="split-legend">
        <view v-for="item in breakdownRows" :key="item.key" class="split-legend-item">
          <text class="split-name">{{ item.label }}</text>
          <text :class="['split-value', item.isPositive ? 'is-up' : 'is-down']">{{ formatSigned(item.value) }}</text>
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
        <svg class="trend-svg" viewBox="0 0 360 218" preserveAspectRatio="none">
          <defs>
            <linearGradient id="trendUpBar" x1="0" x2="0" y1="1" y2="0">
              <stop offset="0%" stop-color="#fecdd3" />
              <stop offset="100%" stop-color="#ef4444" />
            </linearGradient>
            <linearGradient id="trendDownBar" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stop-color="#bbf7d0" />
              <stop offset="100%" stop-color="#22c55e" />
            </linearGradient>
          </defs>
          <g v-for="tick in trendModel.ticks" :key="`tick-${tick.label}`">
            <line :x1="trendModel.plotLeft" :y1="tick.y" :x2="trendModel.plotRight" :y2="tick.y" stroke="#eef2f7" stroke-width="1" stroke-dasharray="4 6" />
          </g>
          <line :x1="trendModel.plotLeft" :y1="trendModel.bottom" :x2="trendModel.plotRight" :y2="trendModel.bottom" stroke="#d8dee8" stroke-width="1" />
          <line :x1="trendModel.plotLeft" :y1="trendModel.zeroY" :x2="trendModel.plotRight" :y2="trendModel.zeroY" stroke="#94a3b8" stroke-width="1.4" />
          <g v-for="point in trendModel.points" :key="point.key">
            <rect
              :x="point.barX"
              :y="point.barY"
              :width="trendModel.barWidth"
              :height="point.barHeight"
              :fill="point.raw >= 0 ? 'url(#trendUpBar)' : 'url(#trendDownBar)'"
              rx="5"
            />
            <circle v-if="point.isLatest" :cx="point.x" :cy="point.raw >= 0 ? point.barY : point.barY + point.barHeight" r="4" :fill="point.raw >= 0 ? '#ef4444' : '#22c55e'" stroke="#fff" stroke-width="2" />
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
  mainInflow?: number
  ratio?: string | number
  fiveDay?: number
  streak?: string
  narrative?: string
  risk?: string
  orders?: FlowOrder[]
  trend?: number[]
  trendDates?: string[]
  trendBadge?: string
}>()

const summaryNote = computed(() => props.narrative || props.trendBadge || '先看总量，再看结构和节奏')
const orders = computed(() => (props.orders || []).filter(item => item.label && item.value !== null && item.value !== undefined))
const trend = computed(() => props.trend || [])
const trendDates = computed(() => props.trendDates?.length ? props.trendDates : trend.value.map((_, idx) => `${idx + 1}`))

const breakdownRows = computed(() => {
  const values = orders.value.map(item => Number(item.value) || 0)
  const maxAbs = Math.max(0.01, ...values.map(value => Math.abs(value)))
  return orders.value.map((item, idx) => {
    const value = Number(item.value) || 0
    return {
      key: `${item.label}-${idx}-${value}`,
      label: item.label,
      value,
      isPositive: value >= 0,
      share: Math.round((Math.abs(value) / maxAbs) * 100),
    }
  })
})

const splitSegments = computed(() => {
  const values = orders.value.map(item => Number(item.value) || 0)
  const maxAbs = Math.max(0.01, ...values.map(value => Math.abs(value)))
  const positive: Array<{ key: string; style: Record<string, string>; isPositive: boolean }> = []
  const negative: Array<{ key: string; style: Record<string, string>; isPositive: boolean }> = []
  let positiveOffset = 0
  let negativeOffset = 0

  orders.value.forEach((item, idx) => {
    const value = Number(item.value) || 0
    const width = Math.max(6, (Math.abs(value) / maxAbs) * 50)
    if (value >= 0) {
      const size = Math.min(50 - positiveOffset, width)
      positive.push({
        key: `${item.label}-${idx}-${value}`,
        isPositive: true,
        style: {
          left: `${50 + positiveOffset}%`,
          width: `${size}%`,
        },
      })
      positiveOffset += size
    } else {
      const size = Math.min(50 - negativeOffset, width)
      negative.push({
        key: `${item.label}-${idx}-${value}`,
        isPositive: false,
        style: {
          left: `${Math.max(0, 50 - negativeOffset - size)}%`,
          width: `${size}%`,
        },
      })
      negativeOffset += size
    }
  })

  return [...negative, ...positive]
})

const trendModel = computed(() => {
  const values = trend.value.map(value => Number(value) || 0)
  const left = 8
  const right = 340
  const top = 20
  const bottom = 172
  if (!values.length) {
    return { points: [], ticks: [], zeroY: 106, linePoints: '', areaPoints: '', left, right, plotLeft: left, plotRight: right, top, bottom }
  }

  const max = Math.max(0, ...values)
  const min = Math.min(0, ...values)
  const pad = Math.max(0.3, (max - min) * 0.16)
  const domainMax = max + pad
  const domainMin = min - pad
  const range = Math.max(1, domainMax - domainMin)
  const yFor = (value: number) => top + ((domainMax - value) / range) * (bottom - top)
  const zeroY = yFor(0)
  const slot = values.length <= 1 ? right - left : (right - left) / values.length
  const barWidth = Math.min(18, Math.max(10, slot * 0.48))

  const points = values.map((value, idx) => {
    const x = left + slot * idx + slot / 2
    const y = yFor(value)
    const barHeight = Math.max(4, Math.abs(y - zeroY))
    return {
      key: `${idx}-${value}`,
      x,
      y,
      raw: value,
      isLatest: idx === values.length - 1,
      barX: x - barWidth / 2,
      barY: value >= 0 ? y : zeroY,
      barHeight,
      text: formatSigned(value),
      date: formatDateLabel(trendDates.value[idx] || `${idx + 1}`),
    }
  })

  const linePoints = points.map(point => `${point.x},${point.y}`).join(' ')
  const areaPoints = `${left},${zeroY} ${linePoints} ${right},${zeroY}`
  const ticks = [domainMax, 0, domainMin].map(value => ({ label: compactNumber(value), y: yFor(value) }))
  return { points, ticks, zeroY, linePoints, areaPoints, left, right, plotLeft: left, plotRight: right, top, bottom, barWidth }
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
  gap: 22rpx;
}

.flow-overview,
.flow-panel {
  padding: 18rpx;
  border-radius: 18rpx;
  background: #f8fafc;
  border: 1rpx solid #eef2f7;
}

.flow-overview-note {
  display: block;
  font-size: 25rpx;
  line-height: 1.55;
  color: #334155;
  word-break: break-word;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 14rpx;
}

.panel-title-wrap {
  min-width: 0;
}

.panel-title {
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

.balance-axis {
  display: flex;
  align-items: center;
  padding-bottom: 8rpx;
  font-size: 20rpx;
  color: $ink-mute;
}

.balance-axis text:last-child {
  margin-left: auto;
}

.balance-track {
  position: relative;
  height: 24rpx;
  background: #edf2f7;
  border-radius: 999rpx;
  overflow: hidden;
  margin-bottom: 16rpx;
}

.balance-center-line {
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 1px;
  transform: translateX(-0.5px);
  background: rgba(148, 163, 184, 0.7);
}

.balance-seg {
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: 999rpx;
  opacity: 0.95;

  &.is-up {
    background: linear-gradient(90deg, #fecdd3, #ef4444);
  }

  &.is-down {
    background: linear-gradient(90deg, #34d399, #22c55e);
  }
}

.split-legend {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10rpx;
}

.split-legend-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
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

.split-value {
  flex-shrink: 0;
  font-size: 22rpx;
  line-height: 1.35;
  font-weight: 800;

  &.is-up { color: $up; }
  &.is-down { color: $down; }
}

.trend-chart {
  display: grid;
  grid-template-columns: 36px 1fr;
  column-gap: 4rpx;
  width: 100%;
  height: 218px;
  overflow: visible;
  padding-top: 4rpx;
  box-sizing: border-box;
}

.trend-axis-col {
  height: 172px;
  padding-top: 18px;
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
  height: 218px;
  overflow: visible;
}

.trend-value-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8rpx 10rpx;
  padding: 4rpx 2rpx 6rpx;
}

.trend-value-item {
  min-width: 0;
  padding: 6rpx 4rpx;
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
  font-size: 21rpx;
  line-height: 1.2;
  font-weight: 800;

  &.is-up { color: $up; }
  &.is-down { color: $down; }
}
</style>
