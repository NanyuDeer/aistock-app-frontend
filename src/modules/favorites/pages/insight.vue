<template>
  <SubPageCard2 title="自选股洞察">
    <view class="page-insight">
    <!-- 加载状态 -->
    <view v-if="loading" class="loading-wrap">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 洞察列表：涨停雷达（insight）+ 价格异动（stocktrace）融合 -->
    <view v-else-if="insights.length" class="insight-list">
      <view
        v-for="item in insights"
        :key="item.event_id"
        class="card"
        @tap="goDetail(item.event_id, item.event_type)"
      >
        <view class="card-title">{{ item.stock_name }}（{{ item.symbol }}）</view>
        <view class="card-move">
          <!-- 涨停雷达：恒为涨停方向，红字标签 + 涨停幅度 10.00%；价格异动：按方向区分红/绿标签 + 实际百分比 -->
          <template v-if="item.event_type === 'limit_up_radar'">
            <text class="tag tag-up">涨停异动</text>
            <text class="up">10.00%</text>
          </template>
          <template v-else>
            <text :class="['tag', item.direction === 'up' ? 'tag-up' : 'tag-down']">{{ item.direction === 'up' ? '上涨异动' : '下跌异动' }}</text>
            <text v-if="item.change_pct !== undefined" :class="item.change_pct >= 0 ? 'up' : 'down'">
              {{ item.change_pct >= 0 ? '+' : '' }}{{ item.change_pct }}%
            </text>
          </template>
        </view>
        <view class="card-sub">
          <text class="meta-date">{{ item.dateText }}</text>
          <text class="tag" :class="{ 'tag--unconfirmed': item.statusText === '主因待验证' }">
            {{ item.statusText }}
          </text>
          <text v-if="item.confidenceText" class="conf">{{ item.confidenceText }}</text>
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
import { watchlistInsightApi, type WatchlistInsight } from '@/shared/api/modules/insight'
import { stockTraceApi, type StockTraceEvent } from '@/shared/api/modules/stockTrace'
import EmptyState from '@/shared/components/EmptyState.vue'
import SubPageCard2 from '@/shared/components/SubPageCard2.vue'
import { navigateToInsightDetail } from '@/shared/utils/insightNavigation'

/** 统一展示模型：涨停雷达（insight）+ 价格异动（stocktrace） */
interface InsightListItem {
  event_id: string
  event_type: 'limit_up_radar' | 'price'
  stock_name: string
  symbol: string
  direction: 'up' | 'down'
  /** 价格异动幅度（%），涨停雷达恒 10.00 由模板写死 */
  change_pct?: number
  /** MM-DD 日期 */
  dateText: string
  /** 归因描述：主因：xxx / 主因待验证 / 归因中 / 待归因 */
  statusText: string
  /** 置信度文案（仅涨停雷达有） */
  confidenceText?: string
  /** 事件时间戳（融合列表按此倒序排列） */
  sortTime: number
}

const insights = ref<InsightListItem[]>([])
const loading = ref(false)

function confidenceText(c: string): string {
  return { high: '高置信', medium: '中置信', low: '低置信' }[c as 'high' | 'medium' | 'low'] || c
}

function fmtDateMMDD(t?: string): string {
  if (!t) return '--'
  const date = new Date(t)
  if (Number.isNaN(date.getTime())) return '--'
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** 涨停雷达（insight 链路）→ 统一模型 */
function fromInsight(w: WatchlistInsight): InsightListItem {
  let statusText = '归因中'
  if (w.attribution_status === 'unconfirmed') statusText = '主因待验证'
  else if (w.attribution_status === 'confirmed' && w.primary_driver?.label) statusText = `主因：${w.primary_driver.label}`
  const date = w.trade_date || w.created_at
  return {
    event_id: w.event_id,
    event_type: 'limit_up_radar',
    stock_name: w.stock_name,
    symbol: w.symbol,
    direction: w.direction,
    dateText: fmtDateMMDD(date),
    statusText,
    confidenceText: w.confidence ? confidenceText(w.confidence) : undefined,
    sortTime: date ? new Date(date).getTime() : 0,
  }
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
  }
}

/** 按事件类型分流：涨停雷达 → insight-detail，价格异动 → insight-detail-move */
function goDetail(eventId: string, eventType?: string) {
  navigateToInsightDetail(eventId, eventType)
}

onShow(async () => {
  loading.value = true
  try {
    // 并行拉取涨停雷达（insights）与价格异动（movements），单个失败不影响另一个
    const [list, page] = await Promise.all([
      watchlistInsightApi.getInsights().catch(() => [] as WatchlistInsight[]),
      stockTraceApi.list(20).catch(() => ({ items: [] as StockTraceEvent[] })),
    ])
    // 融合后按事件时间倒序：最新异动（含今日价格异动）优先展示
    insights.value = [...list.map(fromInsight), ...page.items.map(fromMovement)]
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

.conf {
  font-size: $font-size-xs;
  color: $ink-soft;
}
</style>
