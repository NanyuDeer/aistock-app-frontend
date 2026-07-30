<template>
  <view class="as-modal" :class="{ 'is-visible': visible }">
    <!-- 遮罩层 -->
    <view class="as-modal__overlay" @tap="handleOverlayClick"></view>

    <!-- 弹窗容器 -->
    <view class="as-modal__wrap" :class="`as-modal__wrap--${position}`">
      <view class="as-modal__dialog" :style="dialogStyle">
        <!-- 标题栏 -->
        <view
          v-if="title || $slots.header || closeable"
          class="as-modal__header"
        >
          <slot name="header">
            <text class="as-modal__title">{{ title }}</text>
          </slot>
          <view v-if="closeable" class="as-modal__close" @tap="handleClose">
            <view class="as-modal__close-icon" :style="{ backgroundImage: `url('${closeIcon}')` }" />
          </view>
        </view>

        <!-- 内容区 -->
        <view
          class="as-modal__body"
          :class="{ 'as-modal__body--no-header': !title && !$slots.header && !closeable }"
        >
          <slot />
        </view>

        <!-- 底部操作区 -->
        <view v-if="$slots.footer" class="as-modal__footer">
          <slot name="footer" />
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  visible: boolean
  title?: string
  width?: string
  closeable?: boolean
  maskClosable?: boolean
  position?: 'center' | 'bottom'
}>(), {
  visible: false,
  title: '',
  width: '600rpx',
  closeable: true,
  maskClosable: true,
  position: 'center'
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  close: []
}>()

const close = () => {
  emit('update:visible', false)
  emit('close')
}

const handleClose = () => {
  close()
}

const handleOverlayClick = () => {
  if (props.maskClosable) {
    close()
  }
}

const dialogStyle = computed(() => ({ width: props.width }))

// 关闭图标（X），颜色对应 $ink-soft
const closeIcon = computed(() => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4b5a7a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><path d="M18 6L6 18M6 6l12 12"/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
})
</script>

<style lang="scss" scoped>
.as-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: $z-modal;
  pointer-events: none;
}

.as-modal.is-visible {
  pointer-events: auto;
}

/* ===== Overlay ===== */
.as-modal__overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: $overlay-base;
  backdrop-filter: $overlay-blur;
  -webkit-backdrop-filter: $overlay-blur;
  opacity: 0;
  transition: opacity $t-base;
}

.as-modal.is-visible .as-modal__overlay {
  opacity: 1;
}

/* ===== Wrap ===== */
.as-modal__wrap {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  pointer-events: none;
}

.as-modal__wrap--center {
  align-items: center;
  justify-content: center;
}

.as-modal__wrap--bottom {
  align-items: flex-end;
  justify-content: center;
}

/* ===== Dialog ===== */
.as-modal__dialog {
  background: $bg-card;
  border-radius: $r-xl;
  box-shadow: $shadow-card;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 80vh;
  opacity: 0;
  transform: translateY(40rpx);
  transition: opacity $t-base, transform $t-base;
  pointer-events: auto;
}

.as-modal__wrap--bottom .as-modal__dialog {
  border-radius: $r-xl $r-xl 0 0;
  transform: translateY(100%);
}

.as-modal.is-visible .as-modal__dialog {
  opacity: 1;
  transform: translateY(0);
}

/* ===== Header ===== */
.as-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $s-4 $s-4 $s-2;
  flex-shrink: 0;
}

.as-modal__title {
  font-size: $font-size-lg;
  font-weight: 600;
  color: $ink;
  line-height: $lh-tight;
  flex: 1;
}

.as-modal__close {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $r-full;
  margin-left: $s-2;
  flex-shrink: 0;
  transition: background $t-fast;
}

.as-modal__close:active {
  background: $bg-soft;
}

.as-modal__close-icon {
  width: 36rpx;
  height: 36rpx;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
}

/* ===== Body ===== */
.as-modal__body {
  padding: $s-2 $s-4 $s-4;
  flex: 1;
  min-height: 0;
}

.as-modal__body--no-header {
  padding-top: $s-4;
}

/* ===== Footer ===== */
.as-modal__footer {
  padding: $s-2 $s-4 $s-4;
  padding-bottom: calc(#{$s-4} + #{$safe-bottom});
  flex-shrink: 0;
  border-top: 2rpx solid $line-soft;
}
</style>
