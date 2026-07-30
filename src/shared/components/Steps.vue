<template>
  <view class="as-steps" :class="`as-steps--${direction}`">
    <view
      v-for="(step, index) in steps"
      :key="index"
      class="as-step"
      :class="`as-step--${direction}`"
    >
      <template v-if="direction === 'horizontal'">
        <!-- 水平方向 -->
        <view class="as-step__head as-step__head--h">
          <view class="as-step__line as-step__line--h" :class="leftLineClass(index)"></view>
          <view class="as-step__dot" :class="dotClass(index)">
            <view v-if="isFinished(index)" class="as-step__icon" :style="{ backgroundImage: `url('${checkIcon}')` }" />
            <view v-else-if="isError(index)" class="as-step__icon" :style="{ backgroundImage: `url('${errorIcon}')` }" />
            <text v-else class="as-step__num">{{ index + 1 }}</text>
          </view>
          <view class="as-step__line as-step__line--h" :class="rightLineClass(index)"></view>
        </view>
        <view class="as-step__body as-step__body--h">
          <text class="as-step__title" :class="titleClass(index)">{{ step.title }}</text>
          <text v-if="step.description" class="as-step__desc">{{ step.description }}</text>
        </view>
      </template>

      <template v-else>
        <!-- 垂直方向 -->
        <view class="as-step__head as-step__head--v">
          <view class="as-step__dot" :class="dotClass(index)">
            <view v-if="isFinished(index)" class="as-step__icon" :style="{ backgroundImage: `url('${checkIcon}')` }" />
            <view v-else-if="isError(index)" class="as-step__icon" :style="{ backgroundImage: `url('${errorIcon}')` }" />
            <text v-else class="as-step__num">{{ index + 1 }}</text>
          </view>
          <view
            v-if="index < steps.length - 1"
            class="as-step__line as-step__line--v"
            :class="isFinished(index) ? 'is-finished' : ''"
          ></view>
        </view>
        <view class="as-step__body as-step__body--v">
          <text class="as-step__title" :class="titleClass(index)">{{ step.title }}</text>
          <text v-if="step.description" class="as-step__desc">{{ step.description }}</text>
        </view>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface StepItem {
  title: string
  description?: string
}

const props = withDefaults(defineProps<{
  steps: StepItem[]
  current?: number
  direction?: 'horizontal' | 'vertical'
  status?: 'process' | 'finish' | 'error'
}>(), {
  steps: () => [],
  current: 0,
  direction: 'horizontal',
  status: 'process'
})

// 已完成：索引在 current 之前，或当前步且状态为 finish
const isFinished = (index: number): boolean => {
  if (index < props.current) return true
  if (index === props.current && props.status === 'finish') return true
  return false
}

const isError = (index: number): boolean =>
  index === props.current && props.status === 'error'

const isProcess = (index: number): boolean =>
  index === props.current && props.status === 'process'

const dotClass = (index: number): string => {
  if (isFinished(index)) return 'is-finished'
  if (isError(index)) return 'is-error'
  if (isProcess(index)) return 'is-process'
  return 'is-wait'
}

const titleClass = (index: number): string => {
  if (isError(index)) return 'is-error'
  if (index === props.current) return 'is-current'
  if (isFinished(index)) return 'is-finished'
  return 'is-wait'
}

// 水平左侧连接线：首项占位透明，其余按上一段是否完成着色
const leftLineClass = (index: number): string => {
  if (index === 0) return 'is-empty'
  return isFinished(index - 1) ? 'is-finished' : ''
}

// 水平右侧连接线：末项占位透明，其余按当前段是否完成着色
const rightLineClass = (index: number): string => {
  if (index === props.steps.length - 1) return 'is-empty'
  return isFinished(index) ? 'is-finished' : ''
}

// 对勾图标（白色）
const checkIcon = computed(() => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><path d="M20 6L9 17l-5-5"/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
})

// 错误图标（白色 X）
const errorIcon = computed(() => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><path d="M18 6L6 18M6 6l12 12"/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
})
</script>

<style lang="scss" scoped>
.as-steps {
  display: flex;
}

.as-steps--horizontal {
  flex-direction: row;
}

.as-steps--vertical {
  flex-direction: column;
}

/* ===== 水平步骤 ===== */
.as-step--horizontal {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.as-step__head--h {
  display: flex;
  align-items: center;
  width: 100%;
}

.as-step__line--h {
  flex: 1;
  height: 4rpx;
  background: $line;
  transition: background $t-base;
}

.as-step__line--h.is-finished {
  background: $primary;
}

.as-step__line--h.is-empty {
  background: transparent;
}

/* ===== 垂直步骤 ===== */
.as-step--vertical {
  display: flex;
  flex-direction: row;
}

.as-step__head--v {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
}

.as-step__line--v {
  width: 4rpx;
  flex: 1;
  min-height: 40rpx;
  background: $line;
  transition: background $t-base;
}

.as-step__line--v.is-finished {
  background: $primary;
}

/* ===== 圆点 ===== */
.as-step__dot {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-sizing: border-box;
  transition: all $t-base;
}

.as-step__dot.is-finished {
  background: $primary;
}

.as-step__dot.is-process {
  background: $primary;
  box-shadow: $shadow-glow;
}

.as-step__dot.is-error {
  background: $up;
  box-shadow: $focus-ring-error;
}

.as-step__dot.is-wait {
  background: $bg-card;
  border: 4rpx solid $line;
}

.as-step__icon {
  width: 32rpx;
  height: 32rpx;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
}

.as-step__num {
  font-size: $font-size-sm;
  font-weight: 600;
  color: $ink-faint;
  line-height: 1;
}

.as-step__dot.is-process .as-step__num {
  color: $white;
}

/* ===== 内容 ===== */
.as-step__body--h {
  margin-top: $s-2;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.as-step__body--v {
  margin-left: $s-3;
  padding-bottom: $s-6;
  display: flex;
  flex-direction: column;
}

.as-step__title {
  font-size: $font-size-sm;
  color: $ink-faint;
  line-height: $lh-tight;
}

.as-step__title.is-current {
  color: $ink;
  font-weight: 600;
}

.as-step__title.is-finished {
  color: $ink;
}

.as-step__title.is-error {
  color: $up;
  font-weight: 600;
}

.as-step__desc {
  font-size: $font-size-xs;
  color: $ink-mute;
  line-height: $lh-base;
  margin-top: 4rpx;
}
</style>
