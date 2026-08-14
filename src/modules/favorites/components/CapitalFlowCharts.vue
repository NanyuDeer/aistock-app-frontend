<template>
  <view class="capital-flow-charts">
    <!-- AI 四字标签 -->
    <view class="cf-tag-row">
      <text v-if="tag" :class="['cf-tag', tagClass || 'is-neutral']">{{ tag }}</text>
    </view>

    <!-- 时间尺度分段 tab（选中整段高亮） -->
    <view class="cf-segmented">
      <view
        v-for="chip in windowChips"
        :key="chip.days"
        :class="['cf-segment', { active: chip.days === selectedDays }]"
        @tap="selectDays(chip.days)"
      >
        <text class="cf-segment-label">{{ chip.label }}</text>
        <text :class="['cf-segment-value', chip.isPositive ? 'is-up' : 'is-down']">{{ chip.text }}</text>
      </view>
    </view>

    <!-- 主力净流入（当前尺度） -->
    <view class="cf-hero-card">
      <view class="cf-hero-left">
        <text class="cf-hero-label">主力净流入</text>
        <text :class="['cf-hero-value', (selected?.mainInflow ?? 0) >= 0 ? 'is-up' : 'is-down']">
          {{ formatFlowValue(selected?.mainInflow) }}
        </text>
      </view>
      <view class="cf-hero-right">
        <text class="cf-hero-scale">{{ selectedScaleLabel }}</text>
        <text class="cf-hero-sub">{{ heroSub }}</text>
      </view>
    </view>

    <!-- 资金拆解（当前尺度） -->
    <view v-if="selectedOrders.length" class="flow-panel">
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

    <!-- AI 研判：一句话 -->
    <view v-if="aiSummary" class="cf-ai-summary">
      <text class="cf-ai-summary-label">AI 研判</text>
      <text class="cf-ai-summary-text">{{ aiSummary }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

interface FlowOrder {
  label: string
  value: number
}

interface CapitalFlowWindow {
  days: number
  mainInflow: number
  retailInflow: number
  ratio: number
  orders: FlowOrder[]
}

const props = withDefaults(defineProps<{
  windows?: CapitalFlowWindow[]
  streak?: string
  tag?: string
  tagClass?: string
  summary?: string
  narrative?: string
}>(), {
  windows: () => [],
})

const selectedDays = ref<number>(1)

watch(() => props.windows, (windows) => {
  if (!windows.some(w => w.days === selectedDays.value)) {
    selectedDays.value = windows[0]?.days ?? 1
  }
}, { immediate: true })

const selected = computed(() => (
  props.windows.find(w => w.days === selectedDays.value) || props.windows[0] || null
))

const windowChips = computed(() => props.windows.map(w => ({
  days: w.days,
  label: w.days === 1 ? '今日' : `${w.days}日`,
  text: formatFlowValue(w.mainInflow),
  isPositive: w.mainInflow >= 0,
})))

const selectedScaleLabel = computed(() => {
  const days = selected.value?.days
  if (!days) return ''
  return days === 1 ? '今日' : `${days}日累计`
})

const heroSub = computed(() => {
  const w = selected.value
  const streakText = props.streak ? `${props.streak} · ` : ''
  if (!w) return streakText ? streakText.slice(0, -3) : ''
  if (w.days === 1) return `${streakText}占比 ${w.ratio}%`
  return `${streakText}日均 ${formatFlowValue(w.mainInflow / w.days)}`
})

const selectedOrders = computed(() => (
  (selected.value?.orders || []).filter(o => o.label && o.value !== null && o.value !== undefined)
))

const breakdownRows = computed(() => {
  const values = selectedOrders.value.map(item => Number(item.value) || 0)
  const maxAbs = Math.max(0.01, ...values.map(value => Math.abs(value)))
  return selectedOrders.value.map((item, idx) => {
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

const aiSummary = computed(() => {
  const text = String(props.summary || '').trim()
  return text || buildFallbackSummary() || String(props.narrative || '').trim()
})

/** AI 缺失时的规则兜底：一句话覆盖今日 + 5/10/20 日 */
function buildFallbackSummary(): string {
  const byDays = (days: number) => props.windows.find(x => x.days === days)?.mainInflow
  const w1 = byDays(1)
  const w5 = byDays(5)
  const w10 = byDays(10)
  const w20 = byDays(20)
  if (w1 === undefined || w5 === undefined || w10 === undefined || w20 === undefined) return ''
  if (w1 > 0 && w5 > 0 && w10 > 0 && w20 > 0) return `今日主力净流入${formatAbsYi(w1)}，5/10/20日累计均净流入，资金节奏偏强，关注流入能否延续。`
  if (w1 < 0 && w5 < 0 && w10 < 0 && w20 < 0) return `今日主力净流出${formatAbsYi(w1)}，5/10/20日累计均净流出，资金节奏偏弱，等待流出收敛信号。`
  if (w1 > 0 && w5 <= 0) return `今日主力净流入${formatAbsYi(w1)}，但5/10/20日累计仍净流出，资金处于回流初期，持续性待确认。`
  if (w1 < 0 && w5 >= 0) return `今日主力净流出${formatAbsYi(w1)}，但5/10/20日累计仍净流入，短线资金松动，需防节奏转弱。`
  if (w5 > 0 && w10 <= 0) return `近5日净流入但10/20日累计仍净流出，中期资金格局尚未扭转。`
  if (w5 < 0 && w10 >= 0) return `近5日净流出但10/20日累计仍净流入，短期回撤未改中期流入。`
  return '今日与5/10/20日资金方向不一，节奏处于切换期。'
}

function selectDays(days: number) {
  selectedDays.value = days
}

function formatFlowValue(value: number | undefined | null): string {
  if (value === undefined || value === null || !Number.isFinite(value)) return '--'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}亿`
}

function formatAbsYi(value: number): string {
  return `${Math.abs(value).toFixed(2)}亿`
}

function formatSigned(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}`
}
</script>

<style lang="scss" scoped>
.capital-flow-charts {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

/* ===== 顶部：AI 标签 + 时间尺度分段 tab ===== */
.cf-tag-row {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  flex-wrap: wrap;
}

.cf-tag {
  flex-shrink: 0;
  padding: 6rpx 14rpx;
  border-radius: $r-xs;
  background: $primary-50;
  color: $primary;
  font-size: $font-size-xs;
  line-height: 1.4;
  font-weight: 800;

  &.is-bull {
    color: $up;
    background: $up-soft;
  }

  &.is-bear {
    color: $down;
    background: $down-soft;
  }
}

.cf-segmented {
  display: flex;
  gap: 4rpx;
  padding: 6rpx;
  border-radius: 18rpx;
  background: $bg-deep;
}

.cf-segment {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  padding: 14rpx 4rpx;
  border-radius: 14rpx;

  &.active {
    background: $bg-card;
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
  }
}

.cf-segment-label {
  font-size: 22rpx;
  line-height: 1.3;
  font-weight: 700;
  color: $ink-soft;
}

.cf-segment.active .cf-segment-label {
  color: $primary;
  font-weight: 800;
}

.cf-segment-value {
  font-size: 24rpx;
  line-height: 1.3;
  font-weight: 800;

  &.is-up {
    color: $up;
  }

  &.is-down {
    color: $down;
  }
}

/* ===== 主力净流入 ===== */
.cf-hero-card {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16rpx;
  padding: 20rpx 22rpx;
  border-radius: $r-md;
  background: $bg-card;
  border: 2rpx solid $line;
}

.cf-hero-label {
  display: block;
  font-size: $font-size-xs;
  line-height: 1.4;
  font-weight: 600;
  color: $ink-mute;
}

.cf-hero-value {
  display: block;
  margin-top: 6rpx;
  font-size: 44rpx;
  line-height: 1.15;
  font-weight: 800;

  &.is-up {
    color: $up;
  }

  &.is-down {
    color: $down;
  }
}

.cf-hero-right {
  flex-shrink: 0;
  text-align: right;
}

.cf-hero-scale {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2rpx 10rpx;
  border-radius: 8rpx;
  background: $primary-50;
  color: $primary;
  font-size: 20rpx;
  line-height: 1.5;
  font-weight: 700;
}

.cf-hero-sub {
  display: block;
  margin-top: 8rpx;
  font-size: 20rpx;
  line-height: 1.4;
  font-weight: 600;
  color: $ink-mute;
}

/* ===== 面板 ===== */
.flow-panel {
  padding: 18rpx;
  border-radius: $r-md;
  background: $bg-card;
  border: 2rpx solid $line;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 14rpx;
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

/* ===== 资金拆解横向条形 ===== */
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

/* ===== AI 研判 ===== */
.cf-ai-summary {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  padding: 16rpx 18rpx;
  border-radius: $r-md;
  background: $bg-soft;
}

.cf-ai-summary-label {
  flex-shrink: 0;
  padding: 4rpx 12rpx;
  border-radius: $r-xs;
  background: $primary-50;
  color: $primary;
  font-size: 20rpx;
  line-height: 1.4;
  font-weight: 800;
}

.cf-ai-summary-text {
  min-width: 0;
  font-size: $font-size-xs;
  line-height: 1.55;
  font-weight: 600;
  color: $ink-soft;
  word-break: break-word;
}
</style>
