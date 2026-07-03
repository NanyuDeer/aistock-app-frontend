<template>
  <view class="as-stock-table">
    <view v-if="title" class="as-table-header">
      <text class="as-table-title">{{ title }}</text>
    </view>
    <view class="as-table-grid">
      <view v-for="(row, idx) in rows" :key="idx" class="as-table-row">
        <text class="as-table-label">{{ row.label }}</text>
        <text :class="['as-table-value', row.trend ? trendClass(row.value) : '']">
          {{ formatValue(row) }}
        </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface TableRow {
  label: string
  value: number | string | null | undefined
  unit?: string
  trend?: boolean
  formatter?: 'price' | 'percent' | 'volume' | 'amount' | 'raw'
}

const props = withDefaults(defineProps<{
  data: Array<TableRow>
  title?: string
  columns?: number
}>(), {
  title: '',
  columns: 3
})

const rows = computed(() => props.data)

function trendClass(val: number | string | null | undefined): string {
  if (typeof val !== 'number') return ''
  if (val > 0) return 'up'
  if (val < 0) return 'down'
  return ''
}

function formatValue(row: TableRow): string {
  const { value, formatter, unit } = row
  if (value === null || value === undefined) return '--'
  if (typeof value === 'string') return value

  switch (formatter) {
    case 'price':
      return value.toFixed(2) + (unit || '')
    case 'percent':
      return (value >= 0 ? '+' : '') + value.toFixed(2) + '%'
    case 'volume':
      return formatVolume(value)
    case 'amount':
      return formatAmount(value)
    case 'raw':
    default:
      return String(value) + (unit || '')
  }
}

function formatVolume(vol: number): string {
  if (!vol) return '--'
  if (vol >= 100000000) return (vol / 100000000).toFixed(2) + '亿'
  if (vol >= 10000) return (vol / 10000).toFixed(2) + '万'
  return vol + ''
}

function formatAmount(amt: number): string {
  if (!amt) return '--'
  if (amt >= 100000000) return (amt / 100000000).toFixed(2) + '亿'
  if (amt >= 10000) return (amt / 10000).toFixed(2) + '万'
  return amt.toFixed(2) + '元'
}
</script>

<style lang="scss" scoped>
.as-stock-table { background: #ffffff; border-radius: 12rpx; padding: 24rpx; }

.as-table-header { margin-bottom: 16rpx; }
.as-table-title { font-size: 28rpx; font-weight: 600; color: #1a1d24; }

.as-table-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20rpx 16rpx;
}

.as-table-row { display: flex; flex-direction: column; gap: 4rpx; }
.as-table-label { font-size: 22rpx; color: #9ca3af; }
.as-table-value { font-size: 28rpx; font-weight: 600; color: #1a1d24; }

.up { color: #f43f5e; }
.down { color: #22c55e; }
</style>
