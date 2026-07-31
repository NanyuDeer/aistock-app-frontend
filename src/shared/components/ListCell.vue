<template>
  <view
    class="as-list-cell"
    :class="{
      'is-clickable': clickable,
      'is-disabled': disabled,
      'no-border': !border
    }"
    @click="handleClick"
  >
    <view v-if="$slots.prefix" class="as-list-cell__prefix">
      <slot name="prefix" />
    </view>
    <view class="as-list-cell__content">
      <view class="as-list-cell__main">
        <text v-if="title" class="as-list-cell__title">{{ title }}</text>
        <slot v-else name="title" />
      </view>
      <view v-if="description || $slots.description" class="as-list-cell__desc">
        <text v-if="description">{{ description }}</text>
        <slot v-else name="description" />
      </view>
    </view>
    <view class="as-list-cell__right">
      <slot name="value">
        <text v-if="value" class="as-list-cell__value">{{ value }}</text>
      </slot>
      <view v-if="showArrow" class="as-list-cell__arrow"></view>
    </view>
  </view>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  title?: string
  value?: string
  description?: string
  showArrow?: boolean
  clickable?: boolean
  disabled?: boolean
  border?: boolean
}>(), {
  title: '',
  value: '',
  description: '',
  showArrow: false,
  clickable: false,
  disabled: false,
  border: true
})

const emit = defineEmits<{
  click: []
}>()

const handleClick = () => {
  if (props.clickable && !props.disabled) {
    emit('click')
  }
}
</script>

<style lang="scss" scoped>
.as-list-cell {
  display: flex;
  align-items: center;
  padding: $s-4 $s-5;
  background: $bg-card;
  transition: all $t-fast;
}

.as-list-cell:not(.no-border) + .as-list-cell:not(.no-border) {
  border-top: 2rpx solid $line-soft;
}

.as-list-cell.is-clickable:active {
  background: $bg-soft;
}

.as-list-cell.is-disabled {
  opacity: $op-disabled;
}

.as-list-cell__prefix {
  flex-shrink: 0;
  margin-right: $s-3;
}

.as-list-cell__content {
  flex: 1;
  min-width: 0;
}

.as-list-cell__main {
  display: flex;
  align-items: center;
}

.as-list-cell__title {
  font-size: $font-size-md;
  color: $ink;
  font-weight: 500;
}

.as-list-cell__desc {
  margin-top: 4rpx;
  font-size: $font-size-xs;
  color: $ink-mute;
}

.as-list-cell__right {
  display: flex;
  align-items: center;
  gap: $s-2;
  flex-shrink: 0;
  margin-left: $s-4;
}

.as-list-cell__value {
  font-size: $font-size-sm;
  color: $ink-soft;
  font-family: $font-mono;
}

/* CSS 绘制右箭头 */
.as-list-cell__arrow {
  position: relative;
  width: 16rpx;
  height: 16rpx;
}

.as-list-cell__arrow::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 16rpx;
  height: 16rpx;
  border-right: 4rpx solid $ink-faint;
  border-top: 4rpx solid $ink-faint;
  transform: rotate(45deg);
}
</style>