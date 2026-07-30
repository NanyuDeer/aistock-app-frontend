/**
 * Avatar 组件 — 同步自 aistock-component-lib/src/components/Avatar.vue
 * 同步时间：2026-07-28
 * 向后兼容：保留 name/emoji props 和数字 size
 */
<template>
  <view class="as-avatar" :class="[avatarSize, `as-avatar--${variant}`]" :style="customStyle">
    <text v-if="emoji" class="as-avatar__emoji">{{ emoji }}</text>
    <image v-else-if="src" class="as-avatar__img" :src="src" mode="aspectFill" />
    <text v-else class="as-avatar__text">{{ initials }}</text>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg'
type AvatarVariant = 'primary' | 'gold' | 'accent' | 'neutral'

interface Props {
  src?: string
  /** 向后兼容：等价于 text prop */
  name?: string
  /** 文字头像内容（取前两个字符） */
  text?: string
  /** 向后兼容：emoji 头像 */
  emoji?: string
  /** 头像尺寸，支持预设名称或数字 rpx */
  size?: AvatarSize | number
  variant?: AvatarVariant
}

const props = withDefaults(defineProps<Props>(), {
  src: '',
  name: '',
  text: '',
  emoji: '',
  size: 'md',
  variant: 'primary'
})

const initials = computed(() => {
  // 优先用 text，其次用 name（向后兼容）
  const raw = props.text || props.name
  if (!raw) return ''
  return raw.slice(0, 2)
})

// 数字 size 向预设映射
const avatarSize = computed(() => {
  if (typeof props.size === 'number') {
    if (props.size <= 50) return 'as-avatar--xs'
    if (props.size <= 65) return 'as-avatar--sm'
    if (props.size <= 100) return 'as-avatar--md'
    return 'as-avatar--lg'
  }
  return `as-avatar--${props.size}`
})

// 数字 size 时使用自定义宽高
const customStyle = computed(() => {
  if (typeof props.size === 'number') {
    return { width: `${props.size}rpx`, height: `${props.size}rpx` }
  }
  return {}
})
</script>

<style lang="scss" scoped>
.as-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  flex-shrink: 0;
  overflow: hidden;
  color: $white;
  font-weight: 700;
}

.as-avatar__img {
  width: 100%;
  height: 100%;
}

.as-avatar__text {
  font-size: inherit;
  line-height: 1;
}

.as-avatar__emoji {
  font-size: 48rpx;
  line-height: 1;
}

/* ===== Sizes ===== */
.as-avatar--xs {
  width: 48rpx;
  height: 48rpx;
  font-size: 20rpx;
}

.as-avatar--sm {
  width: 56rpx;
  height: 56rpx;
  font-size: 24rpx;
}

.as-avatar--md {
  width: 80rpx;
  height: 80rpx;
  font-size: 30rpx;
}

.as-avatar--lg {
  width: 120rpx;
  height: 120rpx;
  font-size: 44rpx;
}

/* ===== Variants ===== */
.as-avatar--primary {
  background: linear-gradient(135deg, $primary, $primary-deep);
}

.as-avatar--gold {
  background: linear-gradient(135deg, $gold, $gold-deep);
}

.as-avatar--accent {
  background: linear-gradient(135deg, $accent, $primary);
}

.as-avatar--neutral {
  background: linear-gradient(135deg, $ink-mute, $ink-soft);
}
</style>
