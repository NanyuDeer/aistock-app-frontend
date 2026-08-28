<template>
  <scroll-view class="as-followup-chips" scroll-x :show-scrollbar="false">
    <view class="as-followup-chips-row">
      <view
        v-for="item in items"
        :key="item"
        class="as-followup-chip"
        @tap="$emit('select', item)"
      >
        <text class="as-followup-chip-text">{{ item }}</text>
      </view>
    </view>
  </scroll-view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ items: string[] }>(), { items: () => [] })
defineEmits<{ select: [q: string] }>()
</script>

<style lang="scss" scoped>
/* 对齐 chat 页 skill-btn token：padding 8rpx 20rpx / font-size 24rpx */
.as-followup-chips { width: 100%; white-space: nowrap; }
.as-followup-chips-row { display: inline-flex; gap: 12rpx; padding: 12rpx 20rpx; }
.as-followup-chip {
  display: inline-flex; align-items: center;
  background: $primary-50; color: $primary;
  border-radius: 999rpx; padding: 8rpx 20rpx; flex-shrink: 0;
}
.as-followup-chip-text { font-size: 24rpx; color: $primary; line-height: 1.4; }
.as-followup-chip:active { opacity: 0.7; }
</style>
