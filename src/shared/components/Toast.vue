<template>
  <view class="as-toast" :class="[`as-toast--${position}`, { 'is-visible': visible }]">
    <view class="as-toast__inner">
      <view v-if="iconUri" class="as-toast__icon" :style="{ backgroundImage: `url('${iconUri}')` }" />
      <text class="as-toast__text">{{ message }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, watch, onUnmounted } from 'vue'

type ToastType = 'info' | 'success' | 'warning' | 'error'

const props = withDefaults(defineProps<{
  visible: boolean
  message: string
  type?: ToastType
  duration?: number
  position?: 'top' | 'center' | 'bottom'
}>(), {
  visible: false,
  message: '',
  type: 'info',
  duration: 2000,
  position: 'center'
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  close: []
}>()

let timer: ReturnType<typeof setTimeout> | null = null

const clearTimer = () => {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

const close = () => {
  clearTimer()
  emit('update:visible', false)
  emit('close')
}

// visible 变为 true 时自动计时，duration 毫秒后关闭
watch(
  () => props.visible,
  (val) => {
    clearTimer()
    if (val && props.duration > 0) {
      timer = setTimeout(() => {
        close()
      }, props.duration)
    }
  },
  { immediate: true }
)

onUnmounted(() => {
  clearTimer()
})

// 各类型图标配置（颜色取设计系统对应色系的浅色，深色背景上更清晰）
const iconConfig: Record<ToastType, { paths: string; color: string }> = {
  info: {
    paths: '<circle cx="12" cy="12" r="10"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
    color: '#4d8bff'
  },
  success: {
    paths: '<circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/>',
    color: '#4dc878'
  },
  warning: {
    paths: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
    color: '#f5b840'
  },
  error: {
    paths: '<circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6"/><path d="M9 9l6 6"/>',
    color: '#f06a78'
  }
}

const iconUri = computed(() => {
  const cfg = iconConfig[props.type]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${cfg.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="24" height="24">${cfg.paths}</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
})
</script>

<style lang="scss" scoped>
.as-toast {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: $z-toast;
  pointer-events: none;
  display: flex;
  justify-content: center;
}

.as-toast--top {
  align-items: flex-start;
  padding-top: 120rpx;
}

.as-toast--center {
  align-items: center;
}

.as-toast--bottom {
  align-items: flex-end;
  padding-bottom: 200rpx;
}

/* ===== Inner ===== */
.as-toast__inner {
  display: inline-flex;
  align-items: center;
  max-width: 80%;
  background: rgba(10, 23, 51, 0.85);
  border-radius: $r-md;
  padding: $s-3 $s-4;
  box-shadow: $shadow-card;
  opacity: 0;
  transform: translateY(20rpx);
  transition: opacity $t-fast, transform $t-fast;
}

.as-toast--top .as-toast__inner {
  transform: translateY(-20rpx);
}

.as-toast.is-visible .as-toast__inner {
  opacity: 1;
  transform: translateY(0);
}

.as-toast__icon {
  width: 36rpx;
  height: 36rpx;
  flex-shrink: 0;
  margin-right: $s-2;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
}

.as-toast__text {
  font-size: $font-size-base;
  color: $white;
  line-height: $lh-base;
}
</style>
