<template>
  <view class="as-timeline">
    <view
      v-for="(item, idx) in items"
      :key="idx"
      class="as-timeline__item"
    >
      <view class="as-timeline__rail">
        <view class="as-timeline__dot" :class="`is-${item.type || 'neutral'}`" />
        <view v-if="idx !== items.length - 1" class="as-timeline__line" />
      </view>
      <view class="as-timeline__card">
        <view class="as-timeline__header">
          <text class="as-timeline__time">{{ item.time }}</text>
          <text class="as-timeline__tag" :class="`is-${item.type || 'neutral'}`">{{ typeLabel(item.type) }}</text>
        </view>
        <text class="as-timeline__title">{{ item.title }}</text>
        <text v-if="item.description" class="as-timeline__desc">{{ item.description }}</text>
        <view v-if="item.extra" class="as-timeline__footer">
          <text class="as-timeline__extra" :class="`is-${item.type || 'neutral'}`">{{ item.extra }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
type TimelineType = 'up' | 'down' | 'neutral'

interface TimelineItem {
  /** 时间，如 '2024-Q1' */
  time: string
  /** 标题 */
  title: string
  /** 描述 */
  description?: string
  /** 类型：up=利好(红), down=利空(绿), neutral=中性(灰) */
  type?: TimelineType
  /** 额外信息，如涨跌百分比 */
  extra?: string
}

withDefaults(defineProps<{
  items: TimelineItem[]
}>(), {})

/** 类型标签文案 */
function typeLabel(type?: TimelineType): string {
  const labelMap: Record<TimelineType, string> = {
    up: '利好',
    down: '利空',
    neutral: '中性'
  }
  return labelMap[type || 'neutral']
}
</script>

<style lang="scss" scoped>
.as-timeline {
  display: flex;
  flex-direction: column;
}

.as-timeline__item {
  position: relative;
  padding-left: $s-6; // 为左侧轨道留出空间
  margin-bottom: $s-3;

  &:last-child {
    margin-bottom: 0;
  }
}

/* 左侧轨道：圆点 + 连接线 */
.as-timeline__rail {
  position: absolute;
  left: 0;
  top: 0;
  width: 32rpx;
  height: 100%;
}

.as-timeline__dot {
  position: absolute;
  top: $s-2;
  left: 50%;
  transform: translateX(-50%);
  width: 20rpx;
  height: 20rpx;
  border-radius: $r-full;
  z-index: 2;

  &.is-up {
    background: $up;
    box-shadow: 0 0 0 6rpx rgba(229, 77, 94, 0.18);
  }

  &.is-down {
    background: $down;
    box-shadow: 0 0 0 6rpx rgba(24, 160, 88, 0.18);
  }

  &.is-neutral {
    background: $ink-mute;
    box-shadow: 0 0 0 6rpx rgba(138, 150, 176, 0.18);
  }
}

/* 连接线：从当前圆点底部延伸至下一项圆点顶部，保证竖线连续 */
.as-timeline__line {
  position: absolute;
  top: $s-2 + 20rpx;
  bottom: -1 * ($s-3 + $s-2);
  left: 50%;
  transform: translateX(-50%);
  width: 2rpx;
  background: $line;
}

/* 右侧内容卡片 */
.as-timeline__card {
  background: $bg-card;
  border: 2rpx solid $line;
  border-radius: $r-md;
  box-shadow: $shadow-xs;
  padding: $s-3;
}

.as-timeline__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $s-1;
}

.as-timeline__time {
  font-size: $font-size-xs;
  color: $ink-mute;
  font-family: $font-mono;
}

.as-timeline__tag {
  font-size: 20rpx;
  font-weight: 600;
  padding: 2rpx 12rpx;
  border-radius: $r-xs;

  &.is-up {
    background: $up-soft;
    color: $up;
  }

  &.is-down {
    background: $down-soft;
    color: $down;
  }

  &.is-neutral {
    background: $bg-deep;
    color: $ink-mute;
  }
}

.as-timeline__title {
  display: block;
  font-size: $font-size-md;
  font-weight: 600;
  color: $ink;
  line-height: $lh-tight;
  margin-bottom: $s-1;
}

.as-timeline__desc {
  display: block;
  font-size: $font-size-sm;
  color: $ink-soft;
  line-height: $lh-base;
}

.as-timeline__footer {
  margin-top: $s-2;
}

.as-timeline__extra {
  font-size: $font-size-sm;
  font-weight: 700;
  font-family: $font-mono;

  &.is-up {
    color: $up;
  }

  &.is-down {
    color: $down;
  }

  &.is-neutral {
    color: $ink-mute;
  }
}
</style>
