<template>
  <view class="anomaly-card">
    <view class="anomaly-label">
      <text class="anomaly-star">★</text>
      <text class="anomaly-label-text">大盘洞见</text>
    </view>
    <text class="anomaly-title">今日主因</text>
    <text class="anomaly-conclusion">{{ conclusion }}</text>
  </view>
</template>

<script setup lang="ts">
defineProps<{
  /** 归因结论文本（来自 review.attribution_summary，旧报告回退 brief.items[归因结论].conclusion） */
  conclusion: string
}>()
</script>

<style lang="scss" scoped>
/* 样式对齐早报「今日头条」卡片：
   白底圆角 + 左侧主题色竖条 + 顶部 ★ 标签 + 标题 + 结论 */
.anomaly-card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  border: 1rpx solid rgba(77, 124, 254, 0.20);
  border-left: 8rpx solid $primary;
}

.anomaly-label {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 16rpx;
}

.anomaly-star {
  font-size: 24rpx;
  color: $primary;
}

.anomaly-label-text {
  font-size: 22rpx;
  font-weight: 700;
  color: $primary;
  letter-spacing: 2rpx;
}

.anomaly-title {
  font-size: 34rpx;
  font-weight: 700;
  color: $ink;
  line-height: 1.4;
  display: block;
  margin-bottom: 16rpx;
}

.anomaly-conclusion {
  font-size: 26rpx;
  color: #4b5563;
  line-height: 1.6;
  display: block;
}
</style>
