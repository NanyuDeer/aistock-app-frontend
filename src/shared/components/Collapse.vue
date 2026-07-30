<template>
  <view class="as-collapse">
    <view
      v-for="(item, index) in items"
      :key="item.key"
      class="as-collapse__item"
      :class="{
        'is-disabled': item.disabled,
        'as-collapse__item--border': index > 0
      }"
    >
      <!-- 标题栏 -->
      <view class="as-collapse__header" @tap="toggle(item)">
        <text class="as-collapse__title" :class="{ 'is-disabled': item.disabled }">{{ item.title }}</text>
        <image
          class="as-collapse__arrow"
          :class="{ 'is-active': isActive(item) }"
          :src="chevronIcon"
          mode="aspectFit"
        />
      </view>

      <!-- 内容区 -->
      <view class="as-collapse__content" :class="{ 'is-expanded': isActive(item) }">
        <view class="as-collapse__content-inner">
          <slot :name="item.key" />
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface CollapseItem {
  key: string
  title: string
  disabled?: boolean
}

const props = withDefaults(defineProps<{
  items: CollapseItem[]
  modelValue?: string[]
  accordion?: boolean
}>(), {
  items: () => [],
  modelValue: () => [],
  accordion: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
  change: [value: string[]]
}>()

const isActive = (item: CollapseItem): boolean => props.modelValue.includes(item.key)

const toggle = (item: CollapseItem) => {
  if (item.disabled) return
  let next: string[]
  if (props.accordion) {
    // 手风琴模式：只能展开一个
    next = isActive(item) ? [] : [item.key]
  } else {
    next = isActive(item)
      ? props.modelValue.filter(k => k !== item.key)
      : [...props.modelValue, item.key]
  }
  emit('update:modelValue', next)
  emit('change', next)
}

// chevron-down 图标，颜色对应 $ink-mute
const chevronIcon = computed(() => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#8a96b0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><path d="M6 9l6 6 6-6"/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
})
</script>

<style lang="scss" scoped>
.as-collapse {
  background: $bg-card;
  border-radius: $r-lg;
  box-shadow: $shadow-xs;
  overflow: hidden;
}

.as-collapse__item--border {
  border-top: 2rpx solid $line-soft;
}

/* ===== Header ===== */
.as-collapse__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $s-3 $s-4;
  transition: background $t-fast;
}

.as-collapse__header:active {
  background: $bg-soft;
}

.as-collapse__item.is-disabled .as-collapse__header:active {
  background: transparent;
}

.as-collapse__title {
  font-size: $font-size-md;
  color: $ink;
  line-height: $lh-base;
  font-weight: 500;
  flex: 1;
}

.as-collapse__title.is-disabled {
  color: $ink-faint;
}

.as-collapse__arrow {
  width: 36rpx;
  height: 36rpx;
  flex-shrink: 0;
  margin-left: $s-2;
  transition: transform $t-base;
  transform: rotate(0deg);
}

.as-collapse__arrow.is-active {
  transform: rotate(180deg);
}

.as-collapse__item.is-disabled .as-collapse__arrow {
  opacity: $op-disabled;
}

/* ===== Content ===== */
.as-collapse__content {
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  transition: max-height $t-base, opacity $t-fast;
}

.as-collapse__content.is-expanded {
  max-height: 2000rpx;
  opacity: 1;
}

.as-collapse__content-inner {
  padding: $s-2 $s-4 $s-4;
}
</style>
