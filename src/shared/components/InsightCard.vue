<template>
  <view
    class="as-insight-card"
    :class="[`as-insight-card--${theme}`]"
    @tap="handleClick"
  >
    <!-- 头部：瞳孔 + 类型标签 + 时间 -->
    <view class="as-insight-card__head">
      <InsightTag :type="type" size="sm">{{ typeLabel }}</InsightTag>
      <text v-if="time" class="as-insight-card__time">{{ time }}</text>
    </view>

    <!-- 结论标题（一句话） -->
    <text class="as-insight-card__title">{{ title }}</text>

    <!-- 分隔线 -->
    <view class="as-insight-card__divider" />

    <!-- 溯源 -->
    <view class="as-insight-card__line">
      <text class="as-insight-card__key">溯源</text>
      <text class="as-insight-card__text">{{ trace }}</text>
    </view>

    <!-- 预判 -->
    <view class="as-insight-card__line">
      <text class="as-insight-card__key as-insight-card__key--forecast">预判</text>
      <text class="as-insight-card__text">{{ forecast }}</text>
    </view>

    <!-- 底部 meta -->
    <view v-if="showMeta" class="as-insight-card__foot">
      <text v-if="confidence" class="as-insight-card__meta">置信度 {{ confidence }}</text>
      <text class="as-insight-card__brand">INSIGHT</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import InsightTag from './InsightTag.vue'

/**
 * InsightCard 洞见卡片
 * 全站洞见统一容器：瞳孔标签置前 → 结论一句话 → 溯源 → 预判（两句话上限）。
 */
type InsightType = 'emotion' | 'fund' | 'event' | 'market'
type InsightTheme = 'light' | 'dark'

const props = withDefaults(defineProps<{
  /** 洞见类型 */
  type?: InsightType
  /** 结论标题（一句话说清现象） */
  title: string
  /** 溯源：原因说明 */
  trace: string
  /** 预判：后续走向 */
  forecast: string
  /** 时间，如 '08-21 · 09:10' */
  time?: string
  /** 主题：light 亮色列表卡 / dark 深蓝研报卡 */
  theme?: InsightTheme
  /** 是否显示底部 meta（置信度 + INSIGHT 角标） */
  showMeta?: boolean
  /** 数据置信度，如 '0.82' */
  confidence?: string
}>(), {
  type: 'emotion',
  time: '',
  theme: 'light',
  showMeta: false,
  confidence: ''
})

const emit = defineEmits<{
  click: []
}>()

const typeLabelMap: Record<InsightType, string> = {
  emotion: '情绪洞见',
  fund: '资金洞见',
  event: '事件洞见',
  market: '市场洞见'
}

const typeLabel = computed(() => typeLabelMap[props.type])

const handleClick = () => {
  emit('click')
}
</script>

<style lang="scss" scoped>
.as-insight-card {
  display: flex;
  flex-direction: column;
  gap: $s-2;
  padding: $s-4;
  border-radius: $r-lg;
  transition: transform $t-fast;
  user-select: none;
}

.as-insight-card:active {
  transform: scale(0.995);
}

/* ===== Head ===== */
.as-insight-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.as-insight-card__time {
  font-size: $font-size-xs;
  color: $ink-mute;
}

/* ===== Title ===== */
.as-insight-card__title {
  font-size: $font-size-md;
  font-weight: 600;
  color: $ink;
  line-height: $lh-tight;
}

/* ===== Divider ===== */
.as-insight-card__divider {
  height: 2rpx;
  background: linear-gradient(90deg, $primary-100, rgba($primary-100, 0));
  margin: $s-1 0;
}

/* ===== Lines ===== */
.as-insight-card__line {
  display: flex;
  gap: $s-2;
  align-items: flex-start;
}

.as-insight-card__key {
  flex-shrink: 0;
  font-size: 20rpx;
  font-weight: 600;
  color: $primary;
  line-height: $lh-base;
  padding-top: 2rpx;
}

.as-insight-card__key--forecast {
  color: $gold-deep;
}

.as-insight-card__text {
  font-size: $font-size-sm;
  color: $ink-soft;
  line-height: $lh-base;
  flex: 1;
}

/* ===== Foot ===== */
.as-insight-card__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: $s-1;
}

.as-insight-card__meta {
  font-size: 20rpx;
  color: $ink-faint;
}

.as-insight-card__brand {
  font-size: 20rpx;
  font-weight: 600;
  letter-spacing: $ls-wider;
  color: $ink-faint;
}

/* ===== Theme: Light ===== */
.as-insight-card--light {
  background: $bg-card;
  border: 2rpx solid $line;
  box-shadow: $shadow-xs;
}

/* ===== Theme: Dark（深蓝研报卡） ===== */
.as-insight-card--dark {
  background: $insight-card-dark-gradient;
  border: none;
  box-shadow: $shadow-card;

  .as-insight-card__title {
    color: #fff;
  }

  .as-insight-card__divider {
    background: linear-gradient(90deg, rgba($gold-light, 0.6), rgba($white, 0.12));
  }

  .as-insight-card__key {
    color: $gold-light;
  }

  .as-insight-card__text {
    color: rgba($white, 0.86);
  }

  .as-insight-card__meta,
  .as-insight-card__brand {
    color: rgba($white, 0.55);
  }
}
</style>