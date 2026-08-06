<template>
  <view class="evening-anomaly-card">
    <view class="speaker-icon">
      <SvgIcon name="broadcast-line" size="30rpx" color="#ffffff" />
    </view>
    <view class="dialogue-copy">
      <text class="speaker-name">市场异象</text>
      <text class="dialogue-content">{{ conclusion }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import SvgIcon from '@/shared/components/SvgIcon.vue'

defineProps<{
  /** 归因结论文本（来自 brief.items[归因结论].conclusion） */
  conclusion: string
}>()
</script>

<style lang="scss" scoped>
/* 样式参考 briefing-detail/index.vue 的 analyst 对话泡：
   左圆角 4rpx + 右圆角 16rpx + 品牌色背景 + 白色文字 */
.evening-anomaly-card {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.speaker-icon {
  display: flex;
  flex: 0 0 56rpx;
  align-items: center;
  justify-content: center;
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: $success-color;
}

.dialogue-copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 8rpx;
  min-width: 0;
  max-width: 80%;
  padding: 16rpx 24rpx;
  border-radius: 16rpx 16rpx 4rpx 16rpx;
  background: $primary;
  text-align: left;
}

.speaker-name {
  color: #ffffff;
  font-size: $font-size-xs;
  font-weight: 600;
}

.dialogue-content {
  color: #ffffff;
  font-size: $font-size-base;
  line-height: 1.75;
}
</style>
