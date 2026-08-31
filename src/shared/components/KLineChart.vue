<template>
  <view class="trend-kline">
    <view class="chart-heading">
      <text class="chart-title">{{ title }}</text>
      <text v-if="dateRange" class="chart-range">{{ dateRange }}</text>
    </view>
    <view v-if="!points.length" class="chart-empty">
      <EmptyState text="暂无K线数据" />
    </view>
    <!-- #ifdef H5 || APP-PLUS -->
    <!-- @vue-ignore renderjs module is injected by the uni-app compiler. -->
    <!-- H5 桌面与 App 真机统一走 renderjs + klinecharts 单引擎，保证两端渲染与交互完全一致（废除 App 端手写 SVG 差异实现） -->
    <view
      v-else
      :id="chartId"
      class="kline-host"
      style="height: 200px; min-height: 200px;"
      :chart-payload="chartPayload"
      :change:chart-payload="chartView.updateChart"
    />
    <!-- #endif -->
    <!-- #ifndef H5 || APP-PLUS -->
    <!-- 小程序/其他：renderjs 不可用且用户严禁 canvas → 文本占位 -->
    <view v-else class="kline-host">
      <view class="kline-mp-fallback">
        <text class="kline-mp-fallback-text">K线暂仅支持 App / H5</text>
      </view>
    </view>
    <!-- #endif -->
  </view>
</template>

<script setup lang="ts">
// @ts-nocheck -- vue-tsc does not model uni-app's isolated renderjs module.
import { computed } from 'vue'
// 直接导入 EmptyState 源文件而非 barrel index.ts：index.ts 会 re-export KLineChart，
// 若在此又经 barrel 导入会形成 KLineChart → index.ts → KLineChart 的循环依赖，
// Rollup 会把二者拆到不同 chunk，破坏运行顺序导致白屏。
import EmptyState from './EmptyState.vue'
import type { TrendKLineData } from '@/shared/api/modules/trend-score'

interface KLinePoint {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
}

const props = defineProps<{
  title: string
  data: TrendKLineData
}>()

const chartId = `trend_kline_${Date.now()}_${Math.floor(Math.random() * 10000)}`
const MAX_KLINE_DAYS = 120
const VISIBLE_KLINE_COUNT = 45

function parseTradingDate(value: string): number {
  const digits = String(value || '').replace(/\D/g, '')
  if (digits.length < 8) return Number.NaN
  const year = Number(digits.slice(0, 4))
  const month = Number(digits.slice(4, 6))
  const day = Number(digits.slice(6, 8))
  return new Date(year, month - 1, day, 12).getTime()
}

const points = computed<KLinePoint[]>(() => {
  const length = Math.min(props.data?.dates?.length || 0, props.data?.ohlc?.length || 0)
  const start = Math.max(0, length - MAX_KLINE_DAYS)
  const rows = new Map<number, KLinePoint>()

  for (let index = start; index < length; index += 1) {
    const tuple = props.data.ohlc[index]
    const timestamp = parseTradingDate(props.data.dates[index])
    const open = Number(tuple?.[0])
    const close = Number(tuple?.[1])
    const sourceLow = Number(tuple?.[2])
    const sourceHigh = Number(tuple?.[3])
    if (![timestamp, open, close, sourceLow, sourceHigh].every(Number.isFinite)) continue
    rows.set(timestamp, {
      timestamp,
      open,
      close,
      low: Math.min(open, close, sourceLow, sourceHigh),
      high: Math.max(open, close, sourceLow, sourceHigh),
    })
  }

  return [...rows.values()].sort((left, right) => left.timestamp - right.timestamp)
})

const dateRange = computed(() => points.value.length ? `近${points.value.length}日` : '')
const chartPayload = computed(() => ({
  id: chartId,
  key: `${props.title}_${points.value.length}_${points.value[points.value.length - 1]?.timestamp || 0}`,
  title: props.title,
  visibleCount: VISIBLE_KLINE_COUNT,
  data: points.value,
}))
</script>

<!-- 单引擎方案：H5 与 App 缺省 drop 相同 klinecharts 配置，交叉渲染由 UniApp 编译到视图层，保证两端一致。
     不再包含任何手写 SVG 分支（App 端取消自绘蜡烛/MA/手势，统一交给 klinecharts）。 -->
<script module="chartView" lang="renderjs">
// @ts-nocheck -- renderjs is compiled as an isolated view-layer module by uni-app.
import { dispose, init, registerLocale } from 'klinecharts'

registerLocale('zh-CN', {
  time: '时间',
  open: '开盘',
  high: '最高',
  low: '最低',
  close: '收盘',
  volume: '成交量',
  change: '涨跌幅',
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
  up: '#f43f5e',
  down: '#22c55e',
  brand: '#0b5fff',
  grid: '#eef1f5',
  axis: '#8b95a5',
  text: '#1f2937',
}

export default {
  data() {
    return {
      chart: null,
      host: null,
      chartData: [],
      indicatorId: null,
      payloadKey: '',
      resizeObserver: null,
      resizeTimer: null,
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
            inside: false,
            reverse: false,
            scrollZoomEnabled: false,
            gap: { top: 0.16, bottom: 0.12 },
          },
        },
        styles: {
          separator: { size: 1, color: COLORS.grid, fill: true, activeBackgroundColor: 'rgba(11, 95, 255, 0.08)' },
          grid: {
            show: true,
            horizontal: { show: true, color: COLORS.grid, size: 1, style: 'dashed', dashedValue: [2, 2] },
            vertical: { show: true, color: COLORS.grid, size: 1, style: 'dashed', dashedValue: [2, 2] },
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
              legend: { color: COLORS.axis, size: 10, marginTop: 2, marginBottom: 2 },
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
            lines: [
              { color: COLORS.brand, size: 1.5, style: 'solid' },
            ],
            tooltip: { showRule: 'follow_cross', showType: 'rect' },
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
            axisLine: { show: true, color: COLORS.grid, size: 1 },
            tickLine: { show: false },
            tickText: { show: true, color: COLORS.axis, size: 10, marginStart: 5, marginEnd: 5 },
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
      this.chart.setOffsetRightDistance(10)
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
      chart.setSymbol({ ticker: payload.title || 'K线', pricePrecision: 2, volumePrecision: 0 })
      chart.setPeriod({ type: 'day', span: 1 })
      chart.resetData()
      if (!this.indicatorId) {
        this.indicatorId = chart.createIndicator({
          name: 'MA',
          paneId: 'candle_pane',
          calcParams: [60],
          shouldOhlc: false,
          styles: {
            lines: [{ color: COLORS.brand, size: 1.5, style: 'solid' }],
          },
        })
      }
      this.payloadKey = payload.key
      this.$nextTick(() => this.fitLatestBars(payload.visibleCount || 45))
    },
    fitLatestBars(visibleCount) {
      if (!this.chart || !this.host) return
      this.chart.resize()
      const plotWidth = Math.max(220, this.host.getBoundingClientRect().width - 54)
      this.chart.setBarSpace(Math.max(4, Math.min(16, plotWidth / visibleCount)))
      this.chart.setOffsetRightDistance(Math.max(8, plotWidth / visibleCount * 1.5))
      this.chart.scrollToRealTime()
    },
    scheduleResize() {
      if (this.resizeTimer) clearTimeout(this.resizeTimer)
      this.resizeTimer = setTimeout(() => {
        this.resizeTimer = null
        this.fitLatestBars(45)
      }, 80)
    },
    destroyChart() {
      if (this.resizeTimer) clearTimeout(this.resizeTimer)
      this.resizeObserver?.disconnect()
      this.resizeObserver = null
      if (this.chart) dispose(this.chart)
      this.chart = null
      this.host = null
      this.indicatorId = null
    },
  },
}
</script>

<style lang="scss" scoped>
@import '@/shared/styles/variables.scss';

.trend-kline {
  min-width: 0;
  padding: $spacing-base;
  border-bottom: 1rpx solid $border-color-light;
  box-sizing: border-box;
}

.chart-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-sm;
  margin-bottom: $spacing-sm;
}

.chart-title {
  min-width: 0;
  overflow: hidden;
  color: $text-color-title;
  font-size: $font-size-base;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chart-range {
  flex-shrink: 0;
  color: $text-color-tertiary;
  font-size: $font-size-xs;
}

.kline-host {
  display: block;
  width: 100%;
  height: 200px;
  min-height: 200px;
  overflow: hidden;
  box-sizing: border-box;
  touch-action: pan-y;
}

.chart-empty {
  height: 240rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>