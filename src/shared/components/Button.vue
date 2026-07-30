/**
 * Button 组件 — 同步自 aistock-component-lib/src/components/Button.vue
 * 同步时间：2026-07-28
 * 向后兼容：保留旧 type/size 名称映射、block/icon props
 */
<template>
  <button
    class="as-btn"
    :class="[
      `as-btn--${resolvedType}`,
      resolvedSize && `as-btn--${resolvedSize}`,
      { 'as-btn--loading': loading, 'as-btn--block': block, 'is-disabled': disabled }
    ]"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <view v-if="loading" class="as-btn__loading">
      <view class="as-btn__loading-icon"></view>
    </view>
    <text v-if="icon && !loading" class="as-btn__icon">{{ icon }}</text>
    <text class="as-btn__text">
      <slot />
    </text>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type ButtonType = 'primary' | 'secondary' | 'ghost' | 'accent' | 'gold' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface Props {
  /** 按钮类型，支持旧名称：default→secondary, text→ghost */
  type?: ButtonType | 'default' | 'text'
  /** 按钮尺寸，支持旧名称：small→sm, medium→md, large→lg */
  size?: ButtonSize | 'small' | 'medium' | 'large'
  disabled?: boolean
  loading?: boolean
  /** 向后兼容：块级按钮，占满宽度 */
  block?: boolean
  /** 向后兼容：图标文字前缀 */
  icon?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'primary',
  size: 'md',
  disabled: false,
  loading: false,
  block: false,
  icon: ''
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

// 旧类型名映射
const resolvedType = computed<ButtonType>(() => {
  const map: Record<string, ButtonType> = {
    default: 'secondary',
    text: 'ghost'
  }
  return map[props.type] || (props.type as ButtonType)
})

// 旧尺寸名映射
const resolvedSize = computed<ButtonSize>(() => {
  const map: Record<string, ButtonSize> = {
    small: 'sm',
    medium: 'md',
    large: 'lg'
  }
  return map[props.size] || (props.size as ButtonSize)
})

const handleClick = (event: MouseEvent) => {
  if (!props.disabled && !props.loading) {
    emit('click', event)
  }
}
</script>

<style lang="scss" scoped>
.as-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: $s-2;
  padding: $s-3 $s-4;
  height: 80rpx;
  font-size: $font-size-md;
  font-weight: 500;
  line-height: 1;
  border: none;
  border-radius: $r-md;
  cursor: pointer;
  transition: all $t-base;
  position: relative;
  overflow: hidden;
  outline: none;

  &:active {
    transform: scale(0.98);
  }
}

.as-btn__text {
  font-size: inherit;
  line-height: inherit;
}

.as-btn__icon {
  font-size: inherit;
}

/* 向后兼容：块级按钮 */
.as-btn--block {
  display: flex;
  width: 100%;
}

/* ===== Types ===== */
.as-btn--primary {
  background: linear-gradient(135deg, $primary 0%, $primary-deep 100%);
  color: $white;
  box-shadow: $shadow-primary;

  &:active {
    background: $primary-deep;
    transform: scale(0.98);
  }
}

.as-btn--secondary {
  background: $bg-card;
  color: $ink-soft;
  border: 2rpx solid $line;

  &:active {
    border-color: $primary;
    color: $primary;
    background: $primary-50;
  }
}

.as-btn--ghost {
  background: transparent;
  color: $primary;

  &:active {
    background: $primary-50;
  }
}

.as-btn--accent {
  background: linear-gradient(135deg, $accent 0%, $primary 100%);
  color: $white;
  box-shadow: 0 8rpx 28rpx -4rpx rgba(0, 184, 255, 0.4);

  &:active {
    transform: scale(0.98);
  }
}

.as-btn--gold {
  background: linear-gradient(135deg, $gold 0%, $gold-deep 100%);
  color: $white;
  box-shadow: 0 8rpx 28rpx -4rpx rgba(212, 168, 67, 0.4);

  &:active {
    transform: scale(0.98);
  }
}

.as-btn--danger {
  background: linear-gradient(135deg, $up 0%, $up-deep 100%);
  color: $white;
  box-shadow: 0 8rpx 28rpx -4rpx rgba(229, 77, 94, 0.4);

  &:active {
    transform: scale(0.98);
  }
}

/* ===== Sizes ===== */
.as-btn--sm {
  padding: $s-2 $s-3;
  height: 60rpx;
  font-size: $font-size-sm;
  border-radius: $r-sm;
}

.as-btn--lg {
  padding: $s-4 $s-6;
  height: 100rpx;
  font-size: $font-size-lg;
  border-radius: $r-lg;
}

/* ===== States ===== */
.is-disabled {
  opacity: $op-disabled;
  cursor: not-allowed;
  transform: none !important;
}

.as-btn--loading {
  color: transparent;
  pointer-events: none;
}

.as-btn__loading {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}

.as-btn__loading-icon {
  width: 28rpx;
  height: 28rpx;
  border: 4rpx solid rgba(255, 255, 255, 0.3);
  border-top-color: $white;
  border-radius: 50%;
  animation: as-btn-spin 0.6s linear infinite;
}

@keyframes as-btn-spin {
  to {
    transform: rotate(360deg);
  }
}

.as-btn--secondary .as-btn__loading-icon,
.as-btn--ghost .as-btn__loading-icon {
  border-color: rgba(11, 95, 255, 0.2);
  border-top-color: $primary;
}
</style>
