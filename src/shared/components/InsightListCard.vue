<template>
  <view
    :class="['as-insight-list-card', `as-insight-list-card--${theme}`]"
    @tap="handleClick"
  >
    <!-- 顶部装饰条 -->
    <view class="as-insight-list-card__decor"></view>

    <!-- 卡片头部 -->
    <view class="as-insight-list-card__header">
      <view :class="['as-insight-list-card__icon', `as-insight-list-card__icon--${theme}`]">
        <SvgIcon :name="iconName" size="32rpx" color="#ffffff" />
      </view>
      <view class="as-insight-list-card__header-text">
        <text class="as-insight-list-card__title">{{ title }}</text>
        <text v-if="desc" class="as-insight-list-card__desc">{{ desc }}</text>
      </view>
      <text v-if="clickable" class="as-insight-list-card__more">›</text>
    </view>

    <!-- 卡片内容 -->
    <view class="as-insight-list-card__body">
      <!-- 加载状态 -->
      <view v-if="status === 'loading'" class="as-insight-list-card__state">
        <text class="as-insight-list-card__state-text">{{ statusText || '数据加载中…' }}</text>
      </view>

      <!-- 错误/空状态 -->
      <view v-else-if="status === 'error' || status === 'empty'" class="as-insight-list-card__state">
        <text class="as-insight-list-card__state-text">{{ statusText || '暂无数据' }}</text>
      </view>

      <!-- 数据列表 -->
      <view v-else-if="items.length > 0" class="as-insight-list-card__list">
        <view
          v-for="(item, idx) in displayItems"
          :key="idx"
          class="as-insight-list-card__item"
        >
          <text
            :class="['as-insight-list-card__rank', `as-insight-list-card__rank--${theme}`]"
          >{{ idx + 1 }}</text>
          <text class="as-insight-list-card__name">{{ item.name }}</text>
          <text
            v-if="item.tag"
            :class="['as-insight-list-card__tag', `as-insight-list-card__tag--${theme}`]"
          >{{ item.tag }}</text>
          <text v-if="item.score" class="as-insight-list-card__score">{{ item.score }}</text>
          <text
            v-if="item.trend"
            :class="['as-insight-list-card__trend', item.trendType === 'up' ? 'as-insight-list-card__trend--up' : 'as-insight-list-card__trend--down']"
          >{{ item.trend }}</text>
        </view>
      </view>

      <!-- 默认空数据 -->
      <view v-else class="as-insight-list-card__state">
        <text class="as-insight-list-card__state-text">暂无数据</text>
      </view>
    </view>

    <!-- 底部操作 -->
    <view v-if="actionText" class="as-insight-list-card__footer">
      <text :class="['as-insight-list-card__action', `as-insight-list-card__action--${theme}`]">
        {{ actionText }} ›
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'

interface InsightListItem {
  name: string
  tag?: string
  score?: string
  trend?: string
  trendType?: 'up' | 'down'
}

const props = withDefaults(defineProps<{
  theme?: 'burst' | 'trend' | 'forecast'
  title: string
  desc?: string
  iconName: string
  items: InsightListItem[]
  status?: 'ready' | 'loading' | 'error' | 'empty'
  statusText?: string
  clickable?: boolean
  actionText?: string
  maxItems?: number
}>(), {
  theme: 'trend',
  status: 'ready',
  clickable: true,
  actionText: '',
  maxItems: 3,
})

const emit = defineEmits<{
  (e: 'click'): void
}>()

const displayItems = computed(() => {
  return props.items.slice(0, props.maxItems)
})

function handleClick() {
  if (props.clickable) {
    emit('click')
  }
}
</script>

<style lang="scss" scoped>
.as-insight-list-card {
  background: $bg-soft;
  border: 2rpx solid $line;
  border-radius: $r-lg;
  padding: $s-3;
  margin-bottom: $s-3;
  position: relative;
  overflow: hidden;
  box-shadow: $shadow-card;
  transition: transform 0.2s ease;

  &:active {
    transform: scale(0.98);
  }
}

/* 顶部装饰条 */
.as-insight-list-card__decor {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4rpx;
}

.as-insight-list-card--burst .as-insight-list-card__decor {
  background: linear-gradient(90deg, $warning, $warning-light);
}

.as-insight-list-card--trend .as-insight-list-card__decor {
  background: $brand-gradient;
}

.as-insight-list-card--forecast .as-insight-list-card__decor {
  background: linear-gradient(90deg, $down, $down-light);
}

/* 头部 */
.as-insight-list-card__header {
  display: flex;
  align-items: center;
  gap: $s-2;
  margin-bottom: $s-2;
}

.as-insight-list-card__icon {
  width: 60rpx;
  height: 60rpx;
  border-radius: $r-sm;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.as-insight-list-card__icon--burst {
  background: linear-gradient(135deg, $warning, $warning-light);
  box-shadow: 0 4rpx 12rpx $warning-soft;
}

.as-insight-list-card__icon--trend {
  background: $brand-gradient;
  box-shadow: 0 4rpx 12rpx rgba($primary, 0.3);
}

.as-insight-list-card__icon--forecast {
  background: linear-gradient(135deg, $down, $down-light);
  box-shadow: 0 4rpx 12rpx $down-soft;
}

.as-insight-list-card__header-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.as-insight-list-card__title {
  font-size: $font-size-md;
  font-weight: 600;
  color: $ink;
}

.as-insight-list-card__desc {
  font-size: $font-size-xs;
  color: $ink-soft;
}

.as-insight-list-card__more {
  font-size: $font-size-lg;
  color: $ink-mute;
  font-weight: 300;
}

/* 内容区 */
.as-insight-list-card__body {
  min-height: 80rpx;
}

.as-insight-list-card__state {
  background: $bg-card;
  border-radius: $r-sm;
  padding: $s-2 $s-3;
  min-height: 104rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.as-insight-list-card__state-text {
  font-size: $font-size-xs;
  color: $ink-soft;
}

.as-insight-list-card__list {
  display: flex;
  flex-direction: column;
  gap: $s-1;
  background: $bg-card;
  border-radius: $r-sm;
  padding: $s-2 $s-3;
}

.as-insight-list-card__item {
  display: flex;
  align-items: center;
  gap: $s-1;
  min-width: 0;
}

.as-insight-list-card__rank {
  font-size: $font-size-xs;
  font-weight: 700;
  width: 32rpx;
  height: 32rpx;
  text-align: center;
  line-height: 32rpx;
  border-radius: $r-xs;
  flex-shrink: 0;
}

.as-insight-list-card__rank--burst {
  color: $warning;
  background: $warning-soft;
}

.as-insight-list-card__rank--trend {
  color: $primary;
  background: rgba($primary, 0.1);
}

.as-insight-list-card__rank--forecast {
  color: $down;
  background: $down-soft;
}

.as-insight-list-card__name {
  font-size: $font-size-sm;
  color: $ink;
  font-weight: 500;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.as-insight-list-card__tag {
  font-size: $font-size-xs;
  padding: 2rpx $s-1;
  border-radius: $r-xs;
  flex-shrink: 0;
}

.as-insight-list-card__tag--burst {
  color: $warning;
  background: $warning-soft;
}

.as-insight-list-card__tag--trend {
  color: $primary;
  background: rgba($primary, 0.1);
}

.as-insight-list-card__tag--forecast {
  color: $down;
  background: $down-soft;
}

.as-insight-list-card__score {
  font-size: $font-size-sm;
  color: $ink;
  font-weight: 600;
  flex-shrink: 0;
}

.as-insight-list-card__trend {
  font-size: $font-size-xs;
  font-weight: 600;
  flex-shrink: 0;
}

.as-insight-list-card__trend--up {
  color: $up;
}

.as-insight-list-card__trend--down {
  color: $down;
}

/* 底部操作 */
.as-insight-list-card__footer {
  display: flex;
  justify-content: flex-end;
  margin-top: $s-1;
}

.as-insight-list-card__action {
  font-size: $font-size-xs;
  font-weight: 500;
  padding: $s-1 $s-2;
  border-radius: $r-sm;
}

.as-insight-list-card__action--burst {
  color: $warning;
  background: $warning-soft;
}

.as-insight-list-card__action--trend {
  color: $primary;
  background: rgba($primary, 0.1);
}

.as-insight-list-card__action--forecast {
  color: $down;
  background: $down-soft;
}
</style>
