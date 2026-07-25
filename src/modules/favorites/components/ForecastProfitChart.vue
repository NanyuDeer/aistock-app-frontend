<template>
  <view class="forecast-profit-chart">
    <view class="chart-head">
      <view>
        <text class="chart-title">净利润预测趋势</text>
        <text class="chart-subtitle">实际 + 预测</text>
      </view>
      <text class="chart-unit">亿元</text>
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
        <g v-for="tick in chartModel.ticks" :key="tick.label">
          <line :x1="chartModel.plotLeft" :y1="tick.y" :x2="chartModel.plotRight" :y2="tick.y" stroke="#eef2f7" stroke-width="1" />
        </g>
        <line :x1="chartModel.plotLeft" :y1="chartModel.top" :x2="chartModel.plotLeft" :y2="chartModel.baseY" stroke="#d1d5db" stroke-width="1" />
        <line :x1="chartModel.plotLeft" :y1="chartModel.baseY" :x2="chartModel.plotRight" :y2="chartModel.baseY" stroke="#cbd5e1" stroke-width="1" />
        <g v-for="bar in chartModel.bars" :key="bar.year">
          <rect :x="bar.x - 11" :y="bar.y" width="22" :height="bar.height" rx="4" :fill="bar.color" />
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
  const axisLeft = 18
  const barLeft = 62
  const right = 340
  const top = 24
  const baseY = 172
  const maxValue = Math.max(0.01, ...values) * 1.12
  const bars = points.value.map((item, idx) => {
    const count = Math.max(1, points.value.length)
    const x = count === 1 ? (barLeft + right) / 2 : barLeft + (idx / (count - 1)) * (right - barLeft)
    const height = Math.max(8, Math.min(124, ((Number(item.value) || 0) / maxValue) * 124))
    const kind = item.kind || 'actual'
    return {
      year: item.year,
      valueText: compactNumber(Number(item.value) || 0),
      kind,
      x,
      y: baseY - height,
      height,
      color: kind === 'forecast' ? '#e6a23c' : '#409eff',
    }
  })
  const ticks = [maxValue, maxValue * 0.66, maxValue * 0.33, 0].map(value => ({
    label: compactNumber(value),
    y: top + (1 - value / maxValue) * (baseY - top),
  }))
  return { bars, ticks, left: axisLeft, right, plotLeft: axisLeft, plotRight: right, top, baseY }
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
  color: #172033;
}

.chart-subtitle {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #8aa0bd;
}

.chart-unit {
  flex-shrink: 0;
  padding: 6rpx 12rpx;
  border-radius: 999rpx;
  background: #f1f5f9;
  font-size: 21rpx;
  color: #64748b;
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
  background: #f8fafc;
  border-radius: 999rpx;
  font-size: 22rpx;
  color: #52657f;
}

.legend-line {
  width: 28rpx;
  height: 8rpx;
  border-radius: 999rpx;

  &.is-actual { background: #409eff; }
  &.is-forecast { background: #e6a23c; }
}

.profit-chart-body {
  display: grid;
  grid-template-columns: 46px 1fr;
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
  color: #94a3b8;
}

.profit-svg {
  display: block;
  width: 100%;
  height: 224px;
  overflow: visible;
}

.profit-value-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8rpx;
  padding: 0 4rpx 8rpx;
}

.profit-value-item {
  min-width: 0;
  padding: 8rpx 4rpx;
  border-radius: 8rpx;
  background: #f8fafc;
  text-align: center;
}

.profit-value-year {
  display: block;
  font-size: 19rpx;
  line-height: 1.2;
  color: #94a3b8;
}

.profit-value-number {
  display: block;
  margin-top: 4rpx;
  font-size: 20rpx;
  line-height: 1.2;
  font-weight: 700;

  &.is-actual { color: #409eff; }
  &.is-forecast { color: #e6a23c; }
}
</style>
