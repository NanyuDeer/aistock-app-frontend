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
      <view class="primary-conclusion-banner">
        <text class="banner-label">归因结论</text>
        <text class="banner-text">{{ primaryCause.conclusion }}</text>
      </view>

      <view class="timeline-steps is-vertical">
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

/* 归因结论品牌横幅 */
.primary-conclusion-banner {
  margin-bottom: $spacing-base;
  padding: $spacing-sm $spacing-base;
  background: $primary;
  border-radius: $r-lg;
  box-shadow: 0 4rpx 12rpx rgba(11, 95, 255, 0.2);
}
.banner-label {
  display: block; font-size: 22rpx; color: rgba(255, 255, 255, 0.8);
  letter-spacing: 2rpx; margin-bottom: 4rpx;
}
.banner-text {
  display: block; font-size: 28rpx; font-weight: 600;
  color: #ffffff; line-height: 1.5;
}

/* 时间线步骤（固定垂直布局，触发→传导→结果逐行展示） */
.timeline-steps { display: flex; flex-direction: column; gap: $spacing-sm; }

.step-item { position: relative; display: flex; flex: 1; padding-left: 40rpx; }

.step-rail { position: absolute; left: 0; top: 0; width: 32rpx; height: 100%; }

.step-dot {
  width: 20rpx; height: 20rpx; border-radius: $r-full;
  background: $primary; box-shadow: 0 0 0 6rpx rgba(11, 95, 255, 0.15);
  position: absolute; top: 8rpx; left: 50%; transform: translateX(-50%);
}

.step-line { background: $line-soft; position: absolute; top: 28rpx; bottom: -1 * ($spacing-sm + 8rpx); left: 50%; transform: translateX(-50%); width: 2rpx; }

.step-body { flex: 1; }
.step-label { display: block; font-size: 22rpx; color: $primary; font-weight: 600; margin-bottom: 4rpx; }
.step-text { display: block; font-size: 24rpx; color: $text-color; line-height: 1.5; }

.evidence-block { margin-top: $spacing-base; padding-top: $spacing-sm; border-top: 1rpx solid $line-soft; }
.evidence-label { font-size: 22rpx; color: $text-color-secondary; }
.evidence-text { font-size: 22rpx; color: $text-color; font-family: $font-mono; }
</style>
