<template>
  <view class="market-insight-card">
    <InsightCard
      type="market"
      :title="brief.title"
      :trace="brief.trace"
      :forecast="brief.forecast"
      :time="brief.time"
      :confidence="brief.confidence"
      :show-meta="true"
      @click="toggle"
    />

    <view v-if="canViewFullReport" class="detail-toggle" @tap="toggle">
      <text class="toggle-text">{{ expanded ? '收起详情' : '展开详情' }}</text>
      <text class="toggle-icon" :class="{ 'is-open': expanded }">▾</text>
    </view>

    <view v-if="expanded && detail" class="detail-sections">
      <!-- 现象（title 强相关） -->
      <view class="detail-section">
        <text class="section-title">现象</text>
        <view class="phenomenon-block">
          <text class="phenomenon-summary">{{ detail.phenomenon.summary || detail.phenomenon.severityLabel || '—' }}</text>
          <view v-if="detail.phenomenon.indexPerformance.length" class="index-list">
            <view v-for="(idx, i) in detail.phenomenon.indexPerformance" :key="`idx-${i}`" class="index-row">
              <text class="index-name">{{ idx.name }}</text>
              <text class="index-pct" :class="idx.pctChange && idx.pctChange > 0 ? 'up' : idx.pctChange && idx.pctChange < 0 ? 'down' : 'flat'">
                {{ idx.pctChange === null ? '—' : `${idx.pctChange > 0 ? '+' : ''}${idx.pctChange.toFixed(2)}%` }}
              </text>
            </view>
          </view>
          <view v-if="detail.phenomenon.topGainers.length" class="sector-block">
            <text class="sector-label">领涨板块</text>
            <text class="sector-list">{{ sectorNames(detail.phenomenon.topGainers) }}</text>
          </view>
          <view v-if="detail.phenomenon.topLosers.length" class="sector-block">
            <text class="sector-label">领跌板块</text>
            <text class="sector-list">{{ sectorNames(detail.phenomenon.topLosers) }}</text>
          </view>
        </view>
      </view>

      <!-- 溯源（trace 强相关） -->
      <view class="detail-section">
        <text class="section-title">溯源</text>
        <MarketTraceTimeline :presentation="presentation" />
      </view>

      <!-- 预判（forecast 强相关） -->
      <view class="detail-section">
        <text class="section-title">预判</text>
        <MarketTracePrediction :prediction="presentation.prediction" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { InsightCard } from '@/shared/components'
import { toMarketInsightBrief, toMarketInsightDetail } from '@/modules/analytics/utils/marketInsightBrief'
import type { MarketTracePresentation } from '@/modules/analytics/utils/marketTraceReview'
import MarketTraceTimeline from './MarketTraceTimeline.vue'
import MarketTracePrediction from './MarketTracePrediction.vue'

const props = defineProps<{
  presentation: MarketTracePresentation
}>()

/** 付费墙预留：本期恒 true，后续升级为付费用户才可查看/导出完整报告 */
const canViewFullReport = ref(true)
const expanded = ref(false)

const brief = computed(
  () => toMarketInsightBrief(props.presentation)!, // props.presentation 为必填非空 prop，函数仅对 null/undefined 输入返回 null，此处恒非空
)
const detail = computed(() => toMarketInsightDetail(props.presentation))

function toggle() {
  expanded.value = !expanded.value
}

function sectorNames(items: Array<{ name: string; pctChange: number | null }>): string {
  return items.map((it) => (it.pctChange === null ? it.name : `${it.name} ${it.pctChange > 0 ? '+' : ''}${it.pctChange.toFixed(2)}%`)).join('、')
}
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;

.market-insight-card { display: flex; flex-direction: column; gap: $spacing-sm; padding: $spacing-base; }

.detail-toggle {
  display: inline-flex; align-items: center; align-self: flex-start;
  gap: 6rpx; padding: 8rpx 20rpx; border-radius: $r-full;
  background: $primary-50; border: 1rpx solid $primary-100;
}
.toggle-text { font-size: $font-size-sm; color: $primary; font-weight: 500; }
.toggle-icon { font-size: 24rpx; color: $primary; transition: transform 0.2s; }
.toggle-icon.is-open { transform: rotate(180deg); }

.detail-sections { display: flex; flex-direction: column; gap: $spacing-base; margin-top: $spacing-xs; }
.detail-section { padding: $spacing-base; background: $bg-card; border-radius: $r-md; box-shadow: $shadow-card; }
.section-title { display: block; font-size: 28rpx; font-weight: 600; color: $text-color-title; margin-bottom: $spacing-sm; }

.phenomenon-block { display: flex; flex-direction: column; gap: $spacing-xs; }
.phenomenon-summary { font-size: $font-size-base; color: $text-color; line-height: 1.6; }
.index-list { display: flex; flex-direction: column; gap: $spacing-xs; margin-top: $spacing-xs; }
.index-row { display: flex; justify-content: space-between; font-size: $font-size-sm; }
.index-name { color: $text-color-secondary; }
.index-pct { font-weight: 500; }
.up { color: $up; }
.down { color: $down; }
.flat { color: $text-color-tertiary; }
.sector-block { display: flex; gap: $spacing-xs; margin-top: $spacing-xs; font-size: $font-size-sm; }
.sector-label { flex-shrink: 0; color: $text-color-secondary; font-weight: 500; }
.sector-list { color: $text-color; line-height: 1.5; }
</style>