<template>
  <view
    :class="['insight-alert-card', { 'is-compact': compact, 'is-clickable': clickable }]"
    @tap="onClick"
  >
    <!-- 非 compact：品牌蓝渐变头部 -->
    <view v-if="!compact" class="insight-alert-card__header">
      <view class="insight-alert-card__stock">
        <text class="insight-alert-card__name">{{ name }}</text>
        <text class="insight-alert-card__code">{{ symbol }}</text>
      </view>
      <view :class="['insight-alert-card__tag', `is-${direction}`]">
        <text class="insight-alert-card__tag-text">{{ direction === 'up' ? '涨' : '跌' }}</text>
      </view>
    </view>

    <!-- 内容区 -->
    <view class="insight-alert-card__body">
      <!-- 左侧色条（按 direction 着色） -->
      <view :class="['insight-alert-card__bar', `is-${direction}`]" />

      <!-- compact 模式：头部行内嵌在 body 顶部 -->
      <view v-if="compact" class="insight-alert-card__compact-header">
        <view class="insight-alert-card__stock">
          <text class="insight-alert-card__name">{{ name }}</text>
          <text class="insight-alert-card__code">{{ symbol }}</text>
        </view>
        <view :class="['insight-alert-card__tag', `is-${direction}`]">
          <text class="insight-alert-card__tag-text">{{ direction === 'up' ? '涨' : '跌' }}</text>
        </view>
      </view>

      <text class="insight-alert-card__message">{{ message }}</text>

      <view class="insight-alert-card__footer">
        <view class="insight-alert-card__footer-left">
          <text v-if="!compact" class="insight-alert-card__type">{{ type }}</text>
          <view
            v-if="!compact && confidence"
            :class="['insight-alert-card__confidence', confidenceTagClass]"
          >
            <text class="insight-alert-card__confidence-text">{{ confidenceLabel }}</text>
          </view>
        </view>
        <text class="insight-alert-card__time">{{ time }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  name: string
  symbol: string
  direction: 'up' | 'down'
  message: string
  type: string
  time: string
  confidence?: 'high' | 'medium' | 'low' | 'unconfirmed'
  compact?: boolean
  clickable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  confidence: undefined,
  compact: false,
  clickable: false,
})

const emit = defineEmits<{ click: [event: Event] }>()

const confidenceLabel = computed(() => {
  switch (props.confidence) {
    case 'high': return '高置信'
    case 'medium': return '中置信'
    case 'low': return '低置信'
    case 'unconfirmed': return '待验证'
    default: return ''
  }
})

const confidenceTagClass = computed(() => {
  return props.confidence === 'high' ? 'is-high' : 'is-neutral'
})

function onClick(event: Event) {
  if (props.clickable) emit('click', event)
}
</script>

<style lang="scss" scoped>
.insight-alert-card {
  position: relative;
  background: $bg-card;
  border: 2rpx solid $line;
  border-radius: $r-xl;
  box-shadow: $shadow-card;
  overflow: hidden;

  &.is-clickable {
    /* #ifdef H5 */
    cursor: pointer;
    /* #endif */
    &:active {
      transform: scale(0.995);
    }
  }

  &.is-compact {
    border-radius: $r-md;
    box-shadow: none;
    border-color: $line-soft;
  }
}

/* 非紧凑模式头部（品牌蓝渐变） */
.insight-alert-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 24rpx;
  background: $brand-gradient;
}

.insight-alert-card__stock {
  display: flex;
  align-items: baseline;
  gap: $s-2;
  min-width: 0;
}

.insight-alert-card__name {
  font-size: $font-size-base;
  font-weight: 600;
  color: $bg-card;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.insight-alert-card__code {
  font-size: $font-size-xs;
  color: rgba(255, 255, 255, 0.7);
  flex-shrink: 0;
}

/* 头部 Tag（白底白字） */
.insight-alert-card__tag {
  padding: 4rpx 16rpx;
  border-radius: $r-xs;
  border: 2rpx solid rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.15);

  &.is-up {
    background: rgba(255, 255, 255, 0.15);
  }
  &.is-down {
    background: rgba(255, 255, 255, 0.15);
  }
}

.insight-alert-card__tag-text {
  font-size: $font-size-xs;
  color: $bg-card;
  font-weight: 600;
}

/* 内容区 */
.insight-alert-card__body {
  position: relative;
  padding: 20rpx 24rpx;
}

/* 左侧色条 */
.insight-alert-card__bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 6rpx;

  &.is-up {
    background: $stock-up-color;
  }
  &.is-down {
    background: $stock-down-color;
  }
}

/* compact 模式头部（白底，Tag 用涨跌色） */
.insight-alert-card__compact-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;

  .insight-alert-card__name {
    color: $ink;
  }
  .insight-alert-card__code {
    color: $ink-mute;
  }
  .insight-alert-card__tag {
    &.is-up {
      background: rgba($stock-up-color, 0.1);
      border-color: $stock-up-color;
      .insight-alert-card__tag-text { color: $stock-up-color; }
    }
    &.is-down {
      background: rgba($stock-down-color, 0.1);
      border-color: $stock-down-color;
      .insight-alert-card__tag-text { color: $stock-down-color; }
    }
  }
}

.insight-alert-card__message {
  display: block;
  font-size: $font-size-sm;
  color: $ink-soft;
  line-height: 1.4;
}

.insight-alert-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12rpx;
}

.insight-alert-card__footer-left {
  display: flex;
  align-items: center;
  gap: $s-2;
}

.insight-alert-card__type {
  font-size: $font-size-xs;
  color: $ink-mute;
}

.insight-alert-card__confidence {
  padding: 2rpx 12rpx;
  border-radius: $r-xs;

  &.is-high {
    background: $warning-bg;
    .insight-alert-card__confidence-text { color: $warning; }
  }
  &.is-neutral {
    background: $bg-soft;
    .insight-alert-card__confidence-text { color: $ink-mute; }
  }
}

.insight-alert-card__confidence-text {
  font-size: $font-size-xs;
}

.insight-alert-card__time {
  font-size: $font-size-xs;
  color: $ink-mute;
  font-variant-numeric: tabular-nums;
}

/* compact 模式整体缩小内边距 */
.insight-alert-card.is-compact {
  .insight-alert-card__body {
    padding: 12rpx 16rpx 12rpx 20rpx;
  }
  .insight-alert-card__name {
    font-size: $font-size-sm;
  }
  .insight-alert-card__message {
    font-size: $font-size-xs;
  }
  .insight-alert-card__footer {
    margin-top: 8rpx;
  }
}
</style>
