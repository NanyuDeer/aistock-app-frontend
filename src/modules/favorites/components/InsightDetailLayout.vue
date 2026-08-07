<template>
  <view class="insight-detail-layout">
    <!-- 头部卡（品牌蓝渐变） -->
    <view class="insight-detail-layout__header">
      <view class="insight-detail-layout__header-row">
        <view class="insight-detail-layout__stock">
          <text class="insight-detail-layout__name">{{ detail.stock_name }}</text>
          <text class="insight-detail-layout__code">{{ detail.symbol }}</text>
        </view>
        <view :class="['insight-detail-layout__tag', `is-${detail.direction}`]">
          <text class="insight-detail-layout__tag-text">{{ detail.direction === 'up' ? '涨' : '跌' }}</text>
        </view>
      </view>
      <text class="insight-detail-layout__date">{{ detail.trade_date }}</text>
    </view>

    <!-- 主因卡 -->
    <view v-if="detail.primary_driver" class="insight-detail-layout__primary">
      <view :class="['insight-detail-layout__primary-bar', `is-${detail.direction}`]" />
      <text class="insight-detail-layout__section-label">主导因素</text>
      <view class="insight-detail-layout__primary-content">
        <text class="insight-detail-layout__primary-label">{{ detail.primary_driver.label }}</text>
        <view class="insight-detail-layout__tags">
          <view class="insight-detail-layout__tag-neutral">
            <text class="insight-detail-layout__tag-neutral-text">{{ categoryText(detail.primary_driver.category) }}</text>
          </view>
          <view
            v-if="detail.primary_driver.confidence"
            :class="['insight-detail-layout__tag-neutral', confidenceTagClass(detail.primary_driver.confidence)]"
          >
            <text class="insight-detail-layout__tag-neutral-text">{{ confidenceText(detail.primary_driver.confidence) }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 次因卡 -->
    <view v-if="detail.secondary_drivers?.length" class="insight-detail-layout__secondary">
      <text class="insight-detail-layout__section-label">次要因素</text>
      <view class="insight-detail-layout__secondary-list">
        <view
          v-for="(d, idx) in detail.secondary_drivers"
          :key="idx"
          class="insight-detail-layout__secondary-item"
        >
          <view class="insight-detail-layout__dot" />
          <text class="insight-detail-layout__secondary-label">{{ d.label }}</text>
          <view class="insight-detail-layout__tag-neutral">
            <text class="insight-detail-layout__tag-neutral-text">{{ categoryText(d.category) }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 待验证提示条 -->
    <view v-if="detail.attribution_status === 'unconfirmed'" class="insight-detail-layout__warn">
      <SvgIcon name="alert-line" size="28rpx" color="#f0a020" />
      <text class="insight-detail-layout__warn-text">主因待验证</text>
    </view>

    <!-- 详情卡 -->
    <view v-if="detail.display_report?.details" class="insight-detail-layout__report">
      <text class="insight-detail-layout__section-label">分析详情</text>
      <text class="insight-detail-layout__report-text">{{ detail.display_report.details }}</text>
    </view>

    <!-- 来源卡 -->
    <view class="insight-detail-layout__source" @tap="onOpenSource">
      <text class="insight-detail-layout__section-label">原始来源</text>
      <text v-if="detail.title" class="insight-detail-layout__source-title">{{ detail.title }}</text>
      <text v-if="detail.keywords?.length" class="insight-detail-layout__source-meta">
        关键词：{{ detail.keywords.join(' / ') }}
      </text>
      <text v-if="detail.published_at" class="insight-detail-layout__source-meta">
        发布时间：{{ detail.published_at }}
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { WatchlistInsight, InsightDriver } from '@/shared/api/modules/insight'
import SvgIcon from '@/shared/components/SvgIcon.vue'

interface Props {
  detail: WatchlistInsight
}

const props = defineProps<Props>()

const emit = defineEmits<{ 'open-source': [] }>()

function categoryText(c: InsightDriver['category']): string {
  return {
    industry_theme: '行业题材',
    company_event: '公司事件',
    earnings: '业绩',
    market: '市场',
    trading_sentiment: '交易情绪',
  }[c] || c
}

function confidenceText(c: InsightDriver['confidence']): string {
  return { high: '高置信', medium: '中置信', low: '低置信' }[c] || c
}

function confidenceTagClass(c: InsightDriver['confidence']): string {
  return c === 'high' ? 'is-high' : 'is-neutral'
}

function onOpenSource() {
  emit('open-source')
}
</script>

<style lang="scss" scoped>
.insight-detail-layout {
  display: flex;
  flex-direction: column;
  gap: $s-3;
  padding: $s-3;
}

/* 头部卡（品牌蓝渐变） */
.insight-detail-layout__header {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  padding: 24rpx;
  background: $brand-gradient;
  border-radius: $r-xl;
}

.insight-detail-layout__header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.insight-detail-layout__stock {
  display: flex;
  align-items: baseline;
  gap: $s-2;
  min-width: 0;
}

.insight-detail-layout__name {
  font-size: $font-size-lg;
  font-weight: 600;
  color: $bg-card;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.insight-detail-layout__code {
  font-size: $font-size-sm;
  color: rgba(255, 255, 255, 0.7);
  flex-shrink: 0;
}

.insight-detail-layout__tag {
  padding: 4rpx 20rpx;
  border-radius: $r-xs;

  &.is-up {
    background: $stock-up-color;
  }
  &.is-down {
    background: $stock-down-color;
  }
}

.insight-detail-layout__tag-text {
  font-size: $font-size-xs;
  color: $bg-card;
  font-weight: 600;
}

.insight-detail-layout__date {
  font-size: $font-size-xs;
  color: rgba(255, 255, 255, 0.7);
}

/* 通用 section 标签 */
.insight-detail-layout__section-label {
  display: block;
  font-size: $font-size-xs;
  color: $ink-mute;
  margin-bottom: 8rpx;
}

/* 主因卡 */
.insight-detail-layout__primary {
  position: relative;
  padding: 20rpx 24rpx;
  background: $bg-card;
  border: 2rpx solid $line;
  border-radius: $r-md;
  box-shadow: $shadow-sm;
  overflow: hidden;
}

.insight-detail-layout__primary-bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 6rpx;

  &.is-up { background: $stock-up-color; }
  &.is-down { background: $stock-down-color; }
}

.insight-detail-layout__primary-content {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.insight-detail-layout__primary-label {
  font-size: $font-size-base;
  font-weight: 600;
  color: $ink;
  line-height: 1.4;
}

.insight-detail-layout__tags {
  display: flex;
  flex-wrap: wrap;
  gap: $s-2;
}

/* 通用小标签（neutral 灰底） */
.insight-detail-layout__tag-neutral {
  padding: 2rpx 12rpx;
  border-radius: $r-xs;
  background: $bg-soft;

  &.is-high {
    background: $warning-bg;
    .insight-detail-layout__tag-neutral-text { color: $warning; }
  }
  &.is-neutral {
    .insight-detail-layout__tag-neutral-text { color: $ink-mute; }
  }
}

.insight-detail-layout__tag-neutral-text {
  font-size: $font-size-xs;
}

/* 次因卡 */
.insight-detail-layout__secondary {
  padding: 20rpx 24rpx;
  background: $bg-card;
  border: 2rpx solid $line;
  border-radius: $r-md;
  box-shadow: $shadow-sm;
}

.insight-detail-layout__secondary-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.insight-detail-layout__secondary-item {
  display: flex;
  align-items: center;
  gap: $s-2;
}

.insight-detail-layout__dot {
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
  background: $ink-mute;
  flex-shrink: 0;
}

.insight-detail-layout__secondary-label {
  flex: 1;
  font-size: $font-size-sm;
  color: $ink-soft;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 待验证提示条 */
.insight-detail-layout__warn {
  display: flex;
  align-items: center;
  gap: $s-2;
  padding: 12rpx 24rpx;
  background: $warning-bg;
  border-radius: $r-sm;
}

.insight-detail-layout__warn-text {
  font-size: $font-size-sm;
  color: $warning;
}

/* 详情卡 */
.insight-detail-layout__report {
  padding: 20rpx 24rpx;
  background: $bg-card;
  border: 2rpx solid $line;
  border-radius: $r-md;
  box-shadow: $shadow-sm;
}

.insight-detail-layout__report-text {
  display: block;
  font-size: $font-size-sm;
  color: $ink-soft;
  line-height: 1.6;
}

/* 来源卡 */
.insight-detail-layout__source {
  padding: 20rpx 24rpx;
  background: $bg-card;
  border: 2rpx solid $line;
  border-radius: $r-md;
  box-shadow: $shadow-sm;

  /* #ifdef H5 */
  cursor: pointer;
  /* #endif */

  &:active {
    background: $bg-soft;
  }
}

.insight-detail-layout__source-title {
  display: block;
  font-size: $font-size-sm;
  color: $primary;
  line-height: 1.4;
  margin-bottom: 8rpx;
}

.insight-detail-layout__source-meta {
  display: block;
  font-size: $font-size-xs;
  color: $ink-mute;
  margin-top: 4rpx;
}
</style>
