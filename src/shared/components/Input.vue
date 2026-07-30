<template>
  <view class="as-input" :class="{ 'is-disabled': disabled, 'is-focused': focused }">
    <view v-if="$slots.prefix || searchIcon" class="as-input__prefix">
      <slot name="prefix">
        <view v-if="searchIcon" class="as-input__search-icon"></view>
      </slot>
    </view>
    <input
      class="as-input__inner"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :maxlength="maxlength"
      @input="handleInput"
      @focus="handleFocus"
      @blur="handleBlur"
    />
    <view v-if="$slots.suffix || clearable && modelValue" class="as-input__suffix" @click="handleClear">
      <slot name="suffix">
        <view v-if="clearable && modelValue" class="as-input__clear"></view>
      </slot>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

type InputType = 'text' | 'number' | 'password' | 'digit'

const props = withDefaults(defineProps<{
  modelValue?: string | number
  placeholder?: string
  type?: InputType
  disabled?: boolean
  clearable?: boolean
  searchIcon?: boolean
  maxlength?: number
}>(), {
  modelValue: '',
  placeholder: '',
  type: 'text',
  disabled: false,
  clearable: false,
  searchIcon: false,
  maxlength: -1
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  focus: [event: FocusEvent]
  blur: [event: FocusEvent]
  clear: []
}>()

const focused = ref(false)

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}

const handleFocus = (event: FocusEvent) => {
  focused.value = true
  emit('focus', event)
}

const handleBlur = (event: FocusEvent) => {
  focused.value = false
  emit('blur', event)
}

const handleClear = () => {
  if (!props.disabled) {
    emit('update:modelValue', '')
    emit('clear')
  }
}
</script>

<style lang="scss" scoped>
.as-input {
  display: flex;
  align-items: center;
  background: $bg-card;
  border: 2rpx solid $line;
  border-radius: $r-lg;
  padding: 0 $s-3;
  width: 100%;
  transition: all $t-base;
}

.as-input.is-focused {
  border-color: $primary;
  box-shadow: $shadow-glow;
}

.as-input.is-disabled {
  background: $bg-soft;
  opacity: $op-disabled;
}

.as-input__prefix {
  display: flex;
  align-items: center;
  margin-right: $s-2;
  flex-shrink: 0;
}

/* CSS 绘制搜索图标（放大镜） */
.as-input__search-icon {
  position: relative;
  width: 32rpx;
  height: 32rpx;
}

.as-input__search-icon::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 24rpx;
  height: 24rpx;
  border: 4rpx solid $ink-mute;
  border-radius: 50%;
}

.as-input__search-icon::after {
  content: '';
  position: absolute;
  top: 22rpx;
  left: 22rpx;
  width: 12rpx;
  height: 4rpx;
  background: $ink-mute;
  transform: rotate(45deg);
  border-radius: 2rpx;
}

.as-input__inner {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  padding: $s-3 0;
  font-size: $font-size-base;
  color: $ink;
  width: 100%;
  min-width: 0;
}

.as-input__inner::placeholder {
  color: $ink-faint;
}

.as-input__inner:disabled {
  cursor: not-allowed;
}

.as-input__suffix {
  display: flex;
  align-items: center;
  margin-left: $s-2;
  flex-shrink: 0;
}

/* CSS 绘制清除图标（×） */
.as-input__clear {
  position: relative;
  width: 32rpx;
  height: 32rpx;
  cursor: pointer;
}

.as-input__clear::before,
.as-input__clear::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 20rpx;
  height: 4rpx;
  background: $ink-mute;
  border-radius: 2rpx;
}

.as-input__clear::before {
  transform: translate(-50%, -50%) rotate(45deg);
}

.as-input__clear::after {
  transform: translate(-50%, -50%) rotate(-45deg);
}
</style>