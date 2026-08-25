<template>
  <!-- 恐贪指数按钮：常驻首页头部，点击跳转恐贪指数页 -->
  <view class="fgi-btn" :style="btnStyle" @tap="goFearGreed">
    <!-- 情绪色点 -->
    <view class="fgi-btn__dot" :style="{ background: range.color }" />
    <!-- "恐贪"前缀 -->
    <text class="fgi-btn__prefix">恐贪</text>
    <!-- 数值 -->
    <text class="fgi-btn__value" :style="{ color: range.color }">{{ Math.round(indexValue) }}</text>
    <!-- 标签 -->
    <text class="fgi-btn__label">{{ range.label }}</text>
    <!-- 右箭头：暗示可点击跳转 -->
    <view class="fgi-btn__arrow" :style="{ borderLeftColor: range.color }" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { fearGreedApi } from '@/shared/api/modules/fear-greed'

/**
 * 恐贪指数分档定义（国际 Fear & Greed Index 标准配色）
 * 颜色为恐贪指数固定标准色，非设计 token，故在本组件内常量定义。
 */
interface RangeDef {
  min: number
  max: number
  label: string
  color: string
  start: string
  end: string
  advice: string
  isExtreme: boolean
}

const RANGES: RangeDef[] = [
  { min: 0, max: 25, label: '冰点', color: '#FF3B30', start: '#FF3B30', end: '#FF6B60', advice: '市场恐慌，可能错配，可关注超跌机会', isExtreme: true },
  { min: 25, max: 45, label: '寒冷', color: '#FF9500', start: '#FF9500', end: '#FFB84D', advice: '市场偏谨慎，建议控制仓位', isExtreme: false },
  { min: 45, max: 55, label: '常温', color: '#FFCC00', start: '#FFCC00', end: '#FFE066', advice: '市场情绪平稳，保持观望', isExtreme: false },
  { min: 55, max: 80, label: '温热', color: '#34C759', start: '#34C759', end: '#6AE07A', advice: '市场偏乐观，注意追高风险', isExtreme: false },
  { min: 80, max: 100, label: '沸点', color: '#00C853', start: '#00C853', end: '#5AFF8F', advice: '市场过热，谨防回调风险', isExtreme: true },
]

/** 指数数值（0-100），页面挂载时从恐贪指数服务拉取真实值；失败时保留默认值 */
const indexValue = ref(12)

/** 当前分档（颜色 / 状态 / 建议） */
const range = computed<RangeDef>(() => {
  const v = indexValue.value
  return RANGES.find((r) => v >= r.min && v < r.max) ?? RANGES[RANGES.length - 1]
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
    // 拉取失败时保留默认值，不阻塞首页渲染
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
