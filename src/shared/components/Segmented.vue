<template>
  <view
    class="as-segmented"
    :class="{ 'as-segmented--full': fullWidth }"
  >
    <view
      v-for="item in items"
      :key="item.value"
      class="as-segmented__item"
      :class="{
        'is-active': modelValue === item.value,
        'is-disabled': item.disabled
      }"
      @click="handleSelect(item)"
    >
      <text class="as-segmented__label">{{ item.label }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
interface SegmentedItem {
  label: string
  value: string | number
  disabled?: boolean
}

const props = withDefaults(defineProps<{
  items: SegmentedItem[]
  modelValue?: string | number
  fullWidth?: boolean
}>(), {
  modelValue: '',
  fullWidth: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
  change: [value: string | number]
}>()

const handleSelect = (item: SegmentedItem) => {
  if (item.disabled) return
  if (props.modelValue === item.value) return
  emit('update:modelValue', item.value)
  emit('change', item.value)
}
</script>

<style lang="scss" scoped>
.as-segmented {
  display: inline-flex;
  background: $bg-deep;
  border-radius: $r-md;
  padding: 6rpx;
}

.as-segmented--full {
  display: flex;
  width: 100%;
}

.as-segmented__item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10rpx 28rpx;
  font-size: $font-size-sm;
  font-weight: 500;
  color: $ink-soft;
  border-radius: $r-sm;
  transition: all $t-fast;
  cursor: pointer;
  white-space: nowrap;
}

.as-segmented--full .as-segmented__item {
  flex: 1;
}

.as-segmented__label {
  font-size: inherit;
  line-height: 1.2;
}

/* ===== Active ===== */
.as-segmented__item.is-active {
  background: $bg-card;
  color: $primary;
  box-shadow: $shadow-xs;
  font-weight: 600;
}

/* ===== Disabled ===== */
.as-segmented__item.is-disabled {
  opacity: $op-disabled;
  cursor: not-allowed;
}
</style>
