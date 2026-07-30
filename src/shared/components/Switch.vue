<template>
  <view
    class="as-switch"
    :class="{ 'is-on': modelValue }"
    @click="handleToggle"
  >
    <view class="as-switch__thumb"></view>
  </view>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue?: boolean
  disabled?: boolean
}>(), {
  modelValue: false,
  disabled: false
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  change: [value: boolean]
}>()

const handleToggle = () => {
  if (!props.disabled) {
    const newValue = !props.modelValue
    emit('update:modelValue', newValue)
    emit('change', newValue)
  }
}
</script>

<style lang="scss" scoped>
.as-switch {
  display: inline-flex;
  align-items: center;
  width: 88rpx;
  height: 48rpx;
  border-radius: $r-full;
  background: $line-strong;
  padding: 4rpx;
  transition: all $t-base;
  cursor: pointer;
  flex-shrink: 0;
}

.as-switch.is-on {
  background: linear-gradient(135deg, $primary 0%, $primary-deep 100%);
}

.as-switch__thumb {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: $white;
  box-shadow: $shadow-sm;
  transition: transform $t-base;
  transform: translateX(0);
}

.as-switch.is-on .as-switch__thumb {
  transform: translateX(40rpx);
}
</style>
