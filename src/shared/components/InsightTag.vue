<template>
  <view
    class="as-insight-tag"
    :class="[`as-insight-tag--${type}`, `as-insight-tag--${size}`]"
  >
    <view class="as-insight-tag__eye">
      <view class="as-insight-tag__iris" />
      <view class="as-insight-tag__pupil" />
      <view class="as-insight-tag__glint" />
      <view class="as-insight-tag__spark" />
    </view>
    <text class="as-insight-tag__label">
      <slot />
    </text>
  </view>
</template>

<script setup lang="ts">
/**
 * InsightTag 洞察之眼标签
 * 系统标志组件：瞳孔即洞见类型，全站洞见入口统一使用。
 * 瞳孔语义：虚线外环=数据流，虹膜渐变=数据汇聚，瞳孔+高光=AI 看穿本质。
 */
type InsightType = 'emotion' | 'fund' | 'event' | 'market'
type InsightSize = 'sm' | 'md' | 'lg'

withDefaults(defineProps<{
  /** 洞见类型：emotion 情绪 / fund 资金 / event 事件 / market 市场 */
  type?: InsightType
  /** 尺寸 */
  size?: InsightSize
}>(), {
  type: 'emotion',
  size: 'md'
})
</script>

<style lang="scss" scoped>
.as-insight-tag {
  display: inline-flex;
  align-items: center;
  gap: $s-1;
  padding: 4rpx 16rpx;
  border-radius: $r-full;
  font-size: $font-size-xs;
  font-weight: 600;
  line-height: $lh-tight;
  vertical-align: middle;
}

.as-insight-tag__label {
  font-size: inherit;
  line-height: inherit;
  white-space: nowrap;
}

/* ===== 洞察之眼瞳孔（纯 CSS，无 SVG id 冲突） ===== */
.as-insight-tag__eye {
  position: relative;
  width: 32rpx;
  height: 32rpx;
  border-radius: $r-full;
  border: 1.5rpx dashed currentColor;
  opacity: 0.95;
  flex-shrink: 0;
}

/* 虹膜渐变（外环仅比眼球略大，留细间隙形成光环感） */
.as-insight-tag__iris {
  position: absolute;
  top: 10%;
  left: 10%;
  right: 10%;
  bottom: 10%;
  border-radius: $r-full;
  background: radial-gradient(circle at 38% 32%, var(--iris-light, currentColor) 0%, var(--iris-deep, currentColor) 100%);
}

/* 瞳孔 */
.as-insight-tag__pupil {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 31%;
  height: 31%;
  transform: translate(-50%, -50%);
  border-radius: $r-full;
  background: var(--iris-deep, currentColor);
}

/* 主高光（左上，部分嵌在瞳孔上） */
.as-insight-tag__glint {
  position: absolute;
  left: 33%;
  top: 31%;
  width: 15%;
  height: 15%;
  border-radius: $r-full;
  background: #fff;
  opacity: 0.92;
}

/* 数据汇聚光点（右下，部分嵌在瞳孔上） */
.as-insight-tag__spark {
  position: absolute;
  right: 34%;
  bottom: 34%;
  width: 8%;
  height: 8%;
  border-radius: $r-full;
  background: $gold-light;
  opacity: 0.85;
}

/* ===== Types（瞳孔色即类型） ===== */
.as-insight-tag--emotion {
  background: $insight-emotion-soft;
  color: $insight-emotion;
  --iris-light: #{$insight-emotion-light};
  --iris-deep: #{$insight-emotion-deep};
}

.as-insight-tag--fund {
  background: $insight-fund-soft;
  color: $insight-fund;
  --iris-light: #{$insight-fund-light};
  --iris-deep: #{$insight-fund-deep};
}

.as-insight-tag--event {
  background: $insight-event-soft;
  color: $insight-event-deep;
  --iris-light: #{$insight-event-light};
  --iris-deep: #{$insight-event-deep};
}

.as-insight-tag--market {
  background: $insight-market-soft;
  color: $insight-market;
  --iris-light: #{$insight-market-light};
  --iris-deep: #{$insight-market-deep};
}

/* ===== Sizes ===== */
.as-insight-tag--sm {
  padding: 2rpx 12rpx;
  font-size: 20rpx;

  .as-insight-tag__eye {
    width: 24rpx;
    height: 24rpx;
    border-width: 1rpx;
  }
}

.as-insight-tag--lg {
  padding: 6rpx 20rpx;
  font-size: $font-size-sm;

  .as-insight-tag__eye {
    width: 40rpx;
    height: 40rpx;
  }
}
</style>