<template>
  <view v-if="visible">
    <view class="menu-mask" @touchstart.stop="emit('close')"></view>
    <view class="message-action-menu" :style="{ left: left + 'px', top: top + 'px' }" @touchstart.stop>
      <view
        v-for="it in items"
        :key="it.value"
        class="menu-item"
        :class="{ danger: it.danger }"
        @tap="onSelect(it)"
      >
        <text class="menu-item-label">{{ it.label }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface MenuItem {
  label: string
  value: string
  danger?: boolean
}

const props = defineProps<{
  visible: boolean
  x: number
  y: number
  items: MenuItem[]
}>()

const emit = defineEmits<{
  (e: 'select', item: MenuItem): void
  (e: 'close'): void
}>()

const MENU_W = 168
const GAP = 12
const PAD_V = 8
const ITEM_H = 44
const MENU_H = computed(() => props.items.length * ITEM_H + PAD_V * 2)

const left = computed(() => {
  const sw = uni.getSystemInfoSync().windowWidth
  return Math.max(4, Math.min(props.x + GAP, sw - MENU_W - 4))
})

const top = computed(() => {
  const sh = uni.getSystemInfoSync().windowHeight
  const below = props.y + GAP
  if (below + MENU_H.value + GAP > sh) {
    return Math.max(4, props.y - MENU_H.value - GAP)
  }
  return below
})

function onSelect(it: MenuItem) {
  emit('select', it)
}
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;

.menu-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: $z-popover;
  background: transparent;
}

.message-action-menu {
  position: fixed;
  z-index: calc($z-popover + 1);
  min-width: 168px;
  padding: $s-2 0;
  background: $bg-card;
  border-radius: $r-lg;
  box-shadow: $shadow-card;
  overflow: hidden;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 0 $s-4;
  height: 44px;
}

.menu-item-label {
  font-size: $font-size-md;
  color: $text-color;
  line-height: 1;
}

.menu-item.danger .menu-item-label {
  color: $up;
}
</style>
