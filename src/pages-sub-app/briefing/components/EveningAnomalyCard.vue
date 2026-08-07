<template>
  <view class="insight-row">
    <view class="insight-icon review">
      <text class="insight-icon-text">异</text>
    </view>
    <view class="insight-body">
      <view class="insight-top">
        <text class="insight-source">市场异象</text>
        <text class="sentiment-badge sentiment-mixed">今日主因</text>
      </view>
      <text class="insight-conclusion">{{ conclusion }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{
  /** 归因结论文本（来自 brief.items[归因结论].conclusion） */
  conclusion: string
}>()
</script>

<style lang="scss" scoped>
/* 样式对齐早报 Agent 洞见行：
   白底 + 圆角 20rpx + 左侧圆角图标 + 标题 + 情绪badge + 结论 */
.insight-row {
  display: flex;
  gap: 24rpx;
  align-items: flex-start;
  background: #ffffff;
  border-radius: 20rpx;
  padding: 24rpx 28rpx;
  margin-bottom: 16rpx;
  border: 1rpx solid $line;
  box-shadow: 0 1rpx 4rpx rgba(0, 0, 0, 0.03);
}

.insight-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: #e04545;
}

.insight-icon-text {
  font-size: 28rpx;
  font-weight: 700;
  color: #ffffff;
}

.insight-body {
  flex: 1;
  min-width: 0;
}

.insight-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}

.insight-source {
  font-size: 28rpx;
  font-weight: 600;
  color: $ink;
  line-height: 1.4;
}

.sentiment-badge {
  font-size: 22rpx;
  font-weight: 600;
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
}

.sentiment-badge.sentiment-mixed {
  background: rgba(148, 163, 184, 0.10);
  color: #64748b;
}

.insight-conclusion {
  font-size: 24rpx;
  color: #4b5563;
  line-height: 1.5;
  display: block;
}
</style>
