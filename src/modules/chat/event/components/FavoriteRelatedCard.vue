<template>
  <Card class="fav-related-card" flat>
    <!-- 标题行始终渲染（含无相关事件时）；不做折叠，事件区固定展示 3 条、其余向下滚动 -->
    <view class="frc-header" :class="{ 'frc-header--bordered': rows.length > 0 }">
      <view class="frc-head-main">
        <view class="frc-accent-bar" />
        <text class="frc-title">自选股相关重大事件</text>
        <text v-if="rows.length > 0" class="frc-count">{{ rows.length }} 条相关</text>
      </view>
      <text v-if="rows.length > VISIBLE_COUNT" class="frc-scroll-hint">向下滚动</text>
    </view>

    <!-- 滚动区：高度按前 3 条实测行高确定（见 measureListHeight），不足 3 条时不限高 -->
    <scroll-view
      v-if="rows.length > 0"
      class="frc-list"
      scroll-y
      :show-scrollbar="true"
      :style="listStyle"
    >
      <view class="frc-list-inner">
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
    </scroll-view>

    <!-- 无相关事件（未登录 / 无自选股 / 无匹配）：只保留标题行 + 空提示 -->
    <view v-else class="frc-empty">暂未匹配到与自选股相关的事件</view>
  </Card>
</template>

<script setup lang="ts">
/**
 * FavoriteRelatedCard - 自选股相关事件卡片
 *
 * 事件传导列表页「重大事件」卡片下方的小卡片：筛出与用户自选股相关的事件，标注被影响的自选股。
 * 不做折叠：事件区固定展示前 3 条，超出部分在卡片内向下滚动。
 * 标题行始终渲染；无相关事件（未登录 / 无自选股 / 无匹配）时显示空提示。
 */
import { computed, getCurrentInstance, nextTick, onMounted, ref, watch } from 'vue'
import type { RelatedEventRow } from '../favoriteRelated'
import { formatDateTime } from '@/shared/utils/datetime'
import Card from '@/shared/components/Card.vue'

interface Props {
  rows: RelatedEventRow[]
}

const props = defineProps<Props>()

/** 可视条数：超出后向下滚动 */
const VISIBLE_COUNT = 3

/** 渲染上限（与数据层 MAX_ROWS 一致） */
const MAX_COUNT = 20

/** 展示全部（上限 MAX_COUNT），滚动与否由容器高度决定 */
const visibleRows = computed(() => props.rows.slice(0, MAX_COUNT))

/**
 * 滚动区高度（px）。0 = 不限高：不足 4 条或测量失败时自然撑开。
 * 行高随该事件匹配到的自选股数量变化，无法写死固定值，只能渲染后实测。
 */
const listHeight = ref(0)

const listStyle = computed(() => (
  listHeight.value > 0 ? { height: `${listHeight.value}px` } : {}
))

const instance = getCurrentInstance()

/**
 * 量取「前 3 条」的实际渲染高度作为滚动区高度。
 * 以第 3 条底部 − 滚动区顶部为准（含顶部内边距与行间距），保证正好露出 3 条。
 */
function measureListHeight() {
  if (props.rows.length <= VISIBLE_COUNT || typeof uni === 'undefined') {
    listHeight.value = 0
    return
  }
  try {
    const query = uni.createSelectorQuery()
    if (instance?.proxy) query.in(instance.proxy)
    query.select('.frc-list').boundingClientRect()
    query.selectAll('.frc-row').boundingClientRect()
    query.exec((res: unknown) => {
      const list = Array.isArray(res) ? res : []
      const box = list[0] as { top?: number } | null
      const rows = (Array.isArray(list[1]) ? list[1] : []) as Array<{ bottom?: number }>
      const third = rows[VISIBLE_COUNT - 1]
      if (!box || typeof box.top !== 'number' || !third || typeof third.bottom !== 'number') {
        listHeight.value = 0
        return
      }
      listHeight.value = Math.max(0, Math.round(third.bottom - box.top))
    })
  } catch {
    // 测量失败退化为自然高度：此时列表全量展开，仅少了内部滚动
    listHeight.value = 0
  }
}

onMounted(() => {
  void nextTick(measureListHeight)
})

watch(() => props.rows, () => {
  void nextTick(measureListHeight)
})

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

.frc-header--bordered {
  border-bottom: 2rpx solid var(--ev-border-light);
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

.frc-scroll-hint {
  flex-shrink: 0;
  font-size: 22rpx;
  color: var(--ev-text-muted);
}

/* ===== 列表 ===== */
/* 高度由 measureListHeight 实测写入（仅 >3 条时）；≤3 条自然撑开 */
.frc-list {
  box-sizing: border-box;
  -webkit-overflow-scrolling: touch;
}

.frc-list-inner {
  padding: 16rpx 22rpx 22rpx;
}

.frc-empty {
  padding: 8rpx 22rpx 16rpx;
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
