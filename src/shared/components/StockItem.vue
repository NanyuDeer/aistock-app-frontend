<template>
  <view
    class="as-stock-item"
    :class="{ 'is-active': active }"
    @click="handleClick"
  >
    <view class="as-stock-item__left">
      <text class="as-stock-item__name">{{ name }}</text>
      <text class="as-stock-item__code">{{ code }}</text>
    </view>
    <view class="as-stock-item__right">
      <text class="as-stock-item__price" :class="priceClass">{{ formattedPrice }}</text>
      <view class="as-stock-item__change" :class="changeClass">
        <text class="as-stock-item__change-text">{{ formattedChange }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  name: string
  code: string
  price: number
  change: number
  changePercent: number
  active?: boolean
}>(), {
  active: false
})

const emit = defineEmits<{
  click: []
}>()

const isUp = computed(() => props.change > 0)
const isDown = computed(() => props.change < 0)
const isFlat = computed(() => props.change === 0)

const priceClass = computed(() => ({
  'is-up': isUp.value,
  'is-down': isDown.value,
  'is-flat': isFlat.value
}))

const changeClass = computed(() => ({
  'is-up': isUp.value,
  'is-down': isDown.value,
  'is-flat': isFlat.value
}))

const formattedPrice = computed(() => {
  return props.price.toFixed(2)
})

const formattedChange = computed(() => {
  const sign = isUp.value ? '+' : ''
  const percent = props.changePercent.toFixed(2)
  return `${sign}${percent}%`
})

const handleClick = () => {
  emit('click')
}
</script>

<style lang="scss" scoped>
.as-stock-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: $bg-card;
  border: 2rpx solid $line;
  border-radius: $r-xl;
  padding: $s-3 $s-4;
  transition: all $t-base;
  position: relative;
  overflow: hidden;
}

.as-stock-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 6rpx;
  background: linear-gradient(180deg, $primary, $accent);
  transform: scaleY(0);
  transition: transform $t-base;
}

.as-stock-item:active {
  transform: scale(0.99);
}

.as-stock-item.is-active {
  border-color: rgba(11, 95, 255, 0.4);
  background: $primary-active-bg;
  box-shadow: 0 12rpx 40rpx -12rpx rgba(11, 95, 255, 0.25);
}

.as-stock-item.is-active::before {
  transform: scaleY(1);
}

/* ===== Left ===== */
.as-stock-item__left {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  flex: 1;
  min-width: 0;
}

.as-stock-item__name {
  font-size: $font-size-md;
  font-weight: 600;
  color: $ink;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.as-stock-item__code {
  font-size: $font-size-xs;
  color: $ink-mute;
  font-family: $font-mono;
}

/* ===== Right ===== */
.as-stock-item__right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4rpx;
  flex-shrink: 0;
}

.as-stock-item__price {
  font-size: $font-size-lg;
  font-weight: 700;
  font-family: $font-mono;

  &.is-up { color: $up; }
  &.is-down { color: $down; }
  &.is-flat { color: $flat; }
}

.as-stock-item__change {
  padding: 2rpx 12rpx;
  border-radius: $r-xs;

  &.is-up {
    background: $up-soft;
  }

  &.is-down {
    background: $down-soft;
  }

  &.is-flat {
    background: $bg-deep;
  }
}

.as-stock-item__change-text {
  font-size: $font-size-xs;
  font-weight: 600;
  font-family: $font-mono;

  .is-up & { color: $up; }
  .is-down & { color: $down; }
  .is-flat & { color: $flat; }
}
</style>