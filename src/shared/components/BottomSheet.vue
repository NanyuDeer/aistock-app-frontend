<template>
  <view class="as-bottom-sheet" :class="{ 'is-visible': visible }">
    <!-- 遮罩层 -->
    <view class="as-bottom-sheet__overlay" @click="handleOverlayClick"></view>

    <!-- 抽屉容器 -->
    <view class="as-bottom-sheet__panel">
      <!-- 拖拽手柄 -->
      <view class="as-bottom-sheet__handle"></view>

      <!-- 标题区 -->
      <view v-if="title || $slots.header" class="as-bottom-sheet__header">
        <slot name="header">
          <text class="as-bottom-sheet__title">{{ title }}</text>
        </slot>
      </view>

      <!-- 内容区 -->
      <scroll-view class="as-bottom-sheet__content" scroll-y>
        <slot />
      </scroll-view>

      <!-- 底部操作区 -->
      <view v-if="$slots.footer" class="as-bottom-sheet__footer">
        <slot name="footer" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  visible: boolean
  title?: string
  closeable?: boolean
}>(), {
  visible: false,
  title: '',
  closeable: true
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  close: []
}>()

const close = () => {
  emit('update:visible', false)
  emit('close')
}

const handleOverlayClick = () => {
  if (props.closeable) {
    close()
  }
}
</script>

<style lang="scss" scoped>
.as-bottom-sheet {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: $z-drawer;
  pointer-events: none;
}

.as-bottom-sheet.is-visible {
  pointer-events: auto;
}

/* ===== Overlay ===== */
.as-bottom-sheet__overlay {
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

.as-bottom-sheet.is-visible .as-bottom-sheet__overlay {
  opacity: 1;
}

/* ===== Panel ===== */
.as-bottom-sheet__panel {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: $bg-card;
  border-radius: $r-2xl $r-2xl 0 0;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  transform: translateY(100%);
  transition: transform $t-base;
  box-shadow: $shadow-hover;
}

.as-bottom-sheet.is-visible .as-bottom-sheet__panel {
  transform: translateY(0);
}

/* ===== Handle ===== */
.as-bottom-sheet__handle {
  width: 80rpx;
  height: 8rpx;
  background: $line-strong;
  border-radius: $r-full;
  margin: 16rpx auto;
  flex-shrink: 0;
}

/* ===== Header ===== */
.as-bottom-sheet__header {
  padding: $s-3 $s-5;
  flex-shrink: 0;
}

.as-bottom-sheet__title {
  font-size: $font-size-lg;
  font-weight: 600;
  color: $ink;
  line-height: $lh-tight;
}

/* ===== Content ===== */
.as-bottom-sheet__content {
  flex: 1;
  min-height: 0;
  padding: $s-3 $s-5;
}

/* ===== Footer ===== */
.as-bottom-sheet__footer {
  padding: $s-3 $s-5;
  padding-bottom: calc(#{$s-3} + #{$safe-bottom});
  flex-shrink: 0;
  border-top: 2rpx solid $line-soft;
}
</style>
