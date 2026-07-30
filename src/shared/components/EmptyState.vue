/**
 * EmptyState 组件 — 同步自 aistock-component-lib/src/components/Empty.vue
 * 同步时间：2026-07-28
 * 向后兼容：保留 text/icon props 和 action named slot
 */
<template>
  <view class="as-empty">
    <view class="as-empty__icon">
      <slot name="icon">
        <!-- 向后兼容：支持 SvgIcon name -->
        <SvgIcon v-if="icon" :name="icon" size="80rpx" color="#d1d5db" />
        <view v-else class="as-empty__icon-default"></view>
      </slot>
    </view>
    <text v-if="displayTitle" class="as-empty__title">{{ displayTitle }}</text>
    <text v-if="description" class="as-empty__desc">{{ description }}</text>
    <view v-if="$slots.default || $slots.action" class="as-empty__action">
      <slot />
      <slot name="action" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'

const props = withDefaults(defineProps<{
  /** 主标题（组件库标准 prop） */
  title?: string
  /** 向后兼容：等价于 title */
  text?: string
  /** 描述文字 */
  description?: string
  /** 向后兼容：SvgIcon 图标名称 */
  icon?: string
}>(), {
  title: '',
  text: '',
  description: '',
  icon: ''
})

// 优先用 title，其次用 text（向后兼容）
const displayTitle = computed(() => props.title || props.text || '暂无数据')
</script>

<style lang="scss" scoped>
.as-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: $s-10 $s-6;
}

.as-empty__icon {
  margin-bottom: $s-4;
}

.as-empty__icon-default {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: $bg-deep;
  position: relative;
}

.as-empty__icon-default::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 48rpx;
  height: 48rpx;
  border: 6rpx solid $line-strong;
  border-radius: 50%;
}

.as-empty__icon-default::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-30%, -30%) rotate(-45deg);
  width: 24rpx;
  height: 24rpx;
  border-right: 6rpx solid $line-strong;
  border-bottom: 6rpx solid $line-strong;
  border-radius: 0 0 6rpx 0;
}

.as-empty__title {
  font-size: $font-size-md;
  font-weight: 600;
  color: $ink-soft;
  margin-bottom: $s-2;
}

.as-empty__desc {
  font-size: $font-size-sm;
  color: $ink-mute;
  text-align: center;
}

.as-empty__action {
  margin-top: $s-5;
}
</style>
