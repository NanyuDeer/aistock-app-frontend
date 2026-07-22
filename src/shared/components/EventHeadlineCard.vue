<template>
  <view
    class="event-headline-card"
    :class="[`event-headline-card--${type}`, `event-headline-card--${importance}`]"
  >
    <!-- 标签区 -->
    <view class="event-headline-card__tags">
      <!-- 重要性标签 -->
      <view v-if="importance === 'major'" class="event-headline-card__importance-tag">
        <text class="event-headline-card__importance-icon">🔥</text>
        <text class="event-headline-card__importance-text">重大</text>
      </view>
      <view v-else class="event-headline-card__importance-tag--normal">
        <text class="event-headline-card__importance-text">重要</text>
      </view>

      <!-- 方向标签 -->
      <view class="event-headline-card__direction-tag">
        <text class="event-headline-card__direction-icon">{{ type === 'positive' ? '▲' : '▼' }}</text>
        <text class="event-headline-card__direction-text">{{ type === 'positive' ? '利好事件' : '利空事件' }}</text>
      </view>
    </view>

    <!-- 标题 -->
    <view class="event-headline-card__title">
      <text class="event-headline-card__title-text">{{ title }}</text>
    </view>

    <!-- 行业标签 -->
    <view v-if="industries.length > 0" class="event-headline-card__industries">
      <text class="event-headline-card__industries-text">
        {{ displayedIndustriesText }}
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  type: 'positive' | 'negative'  // 事件方向
  title: string                   // 事件标题
  importance: 'major' | 'normal'  // 重要性
  industries: string[]            // 影响行业（最多展示3个，超过显示 +N）
}

const props = withDefaults(defineProps<Props>(), {
  type: 'positive',
  importance: 'normal',
  industries: () => []
})

// 计算显示的行业文本
const displayedIndustriesText = computed(() => {
  const maxCount = 3
  const displayed = props.industries.slice(0, maxCount)
  const remaining = props.industries.length - maxCount

  let text = displayed.join(' · ')

  if (remaining > 0) {
    text += ` +${remaining}`
  }

  return text
})
</script>

<style lang="scss" scoped>
@import '@/shared/styles/variables.scss';

.event-headline-card {
  position: relative;
  padding: $spacing-base;
  border-radius: $radius-base;
  background: $bg-color-grey;
  box-shadow: $shadow-base;
  overflow: hidden;

  // 左侧强调边框
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 6rpx;
  }

  // 利好卡片样式
  &--positive {
    background: linear-gradient(135deg, #FFF7F7 0%, #FFE4E6 100%);
    box-shadow: 0 2rpx 12rpx rgba(244, 63, 94, 0.15);

    &::before {
      background: $stock-up-color;
    }
  }

  // 利空卡片样式
  &--negative {
    background: linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%);
    box-shadow: 0 2rpx 12rpx rgba(34, 197, 94, 0.15);

    &::before {
      background: $stock-down-color;
    }
  }

  // 标签区
  &__tags {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    margin-bottom: $spacing-sm;
  }

  // 重要性标签（重大）
  &__importance-tag {
    display: flex;
    align-items: center;
    padding: 4rpx 12rpx;
    background: rgba($warning-color, 0.15);
    border-radius: $radius-pill;
  }

  &__importance-icon {
    font-size: $font-size-xs;
    margin-right: 4rpx;
  }

  &__importance-text {
    font-size: $font-size-xs;
    font-weight: 500;
    color: $warning-color;
  }

  // 重要性标签（普通）
  &__importance-tag--normal {
    display: flex;
    align-items: center;
    padding: 4rpx 12rpx;
    background: rgba($text-color-secondary, 0.1);
    border-radius: $radius-pill;
  }

  // 方向标签
  &__direction-tag {
    display: flex;
    align-items: center;
    padding: 4rpx 12rpx;
    border-radius: $radius-pill;
  }

  &__direction-icon {
    font-size: $font-size-xs;
    margin-right: 4rpx;
    font-weight: bold;
  }

  &__direction-text {
    font-size: $font-size-xs;
    font-weight: 500;
  }

  // 利好方向标签样式
  &--positive &__direction-tag {
    background: rgba($stock-up-color, 0.1);
  }

  &--positive &__direction-icon,
  &--positive &__direction-text {
    color: $stock-up-color;
  }

  // 利空方向标签样式
  &--negative &__direction-tag {
    background: rgba($stock-down-color, 0.1);
  }

  &--negative &__direction-icon,
  &--negative &__direction-text {
    color: $stock-down-color;
  }

  // 标题
  &__title {
    margin-bottom: $spacing-sm;
  }

  &__title-text {
    font-size: $font-size-lg;
    font-weight: 600;
    color: $text-color-title;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  // 行业标签
  &__industries {
    margin-top: $spacing-xs;
  }

  &__industries-text {
    font-size: $font-size-sm;
    color: $text-color-secondary;
    line-height: 1.5;
  }
}
</style>