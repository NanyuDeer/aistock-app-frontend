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

    <view v-if="expanded" class="detail-sections">
      <!-- 现象（title 强相关；组件自带「核心现象」标题） -->
      <MarketTracePhenomenon :presentation="presentation" />

      <!-- 溯源（trace 强相关） -->
      <view class="detail-section">
        <text class="section-title">溯源</text>
        <MarketTraceTimeline :presentation="presentation" />
      </view>

      <!-- 预判（forecast 强相关；组件自带「影响持续性预判」标题，prediction 为空时不渲染） -->
      <MarketTracePrediction v-if="presentation.prediction" :prediction="presentation.prediction" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { InsightCard } from '@/shared/components'
import { toMarketInsightBrief } from '@/modules/analytics/utils/marketInsightBrief'
import type { MarketTracePresentation } from '@/modules/analytics/utils/marketTraceReview'
import MarketTracePhenomenon from './MarketTracePhenomenon.vue'
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

function toggle() {
  expanded.value = !expanded.value
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
</style>