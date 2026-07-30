<template>
  <view :class="['as-stat-grid', { 'as-stat-grid--bordered': bordered }]">
    <view
      v-for="(item, idx) in items"
      :key="idx"
      :class="[
        'as-stat-grid__item',
        { 'as-stat-grid__item--row-border': bordered && needRowBorder(idx) },
        { 'as-stat-grid__item--last-in-row': isLastInRow(idx) },
      ]"
      :style="{ flexBasis: `${100 / columns}%` }"
    >
      <template v-if="labelFirst">
        <text class="as-stat-grid__label">{{ item.label }}</text>
        <text
          class="as-stat-grid__value"
          :class="highlight ? `is-${item.color || 'brand'}` : ''"
        >{{ item.value }}<text v-if="item.unit" class="as-stat-grid__unit">{{ item.unit }}</text></text>
        <text v-if="item.subtitle" class="as-stat-grid__subtitle">{{ item.subtitle }}</text>
      </template>
      <template v-else>
        <text
          class="as-stat-grid__value"
          :class="highlight ? `is-${item.color || 'brand'}` : ''"
        >{{ item.value }}<text v-if="item.unit" class="as-stat-grid__unit">{{ item.unit }}</text></text>
        <text class="as-stat-grid__label">{{ item.label }}</text>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
interface StatGridItem {
  label: string
  value: string | number
  unit?: string
  color?: 'brand' | 'up' | 'down' | 'warning'
  subtitle?: string
}

const props = withDefaults(defineProps<{
  items: StatGridItem[]
  columns?: number
  highlight?: boolean
  bordered?: boolean
  labelFirst?: boolean
}>(), {
  columns: 4,
  highlight: true,
  bordered: true,
  labelFirst: false,
})

/** 是否需要底部横线（非最后一行的项需要） */
function needRowBorder(idx: number): boolean {
  const totalRows = Math.ceil(props.items.length / props.columns)
  const currentRow = Math.floor(idx / props.columns)
  return currentRow < totalRows - 1
}

/** 是否是行内最后一个（去掉右边框） */
function isLastInRow(idx: number): boolean {
  return (idx + 1) % props.columns === 0
}
</script>

<style lang="scss" scoped>
.as-stat-grid {
  display: flex;
  flex-wrap: wrap;
  border-radius: $r-md;
  overflow: hidden;
}

.as-stat-grid--bordered {
  background: $bg-card;
  border: 2rpx solid $line;
}

.as-stat-grid__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  padding: $s-2 $s-2;
  text-align: center;
  min-width: 0;
  overflow: hidden;
}

/* 带边框时添加分隔线 */
.as-stat-grid--bordered .as-stat-grid__item {
  border-right: 2rpx solid $line-soft;
}

/* 行内最后一个去掉右边框 */
.as-stat-grid__item--last-in-row {
  border-right: none !important;
}

/* 非最后一行添加底部横线 */
.as-stat-grid__item--row-border {
  border-bottom: 2rpx solid $line-soft;
}

.as-stat-grid__value {
  font-size: $font-size-md;
  font-weight: 700;
  font-family: $font-mono;
  color: $ink;
  line-height: $lh-tight;

  &.is-brand { color: $primary; }
  &.is-up { color: $up; }
  &.is-down { color: $down; }
  &.is-warning { color: $warning; }
}

.as-stat-grid__unit {
  font-size: $font-size-xs;
  font-weight: 500;
  margin-left: 2rpx;
}

.as-stat-grid__label {
  font-size: $font-size-xs;
  color: $ink-mute;
  line-height: $lh-base;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  overflow: hidden;
  word-break: break-all;
  max-width: 100%;
  text-align: center;
}

.as-stat-grid__subtitle {
  font-size: $font-size-xs;
  color: $ink-faint;
  line-height: $lh-base;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  word-break: break-all;
  max-width: 100%;
  text-align: center;
}
</style>
