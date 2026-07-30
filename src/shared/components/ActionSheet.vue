<template>
  <view class="as-action-sheet" :class="{ 'is-visible': visible }">
    <!-- 遮罩层 -->
    <view class="as-action-sheet__overlay" @click="handleOverlayClick"></view>

    <!-- 面板容器 -->
    <view class="as-action-sheet__panel">
      <!-- 选项区 -->
      <view class="as-action-sheet__items">
        <view
          v-for="(item, index) in items"
          :key="item.value"
          class="as-action-sheet__item"
          :class="{
            'is-danger': item.danger,
            'is-disabled': item.disabled,
            'as-action-sheet__item--border': index > 0
          }"
          @click="handleSelect(item)"
        >
          <text class="as-action-sheet__item-text">{{ item.label }}</text>
        </view>
      </view>

      <!-- 分隔区域 -->
      <view v-if="showCancel" class="as-action-sheet__separator"></view>

      <!-- 取消按钮 -->
      <view v-if="showCancel" class="as-action-sheet__cancel" @click="handleCancel">
        <text class="as-action-sheet__cancel-text">{{ cancelText }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
interface ActionItem {
  label: string
  value: string | number
  danger?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<{
  visible: boolean
  items: ActionItem[]
  showCancel?: boolean
  cancelText?: string
}>(), {
  visible: false,
  items: () => [],
  showCancel: true,
  cancelText: '取消'
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  select: [item: ActionItem]
  cancel: []
}>()

const close = () => {
  emit('update:visible', false)
}

const handleSelect = (item: ActionItem) => {
  if (item.disabled) return
  emit('select', item)
  close()
}

const handleCancel = () => {
  emit('cancel')
  close()
}

const handleOverlayClick = () => {
  close()
}
</script>

<style lang="scss" scoped>
.as-action-sheet {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: $z-drawer;
  pointer-events: none;
}

.as-action-sheet.is-visible {
  pointer-events: auto;
}

/* ===== Overlay ===== */
.as-action-sheet__overlay {
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

.as-action-sheet.is-visible .as-action-sheet__overlay {
  opacity: 1;
}

/* ===== Panel ===== */
.as-action-sheet__panel {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: $bg-card;
  border-radius: $r-2xl $r-2xl 0 0;
  transform: translateY(100%);
  transition: transform $t-base;
  box-shadow: $shadow-hover;
  overflow: hidden;
}

.as-action-sheet.is-visible .as-action-sheet__panel {
  transform: translateY(0);
}

/* ===== Items ===== */
.as-action-sheet__items {
  border-radius: $r-2xl $r-2xl 0 0;
  overflow: hidden;
}

.as-action-sheet__item {
  padding: $s-4 $s-5;
  text-align: center;
  transition: background $t-fast;

  &:active {
    background: $bg-soft;
  }
}

.as-action-sheet__item--border {
  border-top: 2rpx solid $line-soft;
}

.as-action-sheet__item-text {
  font-size: $font-size-md;
  color: $ink;
  line-height: $lh-base;
}

/* ===== Danger ===== */
.as-action-sheet__item.is-danger .as-action-sheet__item-text {
  color: $up;
}

/* ===== Disabled ===== */
.as-action-sheet__item.is-disabled {
  opacity: $op-disabled;

  &:active {
    background: transparent;
  }
}

/* ===== Separator ===== */
.as-action-sheet__separator {
  height: $s-2;
  background: $bg-soft;
}

/* ===== Cancel ===== */
.as-action-sheet__cancel {
  padding: $s-4;
  padding-bottom: calc(#{$s-4} + #{$safe-bottom});
  text-align: center;
  transition: background $t-fast;

  &:active {
    background: $bg-soft;
  }
}

.as-action-sheet__cancel-text {
  font-size: $font-size-md;
  color: $ink-soft;
  font-weight: 600;
  line-height: $lh-base;
}
</style>
