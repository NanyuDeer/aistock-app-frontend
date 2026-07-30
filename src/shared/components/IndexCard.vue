<template>
  <view class="as-index-card">
    <view v-if="title || status" class="as-index-card__header">
      <text class="as-index-card__title">{{ title }}</text>
      <text v-if="status" class="as-index-card__status">{{ status }}</text>
    </view>
    <view class="as-index-card__list">
      <view
        v-for="(item, idx) in indices"
        :key="idx"
        class="as-index-card__item"
      >
        <text class="as-index-card__name">{{ item.name }}</text>
        <text class="as-index-card__price">{{ formatPrice(item.price) }}</text>
        <text
          class="as-index-card__change"
          :class="item.changePercent >= 0 ? 'is-up' : 'is-down'"
        >{{ formatPct(item.changePercent) }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
interface IndexItem {
  /** 指数名称，如 '上证指数' */
  name: string
  /** 指数代码 */
  code?: string
  /** 当前点位/价格 */
  price: number
  /** 涨跌幅（百分比数值，如 1.23 表示 +1.23%） */
  changePercent: number
}

withDefaults(defineProps<{
  indices: IndexItem[]
  /** 卡片标题，默认 '大盘概览' */
  title?: string
  /** 右侧状态文字 */
  status?: string
}>(), {
  title: '大盘概览'
})

/** 价格保留两位小数 */
function formatPrice(v: number): string {
  return v.toFixed(2)
}

/** 涨跌幅带正负号 + % */
function formatPct(v: number): string {
  const sign = v > 0 ? '+' : ''
  return sign + v.toFixed(2) + '%'
}
</script>

<style lang="scss" scoped>
.as-index-card {
  background: $bg-card;
  border-radius: $r-lg;
  box-shadow: $shadow-sm;
  padding: $s-3;
}

.as-index-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 $s-1 $s-3;
  border-bottom: 2rpx solid $line-soft;
  margin-bottom: $s-3;
}

.as-index-card__title {
  font-size: $font-size-md;
  font-weight: 700;
  color: $ink;
}

.as-index-card__status {
  font-size: $font-size-xs;
  color: $ink-mute;
}

.as-index-card__list {
  display: flex;
  align-items: stretch;
  gap: $s-2;
}

.as-index-card__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  padding: $s-2 $s-1;
  border-radius: $r-md;
  background: $bg-soft;
}

.as-index-card__name {
  font-size: $font-size-xs;
  color: $ink-mute;
}

.as-index-card__price {
  font-size: $font-size-lg;
  font-weight: 800;
  color: $ink;
  font-family: $font-mono;
  line-height: $lh-tight;
}

.as-index-card__change {
  font-size: $font-size-sm;
  font-weight: 700;
  font-family: $font-mono;

  &.is-up {
    color: $up;
  }

  &.is-down {
    color: $down;
  }
}
</style>
