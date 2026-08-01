<template>
  <view class="capital-flow-charts">
    <view class="flow-overview">
      <text class="flow-overview-note">{{ summaryNote }}</text>
    </view>

    <!-- 资金拆解：横向条形（每项独立轨道，中心线在50%） -->
    <view v-if="orders.length" class="flow-panel">
      <view class="panel-head">
        <text class="panel-title">资金拆解</text>
        <text class="panel-unit">亿元</text>
      </view>
      <view class="hbar-list">
        <view v-for="item in breakdownRows" :key="item.key" class="hbar-row">
          <text class="hbar-label">{{ item.label }}</text>
          <view class="hbar-track">
            <view class="hbar-center"></view>
            <view
              class="hbar-fill"
              :class="item.isPositive ? 'is-up' : 'is-down'"
              :style="item.isPositive
                ? { left: '50%', width: item.share + '%' }
                : { right: '50%', width: item.share + '%' }"
            ></view>
          </view>
          <text :class="['hbar-value', item.isPositive ? 'is-up' : 'is-down']">{{ formatSigned(item.value) }}</text>
        </view>
      </view>
    </view>

    <!-- 10日资金节奏：垂直柱形 + 数值网格（方案 C，柱子样式对齐资金拆解） -->
    <view v-if="trendModel.points.length" class="flow-panel">
      <view class="panel-head">
        <view class="panel-title-wrap">
          <text class="panel-title">10日资金节奏</text>
          <text v-if="trendBadge" class="panel-badge">{{ trendBadge }}</text>
        </view>
        <text class="panel-unit">亿元</text>
      </view>
      <view class="line-chart">
        <view class="line-axis-col">
          <text v-for="tick in trendModel.ticks" :key="`axis-${tick.label}`" class="line-axis-text">{{ tick.label }}</text>
        </view>
        <svg class="line-svg" :viewBox="`0 0 ${trendModel.plotRight} 200`" preserveAspectRatio="none">
          <!-- 网格虚线 -->
          <g v-for="tick in trendModel.ticks" :key="`tick-${tick.label}`">
            <line
              :x1="trendModel.plotLeft"
              :y1="tick.y"
              :x2="trendModel.plotRight"
              :y2="tick.y"
              :stroke="'rgba(225, 233, 245, 0.6)'"
              stroke-width="1"
              stroke-dasharray="4 6"
            />
          </g>
          <!-- 零线（实线） -->
          <line
            :x1="trendModel.plotLeft"
            :y1="trendModel.zeroY"
            :x2="trendModel.plotRight"
            :y2="trendModel.zeroY"
            :stroke="'rgba(138, 150, 176, 0.5)'"
            stroke-width="1.2"
          />
          <!-- 柱子：圆角纯色，红正绿负（对齐资金拆解样式） -->
          <rect
            v-for="point in trendModel.points"
            :key="`bar-${point.key}`"
            :x="point.barX"
            :y="point.barY"
            :width="trendModel.barWidth"
            :height="point.barH"
            :rx="3"
            :fill="point.raw >= 0 ? '#e54d5e' : '#18a058'"
          />
          <!-- 最新柱深色边框高亮 -->
          <rect
            v-if="latestPoint"
            :x="latestPoint.barX"
            :y="latestPoint.barY"
            :width="trendModel.barWidth"
            :height="latestPoint.barH"
            :rx="3"
            fill="none"
            :stroke="'#1a2233'"
            stroke-width="1.5"
          />
        </svg>
      </view>
      <view class="line-value-grid">
        <view
          v-for="point in trendModel.points"
          :key="`detail-${point.key}`"
          :class="['line-value-item', { 'is-latest': point.isLatest }]"
        >
          <text class="line-value-date">{{ point.date }}</text>
          <text :class="['line-value-number', point.raw >= 0 ? 'is-up' : 'is-down']">{{ point.text }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
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
      share: Math.round((Math.abs(value) / maxAbs) * 50),
    }
  })
})

const trendModel = computed(() => {
  const values = trend.value.map(value => Number(value) || 0)
  const left = 8
  const right = 352
  const top = 20
  const bottom = 172
  const barWidth = 24
  if (!values.length) {
    return { points: [], ticks: [], zeroY: 106, plotLeft: left, plotRight: right, top, bottom, barWidth }
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

  const points = values.map((value, idx) => {
    const centerX = left + slot * idx + slot / 2
    const barX = centerX - barWidth / 2
    const y = yFor(value)
    const barY = value >= 0 ? y : zeroY
    const barH = Math.max(1, Math.abs(y - zeroY))
    return {
      key: `${idx}-${value}`,
      centerX,
      barX,
      barY,
      barH,
      raw: value,
      isLatest: idx === values.length - 1,
      text: formatSigned(value),
      date: formatDateLabel(trendDates.value[idx] || `${idx + 1}`),
    }
  })

  const ticks = [domainMax, 0, domainMin].map(value => ({ label: compactNumber(value), y: yFor(value) }))
  return { points, ticks, zeroY, plotLeft: left, plotRight: right, top, bottom, barWidth }
})

const latestPoint = computed(() => {
  const points = trendModel.value.points
  return points.length ? points[points.length - 1] : null
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
  gap: 16rpx;
}

/* 面板：白底 + 细边框 + 圆角，对齐 section-card 令牌 */
.flow-overview,
.flow-panel {
  padding: 18rpx;
  border-radius: $r-md;
  background: $bg-card;
  border: 2rpx solid $line;
}

.flow-overview-note {
  display: block;
  font-size: $font-size-sm;
  line-height: 1.55;
  color: $ink-soft;
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
  font-size: $font-size-md;
  line-height: 1.35;
  font-weight: 700;
  color: $ink;
}

.panel-unit {
  flex-shrink: 0;
  font-size: $font-size-xs;
  line-height: 1.5;
  color: $ink-mute;
}

.panel-badge {
  display: inline-flex;
  margin-top: 8rpx;
  padding: 6rpx 12rpx;
  border-radius: $r-xs;
  background: $warning-soft;
  color: $warning;
  font-size: $font-size-xs;
  line-height: 1.3;
}

/* ===== 横向条形（资金拆解） ===== */
.hbar-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.hbar-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.hbar-label {
  width: 80rpx;
  font-size: $font-size-xs;
  font-weight: 600;
  color: $ink-soft;
  flex-shrink: 0;
}

.hbar-track {
  flex: 1;
  height: 28rpx;
  background: $bg-deep;
  border-radius: $r-xs;
  position: relative;
  overflow: hidden;
}

.hbar-center {
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 2rpx;
  background: $line-strong;
  transform: translateX(-1rpx);
}

.hbar-fill {
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: $r-xs;

  &.is-up {
    background: $up;
  }

  &.is-down {
    background: $down;
  }
}

.hbar-value {
  width: 96rpx;
  text-align: right;
  font-size: $font-size-xs;
  font-weight: 700;
  flex-shrink: 0;

  &.is-up {
    color: $up;
  }

  &.is-down {
    color: $down;
  }
}

/* ===== 垂直柱形图（10日资金节奏，方案 C） ===== */
.line-chart {
  display: grid;
  grid-template-columns: 36px 1fr;
  column-gap: 4rpx;
  width: 100%;
  height: 200px;
  overflow: visible;
  padding-top: 4rpx;
  box-sizing: border-box;
}

.line-axis-col {
  height: 172px;
  padding-top: 18px;
  padding-bottom: 28px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-end;
  box-sizing: border-box;
}

.line-axis-text {
  font-size: $font-size-xs;
  line-height: 1;
  color: $ink-mute;
}

.line-svg {
  display: block;
  width: 100%;
  height: 200px;
  overflow: visible;
}

.line-value-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8rpx 10rpx;
  padding: 8rpx 2rpx 4rpx;
}

.line-value-item {
  min-width: 0;
  padding: 6rpx 4rpx;
  border-radius: $r-xs;
  background: $bg-soft;
  text-align: center;
  border: 2rpx solid transparent;
  box-sizing: border-box;

  &.is-latest {
    background: $bg-card;
    border-color: $ink;
  }
}

.line-value-date {
  display: block;
  font-size: 20rpx;
  line-height: 1.2;
  color: $ink-mute;
}

.line-value-number {
  display: block;
  margin-top: 4rpx;
  font-size: $font-size-xs;
  line-height: 1.2;
  font-weight: 700;

  &.is-up {
    color: $up;
  }

  &.is-down {
    color: $down;
  }
}
</style>
