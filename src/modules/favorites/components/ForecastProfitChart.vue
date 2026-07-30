<template>
  <view class="forecast-profit-chart">
    <view class="chart-head">
      <view>
        <text class="chart-title">净利润预测趋势</text>
        <text class="chart-subtitle">实际 + 预测</text>
      </view>
      <Tag type="neutral" size="sm">亿元</Tag>
    </view>
    <view class="chart-legend">
      <view class="legend-item"><view class="legend-line is-actual"></view><text>实际</text></view>
      <view class="legend-item"><view class="legend-line is-forecast"></view><text>预测</text></view>
    </view>
    <view class="profit-chart-body">
      <view class="profit-axis-col">
        <text v-for="tick in chartModel.ticks" :key="`axis-${tick.label}`" class="profit-axis-text">{{ tick.label }}</text>
      </view>
      <svg class="profit-svg" viewBox="0 0 360 224" preserveAspectRatio="none">
        <rect
          v-if="chartModel.forecastBand"
          :x="chartModel.forecastBand.x"
          :y="chartModel.top"
          :width="chartModel.forecastBand.width"
          :height="chartModel.baseY - chartModel.top"
          fill="rgba(245, 158, 11, 0.08)"
          rx="8"
        />
        <g v-for="tick in chartModel.ticks" :key="tick.label">
          <line :x1="chartModel.plotLeft" :y1="tick.y" :x2="chartModel.plotRight" :y2="tick.y" stroke="#eef2f7" stroke-width="1" />
        </g>
        <line :x1="chartModel.plotLeft" :y1="chartModel.baseY" :x2="chartModel.plotRight" :y2="chartModel.baseY" stroke="#cbd5e1" stroke-width="1" />
        <line
          v-if="chartModel.forecastDividerX"
          :x1="chartModel.forecastDividerX"
          :y1="chartModel.top"
          :x2="chartModel.forecastDividerX"
          :y2="chartModel.baseY"
          stroke="#f59e0b"
          stroke-width="1"
          stroke-dasharray="4 5"
        />
        <g v-for="bar in chartModel.bars" :key="bar.year">
          <rect :x="bar.x - chartModel.barWidth / 2" :y="bar.y" :width="chartModel.barWidth" :height="bar.height" rx="5" :fill="bar.color" />
          <text :x="bar.x" :y="bar.labelY" text-anchor="middle" :fill="bar.color" class="profit-bar-label">{{ bar.valueText }}</text>
        </g>
      </svg>
    </view>
    <view class="profit-value-grid">
      <view v-for="bar in chartModel.bars" :key="`detail-${bar.year}`" class="profit-value-item">
        <text class="profit-value-year">{{ bar.year }}</text>
        <text :class="['profit-value-number', bar.kind === 'forecast' ? 'is-forecast' : 'is-actual']">{{ bar.valueText }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Tag } from '@/shared/components'
import { compactNumber } from '@/shared/utils/format'

interface ProfitPoint {
  year: string
  value: number
  kind?: 'actual' | 'forecast'
}

const props = withDefaults(defineProps<{
  items: ProfitPoint[]
  visible?: boolean
}>(), {
  visible: true,
})

const points = computed(() => props.items || [])

const chartModel = computed(() => {
  const values = points.value.map(item => Number(item.value) || 0)
  const axisLeft = 8
  const barLeft = 42
  const right = 342
  const top = 24
  const baseY = 172
  const maxValue = Math.max(0.01, ...values) * 1.12
  const count = Math.max(1, points.value.length)
  const slot = count <= 1 ? right - barLeft : (right - barLeft) / (count - 1)
  const barWidth = Math.min(24, Math.max(16, slot * 0.34))
  const bars = points.value.map((item, idx) => {
    const x = count === 1 ? (barLeft + right) / 2 : barLeft + (idx / (count - 1)) * (right - barLeft)
    const height = Math.max(8, Math.min(124, ((Number(item.value) || 0) / maxValue) * 124))
    const kind = item.kind || 'actual'
    return {
      year: item.year,
      valueText: compactNumber(Number(item.value) || 0),
      kind,
      x,
      y: baseY - height,
      labelY: Math.max(top + 10, baseY - height - 8),
      height,
      color: kind === 'forecast' ? '#e6a23c' : '#409eff',
    }
  })
  const firstForecastIndex = bars.findIndex(bar => bar.kind === 'forecast')
  const forecastDividerX = firstForecastIndex > 0
    ? (bars[firstForecastIndex - 1].x + bars[firstForecastIndex].x) / 2
    : null
  const forecastBand = firstForecastIndex >= 0
    ? {
        x: forecastDividerX ?? Math.max(axisLeft, bars[firstForecastIndex].x - barWidth),
        width: right - (forecastDividerX ?? Math.max(axisLeft, bars[firstForecastIndex].x - barWidth)),
      }
    : null
  const ticks = [maxValue, maxValue * 0.66, maxValue * 0.33, 0].map(value => ({
    label: compactNumber(value),
    y: top + (1 - value / maxValue) * (baseY - top),
  }))
  return { bars, ticks, left: axisLeft, right, plotLeft: axisLeft, plotRight: right, top, baseY, barWidth, forecastDividerX, forecastBand }
})
</script>

<style lang="scss" scoped>
.forecast-profit-chart {
  padding: 22rpx 0 4rpx;
  margin-bottom: 18rpx;
}

.chart-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
  padding: 0 4rpx;
}

.chart-title {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: $ink;
}

.chart-subtitle {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: $ink-mute;
}

.chart-legend {
  display: flex;
  gap: 12rpx;
  margin: 18rpx 0 8rpx;
  padding: 0 4rpx;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 14rpx;
  background: $bg-soft;
  border-radius: 999rpx;
  font-size: 22rpx;
  color: $ink-soft;
}

.legend-line {
  width: 28rpx;
  height: 8rpx;
  border-radius: 999rpx;

  &.is-actual { background: $primary; }
  &.is-forecast { background: $warning; }
}

.profit-chart-body {
  display: grid;
  grid-template-columns: 34px 1fr;
  column-gap: 4rpx;
  width: 100%;
  height: 224px;
  overflow: visible;
}

.profit-axis-col {
  height: 172px;
  padding-top: 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-end;
  box-sizing: border-box;
}

.profit-axis-text {
  font-size: 21rpx;
  line-height: 1;
  color: $ink-mute;
}

.profit-svg {
  display: block;
  width: 100%;
  height: 224px;
  overflow: visible;
}

.profit-bar-label {
  font-size: 10px;
  line-height: 1;
  font-weight: 700;
}

.profit-value-grid {
  display: flex;
  gap: 8rpx;
  padding: 0 4rpx 8rpx;
}

.profit-value-item {
  flex: 1 1 0;
  min-width: 0;
  padding: 8rpx 2rpx;
  border-radius: 8rpx;
  background: $bg-soft;
  text-align: center;
}

.profit-value-year {
  display: block;
  font-size: 19rpx;
  line-height: 1.2;
  color: $ink-mute;
}

.profit-value-number {
  display: block;
  margin-top: 4rpx;
  font-size: 20rpx;
  line-height: 1.2;
  font-weight: 700;

  &.is-actual { color: $primary; }
  &.is-forecast { color: $warning; }
}
</style>
