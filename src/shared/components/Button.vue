<template>
  <view
    :class="['as-btn', `as-btn--${type}`, `as-btn--${size}`, { 'as-btn--block': block, 'as-btn--disabled': disabled }]"
    @tap="handleTap"
  >
    <text v-if="icon" class="as-btn-icon">{{ icon }}</text>
    <text class="as-btn-text"><slot /></text>
  </view>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  type?: 'primary' | 'default' | 'danger' | 'text'
  size?: 'small' | 'medium' | 'large'
  block?: boolean
  disabled?: boolean
  icon?: string
}>(), {
  type: 'default',
  size: 'medium',
  block: false,
  disabled: false,
  icon: ''
})

const emit = defineEmits<{ (e: 'click'): void }>()

function handleTap() {
  if (props.disabled) return
  emit('click')
}
</script>

<style lang="scss" scoped>
.as-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  border-radius: 12rpx;
  transition: opacity 0.2s;

  &--small { padding: 8rpx 20rpx; font-size: 24rpx; }
  &--medium { padding: 16rpx 32rpx; font-size: 28rpx; }
  &--large { padding: 24rpx 48rpx; font-size: 32rpx; }

  &--block { display: flex; width: 100%; }

  &--primary { background: #4d7cfe; color: #ffffff; }
  &--default { background: #f5f7fa; color: #1a1d24; border: 1rpx solid #e5e7eb; }
  &--danger { background: #f43f5e; color: #ffffff; }
  &--text { background: transparent; color: #4d7cfe; padding: 8rpx 12rpx; }

  &--disabled { opacity: 0.5; }

  &:active { opacity: 0.8; }
}

.as-btn-icon { font-size: inherit; }
.as-btn-text { font-size: inherit; }
</style>
