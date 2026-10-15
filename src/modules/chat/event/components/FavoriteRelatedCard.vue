<template>
  <Card v-if="rows.length > 0" class="fav-related-card" flat>
    <!-- 标题行：整行可点切换展开/收起 -->
    <view class="frc-header" @tap="expanded = !expanded">
      <text class="frc-title">我的自选股 · {{ rows.length }} 条相关</text>
      <view class="frc-toggle">
        <text class="frc-toggle-text">{{ expanded ? '收起' : '展开' }}</text>
        <SvgIcon :name="expanded ? 'arrow-up-s-line' : 'arrow-down-s-line'" size="26rpx" color="#4b5a7a" />
      </view>
    </view>

    <view class="frc-list">
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
          <text class="frc-reason-text">影响板块：{{ stock.matchedIndustry }} → 你的自选股：</text>
          <view class="frc-stock-pill" @tap="goStock(stock.symbol)">
            <text class="frc-stock-name">{{ stock.name }}</text>
            <text class="frc-stock-industry">（{{ stock.industry }}）</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 收起态且有超出：底部提示可展开（与 Web 端一致） -->
    <view v-if="!expanded && rows.length > COLLAPSED_COUNT" class="frc-more" @tap="expanded = true">
      <text class="frc-more-text">还有 {{ rows.length - COLLAPSED_COUNT }} 条，点击展开</text>
    </view>
  </Card>
</template>

<script setup lang="ts">
/**
 * FavoriteRelatedCard - 自选股相关事件卡片
 *
 * 事件传导列表页顶部可收折小卡片：筛出与用户自选股相关的事件，标注被影响的自选股。
 * rows 为空时不渲染（未登录 / 无自选股 / 无相关事件）。
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

/** 收起态展示条数（默认收起显示前 3 条） */
const COLLAPSED_COUNT = 3
/** 展开态上限（与数据层 MAX_ROWS 一致） */
const MAX_COUNT = 20

const expanded = ref(false)

/** 收起态：前 COLLAPSED_COUNT 条；展开态：上限 MAX_COUNT 条 */
const visibleRows = computed(() => (
  expanded.value ? props.rows.slice(0, MAX_COUNT) : props.rows.slice(0, COLLAPSED_COUNT)
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
  padding: 20rpx 22rpx;
  margin-bottom: 20rpx;
  border-radius: $r-lg;
  background: var(--ev-bg-card);
  border: 2rpx solid var(--ev-border);
}

/* ===== 标题行 ===== */
.frc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 12rpx;
  border-bottom: 2rpx solid var(--ev-border-light);
}

.frc-header:active {
  opacity: 0.7;
}

.frc-title {
  font-size: 26rpx;
  font-weight: 700;
  color: var(--ev-text-primary);
}

.frc-toggle {
  display: flex;
  align-items: center;
  gap: 4rpx;
}

.frc-toggle-text {
  font-size: 24rpx;
  color: var(--ev-text-secondary);
}

/* ===== 列表 ===== */
.frc-list {
  padding-top: 12rpx;
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

/* ===== 收起态底部「展开更多」提示 ===== */
.frc-more {
  padding: 12rpx 0 4rpx;
  text-align: center;
}

.frc-more-text {
  font-size: 22rpx;
  color: var(--ev-text-muted);
}
</style>
