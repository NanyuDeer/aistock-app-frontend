<template>
  <view v-if="title && body" class="sc-card">
    <view class="sc-header" :class="variant">
      <view class="sc-accent" />
      <SvgIcon :name="iconName" size="28rpx" :color="accentColor" />
      <text class="sc-title">{{ title }}</text>
    </view>
    <view class="sc-body">
      <mp-html :content="markdownToHtml(body)" class="sc-body-html" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import mpHtml from 'mp-html/dist/uni-app/components/mp-html/mp-html'
import { markdownToHtml } from '@/shared/utils/markdown'
import type { SectionVariant } from '@/shared/utils/parseMarkdownSections'

const props = defineProps<{
  variant: SectionVariant
  title: string
  body: string
}>()

const VARIANT_META: Record<SectionVariant, { icon: string; color: string }> = {
  conclusion: { icon: 'check-double-line', color: '#0b5fff' },
  points: { icon: 'bar-chart-2-line', color: '#4d8bff' },
  notes: { icon: 'information-line', color: '#8a96b0' },
  risk: { icon: 'alert-line', color: '#f0a020' },
  other: { icon: 'checkbox-blank-circle-line', color: '#8a96b0' },
}

// SvgIcon 的 color prop 是运行时字符串，无法引用 SCSS 变量；用设计令牌实值映射（同 ReasoningPanel 做法）
const iconName = computed(() => VARIANT_META[props.variant].icon)
const accentColor = computed(() => VARIANT_META[props.variant].color)
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;

.sc-card {
  margin-bottom: 12rpx;
  padding: 16rpx 20rpx;
  background: $bg-card;
  border-radius: $r-md;
  box-shadow: $shadow-card;
}
.sc-header {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 12rpx;
  padding-bottom: 8rpx;
  border-bottom: 1rpx solid $line-soft;
}
.sc-accent {
  width: 4rpx;
  height: 28rpx;
  border-radius: 3rpx;
  flex-shrink: 0;
}
.sc-header.conclusion .sc-accent { background: $primary; }
.sc-header.points .sc-accent { background: $primary-light; }
.sc-header.notes .sc-accent { background: $ink-mute; }
.sc-header.risk .sc-accent { background: $warning; }
.sc-header.other .sc-accent { background: $ink-mute; }
.sc-header.conclusion { background: $primary-50; }
.sc-header.points { background: $primary-50; }
.sc-header.notes { background: $bg-soft; }
.sc-header.risk { background: $warning-bg; }
.sc-header.other { background: $bg-soft; }
.sc-title {
  font-size: 26rpx;
  font-weight: 600;
  color: $ink;
}
.sc-body {
  margin-top: 4rpx;
}
:deep(.sc-body-html) {
  font-size: 28rpx;
  color: $ink-soft;
  line-height: 1.6;
  word-break: keep-all;
  overflow-wrap: break-word;
}
:deep(.sc-body-html strong),
:deep(.sc-body-html b) {
  display: inline;
  font-weight: 700;
}
:deep(.sc-body-html ul) { padding-left: 20rpx; margin: 4rpx 0; }
:deep(.sc-body-html ol) { padding-left: 20rpx; margin: 4rpx 0; }
</style>
