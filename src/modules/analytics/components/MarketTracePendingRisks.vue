<template>
  <view class="pending-risks-section" v-if="hasRisks">
    <view class="section-title">
      <text class="title-text">待验证风险</text>
    </view>
    <Card class="risks-card">
      <view v-for="(risk, idx) in presentation.pendingRisks.openQuestions" :key="`q-${idx}`" class="risk-item">
        <text class="risk-dot">·</text>
        <text class="risk-text">{{ risk }}</text>
      </view>
      <view v-if="presentation.pendingRisks.missingEvidence.length" class="missing-block">
        <text class="missing-label">缺失数据：</text>
        <text class="missing-text">{{ presentation.pendingRisks.missingEvidence.join('、') }}</text>
      </view>
    </Card>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Card from '@/shared/components/Card.vue'
import type { MarketTracePresentation } from '@/modules/analytics/utils/marketTraceReview'

const props = defineProps<{ presentation: MarketTracePresentation }>()

const hasRisks = computed(() => {
  const r = props.presentation.pendingRisks
  return r.openQuestions.length > 0 || r.missingEvidence.length > 0
})
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;

.pending-risks-section { padding: 0 $spacing-base; margin-bottom: $spacing-sm; }
.section-title { display: flex; align-items: center; padding: 0; margin: $spacing-base 0 $spacing-sm; }
.title-text { font-size: 28rpx; font-weight: 600; color: $text-color-title; }
.risks-card { margin: 0; }
.risk-item { display: flex; align-items: flex-start; gap: 8rpx; margin-top: 8rpx; }
.risk-item:first-child { margin-top: 0; }
.risk-dot { color: $warning; font-size: 28rpx; line-height: 1.4; }
.risk-text { flex: 1; color: $text-color; font-size: 24rpx; line-height: 1.5; }
.missing-block {
  margin-top: $spacing-sm; padding-top: $spacing-sm;
  border-top: 1rpx solid $line-soft;
  display: flex; align-items: flex-start; gap: 8rpx; flex-wrap: wrap;
}
.missing-label { font-size: 22rpx; color: $warning; font-weight: 600; }
.missing-text { font-size: 22rpx; color: $text-color-secondary; line-height: 1.5; }
</style>
