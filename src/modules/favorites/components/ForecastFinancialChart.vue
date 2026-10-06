<template>
  <view class="ffc">
    <view v-for="block in blocks" :key="block.key" class="ffc__block">
      <view class="ffc__block-head">
        <text class="ffc__block-title">{{ block.title }}</text>
        <text class="ffc__block-unit">{{ block.unitText }}</text>
      </view>

      <view class="ffc__plot-col">
        <view class="ffc__plot">
          <view class="ffc__plot-inner">
            <view
              v-for="(gl, gi) in block.gridlines"
              :key="'gl' + gi"
              class="ffc__gridline"
              :style="{ top: gl + '%' }"
            />

            <view
              v-for="(tick, ti) in block.ticksLeft"
              :key="'lt' + ti"
              class="ffc__tick ffc__tick--left"
              :style="{ bottom: tick.pos + '%' }"
            >{{ tick.text }}</view>
            <view
              v-for="(tick, ti) in block.ticksRight"
              :key="'rt' + ti"
              class="ffc__tick ffc__tick--right"
              :style="{ bottom: tick.pos + '%' }"
            >{{ tick.text }}</view>

            <view
              v-if="block.forecastDivider != null"
              class="ffc__divider is-forecast"
              :style="{ left: block.forecastDivider + '%' }"
            />

            <view
              v-for="col in block.columns"
              :key="'bar' + col.year"
              class="ffc__anchor"
              :style="{ left: col.leftPct + '%' }"
            >
              <view
                v-if="col.profitPct != null"
                class="ffc__bar is-profit"
                :style="{ height: col.profitPct + '%', bottom: '0%' }"
              />
              <view
                v-if="col.restPct != null"
                class="ffc__bar is-rest"
                :style="{ height: col.restPct + '%', bottom: (col.profitPct || 0) + '%' }"
              />
            </view>

            <template v-for="line in block.lines" :key="line.key">
              <view
                v-for="(seg, si) in line.segments"
                :key="line.key + '-s' + si"
                class="ffc__seg"
                :style="{ left: seg.leftPct + '%', bottom: seg.bottom + '%', width: seg.lenPct + '%', transform: `rotate(${seg.angle}deg)`, background: line.color }"
              />
              <view
                v-for="(dot, di) in line.dots"
                :key="line.key + '-d' + di"
                class="ffc__dot"
                :class="{ 'is-hollow': dot.forecast }"
                :style="dotStyle(dot, line.color)"
              />
            </template>
          </view>
        </view>

        <view class="ffc__years">
          <text
            v-for="item in block.yearAxis"
            :key="'y' + item.year"
            class="ffc__year"
            :style="{ left: item.leftPct + '%' }"
          >{{ item.year }}</text>
        </view>
      </view>

      <view class="ffc__legend">
        <view v-for="item in block.legend" :key="item.label" class="ffc__legend-item">
          <view
            class="ffc__legend-mark"
            :class="item.line ? 'is-line' : 'is-block'"
            :style="{ background: item.color }"
          />
          <text>{{ item.label }}</text>
        </view>
      </view>
    </view>

    <view v-if="forecastYearNote" class="ffc__note">{{ forecastYearNote }} 为预测</view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { compactNumber } from '@/shared/utils/format'

/** 业绩预测详表行（后端 `业绩预测详表_详细指标预测`） */
type DetailRow = Record<string, unknown>

interface Props {
  detailRows: ReadonlyArray<DetailRow>
}

const props = defineProps<Props>()

/** 绘图区高 / 全宽（CSS 用 padding-top 百分比实现恒定宽高比） */
const PLOT_ASPECT = 0.46
/** 绘图区左右留白（百分比，供刻度文字；同时保证与卡片边缘留出间距） */
const PLOT_PAD_PCT = 12
/** 坐标区高 / 宽：由上面两个常量推导，用于折线角度换算（跨设备恒定） */
const PLOT_INNER_ASPECT = PLOT_ASPECT / (1 - (PLOT_PAD_PCT * 2) / 100)

/** 序列配色（与 Web 版色相同族，映射到 design token 值） */
const COLOR = {
  profit: '#0b5fff',      // $primary
  revenue: '#d6e6ff',     // $primary-100
  netProfitGrowth: '#f0a020', // $warning
  revenueGrowth: '#18a058',   // $down
  roe: '#e54d5e',         // $up
  pe: '#8a96b0',          // $ink-mute
}

interface YearCol {
  year: string
  key: string
  kind: 'actual' | 'forecast'
}

interface Tick {
  text: string
  pos: number
}

interface LineDot {
  leftPct: number
  pos: number
  forecast: boolean
}

interface LineSegment {
  leftPct: number
  bottom: number
  lenPct: number
  angle: number
}

interface ChartLine {
  key: string
  label: string
  color: string
  dots: LineDot[]
  segments: LineSegment[]
}

interface BarColumn {
  year: string
  leftPct: number
  profitPct: number | null
  restPct: number | null
}

interface ChartBlock {
  key: string
  title: string
  unitText: string
  columns: BarColumn[]
  /** 横坐标年份轴（与 columns 解耦：无柱状序列的块也要有年份轴） */
  yearAxis: Array<{ year: string; leftPct: number }>
  lines: ChartLine[]
  ticksLeft: Tick[]
  ticksRight: Tick[]
  gridlines: number[]
  forecastDivider: number | null
  legend: Array<{ label: string; color: string; line: boolean }>
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/** 单元格取值：去除千分位；含「万」折算为亿（与 Web 版口径一致）；无效值 → null */
function parseCell(value: unknown): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const raw = String(value).replace(/,/g, '').trim()
  if (!raw || raw === '--' || raw === '-') return null
  const num = parseFloat(raw)
  if (!Number.isFinite(num)) return null
  return raw.includes('万') ? num / 10000 : num
}

/**
 * 年份列：取首行中「YYYY-实际值」/「预测YYYY-平均」列，按年份升序。
 * 同年两者并存时取实际值列（不产生重复年份）。
 */
function extractYearCols(rows: ReadonlyArray<DetailRow>): YearCol[] {
  const first = rows[0]
  if (!first) return []
  const byYear = new Map<string, YearCol>()
  for (const key of Object.keys(first)) {
    const actual = key.match(/^(\d{4})-实际值$/)
    if (actual) {
      byYear.set(actual[1], { year: actual[1], key, kind: 'actual' })
      continue
    }
    const forecast = key.match(/^预测(\d{4})-平均$/)
    if (forecast && !byYear.has(forecast[1])) {
      byYear.set(forecast[1], { year: forecast[1], key, kind: 'forecast' })
    }
  }
  return Array.from(byYear.values()).sort((a, b) => Number(a.year) - Number(b.year))
}

/** 按指标名片段匹配行；整行缺失返回 null */
function readSeries(
  rows: ReadonlyArray<DetailRow>,
  namePart: string,
  cols: YearCol[]
): Array<number | null> | null {
  const row = rows.find(item => String(item['预测指标'] ?? item.indicator ?? '').includes(namePart))
  if (!row) return null
  return cols.map(col => parseCell(row[col.key]))
}

function hasValue(values: Array<number | null> | null): boolean {
  return !!values && values.some(v => v !== null)
}

function leftPctOf(index: number, count: number): number {
  return count <= 1 ? 50 : round2((index / (count - 1)) * 100)
}

/** 横坐标年份轴：与柱状序列解耦，保证纯折线块也有年份刻度 */
function yearAxisOf(cols: YearCol[]): Array<{ year: string; leftPct: number }> {
  return cols.map((col, i) => ({ year: col.year, leftPct: leftPctOf(i, cols.length) }))
}

interface AxisRange {
  min: number
  max: number
}

/** 同轴共用的取值范围：始终包含 0 基线（多序列必须共用，否则与刻度错位） */
function rangeOf(groups: Array<Array<number | null>>): AxisRange {
  const nums = groups.reduce<number[]>((acc, cur) => acc.concat(cur.filter((v): v is number => v !== null)), [])
  if (!nums.length) return { min: 0, max: 1 }
  return { min: Math.min(...nums, 0), max: Math.max(...nums, 0) }
}

/** 折线：按传入的轴范围定标，缺失年份断开 */
function buildLine(
  key: string,
  label: string,
  color: string,
  values: Array<number | null>,
  cols: YearCol[],
  axis: AxisRange
): ChartLine {
  const span = axis.max - axis.min || 1
  const posOf = (v: number) => round2(((v - axis.min) / span) * 100)

  const dots: Array<LineDot | null> = values.map((v, i) => (v === null
    ? null
    : { leftPct: leftPctOf(i, cols.length), pos: posOf(v), forecast: cols[i].kind === 'forecast' }))

  const segments: LineSegment[] = []
  for (let i = 0; i < dots.length - 1; i++) {
    const from = dots[i]
    const to = dots[i + 1]
    if (!from || !to) continue
    const dx = to.leftPct - from.leftPct
    const dy = to.pos - from.pos
    const dyPx = dy * PLOT_INNER_ASPECT
    segments.push({
      leftPct: from.leftPct,
      bottom: from.pos,
      lenPct: round2(Math.sqrt(dx * dx + dyPx * dyPx)),
      angle: round2(-(Math.atan2(dyPx, dx) * 180) / Math.PI),
    })
  }

  return {
    key,
    label,
    color,
    dots: dots.filter((d): d is LineDot => d !== null),
    segments,
  }
}

/** 刻度：4 档等比（最大值 → 最小值） */
function buildTicks(max: number, min: number): Tick[] {
  return [0, 1, 2, 3].map(i => ({
    text: compactNumber(max - ((max - min) * i) / 3),
    pos: round2(100 - (i * 100) / 3),
  }))
}

const yearCols = computed(() => extractYearCols(props.detailRows))

const blocks = computed<ChartBlock[]>(() => {
  const cols = yearCols.value
  if (!cols.length) return []

  const revenue = readSeries(props.detailRows, '营业收入(元)', cols)
  const netProfit = readSeries(props.detailRows, '净利润(元)', cols)
  const netProfitGrowth = readSeries(props.detailRows, '净利润增长率', cols)
  const revenueGrowth = readSeries(props.detailRows, '营业收入增长率', cols)
  const roe = readSeries(props.detailRows, '净资产收益率', cols)
  const pe = readSeries(props.detailRows, '市盈率(动态)', cols)

  const result: ChartBlock[] = []

  // ===== 块 1：规模与成长（金额堆叠柱 + 净利润增长率折线）=====
  const barParts = cols.map((_, i) => {
    const rev = revenue ? revenue[i] : null
    const np = netProfit ? netProfit[i] : null
    if (rev === null && np === null) return { profit: null, rest: null }
    if (np === null) return { profit: null, rest: rev }
    if (rev === null) return { profit: np, rest: 0 }
    return { profit: np, rest: Math.max(0, rev - np) }
  })
  const maxTotal = Math.max(0, ...barParts.map(p => (p.profit || 0) + (p.rest || 0)))
  const hasBars = maxTotal > 0

  const columns: BarColumn[] = barParts.map((part, i) => ({
    year: cols[i].year,
    leftPct: leftPctOf(i, cols.length),
    profitPct: hasBars && part.profit !== null ? round2((part.profit / maxTotal) * 100) : null,
    restPct: hasBars && part.rest !== null && part.rest > 0 ? round2((part.rest / maxTotal) * 100) : null,
  }))

  const axis1 = rangeOf([netProfitGrowth ?? []])
  const line1 = hasValue(netProfitGrowth)
    ? [buildLine('netProfitGrowth', '净利润增长率', COLOR.netProfitGrowth, netProfitGrowth as Array<number | null>, cols, axis1)]
    : []

  if (hasBars || line1.length) {
    const legend: Array<{ label: string; color: string; line: boolean }> = []
    if (hasValue(netProfit)) legend.push({ label: '净利润', color: COLOR.profit, line: false })
    if (hasValue(revenue)) legend.push({ label: '营业收入', color: COLOR.revenue, line: false })
    if (line1.length) legend.push({ label: '净利润增长率', color: COLOR.netProfitGrowth, line: true })

    result.push({
      key: 'scale',
      title: '规模与成长',
      unitText: '亿元 / %',
      columns,
      yearAxis: yearAxisOf(cols),
      lines: line1,
      ticksLeft: buildTicks(maxTotal, 0),
      ticksRight: line1.length ? buildTicks(axis1.max, axis1.min) : [],
      gridlines: [0, 33.33, 66.67, 100],
      forecastDivider: forecastDividerOf(cols),
      legend,
    })
  }

  // ===== 块 2：成长与估值（营业收入增长率 / ROE / 市盈率 折线）=====
  // 增长率与 ROE 共用左轴（%），市盈率单独用右轴（倍）；同轴序列必须共用取值范围
  const rateAxis = rangeOf([revenueGrowth ?? [], roe ?? []])
  const peAxis = rangeOf([pe ?? []])
  const line2: ChartLine[] = []
  if (hasValue(revenueGrowth)) {
    line2.push(buildLine('revenueGrowth', '营业收入增长率', COLOR.revenueGrowth, revenueGrowth as Array<number | null>, cols, rateAxis))
  }
  if (hasValue(roe)) {
    line2.push(buildLine('roe', '净资产收益率', COLOR.roe, roe as Array<number | null>, cols, rateAxis))
  }
  if (hasValue(pe)) {
    line2.push(buildLine('pe', '市盈率', COLOR.pe, pe as Array<number | null>, cols, peAxis))
  }

  if (line2.length) {
    result.push({
      key: 'valuation',
      title: '成长与估值',
      unitText: '% / 倍',
      columns: [],
      yearAxis: yearAxisOf(cols),
      lines: line2,
      ticksLeft: buildTicks(rateAxis.max, rateAxis.min),
      ticksRight: hasValue(pe) ? buildTicks(peAxis.max, peAxis.min) : [],
      gridlines: [0, 33.33, 66.67, 100],
      forecastDivider: forecastDividerOf(cols),
      legend: line2.map(l => ({ label: l.label, color: l.color, line: true })),
    })
  }

  return result
})

/** 预测段起点：最后一根实际柱与第一根预测柱的中点（无预测段 → null） */
function forecastDividerOf(cols: YearCol[]): number | null {
  const firstForecast = cols.findIndex(c => c.kind === 'forecast')
  if (firstForecast < 0) return null
  if (firstForecast === 0) return 0
  return round2((leftPctOf(firstForecast - 1, cols.length) + leftPctOf(firstForecast, cols.length)) / 2)
}

const forecastYearNote = computed(() => {
  const target = yearCols.value.find(c => c.kind === 'forecast')
  return target ? target.year : ''
})

function dotStyle(dot: LineDot, color: string): Record<string, string> {
  const base = { left: `${dot.leftPct}%`, bottom: `${dot.pos}%` }
  return dot.forecast ? { ...base, borderColor: color } : { ...base, background: color }
}
</script>

<style lang="scss" scoped>
.ffc {
  padding: 6rpx 0 0;
}

.ffc__block {
  & + & {
    margin-top: 28rpx;
  }
}

/* 标题与单位分行：标题在上、单位在下（副标题形态） */
.ffc__block-head {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6rpx;
  padding: 0 4rpx 16rpx;
}

.ffc__block-title {
  font-size: $font-size-sm;
  font-weight: 600;
  color: $ink;
}

.ffc__block-unit {
  font-size: $font-size-xs;
  color: $ink-mute;
}

/* 绘图区：padding-top 百分比锁定宽高比，折线角度据此换算，跨设备一致 */
.ffc__plot {
  position: relative;
  width: 100%;
  height: 0;
  padding-top: 46%;
}

.ffc__plot-inner {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 12%;
  right: 12%;
}

.ffc__gridline {
  position: absolute;
  left: 0;
  right: 0;
  height: 1rpx;
  background: $line-soft;
}

.ffc__tick {
  position: absolute;
  font-size: 20rpx;
  line-height: 1;
  color: $ink-mute;
  white-space: nowrap;
}

.ffc__tick--left {
  right: 100%;
  margin-right: 16rpx;
  transform: translateY(50%);
}

.ffc__tick--right {
  left: 100%;
  margin-left: 16rpx;
  transform: translateY(50%);
}

/* 预测段起点虚线分隔 */
.ffc__divider.is-forecast {
  position: absolute;
  top: 0;
  bottom: 0;
  border-left: 1rpx dashed $warning;
}

/* 堆叠柱锚点：宽度由内部柱决定，水平居中于该年份 */
.ffc__anchor {
  position: absolute;
  bottom: 0;
  width: 0;
  height: 100%;
}

.ffc__bar {
  position: absolute;
  left: -11rpx;
  width: 22rpx;
  border-radius: 4rpx;

  &.is-profit {
    background: $primary;
  }

  &.is-rest {
    background: $primary-100;
  }
}

/* 折线段：以起点为原点旋转，长度按绘图区宽度的百分比给出 */
.ffc__seg {
  position: absolute;
  height: 3rpx;
  border-radius: 3rpx;
  transform-origin: left center;
}

.ffc__dot {
  position: absolute;
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  transform: translate(-50%, 50%);
  box-sizing: border-box;

  &.is-hollow {
    background: $bg-card;
    border: 3rpx solid;
  }
}

.ffc__plot-col {
  width: 100%;
}

.ffc__years {
  position: relative;
  height: 30rpx;
  margin: 8rpx 12% 0;
}

.ffc__year {
  position: absolute;
  transform: translateX(-50%);
  font-size: 20rpx;
  line-height: 1;
  color: $ink-faint;
}

.ffc__legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8rpx 16rpx;
  padding: 12rpx 4rpx 0;
}

.ffc__legend-item {
  display: flex;
  align-items: center;
  gap: 6rpx;
  font-size: $font-size-xs;
  color: $ink-soft;
}

.ffc__legend-mark {
  width: 14rpx;
  height: 14rpx;
  border-radius: 3rpx;

  &.is-line {
    height: 4rpx;
    border-radius: 4rpx;
  }
}

.ffc__note {
  padding: 8rpx 4rpx 0;
  font-size: $font-size-xs;
  color: $ink-mute;
}
</style>
