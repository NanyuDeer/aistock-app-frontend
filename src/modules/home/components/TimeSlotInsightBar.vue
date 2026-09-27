<template>
  <view class="insight-bar">
    <view class="insight-bar__header">
      <text class="insight-bar__title">洞见</text>
      <text class="insight-bar__slot">· {{ slotLabel }}</text>
    </view>
    <view class="insight-bar__tabs">
      <view
        v-for="tab in TABS"
        :key="tab.slot"
        class="insight-bar__tab"
        :class="{ 'insight-bar__tab--active': tab.slot === activeSlot }"
        @tap="activeSlot = tab.slot"
      >
        <text class="insight-bar__tab-text">{{ tab.label }}</text>
      </view>
    </view>
    <view class="insight-bar__rows">
      <view
        v-for="row in currentRows"
        :key="row.key"
        class="insight-bar__row"
        @tap="emit('navigate', row.target)"
      >
        <text class="insight-bar__row-label">{{ row.label }}</text>
        <text class="insight-bar__row-value">{{ row.value }}</text>
        <text class="insight-bar__row-arrow">›</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { getTradingTimeSlot, type TradingTimeSlot } from '@/shared/utils/tradingTime'

type BarTarget = 'rhythm' | 'sectors' | 'events' | 'trace'

interface Props {
  leaderSectors: ReadonlyArray<{ name: string }>
  chainEvents: ReadonlyArray<{ name: string }>
  traceReports: ReadonlyArray<{ name: string }>
  rhythmRows: ReadonlyArray<{ band: string; basis_date: string | null }>
  currentSlot?: TradingTimeSlot
}

interface BarRow {
  key: string
  label: string
  value: string
  target: BarTarget
}

const props = defineProps<Props>()
const emit = defineEmits<{ (e: 'navigate', target: BarTarget): void }>()

const EMPTY = '暂无'

const TABS: ReadonlyArray<{ slot: TradingTimeSlot; label: string }> = [
  { slot: 'pre', label: '盘前' },
  { slot: 'intraday', label: '盘中' },
  { slot: 'post', label: '盘后' },
]

// 复位由父组件 :key 重挂载负责，故此处仅初始化、不 watch
const activeSlot = ref<TradingTimeSlot>(props.currentSlot ?? getTradingTimeSlot())

const slotLabel = computed(() => TABS.find((t) => t.slot === activeSlot.value)?.label ?? '')

const preRows = computed<BarRow[]>(() => [
  {
    key: 'pre-rhythm',
    label: '今日节奏 · 建议仓位',
    value: props.rhythmRows[0]?.band || EMPTY,
    target: 'rhythm',
  },
  {
    key: 'pre-sectors',
    label: '风口 · 前三板块',
    value: props.leaderSectors.slice(0, 3).map((s) => s.name).join(' / ') || EMPTY,
    target: 'sectors',
  },
])

const intradayRows = computed<BarRow[]>(() => [
  {
    key: 'intraday-events',
    label: '重磅消息 · 最新 3 条',
    value: props.chainEvents.slice(0, 3).map((e) => e.name).join(' · ') || '暂无重磅消息',
    target: 'events',
  },
])

const postRows = computed<BarRow[]>(() => [
  {
    key: 'post-trace',
    label: '市场洞见 · 今日溯源结论',
    value: props.traceReports[0]?.name || EMPTY,
    target: 'trace',
  },
  {
    key: 'post-rhythm',
    label: '明日节奏 · 收盘基准',
    value: basisText(props.rhythmRows[0]),
    target: 'rhythm',
  },
])

const currentRows = computed<BarRow[]>(() => {
  if (activeSlot.value === 'pre') return preRows.value
  if (activeSlot.value === 'intraday') return intradayRows.value
  return postRows.value
})

function basisText(row?: { band: string; basis_date: string | null }): string {
  if (!row) return EMPTY
  const short = row.basis_date ? row.basis_date.slice(5) : ''
  if (short) return row.band ? `${row.band}（基准 ${short}）` : `基准 ${short}`
  return row.band || EMPTY
}
</script>

<style lang="scss" scoped>
.insight-bar {
  position: relative;
  padding: $s-3;
  background: $bg-soft;
  border: 2rpx solid $line;
  border-radius: $r-md;
  margin-bottom: $s-2;
  box-shadow: $shadow-card;
  overflow: hidden;
}

.insight-bar::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4rpx;
  background: $brand-gradient;
}

.insight-bar__header {
  display: flex;
  align-items: baseline;
  gap: 6rpx;
  margin-bottom: $s-2;
}

.insight-bar__title {
  font-size: $font-size-lg;
  font-weight: 600;
  color: $ink;
}

.insight-bar__slot {
  font-size: $font-size-xs;
  color: $ink-mute;
}

.insight-bar__tabs {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 6rpx;
  background: $bg-card;
  border: 1rpx solid $line;
  border-radius: $r-full;
}

.insight-bar__tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10rpx 0;
  border-radius: $r-full;
}

.insight-bar__tab--active {
  background: $brand-gradient;
}

.insight-bar__tab-text {
  font-size: $font-size-sm;
  color: $ink-soft;
}

.insight-bar__tab--active .insight-bar__tab-text {
  color: #ffffff;
  font-weight: 600;
}

.insight-bar__rows {
  margin-top: $s-2;
}

.insight-bar__row {
  display: flex;
  align-items: center;
  gap: $s-2;
  padding: 14rpx 0;

  & + & {
    border-top: 1rpx solid $line;
  }
}

.insight-bar__row-label {
  flex: none;
  font-size: $font-size-xs;
  color: $ink-mute;
}

.insight-bar__row-value {
  flex: 1;
  font-size: $font-size-sm;
  color: $ink;
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.insight-bar__row-arrow {
  flex: none;
  font-size: $font-size-lg;
  color: $ink-mute;
}
</style>
