<template>
  <view class="as-kline">
    <view class="as-kline-header">
      <view class="as-kline-meta">
        <text :class="['as-kline-price', lastPoint.change >= 0 ? 'up' : 'down']">{{ formatPrice(lastPoint.close) }}</text>
        <text :class="['as-kline-change', lastPoint.change >= 0 ? 'up' : 'down']">
          {{ formatSigned(lastPoint.change) }} {{ formatSigned(lastPoint.changePercent) }}%
        </text>
      </view>
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
    <view v-else-if="!normalizedItems.length" class="as-kline-empty">
      <text class="as-kline-empty-text">暂无K线数据</text>
    </view>

    <!-- #ifdef H5 || APP-PLUS -->
    <!-- @vue-ignore renderjs module is injected by the uni-app compiler. -->
    <view
      v-else
      :id="chartId"
      class="kline-host"
      style="height: 328px; min-height: 328px;"
      :chart-payload="chartPayload"
      :change:chart-payload="chartView.updateChart"
    />
    <!-- #endif -->

    <!-- #ifndef H5 || APP-PLUS -->
    <view v-else class="kline-fallback">
      <view class="kline-axis-col">
        <view v-for="tick in fallbackModel.ticks" :key="tick.label" class="kline-axis-text">{{ tick.label }}</view>
      </view>
      <view class="kline-plot-wrap">
        <svg class="kline-svg" viewBox="0 0 360 286" preserveAspectRatio="none">
          <g v-for="tick in fallbackModel.ticks" :key="`grid-${tick.label}`">
            <line :x1="fallbackModel.left" :y1="tick.y" :x2="fallbackModel.right" :y2="tick.y" stroke="#eef2f7" stroke-width="1" />
          </g>
          <line :x1="fallbackModel.left" :y1="fallbackModel.top" :x2="fallbackModel.left" :y2="fallbackModel.priceBottom" stroke="#d1d5db" stroke-width="1" />
          <line :x1="fallbackModel.left" :y1="fallbackModel.priceBottom" :x2="fallbackModel.right" :y2="fallbackModel.priceBottom" stroke="#d1d5db" stroke-width="1" />
          <line :x1="fallbackModel.left" :y1="fallbackModel.volumeTop" :x2="fallbackModel.right" :y2="fallbackModel.volumeTop" stroke="#eef2f7" stroke-width="1" />
          <g v-for="bar in fallbackModel.items" :key="bar.key">
            <line :x1="bar.x" :y1="bar.highY" :x2="bar.x" :y2="bar.lowY" :stroke="bar.color" stroke-width="1.2" />
            <rect
              :x="bar.x - fallbackModel.candleWidth / 2"
              :y="bar.bodyY"
              :width="fallbackModel.candleWidth"
              :height="bar.bodyHeight"
              :fill="bar.color"
              rx="1.2"
            />
            <rect
              :x="bar.x - fallbackModel.volumeWidth / 2"
              :y="bar.volumeY"
              :width="fallbackModel.volumeWidth"
              :height="bar.volumeHeight"
              :fill="bar.volumeColor"
              rx="0.8"
            />
          </g>
        </svg>
        <view class="kline-date-row">
          <view v-for="date in fallbackModel.dates" :key="date" class="kline-date">{{ date }}</view>
        </view>
      </view>
    </view>
    <!-- #endif -->
  </view>
</template>

<script setup lang="ts">
// @ts-nocheck -- uni-app renderjs module is compiled outside normal vue-tsc context.
import { computed, ref, watch } from 'vue'

interface KLineItem {
  date: string
  open: number
  close: number
  high: number
  low: number
  volume?: number
  change?: number
  changePercent?: number
}

interface NormalizedKLineItem extends KLineItem {
  timestamp: number
  change: number
  changePercent: number
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
  period: 'daily',
})

const emit = defineEmits<{ (e: 'period-change', p: Period): void }>()

const periods = [
  { label: '日K', value: 'daily' as Period },
  { label: '周K', value: 'weekly' as Period },
  { label: '月K', value: 'yearly' as Period },
]

const chartId = `favorite_kline_${Date.now()}_${Math.floor(Math.random() * 10000)}`
const currentPeriod = ref<Period>(props.period)
const UP_COLOR = '#ef4444'
const DOWN_COLOR = '#22c55e'
const visibleCount = computed(() => currentPeriod.value === 'daily' ? 58 : currentPeriod.value === 'weekly' ? 52 : 18)

const normalizedItems = computed<NormalizedKLineItem[]>(() => {
  const rows = new Map<number, NormalizedKLineItem>()
  ;(props.klineData || []).forEach((item) => {
    const timestamp = parseTradingDate(item.date)
    const open = Number(item.open) || 0
    const close = Number(item.close) || 0
    const high = Number(item.high) || Math.max(open, close)
    const low = Number(item.low) || Math.min(open, close)
    if (!Number.isFinite(timestamp) || !open || !close || !high || !low) return
    rows.set(timestamp, {
      date: item.date,
      timestamp,
      open,
      close,
      high: Math.max(high, open, close),
      low: Math.min(low, open, close),
      volume: Number(item.volume) || 0,
      change: toFiniteNumber(item.change) ?? Number.NaN,
      changePercent: toFiniteNumber(item.changePercent) ?? Number.NaN,
    })
  })
  return [...rows.values()]
    .sort((left, right) => left.timestamp - right.timestamp)
    .map((item, index, items) => {
      const prevClose = items[index - 1]?.close || item.open
      const fallbackChange = item.close - prevClose
      return {
        ...item,
        change: Number.isFinite(item.change) ? item.change : fallbackChange,
        changePercent: Number.isFinite(item.changePercent)
          ? item.changePercent
          : prevClose ? (fallbackChange / prevClose) * 100 : 0,
      }
    })
})

const lastPoint = computed(() => {
  const item = normalizedItems.value[normalizedItems.value.length - 1]
  return item || { close: 0, change: 0, changePercent: 0, volume: 0 }
})

const chartPayload = computed(() => ({
  id: chartId,
  key: `${currentPeriod.value}_${normalizedItems.value.length}_${normalizedItems.value.at(-1)?.timestamp || 0}`,
  title: props.title || 'K线图',
  period: currentPeriod.value === 'yearly' ? 'month' : currentPeriod.value === 'weekly' ? 'week' : 'day',
  visibleCount: visibleCount.value,
  data: normalizedItems.value.map(item => ({
    timestamp: item.timestamp,
    open: item.open,
    high: item.high,
    low: item.low,
    close: item.close,
    volume: item.volume || 0,
  })),
}))

const fallbackItems = computed(() => normalizedItems.value.slice(-Math.min(28, visibleCount.value)))
const fallbackModel = computed(() => {
  const items = fallbackItems.value
  const left = 4
  const right = 356
  const top = 10
  const priceBottom = 182
  const volumeTop = 206
  const volumeBottom = 258
  if (!items.length) {
    return { items: [], ticks: [], dates: [], left, right, top, priceBottom, volumeTop, volumeBottom, candleWidth: 10, volumeWidth: 10 }
  }

  const high = Math.max(...items.map(item => item.high))
  const low = Math.min(...items.map(item => item.low))
  const pad = Math.max(0.01, (high - low) * 0.1)
  const max = high + pad
  const min = low - pad
  const range = Math.max(0.01, max - min)
  const yFor = (value: number) => top + ((max - value) / range) * (priceBottom - top)
  const slot = (right - left) / Math.max(1, items.length)
  const candleWidth = Math.min(16, Math.max(5, slot * 0.68))
  const volumeWidth = Math.min(14, Math.max(4, slot * 0.56))
  const maxVolume = Math.max(1, ...items.map(item => item.volume || 0))

  const chartItems = items.map((item, idx) => {
    const x = left + slot * idx + slot / 2
    const openY = yFor(item.open)
    const closeY = yFor(item.close)
    const volumeHeight = Math.max(1, ((item.volume || 0) / maxVolume) * (volumeBottom - volumeTop))
    return {
      key: `${item.date}-${idx}`,
      x,
      highY: yFor(item.high),
      lowY: yFor(item.low),
      bodyY: Math.min(openY, closeY),
      bodyHeight: Math.max(2, Math.abs(closeY - openY)),
      volumeY: volumeBottom - volumeHeight,
      volumeHeight,
      color: item.close >= item.open ? UP_COLOR : DOWN_COLOR,
      volumeColor: item.close >= item.open ? 'rgba(239, 68, 68, 0.34)' : 'rgba(34, 197, 94, 0.34)',
    }
  })

  const tickValues = [max, max - range * 0.25, max - range * 0.5, max - range * 0.75, min]
  return {
    items: chartItems,
    ticks: tickValues.map(value => ({ label: formatPrice(value), y: yFor(value) })),
    dates: getDateMarks(items),
    left,
    right,
    top,
    priceBottom,
    volumeTop,
    volumeBottom,
    candleWidth,
    volumeWidth,
  }
})

function switchPeriod(p: Period) {
  if (currentPeriod.value === p) return
  currentPeriod.value = p
  emit('period-change', p)
}

function parseTradingDate(value: string): number {
  const digits = String(value || '').replace(/\D/g, '')
  if (digits.length < 8) return Number.NaN
  const year = Number(digits.slice(0, 4))
  const month = Number(digits.slice(4, 6))
  const day = Number(digits.slice(6, 8))
  return new Date(year, month - 1, day, 12).getTime()
}

function getDateMarks(items: KLineItem[]): string[] {
  if (items.length <= 2) return items.map(item => formatDate(item.date))
  const middle = items[Math.floor(items.length / 2)]
  return [items[0], middle, items[items.length - 1]].map(item => formatDate(item.date))
}

function formatDate(value: string): string {
  const text = String(value || '').replace(/-/g, '')
  return text.length >= 8 ? `${text.slice(4, 6)}-${text.slice(6, 8)}` : value
}

function toFiniteNumber(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function formatPrice(value: number): string {
  if (!Number.isFinite(value)) return '--'
  return value.toFixed(2).replace(/\.00$/, '')
}

function formatSigned(value: number): string {
  if (!Number.isFinite(value)) return '--'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}`
}

watch(() => props.period, value => {
  currentPeriod.value = value
})
</script>

<!-- KLineChart runs in the view layer on H5/App so the chart library can use DOM canvas. -->
<script module="chartView" lang="renderjs">
// @ts-nocheck
import { dispose, init, registerLocale } from 'klinecharts'

registerLocale('zh-CN', {
  time: '时间',
  open: '开',
  high: '高',
  low: '低',
  close: '收',
  volume: '量',
  change: '涨跌额',
  turnover: '成交额',
  second: '秒',
  minute: '分钟',
  hour: '小时',
  day: '日',
  week: '周',
  month: '月',
  year: '年',
})

const COLORS = {
  up: '#ef4444',
  down: '#16a34a',
  grid: '#edf1f6',
  axis: '#8b95a5',
  text: '#111827',
  ma5: '#f59e0b',
  ma10: '#2563eb',
  ma20: '#8b5cf6',
}

export default {
  data() {
    return {
      chart: null,
      host: null,
      chartData: [],
      payloadKey: '',
      resizeObserver: null,
      resizeTimer: null,
      maReady: false,
      volReady: false,
    }
  },
  beforeDestroy() {
    this.destroyChart()
  },
  beforeUnmount() {
    this.destroyChart()
  },
  methods: {
    ensureChart(hostId) {
      if (this.chart && this.host && document.body.contains(this.host) && this.host.id === hostId) return this.chart
      if (this.chart) this.destroyChart()
      this.host = document.getElementById(hostId)
      if (!this.host) return null

      this.chart = init(this.host, {
        locale: 'zh-CN',
        timezone: 'Asia/Shanghai',
        layout: {
          barSpaceLimit: { min: 3, max: 26 },
          yAxis: {
            position: 'left',
            inside: true,
            scrollZoomEnabled: false,
            gap: { top: 0.24, bottom: 0.1 },
          },
        },
        styles: {
          separator: { size: 1, color: COLORS.grid, fill: true, activeBackgroundColor: 'rgba(37, 99, 235, 0.08)' },
          grid: {
            show: true,
            horizontal: { show: true, color: COLORS.grid, size: 1, style: 'solid' },
            vertical: { show: false, color: COLORS.grid, size: 1, style: 'solid' },
          },
          candle: {
            type: 'candle_solid',
            bar: {
              compareRule: 'current_open',
              upColor: COLORS.up,
              downColor: COLORS.down,
              noChangeColor: COLORS.axis,
              upBorderColor: COLORS.up,
              downBorderColor: COLORS.down,
              noChangeBorderColor: COLORS.axis,
              upWickColor: COLORS.up,
              downWickColor: COLORS.down,
              noChangeWickColor: COLORS.axis,
            },
            priceMark: {
              show: true,
              high: { show: true, color: COLORS.axis, textSize: 10 },
              low: { show: true, color: COLORS.axis, textSize: 10 },
              last: {
                show: true,
                upColor: COLORS.up,
                downColor: COLORS.down,
                noChangeColor: COLORS.axis,
                line: { show: true, style: 'dashed', size: 1, dashedValue: [4, 4] },
                text: { show: true, color: '#ffffff', size: 10, paddingLeft: 4, paddingRight: 4 },
              },
            },
            tooltip: {
              showRule: 'follow_cross',
              showType: 'rect',
              offsetTop: 4,
              offsetLeft: 6,
              offsetRight: 6,
              offsetBottom: 6,
              title: { show: true, color: COLORS.text, size: 10 },
              legend: {
                color: COLORS.axis,
                size: 10,
                marginTop: 2,
                marginBottom: 2,
                marginLeft: 0,
                marginRight: 0,
              },
              rect: {
                position: 'fixed',
                color: 'rgba(255, 255, 255, 0.96)',
                borderColor: COLORS.grid,
                borderSize: 1,
                borderRadius: 4,
                offsetLeft: 8,
                offsetRight: 8,
                offsetTop: 8,
                offsetBottom: 8,
                paddingLeft: 8,
                paddingRight: 8,
                paddingTop: 6,
                paddingBottom: 6,
              },
            },
          },
          indicator: {
            bars: [
              {
                style: 'fill',
                borderStyle: 'solid',
                borderSize: 1,
                borderDashedValue: [2, 2],
                upColor: 'rgba(239, 68, 68, 0.42)',
                downColor: 'rgba(22, 163, 74, 0.42)',
                noChangeColor: 'rgba(139, 149, 165, 0.3)',
              },
            ],
            lines: [
              { color: COLORS.ma5, size: 1, style: 'solid' },
              { color: COLORS.ma10, size: 1, style: 'solid' },
              { color: COLORS.ma20, size: 1, style: 'solid' },
            ],
            tooltip: {
              showRule: 'none',
              showType: 'standard',
              offsetTop: 8,
              offsetLeft: 4,
              offsetRight: 4,
              text: { size: 10, color: COLORS.axis },
              legend: {
                size: 10,
                color: COLORS.axis,
                marginTop: 0,
                marginBottom: 4,
                marginLeft: 0,
                marginRight: 10,
              },
            },
          },
          xAxis: {
            show: true,
            axisLine: { show: true, color: COLORS.grid, size: 1 },
            tickLine: { show: false },
            tickText: { show: true, color: COLORS.axis, size: 10, marginStart: 5, marginEnd: 5 },
          },
          yAxis: {
            show: true,
            size: 'auto',
            axisLine: { show: false, color: COLORS.grid, size: 1 },
            tickLine: { show: false },
            tickText: { show: true, color: COLORS.axis, size: 10, marginStart: 2, marginEnd: 2 },
          },
          crosshair: {
            show: true,
            horizontal: {
              show: true,
              line: { show: true, color: COLORS.axis, size: 1, style: 'dashed', dashedValue: [3, 3] },
              text: { show: true, color: '#ffffff', size: 10, backgroundColor: COLORS.text },
            },
            vertical: {
              show: true,
              line: { show: true, color: COLORS.axis, size: 1, style: 'dashed', dashedValue: [3, 3] },
              text: { show: true, color: '#ffffff', size: 10, backgroundColor: COLORS.text },
            },
          },
        },
      })
      if (!this.chart) return null

      this.chart.setScrollEnabled(true)
      this.chart.setZoomEnabled(true)
      this.chart.setRightMinVisibleBarCount(2)
      this.chart.setOffsetRightDistance(12)
      this.chart.setDataLoader({
        getBars: ({ callback }) => callback(this.chartData, false),
      })
      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => this.scheduleResize())
        this.resizeObserver.observe(this.host)
      }
      return this.chart
    },
    updateChart(payload) {
      if (!payload || !Array.isArray(payload.data)) return
      const chart = this.ensureChart(payload.id)
      if (!chart) return
      this.chartData = payload.data
      chart.setSymbol({ ticker: payload.title || 'K线图', pricePrecision: 2, volumePrecision: 0 })
      chart.setPeriod({ type: payload.period || 'day', span: 1 })
      chart.resetData()
      this.ensureIndicators(chart)
      this.payloadKey = payload.key
      this.$nextTick(() => this.fitLatestBars(payload.visibleCount || 58))
    },
    ensureIndicators(chart) {
      if (!this.maReady) {
        chart.createIndicator({
          name: 'MA',
          paneId: 'candle_pane',
          calcParams: [5, 10, 20],
          shouldOhlc: false,
          styles: {
            lines: [
              { color: COLORS.ma5, size: 1, style: 'solid' },
              { color: COLORS.ma10, size: 1, style: 'solid' },
              { color: COLORS.ma20, size: 1, style: 'solid' },
            ],
          },
        })
        this.maReady = true
      }
      if (!this.volReady) {
        chart.createIndicator({
          name: 'VOL',
          height: 82,
          styles: {
            bars: [
              {
                style: 'fill',
                upColor: 'rgba(239, 68, 68, 0.42)',
                downColor: 'rgba(22, 163, 74, 0.42)',
                noChangeColor: 'rgba(139, 149, 165, 0.3)',
              },
            ],
          },
        })
        this.volReady = true
      }
    },
    fitLatestBars(visibleCount) {
      if (!this.chart || !this.host) return
      this.chart.resize()
      const plotWidth = Math.max(240, this.host.getBoundingClientRect().width - 28)
      this.chart.setBarSpace(Math.max(4, Math.min(14, plotWidth / visibleCount)))
      this.chart.setOffsetRightDistance(Math.max(22, plotWidth / visibleCount * 3.2))
      this.chart.scrollToRealTime()
    },
    scheduleResize() {
      if (this.resizeTimer) clearTimeout(this.resizeTimer)
      this.resizeTimer = setTimeout(() => {
        this.resizeTimer = null
        this.fitLatestBars(58)
      }, 80)
    },
    destroyChart() {
      if (this.resizeTimer) clearTimeout(this.resizeTimer)
      this.resizeObserver?.disconnect()
      this.resizeObserver = null
      if (this.chart) dispose(this.chart)
      this.chart = null
      this.host = null
      this.maReady = false
      this.volReady = false
    },
  },
}
</script>

<style lang="scss" scoped>
.as-kline {
  background: #ffffff;
  border-radius: 12rpx;
  padding: 0;
}

.as-kline-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16rpx;
  margin-bottom: 12rpx;
}

.as-kline-meta {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4rpx;
}

.as-kline-price {
  font-size: 34rpx;
  font-weight: 700;
  line-height: 1;
}

.as-kline-change {
  font-size: 22rpx;
  line-height: 1;
}

.up {
  color: #ef4444;
}

.down {
  color: #16a34a;
}

.as-kline-periods {
  display: flex;
  gap: 6rpx;
  flex-shrink: 0;
}

.as-kline-period {
  font-size: 22rpx;
  color: #6b7280;
  padding: 5rpx 13rpx;
  border-radius: 12rpx;
  background: #f5f7fa;
}

.as-kline-period.active {
  color: #2563eb;
  background: rgba(37, 99, 235, 0.1);
  font-weight: 600;
}

.kline-host {
  display: block;
  width: 100%;
  height: 328px;
  min-height: 328px;
  overflow: hidden;
  touch-action: pan-y;
}

.kline-fallback {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  column-gap: 4rpx;
  min-height: 318px;
}

.kline-axis-col {
  height: 182px;
  padding-top: 10px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-end;
  box-sizing: border-box;
}

.kline-axis-text {
  display: block;
  font-size: 21rpx;
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
  height: 286px;
  overflow: visible;
}

.kline-date-row {
  display: flex;
  justify-content: space-between;
  padding: 0 8rpx 0 4rpx;
  margin-top: -10px;
}

.kline-date {
  display: block;
  font-size: 22rpx;
  line-height: 1;
  color: #94a3b8;
}

.as-kline-loading,
.as-kline-empty {
  height: 560rpx;
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
