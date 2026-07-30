/**
 * MorningCard 晨报入口卡片
 * 视觉层：基于组件库 Card + Button + SvgIcon（同步时间：2026-07-28）
 * 保留业务逻辑：tag/title/desc 展示 + playing 状态 + play 事件
 *
 * 组件映射：Card 作为容器（clickable，渐变背景通过主题覆写），
 * Button 作为播放按钮，SvgIcon 替代原 emoji ⏸/▶
 */
<template>
  <Card class="as-morning-card" clickable @click="$emit('play')">
    <view class="as-morning-content">
      <view class="as-morning-tag">{{ tag }}</view>
      <text class="as-morning-title">{{ title }}</text>
      <text v-if="desc" class="as-morning-desc">{{ desc }}</text>
    </view>
    <view class="as-morning-play-wrap">
      <Button type="ghost" @click.stop="$emit('play')">
        <SvgIcon
          :name="playing ? 'pause-fill' : 'play-fill'"
          size="32rpx"
          color="#ffffff"
        />
      </Button>
    </view>
  </Card>
</template>

<script setup lang="ts">
import Card from '@/shared/components/Card.vue'
import Button from '@/shared/components/Button.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'

withDefaults(defineProps<{
  tag?: string
  title?: string
  desc?: string
  playing?: boolean
}>(), {
  tag: '今日晨报',
  title: '双人对话播报',
  desc: '',
  playing: false
})

defineEmits<{ (e: 'play'): void }>()
</script>

<style lang="scss" scoped>
/* Card 容器主题覆写：渐变背景 + 去边框。
   .as-morning-card 与 .as-card 落在同一根元素上，用复合选择器提升优先级可靠覆写 Card 自身样式。 */
.as-morning-card.as-card {
  background: $brand-gradient;
  border: none;
  box-shadow: 0 8rpx 24rpx rgba(77, 124, 254, 0.25);
}

/* Card body 内左右分栏 */
.as-morning-card :deep(.as-card__body) {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.as-morning-content {
  flex: 1;
  min-width: 0;
}

.as-morning-tag {
  display: inline-block;
  padding: 4rpx $s-2;
  background: rgba(255, 255, 255, 0.25);
  border-radius: $r-full;
  font-size: $font-size-xs;
  color: $white;
  margin-bottom: $s-2;
}

.as-morning-title {
  font-size: 34rpx;
  font-weight: 600;
  color: $white;
  display: block;
}

.as-morning-desc {
  font-size: $font-size-sm;
  color: rgba(255, 255, 255, 0.85);
  margin-top: $s-1;
  display: block;
}

/* 播放按钮：覆写为圆形半透明白底 */
.as-morning-play-wrap {
  :deep(.as-btn) {
    width: 80rpx;
    height: 80rpx;
    min-width: 80rpx;
    padding: 0;
    border-radius: $r-full;
    background: rgba(255, 255, 255, 0.25);
    box-shadow: none;
  }

  :deep(.as-btn:active) {
    background: rgba(255, 255, 255, 0.35);
    transform: scale(0.95);
  }
}
</style>
