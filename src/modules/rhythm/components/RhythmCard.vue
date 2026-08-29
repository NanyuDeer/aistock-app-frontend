<template>
  <view class="rhythm-card">
    <view class="rc-head">
      <text class="rc-title">{{ title }}</text>
      <text class="rc-slot" v-if="slot">{{ slotLabel }}</text>
    </view>
    <view class="rc-band" v-if="card.position_band">
      <text class="rc-score" v-if="card.score != null">{{ card.score }}</text>
      <text class="rc-band-text">{{ card.position_band.text }}</text>
    </view>
    <view class="rc-phase" v-if="card.phase">
      <text>情绪周期：{{ phaseLabel }}（实验性判定）</text>
    </view>
    <view class="rc-temp" v-if="card.temperature_series && card.temperature_series.length">
      <view class="rc-temp-title">近 7 日情绪温度</view>
      <view class="rc-temp-bars">
        <view v-for="(t, i) in card.temperature_series" :key="i" class="rc-temp-col">
          <view class="rc-temp-bar" :style="{ height: tempBarHeight(t.score) }"></view>
          <text class="rc-temp-date">{{ t.date.slice(5) }}</text>
        </view>
      </view>
    </view>
    <view class="rc-conflict" v-if="card.conflict">
      <text>{{ card.conflict_detail || '信号背离，仅提供区间与提示' }}</text>
    </view>
    <view class="rc-events" v-if="card.event_window && card.event_window.length">
      <view class="rc-evt" v-for="(ev, i) in card.event_window" :key="i">
        <text class="rc-evt-date">{{ ev.date }}</text>
        <text class="rc-evt-title">{{ ev.title }}</text>
        <Tag :type="ev.importance === 'high' ? 'warning' : 'neutral'" size="sm">{{ ev.importance }}</Tag>
      </view>
    </view>
    <view class="rc-empty" v-else-if="card.event_source_missing">
      <text>该维度数据源未接入</text>
    </view>
    <view class="rc-empty" v-else>
      <text>今日无事件（正常交易日）</text>
    </view>
    <view class="rc-branches" v-if="card.branches && card.branches.length">
      <view class="rc-branch" v-for="(b, i) in card.branches" :key="i">
        <text class="rc-branch-cond">{{ b.condition.label || b.condition.value || b.condition.indicator }}</text>
        <text class="rc-branch-concl">{{ directionLabel(b.conclusion.direction) }}：{{ b.conclusion.range || b.conclusion.note }}</text>
      </view>
    </view>
    <view class="rc-missing" v-if="card.data_missing && card.data_missing.length">
      <text v-for="(m, i) in card.data_missing" :key="i" class="rc-missing-item">{{ m }}</text>
    </view>
    <view class="rc-disclaimer">本页内容为研究参考，不构成任何投资建议，据此操作风险自担。</view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Tag } from '@/shared/components'
import type { RhythmCard as RhythmCardData } from '@/shared/api/modules/agent'

const props = withDefaults(
  defineProps<{ card: RhythmCardData; title?: string; slot?: string }>(),
  { title: '节奏状态卡', slot: '' },
)

const phaseLabel = computed(() => {
  const m: Record<string, string> = { ice: '冰点', warm_up: '升温', overheat: '过热', ebb: '退潮' }
  return m[props.card.phase ?? ''] ?? props.card.phase ?? '数据缺失（沿用前值）'
})

const slotLabel = computed(() => {
  const m: Record<string, string> = { after_close: '收盘基准', morning: '盘前', midday: '午间' }
  return m[props.slot] ?? props.slot
})

function directionLabel(d: string): string {
  const m: Record<string, string> = { bullish: '偏多', bearish: '偏空', neutral: '中性' }
  return m[d] ?? d
}

function tempBarHeight(score: number): string {
  const pct = Math.max(4, Math.min(100, Number(score) || 0))
  return `${pct}%`
}
</script>

<style lang="scss" scoped>
@import '@/shared/styles/variables.scss';
.rhythm-card { padding: 24rpx; background: $bg-card; border-radius: 16rpx; }
.rc-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.rc-title { font-size: 32rpx; font-weight: 600; color: $ink; }
.rc-slot { font-size: 24rpx; color: $primary; }
.rc-band { display: flex; align-items: baseline; gap: 16rpx; margin-bottom: 12rpx; }
.rc-score { font-size: 64rpx; font-weight: 700; color: $primary; }
.rc-band-text { font-size: 30rpx; color: $ink-soft; }
.rc-phase, .rc-conflict, .rc-missing-item, .rc-empty { font-size: 26rpx; color: $ink-soft; margin-bottom: 8rpx; }
.rc-temp { margin: 12rpx 0; }
.rc-temp-title { font-size: 24rpx; color: $ink-soft; margin-bottom: 8rpx; }
.rc-temp-bars { display: flex; align-items: flex-end; gap: 12rpx; height: 120rpx; }
.rc-temp-col { display: flex; flex-direction: column; align-items: center; flex: 1; }
.rc-temp-bar { width: 24rpx; background: $primary; border-radius: 6rpx 6rpx 0 0; }
.rc-temp-date { font-size: 20rpx; color: $ink-soft; margin-top: 6rpx; }
.rc-evt { display: flex; align-items: center; gap: 12rpx; margin-bottom: 8rpx; }
.rc-evt-date { font-size: 24rpx; color: $primary-700; }
.rc-evt-title { font-size: 26rpx; color: $ink; flex: 1; }
.rc-branch { margin-bottom: 8rpx; }
.rc-branch-cond { font-size: 26rpx; color: $ink; font-weight: 500; }
.rc-branch-concl { font-size: 26rpx; color: $ink-soft; margin-left: 12rpx; }
.rc-disclaimer { margin-top: 16rpx; font-size: 22rpx; color: $warning; }
</style>
