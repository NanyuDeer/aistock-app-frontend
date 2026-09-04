<template>
  <SubPageCard2 title="自选股洞察">
    <view class="page-insight">
    <!-- 加载状态 -->
    <view v-if="loading" class="loading-wrap">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 洞察列表：价格异动（stocktrace 链路） -->
    <view v-else-if="insights.length" class="insight-list">
      <view
        v-for="item in insights"
        :key="item.event_id"
        class="card"
        @tap="goDetail(item.event_id)"
      >
        <view class="card-title">{{ item.stock_name }}（{{ item.symbol }}）</view>
        <view class="card-move">
          <!-- 价格异动：按方向区分红/绿标签 + 实际百分比 -->
          <text :class="['tag', item.direction === 'up' ? 'tag-up' : 'tag-down']">{{ item.direction === 'up' ? '上涨异动' : '下跌异动' }}</text>
          <text v-if="item.change_pct !== undefined" :class="item.change_pct >= 0 ? 'up' : 'down'">
            {{ item.change_pct >= 0 ? '+' : '' }}{{ item.change_pct }}%
          </text>
        </view>
        <view class="card-sub">
          <text class="meta-date">{{ item.dateText }}</text>
          <text v-if="item.statusText" class="tag" :class="{ 'tag--unconfirmed': item.statusText === '主因待验证' }">
            {{ item.statusText }}
          </text>
        </view>
        <!-- 轻量预判摘要（有 forecast 且 summary 存在时展示） -->
        <view v-if="item.forecastSummary" class="card-forecast">
          <text class="forecast-label">预判</text>
          <text class="forecast-text">{{ item.forecastSummary }}</text>
        </view>
      </view>
    </view>

    <!-- 空态 -->
    <EmptyState v-else title="暂无自选股洞察" description="自选股出现异动时将在此生成洞察" />
    </view>
  </SubPageCard2>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { stockTraceApi, type StockTraceEvent } from '@/shared/api/modules/stockTrace'
import EmptyState from '@/shared/components/EmptyState.vue'
import SubPageCard2 from '@/shared/components/SubPageCard2.vue'
import { parseForecastSlot, isUnattributableMovement } from '@/modules/favorites/components/insightCards'

/** 统一展示模型：价格异动（stocktrace 链路） */
interface InsightListItem {
  event_id: string
  event_type: 'price'
  stock_name: string
  symbol: string
  direction: 'up' | 'down'
  /** 价格异动幅度（%） */
  change_pct?: number
  /** MM-DD 日期 */
  dateText: string
  /** 归因描述：主因：xxx / 主因待验证 / 归因中 / 待归因 */
  statusText: string
  /** 事件时间戳（按此倒序排列） */
  sortTime: number
  /** 轻量预判摘要（有 forecast 且 summary 存在时填充） */
  forecastSummary?: string
}

const insights = ref<InsightListItem[]>([])
const loading = ref(false)

function fmtDateMMDD(t?: string): string {
  if (!t) return '--'
  const date = new Date(t)
  if (Number.isNaN(date.getTime())) return '--'
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** 从 forecast JSONB 中提取轻量预判摘要：复用 parseForecastSlot 获取 close??midday 的 summary；截断至 50 字 */
function extractForecastSummary(forecast: Record<string, unknown> | null | undefined): string | undefined {
  const parsed = parseForecastSlot(forecast)
  if (!parsed?.summary) return undefined
  return parsed.summary.length > 50 ? parsed.summary.slice(0, 50) + '…' : parsed.summary
}

/** 价格异动（stocktrace 链路）→ 统一模型 */
function fromMovement(m: StockTraceEvent): InsightListItem {
  let statusText = '待归因'
  if (m.primary_cause) statusText = `主因：${m.primary_cause}`
  else if (m.movement_view?.primaryCandidate?.verdict) statusText = `主因：${m.movement_view.primaryCandidate.verdict}`
  else if (m.analysis_status === 'completed') statusText = '归因完成'
  else if (m.analysis_status === 'processing') statusText = '归因中'
  // 最近触发时间优先：长窗口事件（连续涨停合并）按 window_end_at 展示最新异动日期，
  // 避免始终停留在首次触发日期（如 8/10 锚定的近岸显示 08-10 而非 08-21）
  const recent = m.window_end_at || m.triggered_at
  return {
    event_id: m.event_id,
    event_type: 'price',
    stock_name: m.stock_name,
    symbol: m.symbol,
    direction: m.direction,
    change_pct: m.change_pct,
    dateText: fmtDateMMDD(recent),
    statusText,
    sortTime: recent ? new Date(recent).getTime() : 0,
    forecastSummary: extractForecastSummary(m.forecast),
  }
}

/** 所有异动均为 stocktrace 价格事件，跳转到 insight-detail-move */
function goDetail(eventId: string) {
  uni.navigateTo({ url: `/modules/favorites/pages/insight-detail-move?event_id=${encodeURIComponent(eventId)}` })
}

onShow(async () => {
  loading.value = true
  try {
    // 2026-09-02 链路合并：涨停雷达事件已并入 stock-trace（movements），列表只消费 movements
    const page = await stockTraceApi.list(20).catch(() => ({ items: [] as StockTraceEvent[] }))
    insights.value = page.items
      .filter((m) => !isUnattributableMovement(m))
      .map(fromMovement)
      .sort((a, b) => b.sortTime - a.sortTime)
  } catch {
    // API 失败时显示空状态
    insights.value = []
  } finally {
    loading.value = false
  }
})
</script>

<style lang="scss" scoped>
.page-insight {
  padding: $s-3;
  background: $bg-page;
}

.loading-wrap {
  padding: $s-10;
  text-align: center;
}
.loading-text {
  font-size: $font-size-sm;
  color: $ink-soft;
}

.insight-list {
  display: flex;
  flex-direction: column;
  gap: $s-2;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  padding: $s-3;
  background: $bg-card;
  border: 2rpx solid $line;
  border-radius: $r-md;
}

.card-title {
  font-size: $font-size-base;
  font-weight: 600;
  color: $ink;
}

.card-move {
  display: flex;
  align-items: center;
  gap: $s-2;
}

.tag.tag-up {
  color: $up;
  background: $up-bg;
}

.tag.tag-down {
  color: $down;
  background: $down-bg;
}

.up {
  font-size: $font-size-sm;
  font-weight: 600;
  color: $up;
}

.down {
  font-size: $font-size-sm;
  font-weight: 600;
  color: $down;
}

.card-sub {
  display: flex;
  align-items: center;
  gap: $s-2;
}

.meta-date {
  font-size: $font-size-xs;
  color: $ink-soft;
}

.tag {
  padding: 2rpx 12rpx;
  border-radius: $r-xs;
  font-size: $font-size-xs;
  color: $primary;
  background: $primary-50;
}
.tag--unconfirmed {
  color: $warning;
  background: $warning-bg;
}

/* 轻量预判摘要行 */
.card-forecast {
  display: flex;
  align-items: center;
  gap: $s-1;
  padding: 4rpx 0;
}
.forecast-label {
  font-size: $font-size-xs;
  color: $primary;
  background: $primary-50;
  padding: 0 8rpx;
  border-radius: $r-xs;
  flex-shrink: 0;
  line-height: 1.6;
}
.forecast-text {
  font-size: $font-size-xs;
  color: $ink-soft;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.6;
}
</style>