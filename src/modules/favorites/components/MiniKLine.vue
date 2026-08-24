<!--
 * MiniKLine 轻量迷你 K 线（多股同列宫格卡片用）
 * 逻辑层算好坐标 → renderjs 视图层用 DOM 构建 SVG（App + H5 共用，效果一致）。
 * 分时/五日：折线（五日为按日叠加）+ 分时均价线；日K/周K/月K：蜡烛图 + 成交量。
 * 涨跌色：趋势涨=红(#f43f5e)，趋势跌=绿(#22c55e)，与自选页行情色一致。
 -->
<template>
  <view class="mini-kline" :style="{ height }">
    <!-- H5 + App 统一走 renderjs：uni-app 没有 <svg> 组件，模板内联 <svg> 在 App 端被当未知标签不渲染。
         renderjs 在视图层(webview)用 createElementNS 构建真实 SVG DOM，与 H5 效果一致。 -->
    <view
      v-if="renderable"
      :id="hostId"
      class="mini-kline__host"
      :data="svgModel"
      :change:data="miniView.render"
    />
    <view v-else class="mini-kline__empty">
      <text class="mini-kline__empty-text">--</text>
    </view>
  </view>
</template>

<script setup lang="ts">
// @ts-nocheck -- uni-app renderjs module (miniView) 在正常 vue-tsc 上下文之外编译；首行声明以抑制整 SFC 交叉诊断。
import { computed } from 'vue'
import type { KLineItem } from '@/shared/api/modules/stock'
import {
  VIEW_W,
  PRICE_BOTTOM,
  VOL_TOP,
  VOL_BOTTOM,
  isLinePeriod,
  buildLineGroupsRaw,
  isLineRenderable,
  buildScale,
} from './miniKLineLogic'

// 供页面以 `MiniKLine, { type MiniPeriod }` 跨文件 type 导入
// （script setup 中 `export type {} from ...` 重导不会被 vue-tsc 识别为 SFC 模块导出，故在此直接声明；
//   与 miniKLineLogic.ts 的 MiniPeriod 为同一字面量联合，结构兼容）。
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

/** renderjs 视图层 host 元素 id（模块经 uni-app 编译器映射到真实 DOM） */
const hostId = `mini_kline_${Date.now()}_${Math.floor(Math.random() * 10000)}`

const isLine = computed(() => isLinePeriod(props.period))
const isCandle = computed(() => !isLine.value)

/* ===== 折线数据（分时/五日） ===== */
const lineGroupsRaw = computed<{ label: string; values: number[] }[]>(() =>
  buildLineGroupsRaw(props.period, props.data),
)

/** 生成价格区域 y 映射（统一按全部折线点归一化，保证五日各日同尺度可比） */
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
  return `${pts} ${VIEW_W},${PRICE_BOTTOM} 0,${PRICE_BOTTOM}`
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
  return isLineRenderable(props.period, props.data)
})

/**
 * 传给 renderjs 的结构化数据：含 host 定位 + 全部已算好的坐标/样式。
 * renderjs 动态生成的节点不命中 scoped 样式，故颜色/线宽等视觉属性已随数据带出，
 * 由视图层内联到 SVG 节点属性上（与 KLineChart renderjs 分支同理）。
 */
const svgModel = computed(() => {
  if (!renderable.value) return null
  const base = { hostId, lineColor: lineColor.value }
  if (isLine.value) {
    return {
      ...base,
      kind: 'line',
      lineGroups: lineGroups.value.map((g) => ({ points: g.points, solid: g.solid })),
      area: areaPoints.value,
      avg: avgPoints.value,
    }
  }
  return { ...base, kind: 'candle', candles: candles.value }
})
</script>

<!-- MiniKLine renderjs 分支：App + H5 共用。逻辑层算出全部坐标，此处用 createElementNS 构建真实 SVG DOM，
     视觉属性内联到节点上（renderjs 动态节点不受 scoped 样式作用域约束）。 -->
<script module="miniView" lang="renderjs">
// @ts-nocheck -- renderjs 由 uni-app 编译器作为独立的视图层模块编译。
const SVG_NS = 'http://www.w3.org/2000/svg'

function makeSvgNode(tag, attrs) {
  const node = document.createElementNS(SVG_NS, tag)
  const entries = attrs || {}
  Object.keys(entries).forEach((key) => node.setAttribute(key, String(entries[key])))
  return node
}

export default {
  methods: {
    render(model) {
      if (!model || !model.hostId) return
      const host = document.getElementById(model.hostId)
      if (!host) return
      host.innerHTML = ''
      const svg = makeSvgNode('svg', {
        viewBox: '0 0 200 100',
        preserveAspectRatio: 'none',
        style: 'display:block;width:100%;height:100%;overflow:visible',
      })

      if (model.kind === 'line') {
        // 分时：收盘线下方面积
        if (model.area) {
          svg.appendChild(makeSvgNode('polygon', {
            points: model.area,
            fill: model.lineColor,
            'fill-opacity': '0.12',
          }))
        }
        // 折线：五日按日叠加（旧日降透明度），分时单条实线
        model.lineGroups.forEach((g) => {
          const line = makeSvgNode('polyline', {
            points: g.points,
            fill: 'none',
            stroke: model.lineColor,
            'stroke-width': '1.5',
            'stroke-linejoin': 'round',
            'stroke-linecap': 'round',
          })
          if (!g.solid) line.setAttribute('opacity', '0.4')
          svg.appendChild(line)
        })
        // 分时均价线（蓝色）
        if (model.avg) {
          svg.appendChild(makeSvgNode('polyline', {
            points: model.avg,
            fill: 'none',
            stroke: '#2563eb',
            'stroke-width': '1.2',
            'stroke-linejoin': 'round',
            'stroke-linecap': 'round',
          }))
        }
      } else {
        // 日/周/月：蜡烛（影线 + 实体）+ 成交量
        model.candles.forEach((c) => {
          svg.appendChild(makeSvgNode('line', {
            x1: c.x, y1: c.highY, x2: c.x, y2: c.lowY, stroke: c.color, 'stroke-width': '1',
          }))
          svg.appendChild(makeSvgNode('rect', {
            x: c.bodyX, y: c.bodyY, width: c.bodyW, height: c.bodyH, fill: c.color,
          }))
          svg.appendChild(makeSvgNode('rect', {
            x: c.volX, y: c.volY, width: c.volW, height: c.volH, fill: c.volColor,
          }))
        })
      }
      host.appendChild(svg)
    },
  },
}
</script>

<style lang="scss" scoped>
.mini-kline {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.mini-kline__host {
  width: 100%;
  height: 100%;
  overflow: hidden;
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
