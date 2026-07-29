/**
 * Card 组件 — 同步自 aistock-component-lib/src/components/Card.vue
 * 同步时间：2026-07-28
 * 向后兼容：保留 flat prop 和 action slot 别名
 */
<template>
  <view
    class="as-card"
    :class="{
      'is-hoverable': hoverable,
      'is-clickable': clickable,
      'as-card--flat': flat
    }"
    @click="handleClick"
  >
    <view v-if="title || $slots.header" class="as-card__header">
      <view class="as-card__header-content">
        <text v-if="title" class="as-card__title">{{ title }}</text>
        <text v-if="subtitle" class="as-card__subtitle">{{ subtitle }}</text>
      </view>
      <view class="as-card__header-extra">
        <!-- 兼容旧 action slot -->
        <slot name="extra" />
        <slot name="action" />
      </view>
    </view>
    <view class="as-card__body">
      <slot />
    </view>
    <view v-if="$slots.footer" class="as-card__footer">
      <slot name="footer" />
    </view>
  </view>
</template>

<script setup lang="ts">
interface Props {
  title?: string
  subtitle?: string
  hoverable?: boolean
  clickable?: boolean
  /** 向后兼容：flat 模式无阴影，仅边框 */
  flat?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  subtitle: '',
  hoverable: false,
  clickable: false,
  flat: false
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const handleClick = (event: MouseEvent) => {
  if (props.clickable) {
    emit('click', event)
  }
}
</script>

<style lang="scss" scoped>
.as-card {
  background: $bg-card;
  border: 2rpx solid $line;
  border-radius: $r-xl;
  padding: $s-5;
  box-shadow: $shadow-xs;
  transition: all $t-base;
}

/* 向后兼容：flat 模式 */
.as-card--flat {
  box-shadow: none;
  border: 2rpx solid $line;
}

/* ===== Header ===== */
.as-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: $s-4;
  padding-bottom: $s-3;
  border-bottom: 2rpx solid $line-soft;
}

.as-card__header-content {
  flex: 1;
  min-width: 0;
}

.as-card__header-extra {
  flex-shrink: 0;
  margin-left: $s-4;
}

.as-card__title {
  display: block;
  font-size: $font-size-lg;
  font-weight: 600;
  color: $ink;
  line-height: $lh-tight;
}

.as-card__subtitle {
  display: block;
  font-size: $font-size-sm;
  color: $ink-soft;
  margin-top: $s-1;
}

/* ===== Body ===== */
.as-card__body {
  color: $ink;
  font-size: $font-size-base;
  line-height: $lh-base;
}

/* ===== Footer ===== */
.as-card__footer {
  margin-top: $s-4;
  padding-top: $s-3;
  border-top: 2rpx solid $line-soft;
}

/* ===== States ===== */
.is-hoverable:hover {
  box-shadow: $shadow-card;
  transform: translateY(-2rpx);
}

.is-clickable {
  cursor: pointer;
  user-select: none;
}

.is-clickable:active {
  transform: scale(0.995);
}
</style>
