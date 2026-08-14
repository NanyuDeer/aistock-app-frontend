<template>
  <view class="feedback-bar">
    <view
      class="feedback-item"
      :class="{ active: value === 'up' }"
      @tap="$emit('select', 'up')"
    >
      <SvgIcon
        :name="value === 'up' ? 'thumb-up-fill' : 'thumb-up-line'"
        size="28rpx"
        :color="value === 'up' ? PRIMARY : MUTED"
      />
      <text class="feedback-label">有帮助</text>
    </view>
    <view
      class="feedback-item"
      :class="{ active: value === 'down' }"
      @tap="$emit('select', 'down')"
    >
      <SvgIcon
        :name="value === 'down' ? 'thumb-down-fill' : 'thumb-down-line'"
        size="28rpx"
        :color="value === 'down' ? PRIMARY : MUTED"
      />
      <text class="feedback-label">没帮助</text>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * Phase 4-2 Task 3：回答气泡尾部「有帮助/没帮助」反馈入口（v1 本地赞/踩，不落库）。
 * 纯展示组件：选中态由 value 驱动（line/fill 图标 + 品牌色高亮），点击通过 select 上抛，
 * 由页面调 chatStore.setFeedback(messageId, value) 落本地（同值再点取消、可改选、刷新保留）。
 */
import SvgIcon from './SvgIcon.vue'

defineProps<{
  /** 当前反馈值（读自 ChatMessage.feedback） */
  value?: 'up' | 'down'
}>()

defineEmits<{
  (e: 'select', value: 'up' | 'down'): void
}>()

// Design Token 对应色值（与 shared/styles/variables.scss 一致）：$primary / $ink-mute
const PRIMARY = '#0b5fff'
const MUTED = '#8a96b0'
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;

.feedback-bar {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 12rpx;
  padding-top: 12rpx;
  border-top: 1rpx solid $line;
}

.feedback-item {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  padding: 6rpx 16rpx;
  border-radius: $r-md;
  background: $bg-soft;
}

.feedback-item:active {
  background: $primary-50;
}

.feedback-label {
  font-size: 22rpx;
  color: $ink-mute;
}

/* 选中态：品牌色浅底 + 图标已在 script 侧切 fill 色，文字同步加深 */
.feedback-item.active {
  background: $primary-50;
}

.feedback-item.active .feedback-label {
  color: $primary;
}
</style>
