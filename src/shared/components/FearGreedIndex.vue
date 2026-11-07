<template>
  <!-- 恐贪指数按钮：常驻首页头部，点击跳转恐贪指数页 -->
  <view class="fgi-btn" :style="btnStyle" @tap="goFearGreed">
    <!-- 情绪色点 -->
    <view class="fgi-btn__dot" :style="{ background: range.color }" />
    <!-- "恐贪"前缀 -->
    <text class="fgi-btn__prefix">恐贪</text>
    <!-- 数值 -->
    <text class="fgi-btn__value" :style="{ color: range.color }">{{ indexValue == null ? '--' : Math.round(indexValue) }}</text>
    <!-- 标签 -->
    <text class="fgi-btn__label">{{ range.label }}</text>
    <!-- 右箭头：暗示可点击跳转 -->
    <view class="fgi-btn__arrow" :style="{ borderLeftColor: range.color }" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { fearGreedApi } from '@/shared/api/modules/fear-greed'
import { fearGreedZoneOf, type FearGreedZoneMeta } from '@/shared/utils/fearGreedZones'

/** 未加载/拉取失败时的中性档（灰 + 占位文案）：不用任何真实档位冒充，避免展示假数值 */
interface NeutralZone {
  min: number
  max: number
  label: string
  color: string
  start: string
  end: string
  isExtreme: boolean
}
const NEUTRAL_ZONE: NeutralZone = {
  min: 0, max: 0, label: '--', color: '#9ca3af', start: '#9ca3af', end: '#9ca3af', isExtreme: false,
}

/** 指数数值（0-100）；未拉到数据时为 null（显示 --，不再用写死的 12 冒充真实值） */
const indexValue = ref<number | null>(null)

/** 当前分档（颜色 / 标签）；未加载为中性占位档，已加载走共享的单一事实源 fearGreedZoneOf */
const range = computed<FearGreedZoneMeta | NeutralZone>(() => {
  const v = indexValue.value
  if (v == null) return NEUTRAL_ZONE
  return fearGreedZoneOf(v)
})

/** 按钮容器样式：软底背景跟随情绪色 */
const btnStyle = computed(() => ({
  background: `${range.value.color}14`,
  borderColor: `${range.value.color}30`,
}))

function goFearGreed() {
  uni.navigateTo({ url: '/modules/fear-greed/pages/index' })
}

onMounted(async () => {
  try {
    const d = await fearGreedApi.getDashboard('jq')
    if (d?.currentIndex != null) indexValue.value = d.currentIndex
  } catch {
    // 拉取失败时保持 null（显示 -- 占位），不阻塞首页渲染
  }
})
</script>

<style lang="scss" scoped>
@import '@/shared/styles/variables.scss';

.fgi-btn {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  padding: 6rpx 12rpx 6rpx 16rpx;
  border-radius: $r-full;
  border: 1rpx solid $line;
  background: rgba(255, 255, 255, 0.6);
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
  transition: all 0.2s ease;

  &:active {
    transform: scale(0.95);
    opacity: 0.8;
    box-shadow: 0 1rpx 3rpx rgba(0, 0, 0, 0.04);
  }
}

.fgi-btn__dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  flex-shrink: 0;
}

.fgi-btn__prefix {
  font-size: 18rpx;
  font-weight: 600;
  color: $ink-mute;
  line-height: 1;
}

.fgi-btn__value {
  font-size: 24rpx;
  font-weight: 800;
  font-family: $font-mono;
  line-height: 1;
  margin-top: -2rpx;
}

.fgi-btn__label {
  font-size: 18rpx;
  font-weight: 600;
  color: $ink-mute;
  line-height: 1;
}

/* 右箭头：CSS 三角形，暗示可点击进入 */
.fgi-btn__arrow {
  width: 0;
  height: 0;
  border-top: 7rpx solid transparent;
  border-bottom: 7rpx solid transparent;
  border-left: 10rpx solid currentColor;
  flex-shrink: 0;
  margin-left: 4rpx;
}
</style>
