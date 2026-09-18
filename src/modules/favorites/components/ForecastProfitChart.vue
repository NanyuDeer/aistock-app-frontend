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
      <!-- 图表区不用内联 <svg>：uni-app 无 <svg> 组件，App 端会被当作未知标签不渲染，改用 HTML+CSS 柱条 -->
      <view class="profit-plot">
        <view
          v-if="chartModel.forecastBand"
          class="forecast-band"
          :style="{ left: chartModel.forecastBand.left + '%', width: chartModel.forecastBand.width + '%' }"
        ></view>
        <view v-for="gl in chartModel.gridlines" :key="`gl-${gl.top}`" class="plot-gridline" :style="{ top: gl.top + '%' }"></view>
        <view
          v-if="chartModel.forecastDividerLeft != null"
          class="forecast-divider"
          :style="{ left: chartModel.forecastDividerLeft + '%' }"
        ></view>
        <view
          v-for="bar in chartModel.bars"
          :key="bar.year"
          class="bar-anchor"
          :style="{ left: bar.leftPct + '%', width: bar.widthPx + 'px', marginLeft: -(bar.widthPx / 2) + 'px' }"
        >
          <view class="bar-rect" :style="{ height: bar.heightPct + '%', background: bar.color }"></view>
          <text class="bar-label" :style="{ bottom: bar.labelBottom + '%', color: bar.color }">{{ bar.valueText }}</text>
        </view>
      </view>
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
  const maxValue = Math.max(0.01, ...values) * 1.12
  const count = Math.max(1, points.value.length)
  const maxBarHeightPct = 96
  const bars = points.value.map((item, idx) => {
    const raw = Number(item.value) || 0
    const kind = item.kind || 'actual'
    const heightPct = Math.max(6, Math.min(maxBarHeightPct, (raw / maxValue) * 100))
    const leftPct = count === 1 ? 50 : (idx / (count - 1)) * 100
    const widthPx = Math.min(24, Math.max(14, (340 / Math.max(1, count - 1)) * 0.34))
    return {
      year: item.year,
      valueText: compactNumber(raw),
      kind,
      color: kind === 'forecast' ? '#e6a23c' : '#409eff',
      leftPct,
      heightPct,
      labelBottom: Math.max(heightPct + 2, 12),
      widthPx,
    }
  })
  const firstForecastIndex = bars.findIndex(bar => bar.kind === 'forecast')
  const forecastDividerLeft = firstForecastIndex > 0
    ? (bars[firstForecastIndex - 1].leftPct + bars[firstForecastIndex].leftPct) / 2
    : (firstForecastIndex === 0 ? 0 : null)
  const forecastBand = firstForecastIndex >= 0
    ? { left: forecastDividerLeft ?? 0, width: 100 - (forecastDividerLeft ?? 0) }
    : null
  const ticks = [maxValue, maxValue * 0.66, maxValue * 0.33, 0].map(value => ({
    label: compactNumber(value),
  }))
  const gridlines = [maxValue, maxValue * 0.66, maxValue * 0.33, 0]
    .map(value => ({ top: Math.round((1 - value / maxValue) * 100) }))
  return { bars, ticks, gridlines, forecastBand, forecastDividerLeft }
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
  height: 200px;
}

.profit-axis-col {
  height: 180px;
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

.profit-plot {
  position: relative;
  height: 100%;
  border-bottom: 1px solid #eef2f7;
}

.plot-gridline {
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background: #eef2f7;
}

.forecast-band {
  position: absolute;
  top: 0;
  bottom: 0;
  background: rgba(245, 158, 11, 0.10);
  border-radius: 8px;
}

.forecast-divider {
  position: absolute;
  top: 0;
  bottom: 0;
  border-left: 1px dashed #f59e0b;
}

.bar-anchor {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 100%;
}

.bar-rect {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 5px;
}

.bar-label {
  position: absolute;
  left: 0;
  width: 100%;
  text-align: center;
  font-size: 10px;
  line-height: 1;
  font-weight: 700;
  white-space: nowrap;
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