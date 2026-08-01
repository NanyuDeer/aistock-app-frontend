<template>
  <view class="timeline-section">
    <view class="section-title">
      <text class="title-text">{{ titleText }}</text>
    </view>

    <!-- 证据不足态：主因缺失提示卡片 -->
    <Card v-if="!primaryCause" class="insufficient-card">
      <view class="insufficient-icon">
        <SvgIcon name="error-warning-line" size="32rpx" color="#f0a020" />
      </view>
      <view class="insufficient-text">
        <text class="insufficient-title">证据不足，未确认主因</text>
        <text class="insufficient-desc">未能从当前可用证据中确认主导因果链。请参考下方候选解释与缺失证据。</text>
      </view>
    </Card>

    <!-- 成功态：主因时间线 -->
    <Card v-else class="timeline-card">
      <view class="primary-conclusion">
        <text class="conclusion-label">主因</text>
        <text class="conclusion-text">{{ primaryCause.conclusion }}</text>
      </view>

      <view class="timeline-steps" :class="`is-${layout}`">
        <view v-if="primaryCause.trigger" class="step-item">
          <view class="step-rail">
            <view class="step-dot" />
            <view class="step-line" />
          </view>
          <view class="step-body">
            <text class="step-label">触发</text>
            <text class="step-text">{{ primaryCause.trigger }}</text>
          </view>
        </view>
        <view v-if="primaryCause.transmission" class="step-item">
          <view class="step-rail">
            <view class="step-dot" />
            <view class="step-line" />
          </view>
          <view class="step-body">
            <text class="step-label">传导</text>
            <text class="step-text">{{ primaryCause.transmission }}</text>
          </view>
        </view>
        <view v-if="primaryCause.result" class="step-item">
          <view class="step-rail">
            <view class="step-dot" />
          </view>
          <view class="step-body">
            <text class="step-label">结果</text>
            <text class="step-text">{{ primaryCause.result }}</text>
          </view>
        </view>
      </view>

      <view v-if="primaryCause.supportingEvidence.length" class="evidence-block">
        <text class="evidence-label">参考来源：</text>
        <text class="evidence-text">{{ primaryCause.supportingEvidence.join('、') }}</text>
      </view>
    </Card>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Card from '@/shared/components/Card.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import type { MarketTracePresentation } from '@/modules/analytics/utils/marketTraceReview'

const props = defineProps<{
  presentation: MarketTracePresentation
  layout: 'vertical' | 'horizontal'
}>()

const primaryCause = computed(() => props.presentation.primaryCause)

const titleText = computed(() => {
  if (!props.presentation.primaryCause) return '主因'
  return '主因'
})
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;

.timeline-section { padding: 0 $spacing-base; margin-bottom: $spacing-sm; }
.section-title { display: flex; align-items: center; margin: $spacing-base 0 $spacing-sm; }
.title-text { font-size: 28rpx; font-weight: 600; color: $text-color-title; }

/* 证据不足提示卡片 */
.insufficient-card { margin: 0; display: flex; align-items: flex-start; gap: $spacing-sm; }
.insufficient-icon { width: 60rpx; height: 60rpx; border-radius: $r-full; background: $warning-soft; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.insufficient-text { flex: 1; }
.insufficient-title { display: block; font-size: 28rpx; font-weight: 600; color: $warning; margin-bottom: 4rpx; }
.insufficient-desc { display: block; font-size: 24rpx; color: $text-color-secondary; line-height: 1.5; }

/* 成功态时间线卡片 */
.timeline-card { margin: 0; }
.primary-conclusion { margin-bottom: $spacing-base; padding-bottom: $spacing-sm; border-bottom: 1rpx solid $line-soft; }
.conclusion-label { display: block; font-size: 22rpx; color: $text-color-secondary; margin-bottom: 4rpx; }
.conclusion-text { display: block; font-size: 26rpx; color: $text-color-title; line-height: 1.6; font-weight: 500; }

/* 时间线步骤 */
.timeline-steps { display: flex; }
.timeline-steps.is-vertical { flex-direction: column; gap: $spacing-sm; }
.timeline-steps.is-horizontal { flex-direction: row; gap: $spacing-xs; align-items: stretch; }

.step-item { position: relative; display: flex; flex: 1; }
.timeline-steps.is-vertical .step-item { padding-left: 40rpx; }
.timeline-steps.is-horizontal .step-item { flex-direction: column; padding-top: 40rpx; }

.step-rail { position: absolute; }
.timeline-steps.is-vertical .step-rail { left: 0; top: 0; width: 32rpx; height: 100%; }
.timeline-steps.is-horizontal .step-rail { left: 0; top: 0; width: 100%; height: 32rpx; }

.step-dot {
  width: 20rpx; height: 20rpx; border-radius: $r-full;
  background: $primary; box-shadow: 0 0 0 6rpx rgba(11, 95, 255, 0.15);
  position: absolute;
}
.timeline-steps.is-vertical .step-dot { top: 8rpx; left: 50%; transform: translateX(-50%); }
.timeline-steps.is-horizontal .step-dot { top: 6rpx; left: 0; }

.step-line { background: $line-soft; position: absolute; }
.timeline-steps.is-vertical .step-line { top: 28rpx; bottom: -1 * ($spacing-sm + 8rpx); left: 50%; transform: translateX(-50%); width: 2rpx; }
.timeline-steps.is-horizontal .step-line { top: 16rpx; left: 20rpx; right: 0; height: 2rpx; }

.step-body { flex: 1; }
.timeline-steps.is-horizontal .step-body { padding-top: 8rpx; }
.step-label { display: block; font-size: 22rpx; color: $primary; font-weight: 600; margin-bottom: 4rpx; }
.step-text { display: block; font-size: 24rpx; color: $text-color; line-height: 1.5; }

.evidence-block { margin-top: $spacing-base; padding-top: $spacing-sm; border-top: 1rpx solid $line-soft; }
.evidence-label { font-size: 22rpx; color: $text-color-secondary; }
.evidence-text { font-size: 22rpx; color: $text-color; font-family: $font-mono; }
</style>
