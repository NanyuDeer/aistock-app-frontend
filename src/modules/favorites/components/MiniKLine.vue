<!--
 * MiniKLine 轻量迷你 K 线（多股同列宫格卡片用）
 * 纯 SVG 渲染，不依赖 klinecharts/renderjs，所有端可用。
 * 分时/五日：折线（五日为按日叠加）+ 分时均价线；日K/周K/月K：蜡烛图 + 成交量。
 * 涨跌色：趋势涨=红(#f43f5e)，趋势跌=绿(#22c55e)，与自选页行情色一致。
 -->
<template>
  <view class="mini-kline" :style="{ height }">
    <svg
      v-if="renderable"
      class="mini-kline__svg"
      viewBox="0 0 200 100"
      preserveAspectRatio="none"
    >
      <!-- 分时/五日：面积 + 折线（+ 分时均价线） -->
      <template v-if="isLine">
        <polygon v-if="areaPoints" class="mini-kline__area" :points="areaPoints" :fill="lineColor" />
        <polyline
          v-for="(g, i) in lineGroups"
          :key="i"
          class="mini-kline__line"
          :class="{ 'mini-kline__line--dim': !g.solid }"
          :points="g.points"
          :stroke="lineColor"
          vector-effect="non-scaling-stroke"
        />
        <polyline v-if="avgPoints" class="mini-kline__avg" :points="avgPoints" vector-effect="non-scaling-stroke" />
      </template>
      <!-- 日/周/月：蜡烛 + 成交量 -->
      <template v-else>
        <g v-for="(c, i) in candles" :key="i">
          <line :x1="c.x" :y1="c.highY" :x2="c.x" :y2="c.lowY" :stroke="c.color" stroke-width="1" />
          <rect :x="c.bodyX" :y="c.bodyY" :width="c.bodyW" :height="c.bodyH" :fill="c.color" />
          <rect :x="c.volX" :y="c.volY" :width="c.volW" :height="c.volH" :fill="c.volColor" />
        </g>
      </template>
    </svg>
    <view v-else class="mini-kline__empty">
      <text class="mini-kline__empty-text">--</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { KLineItem } from '@/shared/api/modules/stock'

export type MiniPeriod = 'minute' | 'five' | 'daily' | 'weekly' | 'monthly'

const props = withDefaults(defineProps<{
  data: KLineItem[]
  period: MiniPeriod
  /** 涨跌方向（涨=红/跌=绿）；缺省按数据首尾收盘判断 */
  trendUp?: boolean
  height?: string
}>(), {
  data: () => [],
  period: 'daily',
  trendUp: undefined,
  height: '180rpx',
})

const UP = '#f43f5e'
const DOWN = '#22c55e'
const AVG = '#2563eb'
const VIEW_W = 200
const VIEW_H = 100
const PRICE_TOP = 6
const PRICE_BOTTOM = 78
const VOL_TOP = 86
const VOL_BOTTOM = 96

const isLine = computed(() => props.period === 'minute' || props.period === 'five')
const isCandle = computed(() => !isLine.value)

/* ===== 折线数据（分时/五日） ===== */
interface LineGroup { label: string; values: number[] }

/** 按日期（YYYYMMDD）分组，供五日按日叠加与分时取最近交易日 */
function groupByDate(items: KLineItem[]) {
  const map = new Map<string, KLineItem[]>()
  items.forEach((item) => {
    const d = String(item.date || '').replace(/\D/g, '').slice(0, 8)
    if (!d) return
    const list = map.get(d) || []
    list.push(item)
    map.set(d, list)
  })
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
}

const lineGroupsRaw = computed<LineGroup[]>(() => {
  if (!isLine.value) return []
  if (props.period === 'five') {
    return groupByDate(props.data).slice(-5).map(([label, list]) => ({
      label,
      values: list.map((i) => Number(i.close) || 0).filter((v) => v > 0),
    }))
  }
  // 分时：取最近一个交易日的分钟序列
  const groups = groupByDate(props.data)
  const source = groups.length ? groups[groups.length - 1][1] : props.data
  return [{
    label: groups.length ? groups[groups.length - 1][0] : '',
    values: source.map((i) => Number(i.close) || 0).filter((v) => v > 0),
  }]
})

/** 生成价格区域 y 映射（统一按全部折线点归一化，保证五日各日同尺度可比） */
function buildScale(values: number[]) {
  const nums = values.filter((v) => Number.isFinite(v))
  if (nums.length < 2) return null
  let min = Math.min(...nums)
  let max = Math.max(...nums)
  if (min === max) {
    min -= 0.5
    max += 0.5
  }
  const pad = (max - min) * 0.12
  min -= pad
  max += pad
  const range = max - min || 1
  return {
    yFor: (v: number) => PRICE_TOP + ((max - v) / range) * (PRICE_BOTTOM - PRICE_TOP),
  }
}

const lineScale = computed(() => buildScale(lineGroupsRaw.value.flatMap((g) => g.values)))

const lineGroups = computed(() => {
  const scale = lineScale.value
  if (!scale) return []
  const all = lineGroupsRaw.value
  const total = all.length
  return all.map((g, gi) => {
    const n = g.values.length
    if (n < 1) return { points: '', solid: false }
    const pts = g.values
      .map((v, i) => {
        const x = n <= 1 ? VIEW_W / 2 : (i / (n - 1)) * VIEW_W
        return `${x.toFixed(2)},${scale.yFor(v).toFixed(2)}`
      })
      .join(' ')
    return { points: pts, solid: gi === total - 1 }
  })
})

/** 分时：收盘折线下方面积 */
const areaPoints = computed(() => {
  if (props.period !== 'minute') return ''
  const scale = lineScale.value
  const g = lineGroupsRaw.value[0]
  if (!scale || !g || g.values.length < 2) return ''
  const n = g.values.length
  const pts = g.values
    .map((v, i) => `${((i / (n - 1)) * VIEW_W).toFixed(2)},${scale.yFor(v).toFixed(2)}`)
    .join(' ')
  return `${pts} ${VIEW_W},${VOL_BOTTOM} 0,${VOL_BOTTOM}`
})

/** 分时：均价线（收盘运行均值，蓝色区分） */
const avgPoints = computed(() => {
  if (props.period !== 'minute') return ''
  const scale = lineScale.value
  const g = lineGroupsRaw.value[0]
  const values = g?.values || []
  if (!scale || values.length < 2) return ''
  let sum = 0
  const runs = values.map((v, i) => {
    sum += v
    return sum / (i + 1)
  })
  return runs
    .map((v, i) => `${((i / (values.length - 1)) * VIEW_W).toFixed(2)},${scale.yFor(v).toFixed(2)}`)
    .join(' ')
})

/* ===== 蜡烛数据（日/周/月） ===== */
const validCandles = computed(() => props.data.filter((i) => Number(i.close) > 0))

const candles = computed(() => {
  const items = validCandles.value
  if (!items.length) return []
  const sorted = [...items].sort((a, b) => String(a.date).localeCompare(String(b.date))).slice(-30)
  const lo = Math.min(...sorted.map((i) => Number(i.low) || 0))
  const hi = Math.max(...sorted.map((i) => Number(i.high) || 0))
  const scale = buildScale([lo, hi])
  if (!scale) return []
  const n = sorted.length
  const slot = VIEW_W / n
  const w = Math.max(1.5, Math.min(7, slot * 0.62))
  const maxVol = Math.max(1, ...sorted.map((i) => Number(i.volume) || 0))
  return sorted.map((it, idx) => {
    const open = Number(it.open) || Number(it.close)
    const close = Number(it.close)
    const high = Number(it.high) || Math.max(open, close)
    const low = Number(it.low) || Math.min(open, close)
    const up = close >= open
    const color = up ? UP : DOWN
    const x = slot * idx + slot / 2
    const oy = scale.yFor(open)
    const cy = scale.yFor(close)
    const volH = Math.max(0.6, ((Number(it.volume) || 0) / maxVol) * (VOL_BOTTOM - VOL_TOP))
    return {
      x,
      highY: scale.yFor(high),
      lowY: scale.yFor(low),
      bodyX: x - w / 2,
      bodyY: Math.min(oy, cy),
      bodyW: w,
      bodyH: Math.max(1, Math.abs(oy - cy)),
      color,
      volX: x - w / 2,
      volY: VOL_BOTTOM - volH,
      volW: w,
      volH,
      volColor: up ? 'rgba(244, 63, 94, 0.35)' : 'rgba(34, 197, 94, 0.35)',
    }
  })
})

/* ===== 涨跌色与可渲染判定 ===== */
const trendUp = computed(() => {
  if (props.trendUp !== undefined) return props.trendUp
  const vals = lineGroupsRaw.value.flatMap((g) => g.values)
  if (vals.length >= 2) return vals[vals.length - 1] >= vals[0]
  const items = validCandles.value
  if (items.length >= 2) return Number(items[items.length - 1].close) >= Number(items[0].close)
  return true
})

const lineColor = computed(() => (trendUp.value ? UP : DOWN))

const renderable = computed(() => {
  if (isCandle.value) return candles.value.length > 0
  return lineGroupsRaw.value.some((g) => g.values.length >= 2)
})
</script>

<style lang="scss" scoped>
.mini-kline {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.mini-kline__svg {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.mini-kline__line {
  fill: none;
  stroke-width: 1.5;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.mini-kline__line--dim {
  opacity: 0.4;
}

.mini-kline__avg {
  fill: none;
  stroke-width: 1.2;
  /* 与 JS 常量 AVG('#2563eb') 保持一致；$AVG 非 SCSS 变量，直接写字面量避免编译报错 */
  stroke: #2563eb;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.mini-kline__area {
  stroke: none;
  fill-opacity: 0.12;
}

.mini-kline__empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mini-kline__empty-text {
  font-size: 24rpx;
  color: #9ca3af;
}
</style>
