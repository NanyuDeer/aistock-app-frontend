<template>
  <view
    :class="['as-guide-card', `as-guide-card--${theme}`]"
    @tap="handleClick"
  >
    <view class="as-guide-card__icon">
      <SvgIcon :name="iconName" size="36rpx" color="#ffffff" />
    </view>
    <view class="as-guide-card__body">
      <text class="as-guide-card__title">{{ title }}</text>
      <text v-if="desc" class="as-guide-card__desc">{{ desc }}</text>
    </view>
    <text v-if="clickable" class="as-guide-card__arrow">›</text>
  </view>
</template>

<script setup lang="ts">
import SvgIcon from './SvgIcon.vue'

withDefaults(defineProps<{
  title: string
  desc?: string
  iconName: string
  theme?: 'brand' | 'accent' | 'warning'
  clickable?: boolean
}>(), {
  desc: '',
  theme: 'brand',
  clickable: true,
})

const emit = defineEmits<{
  (e: 'click'): void
}>()

function handleClick() {
  emit('click')
}
</script>

<style lang="scss" scoped>
.as-guide-card {
  display: flex;
  align-items: center;
  gap: $s-2;
  padding: $s-3 $s-4;
  border-radius: $r-lg;
  transition: transform $t-base;
  position: relative;
  overflow: hidden;

  &:active {
    transform: scale(0.98);
  }
}

/* 主题渐变背景 */
.as-guide-card--brand {
  background: $brand-gradient;
  box-shadow: 0 8rpx 24rpx -8rpx rgba($primary, 0.4);
}

.as-guide-card--accent {
  background: linear-gradient(135deg, $accent 0%, $accent-deep 100%);
  box-shadow: 0 8rpx 24rpx -8rpx rgba($accent, 0.4);
}

.as-guide-card--warning {
  background: linear-gradient(135deg, $warning 0%, $warning-light 100%);
  box-shadow: 0 8rpx 24rpx -8rpx rgba($warning, 0.4);
}

/* 图标 */
.as-guide-card__icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: $r-md;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* 文本区 */
.as-guide-card__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.as-guide-card__title {
  font-size: $font-size-md;
  font-weight: 600;
  color: #ffffff;
  line-height: $lh-tight;
}

.as-guide-card__desc {
  font-size: $font-size-xs;
  color: rgba(255, 255, 255, 0.8);
  line-height: $lh-base;
}

/* 箭头 */
.as-guide-card__arrow {
  font-size: $font-size-xl;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 300;
  flex-shrink: 0;
}
</style>
