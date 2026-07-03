<template>
  <view class="as-skill-card">
    <view v-if="title" class="as-skill-card-header">
      <text class="as-skill-card-title">{{ title }}</text>
    </view>
    <view class="as-skill-card-body">
      <slot />
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{
  title?: string
}>()
</script>

<style lang="scss" scoped>
.as-skill-card {
  margin-top: 16rpx;
  padding: 20rpx;
  background: #f5f7fa;
  border-radius: 12rpx;
}

.as-skill-card-header { margin-bottom: 12rpx; }
.as-skill-card-title { font-size: 26rpx; font-weight: 500; color: #1a1d24; }
.as-skill-card-body { font-size: 26rpx; color: #6b7280; line-height: 1.5; }
</style>
