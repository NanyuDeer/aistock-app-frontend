<template>
  <view class="rejected-section" v-if="presentation.rejected.length">
    <view class="section-title">
      <text class="title-text">{{ titleText }}</text>
    </view>
    <view class="rej-list">
      <Card v-for="rej in presentation.rejected" :key="rej.categoryId" class="rej-card">
        <view class="rej-header">
          <text class="rej-label">{{ rej.categoryLabel }}</text>
          <Tag :type="tagType(rej.status)" size="sm">{{ tagText(rej.status) }}</Tag>
        </view>
        <text class="rej-conclusion">{{ rej.conclusion }}</text>
        <text class="rej-reason">{{ rej.reason }}</text>
      </Card>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Card from '@/shared/components/Card.vue'
import Tag from '@/shared/components/Tag.vue'
import type { MarketTracePresentation } from '@/modules/analytics/utils/marketTraceReview'

const props = defineProps<{ presentation: MarketTracePresentation }>()

const titleText = computed(() => {
  return props.presentation.attributionStatus === 'insufficient' ? '证据不足的解释' : '已排除的解释'
})

function tagType(status: 'rejected' | 'insufficient' | 'weak'): 'neutral' | 'warning' {
  return status === 'insufficient' ? 'warning' : 'neutral'
}

function tagText(status: 'rejected' | 'insufficient' | 'weak'): string {
  if (status === 'rejected') return '已排除'
  if (status === 'insufficient') return '证据不足'
  return '弱支持'
}
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;
@use '@/shared/styles/breakpoints.scss' as bp;

.rejected-section { padding: 0 $spacing-base; margin-bottom: $spacing-sm; }
.section-title { display: flex; align-items: center; margin: $spacing-base 0 $spacing-sm; }
.title-text { font-size: 28rpx; font-weight: 600; color: $text-color-title; }
.rej-list {
  display: grid; grid-template-columns: 1fr; gap: $spacing-sm;
  @include bp.respond-to-lg { grid-template-columns: 1fr 1fr; }
}
.rej-card { margin: 0; }
.rej-header { display: flex; align-items: center; gap: $spacing-sm; margin-bottom: $spacing-xs; }
.rej-label { font-size: 24rpx; font-weight: 600; color: $text-color-title; flex: 1; }
.rej-conclusion { display: block; font-size: 24rpx; color: $text-color; line-height: 1.5; }
.rej-reason { display: block; margin-top: $spacing-xs; font-size: 22rpx; color: $text-color-secondary; line-height: 1.5; }
</style>
