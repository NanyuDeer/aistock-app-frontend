<template>
  <Card class="fav-related-card" flat>
    <!-- 标题行始终渲染（含无相关事件时），整行可点切换展开/收起 -->
    <view class="frc-header" :class="{ 'frc-header--expanded': expanded }" @tap="expanded = !expanded">
      <view class="frc-head-main">
        <view class="frc-accent-bar" />
        <text class="frc-title">自选股相关重大事件</text>
        <text v-if="rows.length > 0" class="frc-count">{{ rows.length }} 条相关</text>
      </view>
      <view class="frc-toggle">
        <text class="frc-toggle-text">{{ expanded ? '收起' : '展开' }}</text>
        <SvgIcon :name="expanded ? 'arrow-up-s-line' : 'arrow-down-s-line'" size="26rpx" color="#0b5fff" />
      </view>
    </view>

    <view v-if="expanded" class="frc-list">
      <!-- 无相关事件时的展开态提示 -->
      <text v-if="rows.length === 0" class="frc-empty">暂未匹配到与自选股相关的事件</text>
      <view v-for="row in visibleRows" :key="row.event.eventId" class="frc-row">
        <view class="frc-row-head">
          <text class="frc-event-title" @tap="goEvent(row.event.eventId)">{{ row.event.title }}</text>
          <text class="frc-date">{{ formatDateTime(row.event.publishTime) }}</text>
        </view>
        <view
          v-for="stock in row.matchedStocks"
          :key="stock.symbol"
          class="frc-reason"
        >
          <text class="frc-reason-text">影响板块：</text>
          <text class="frc-industry" :class="'frc-industry--' + stock.direction">{{ stock.matchedIndustry }}</text>
          <text class="frc-reason-text"> → 你的自选股：</text>
          <view class="frc-stock-pill" @tap="goStock(stock.symbol)">
            <text class="frc-stock-name">{{ stock.name }}</text>
            <text class="frc-stock-industry">（{{ stock.industry }}）</text>
          </view>
        </view>
      </view>
    </view>
  </Card>
</template>

<script setup lang="ts">
/**
 * FavoriteRelatedCard - 自选股相关事件卡片
 *
 * 事件传导列表页「重大事件」卡片下方可收折小卡片：筛出与用户自选股相关的事件，标注被影响的自选股。
 * 默认全部收起（仅显示标题行），点击标题行展开。
 * 标题行始终渲染；无相关事件（未登录 / 无自选股 / 无匹配）时展开显示空提示。
 */
import { computed, ref } from 'vue'
import type { RelatedEventRow } from '../favoriteRelated'
import { formatDateTime } from '@/shared/utils/datetime'
import Card from '@/shared/components/Card.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'

interface Props {
  rows: RelatedEventRow[]
}

const props = defineProps<Props>()

/** 展开态上限（与数据层 MAX_ROWS 一致） */
const MAX_COUNT = 20

/** 默认全部收起：收起态不渲染任何事件行，仅保留标题行 */
const expanded = ref(false)

/** 展开态展示全部（上限 MAX_COUNT）；收起态为空数组 */
const visibleRows = computed(() => (
  expanded.value ? props.rows.slice(0, MAX_COUNT) : []
))

/** 事件标题点击 → 事件详情页 */
function goEvent(eventId: string) {
  uni.navigateTo({ url: '/modules/chat/pages/event/detail?id=' + eventId })
}

/** 自选股胶囊点击 → 个股详情页 */
function goStock(symbol: string) {
  uni.navigateTo({ url: '/modules/favorites/pages/detail?symbol=' + symbol })
}
</script>

<style lang="scss" scoped>
@import '@/shared/styles/variables.scss';

.fav-related-card.as-card {
  padding: 0;
  margin-bottom: 20rpx;
  border-radius: $r-lg;
  background: var(--ev-bg-card);
  border: 2rpx solid var(--ev-border);
  overflow: hidden;
}

/* ===== 标题行：强调样式（左侧色条 + 品牌浅底 + 计数徽标） ===== */
.frc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  padding: 24rpx 22rpx;
  background: var(--ev-accent-bg);
}

.frc-header--expanded {
  border-bottom: 2rpx solid var(--ev-border-light);
}

.frc-header:active {
  opacity: 0.7;
}

.frc-head-main {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex: 1;
  min-width: 0;
}

.frc-accent-bar {
  width: 6rpx;
  height: 30rpx;
  border-radius: 4rpx;
  background: var(--ev-accent);
  flex-shrink: 0;
}

.frc-title {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--ev-text-primary);
  letter-spacing: 0.5rpx;
}

.frc-count {
  flex-shrink: 0;
  padding: 2rpx 12rpx;
  border-radius: 9999rpx;
  background: var(--ev-accent-soft);
  color: var(--ev-accent);
  font-size: 22rpx;
  font-weight: 600;
}

.frc-toggle {
  display: flex;
  align-items: center;
  gap: 4rpx;
  flex-shrink: 0;
}

.frc-toggle-text {
  font-size: 24rpx;
  font-weight: 600;
  color: var(--ev-accent);
}

/* ===== 列表 ===== */
.frc-list {
  padding: 16rpx 22rpx 22rpx;
}

.frc-empty {
  display: block;
  padding: 8rpx 0;
  font-size: 24rpx;
  color: var(--ev-text-muted);
}

.frc-row + .frc-row {
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 2rpx solid var(--ev-border-light);
}

.frc-row-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12rpx;
}

.frc-event-title {
  flex: 1;
  min-width: 0;
  font-size: 26rpx;
  font-weight: 600;
  color: var(--ev-text-primary);
  line-height: 1.4;
  transition: color $t-fast;
  -webkit-tap-highlight-color: transparent;
}

.frc-event-title:active {
  color: var(--ev-accent);
}

.frc-date {
  flex-shrink: 0;
  font-size: 22rpx;
  color: var(--ev-text-muted);
}

/* ===== 理由行 ===== */
.frc-reason {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  margin-top: 8rpx;
}

.frc-reason-text {
  font-size: 22rpx;
  color: var(--ev-text-secondary);
  margin-right: 4rpx;
}

/* 影响板块名称方向着色（A 股红涨绿跌，与时间轴 sector-tag 口径一致，无底色） */
.frc-industry {
  font-size: 22rpx;
  font-weight: 600;
}

.frc-industry--bullish {
  color: var(--ev-negative);
}

.frc-industry--bearish {
  color: var(--ev-positive);
}

.frc-industry--neutral {
  color: var(--ev-text-secondary);
}

.frc-stock-pill {
  display: inline-flex;
  align-items: baseline;
  margin: 2rpx 6rpx 2rpx 0;
  padding: 2rpx 12rpx;
  border-radius: 9999rpx;
  background: var(--ev-accent-soft);
}

.frc-stock-name {
  font-size: 22rpx;
  font-weight: 600;
  color: var(--ev-accent);
}

.frc-stock-industry {
  font-size: 20rpx;
  color: var(--ev-text-muted);
}
</style>
