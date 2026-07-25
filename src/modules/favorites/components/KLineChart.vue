<template>
  <view class="as-kline">
    <view class="as-kline-header">
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
    <view v-else-if="!chartModel.items.length" class="as-kline-empty">
      <text class="as-kline-empty-text">暂无K线数据</text>
    </view>
    <view v-else class="kline-chart">
      <view class="kline-axis-col">
        <view v-for="tick in chartModel.ticks" :key="tick.label" class="kline-axis-text">{{ tick.label }}</view>
      </view>
      <view class="kline-plot-wrap">
        <svg class="kline-svg" viewBox="0 0 360 238" preserveAspectRatio="xMidYMid meet">
          <g v-for="tick in chartModel.ticks" :key="`grid-${tick.label}`">
            <line :x1="chartModel.left" :y1="tick.y" :x2="chartModel.right" :y2="tick.y" stroke="#eef2f7" stroke-width="1" />
          </g>
          <line :x1="chartModel.left" :y1="chartModel.top" :x2="chartModel.left" :y2="chartModel.bottom" stroke="#d1d5db" stroke-width="1.2" />
          <line :x1="chartModel.left" :y1="chartModel.bottom" :x2="chartModel.right" :y2="chartModel.bottom" stroke="#d1d5db" stroke-width="1.2" />
          <g v-for="bar in chartModel.items" :key="bar.key">
            <line :x1="bar.x" :y1="bar.highY" :x2="bar.x" :y2="bar.lowY" :stroke="bar.color" stroke-width="1.5" />
            <rect
              :x="bar.x - chartModel.candleWidth / 2"
              :y="bar.bodyY"
              :width="chartModel.candleWidth"
              :height="bar.bodyHeight"
              :fill="bar.color"
              rx="1.6"
            />
          </g>
        </svg>
        <view class="kline-date-row">
          <view class="kline-date">{{ chartModel.startDate }}</view>
          <view class="kline-date">{{ chartModel.endDate }}</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

interface KLineItem {
  date: string
  open: number
  close: number
  high: number
  low: number
  volume?: number
}

type Period = 'daily' | 'weekly' | 'yearly'

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
  { label: '年K', value: 'yearly' as Period }
]

const currentPeriod = ref<Period>(props.period)
const UP_COLOR = '#ef4444'
const DOWN_COLOR = '#22c55e'

const displayItems = computed(() => props.klineData.slice(-getVisibleCandleCount()))

const chartModel = computed(() => {
  const items = displayItems.value
  const left = 8
  const right = 350
  const top = 16
  const bottom = 206
  if (!items.length) {
    return { items: [], ticks: [], left, right, top, bottom, candleWidth: 10, startDate: '', endDate: '' }
  }

  const high = Math.max(...items.map(item => Number(item.high) || 0))
  const low = Math.min(...items.map(item => Number(item.low) || 0))
  const pad = Math.max(0.01, (high - low) * 0.08)
  const max = high + pad
  const min = low - pad
  const range = Math.max(0.01, max - min)
  const yFor = (value: number) => top + ((max - value) / range) * (bottom - top)
  const slot = (right - left) / Math.max(1, items.length)
  const candleWidth = Math.min(14, Math.max(7, slot * 0.56))

  const chartItems = items.map((item, idx) => {
    const open = Number(item.open) || 0
    const close = Number(item.close) || 0
    const highValue = Number(item.high) || Math.max(open, close)
    const lowValue = Number(item.low) || Math.min(open, close)
    const x = left + slot * idx + slot / 2
    const openY = yFor(open)
    const closeY = yFor(close)
    const bodyY = Math.min(openY, closeY)
    const bodyHeight = Math.max(2, Math.abs(closeY - openY))
    return {
      key: `${item.date}-${idx}`,
      x,
      highY: yFor(highValue),
      lowY: yFor(lowValue),
      bodyY,
      bodyHeight,
      color: close >= open ? UP_COLOR : DOWN_COLOR,
    }
  })

  const tickValues = [max, max - range * 0.25, max - range * 0.5, max - range * 0.75, min]
  const ticks = tickValues.map(value => ({ label: formatPrice(value), y: yFor(value) }))
  return {
    items: chartItems,
    ticks,
    left,
    right,
    top,
    bottom,
    candleWidth,
    startDate: formatDate(items[0]?.date),
    endDate: formatDate(items[items.length - 1]?.date),
  }
})

function switchPeriod(p: Period) {
  if (currentPeriod.value === p) return
  currentPeriod.value = p
  emit('period-change', p)
}

function getVisibleCandleCount(): number {
  if (currentPeriod.value === 'daily') return 18
  if (currentPeriod.value === 'weekly') return 14
  return 10
}

function formatDate(value: string): string {
  const text = String(value || '').replace(/-/g, '')
  return text.length >= 8 ? `${text.slice(4, 6)}-${text.slice(6, 8)}` : value
}

function formatPrice(value: number): string {
  if (!Number.isFinite(value)) return '--'
  return value.toFixed(2).replace(/\.00$/, '')
}

watch(() => props.period, value => {
  currentPeriod.value = value
})
</script>

<style lang="scss" scoped>
.as-kline {
  background: #ffffff;
  border-radius: 12rpx;
  padding: 0;
}

.as-kline-header {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-bottom: 12rpx;
}

.as-kline-periods {
  display: flex;
  gap: 6rpx;
}

.as-kline-period {
  font-size: 22rpx;
  color: #6b7280;
  padding: 4rpx 12rpx;
  border-radius: 12rpx;
  background: #f5f7fa;
}

.as-kline-period.active {
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
}

.kline-chart {
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr);
  column-gap: 6rpx;
  min-height: 270px;
}

.kline-axis-col {
  height: 206px;
  padding-top: 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-end;
  box-sizing: border-box;
}

.kline-axis-text {
  display: block;
  font-size: 22rpx;
  line-height: 1;
  color: #6b7280;
  white-space: nowrap;
}

.kline-plot-wrap {
  min-width: 0;
}

.kline-svg {
  display: block;
  width: 100%;
  height: 238px;
  overflow: visible;
}

.kline-date-row {
  display: flex;
  justify-content: space-between;
  padding: 0 10rpx 0 4rpx;
  margin-top: -4px;
}

.kline-date {
  display: block;
  font-size: 22rpx;
  line-height: 1;
  color: #94a3b8;
}

.as-kline-loading,
.as-kline-empty {
  height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.as-kline-loading-text,
.as-kline-empty-text {
  font-size: 26rpx;
  color: #9ca3af;
}
</style>
