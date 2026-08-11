<template>
  <view v-if="hasData" class="cf-card">
    <view class="cf-header">
      <text class="cf-title">{{ card.title }}</text>
      <text v-if="netAmount != null" class="cf-net" :class="netClass">净额 {{ fmtSigned(netAmount) }}</text>
    </view>

    <view class="cf-grid">
      <view class="cf-cell in">
        <text class="cf-cell-value">{{ fmtCap(mainIn) }}</text>
        <text class="cf-cell-label">主力流入</text>
      </view>
      <view class="cf-cell out">
        <text class="cf-cell-value">{{ fmtCap(mainOut) }}</text>
        <text class="cf-cell-label">主力流出</text>
      </view>
    </view>

    <view v-if="flow5d.length > 0" class="cf-bars">
      <view v-for="(f, i) in flow5d" :key="i" class="cf-bar-col">
        <text class="cf-bar-value">{{ f.value ?? '--' }}</text>
        <view class="cf-bar-track">
          <view class="cf-bar" :class="(f.value ?? 0) >= 0 ? 'pos' : 'neg'" :style="{ height: barHeight(f) }" />
        </view>
        <text class="cf-bar-label">{{ f.label }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ChatCard } from '@/shared/api/modules/agent'

/** 契约字典：capital_flow.data.flow_5d 元素 */
interface FlowItem {
  label?: string
  value?: number
}

const props = defineProps<{ card: ChatCard }>()

const mainIn = computed(() => (typeof props.card.data.main_in === 'number' ? props.card.data.main_in : null))
const mainOut = computed(() => (typeof props.card.data.main_out === 'number' ? props.card.data.main_out : null))
const netAmount = computed(() => (typeof props.card.data.net_amount === 'number' ? props.card.data.net_amount : null))

const flow5d = computed<FlowItem[]>(() => {
  const raw = props.card.data.flow_5d
  return Array.isArray(raw) ? (raw as unknown as FlowItem[]) : []
})
const maxAbs = computed(() => Math.max(1, ...flow5d.value.map(f => Math.abs(f.value ?? 0))))

const hasData = computed(() => mainIn.value != null || mainOut.value != null || netAmount.value != null || flow5d.value.length > 0)
const netClass = computed(() => {
  const v = netAmount.value ?? 0
  return v > 0 ? 'up' : v < 0 ? 'down' : 'flat'
})

function barHeight(f: FlowItem): string {
  return `${Math.round((Math.abs(f.value ?? 0) / maxAbs.value) * 100)}%`
}
function fmtSigned(v: number): string {
  return v > 0 ? `+${v}` : String(v)
}
function fmtCap(v: number | null): string {
  if (v == null) return '--'
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  // 亿阈值 1e7（千万以上用亿）：brief 测试要求 8.5e7 → 0.9亿；整数域舍入避免 0.85.toFixed(1) 浮点取 0.8
  if (abs >= 1e7) return `${sign}${Math.round(abs / 1e7) / 10}亿`
  if (abs >= 1e4) return `${sign}${Math.round(abs / 1e4)}万`
  return String(v)
}
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;

.cf-card {
  margin-bottom: 12rpx;
  padding: 16rpx 20rpx;
  background: $bg-card;
  border-radius: $r-md;
  box-shadow: $shadow-card;
}
.cf-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}
.cf-title { font-size: 26rpx; font-weight: 600; color: $ink; }
.cf-grid { display: flex; gap: 8rpx; }
.cf-cell {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  border-radius: $r-xs;
  padding: 10rpx 0;
}
.cf-cell.in { background: $up-bg; }
.cf-cell.out { background: $down-bg; }
.cf-cell-value { font-size: 28rpx; font-weight: 700; }
.cf-cell.in .cf-cell-value { color: $up; }
.cf-cell.out .cf-cell-value { color: $down; }
.cf-cell-label { font-size: 20rpx; color: $ink-mute; }
.cf-bars {
  display: flex;
  align-items: flex-end;
  gap: 8rpx;
  margin-top: 16rpx;
  padding-top: 12rpx;
  border-top: 1rpx solid $line-soft;
}
.cf-bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4rpx; }
.cf-bar-value { font-size: 18rpx; color: $ink-mute; }
.cf-bar-track {
  width: 100%;
  height: 80rpx;
  display: flex;
  align-items: flex-end;
  background: $bg-soft;
  border-radius: 4rpx;
  overflow: hidden;
}
.cf-bar { width: 100%; border-radius: 4rpx 4rpx 0 0; }
.cf-bar.pos { background: linear-gradient(180deg, $up-light, $up); }
.cf-bar.neg { background: linear-gradient(180deg, $down-light, $down); }
.cf-bar-label { font-size: 18rpx; color: $ink-mute; }
.up { color: $up; }
.down { color: $down; }
.flat { color: $flat; }
</style>
