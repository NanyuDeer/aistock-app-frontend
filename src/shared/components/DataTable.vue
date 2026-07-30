<template>
  <view class="as-data-table">
    <view v-if="title" class="as-data-table__title">
      <text class="as-data-table__title-text">{{ title }}</text>
    </view>
    <view class="as-data-table__grid" :style="gridStyle">
      <view
        v-for="(row, idx) in data"
        :key="idx"
        class="as-data-table__cell"
      >
        <text class="as-data-table__label">{{ row.label }}</text>
        <text class="as-data-table__value" :class="valueClass(row)">{{ formatValue(row) }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type Formatter = 'price' | 'percent' | 'volume' | 'amount' | 'raw'

interface DataRow {
  /** 字段名 */
  label: string
  /** 字段值 */
  value: number | string | null
  /** 单位 */
  unit?: string
  /** 是否按涨跌着色（正值红、负值绿） */
  trend?: boolean
  /** 格式化方式 */
  formatter?: Formatter
}

const props = withDefaults(defineProps<{
  data: DataRow[]
  /** 表格标题 */
  title?: string
  /** 列数，默认 3 */
  columns?: number
}>(), {
  columns: 3
})

const gridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${props.columns}, 1fr)`
} as Record<string, string>))

/** 成交量/成交额按万/亿换算 */
function formatVolume(v: number): string {
  const abs = Math.abs(v)
  if (abs >= 1e8) return (v / 1e8).toFixed(2) + '亿'
  if (abs >= 1e4) return (v / 1e4).toFixed(2) + '万'
  return String(v)
}

/** 按格式化方式格式化数值 */
function formatNumber(v: number, formatter: Formatter | undefined, unit: string | undefined): string {
  switch (formatter) {
    case 'price':
      return v.toFixed(2) + (unit ? unit : '')
    case 'percent': {
      const sign = v > 0 ? '+' : ''
      return sign + v.toFixed(2) + '%'
    }
    case 'volume':
      return formatVolume(v)
    case 'amount':
      return formatVolume(v) + '元'
    case 'raw':
    default:
      return String(v) + (unit ? unit : '')
  }
}

/** 格式化单元格值，空值显示 '--' */
function formatValue(row: DataRow): string {
  const v = row.value
  if (v === null || v === undefined || v === '') return '--'
  if (typeof v === 'number') {
    if (Number.isNaN(v)) return '--'
    return formatNumber(v, row.formatter, row.unit)
  }
  return String(v) + (row.unit ? row.unit : '')
}

/** 涨跌着色 class */
function valueClass(row: DataRow): string {
  if (!row.trend) return ''
  if (typeof row.value !== 'number') return ''
  if (row.value > 0) return 'is-up'
  if (row.value < 0) return 'is-down'
  return ''
}
</script>

<style lang="scss" scoped>
.as-data-table {
  width: 100%;
}

.as-data-table__title {
  padding: 0 0 $s-2;
}

.as-data-table__title-text {
  font-size: $font-size-md;
  font-weight: 700;
  color: $ink;
}

/* 网格：用 gap + 背景色形成分隔线 */
.as-data-table__grid {
  display: grid;
  gap: 2rpx;
  background: $line-soft;
  border: 2rpx solid $line;
  border-radius: $r-md;
  overflow: hidden;
}

.as-data-table__cell {
  background: $bg-card;
  padding: $s-2 $s-3;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.as-data-table__label {
  font-size: $font-size-xs;
  color: $ink-mute;
  line-height: $lh-tight;
}

.as-data-table__value {
  font-size: $font-size-base;
  font-weight: 700;
  color: $ink;
  font-family: $font-mono;
  line-height: $lh-tight;

  &.is-up {
    color: $up;
  }

  &.is-down {
    color: $down;
  }
}
</style>
