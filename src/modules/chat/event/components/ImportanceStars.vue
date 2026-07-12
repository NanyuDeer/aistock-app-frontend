<template>
  <view class="importance-stars" :style="{ gap: gap + 'rpx' }">
    <text
      v-for="i in 5"
      :key="i"
      class="importance-star"
      :class="{ active: i <= level }"
      :style="{ fontSize: size + 'rpx' }"
    >★</text>
  </view>
</template>

<script setup lang="ts">
/**
 * 重要性星级评分组件
 *
 * 展示 1-5 星，金色实心星 + 灰色空心星
 */
interface Props {
  /** 重要性等级 1-5 */
  level?: number
  /** 星星大小 rpx */
  size?: number
  /** 间距 rpx */
  gap?: number
}

withDefaults(defineProps<Props>(), {
  level: 3,
  size: 24,
  gap: 2,
})
</script>

<style scoped>
.importance-stars {
  display: inline-flex;
  align-items: center;
}

.importance-star {
  color: var(--ev-border);
  line-height: 1;
  transition: color 0.2s;
}

.importance-star.active {
  color: var(--ev-warning);
}
</style>
