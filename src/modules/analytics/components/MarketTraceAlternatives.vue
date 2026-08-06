<template>
  <view class="alternatives-section" v-if="presentation.alternatives.length">
    <view class="section-title">
      <text class="title-text">{{ titleText }}</text>
    </view>
    <view class="alt-list">
      <Card v-for="alt in presentation.alternatives" :key="alt.categoryId" class="alt-card">
        <view class="alt-header">
          <text class="alt-label">{{ alt.categoryLabel }}</text>
          <Tag type="warning" size="sm">弱支持</Tag>
        </view>
        <text class="alt-conclusion">{{ alt.conclusion }}</text>
        <view v-if="alt.transmission" class="alt-transmission">
          <text class="trans-label">传导：</text>
          <text class="trans-text">{{ alt.transmission }}</text>
        </view>
        <view v-if="alt.supportingEvidence.length || alt.counterEvidence.length" class="evidence-twocol">
          <view v-if="alt.supportingEvidence.length" class="ev-col">
            <text class="ev-col-label ev-col-sup">支持证据</text>
            <view class="ev-col-chips">
              <Tag v-for="ev in labelEvidenceList(alt.supportingEvidence)" :key="ev" type="neutral" size="sm">{{ ev }}</Tag>
            </view>
          </view>
          <view v-if="alt.counterEvidence.length" class="ev-col">
            <text class="ev-col-label ev-col-ctr">反证</text>
            <view class="ev-col-chips">
              <Tag v-for="ev in labelEvidenceList(alt.counterEvidence)" :key="ev" type="warning" size="sm">{{ ev }}</Tag>
            </view>
          </view>
        </view>
      </Card>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Card from '@/shared/components/Card.vue'
import Tag from '@/shared/components/Tag.vue'
import { labelEvidenceList } from '@/modules/analytics/utils/evidenceLabels'
import type { MarketTracePresentation } from '@/modules/analytics/utils/marketTraceReview'

const props = defineProps<{ presentation: MarketTracePresentation }>()

const titleText = computed(() => {
  return props.presentation.attributionStatus === 'insufficient' ? '候选解释' : '备选解释'
})
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;
@use '@/shared/styles/breakpoints.scss' as bp;

.alternatives-section { padding: 0 $spacing-base; margin-bottom: $spacing-sm; }
.section-title { display: flex; align-items: center; margin: $spacing-base 0 $spacing-sm; }
.title-text { font-size: 28rpx; font-weight: 600; color: $text-color-title; }
.alt-list {
  display: grid; grid-template-columns: 1fr; gap: $spacing-sm;
  @include bp.respond-to-lg { grid-template-columns: 1fr 1fr; }
}
.alt-card { margin: 0; }
.alt-header { display: flex; align-items: center; gap: $spacing-sm; margin-bottom: $spacing-xs; }
.alt-label { font-size: 24rpx; font-weight: 600; color: $text-color-title; flex: 1; }
.alt-conclusion { display: block; font-size: 24rpx; color: $text-color; line-height: 1.5; }
.alt-transmission { margin-top: $spacing-xs; display: flex; align-items: flex-start; gap: 4rpx; }
.trans-label { font-size: 22rpx; color: $text-color-secondary; flex-shrink: 0; }
.trans-text { font-size: 22rpx; color: $text-color; line-height: 1.5; flex: 1; }

/* 支持/反证分栏 */
.evidence-twocol {
  display: flex; gap: $spacing-sm; margin-top: $spacing-xs;
}
.ev-col {
  flex: 1; min-width: 0;
  display: flex; flex-direction: column; gap: 6rpx;
}
.ev-col-label { font-size: 22rpx; font-weight: 600; }
.ev-col-sup { color: $up; }
.ev-col-ctr { color: $warning; }
.ev-col-chips { display: flex; flex-wrap: wrap; gap: 6rpx; }
</style>
