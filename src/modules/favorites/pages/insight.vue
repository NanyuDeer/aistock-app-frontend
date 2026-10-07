<template>
  <SubPageCard2 title="自选股洞察" @scrolltolower="loadMore">
    <view class="page-insight">
      <!-- 方向筛选：对齐个股情报页（event-catcher）的顶部筛选栏 -->
      <view class="filter-bar">
        <Segmented :items="dirTabs" v-model="activeDir" fullWidth />
      </view>

      <!-- 加载中 -->
      <view v-if="loading" class="loading-wrap">
        <LoadingState />
      </view>

      <!-- 洞察列表：价格异动（stocktrace 链路） -->
      <view v-else-if="filteredInsights.length" class="insight-list">
        <Card
          v-for="item in filteredInsights"
          :key="item.event_id"
          clickable
          @click="goDetail(item.event_id)"
        >
          <!-- 上行：股票名 + 代码 + 涨跌幅 | 方向标签 -->
          <view class="event-top">
            <view class="event-stock">
              <text class="stock-name">{{ item.stock_name }}</text>
              <text class="stock-code">{{ item.symbol }}</text>
              <text
                v-if="item.change_pct !== undefined"
                class="stock-move"
                :class="item.change_pct >= 0 ? 'up' : 'down'"
              >{{ item.change_pct >= 0 ? '+' : '' }}{{ item.change_pct }}%</text>
            </view>
            <Tag :type="item.direction">{{ item.direction === 'up' ? '上涨异动' : '下跌异动' }}</Tag>
          </view>

          <!-- 中行：主因正文 -->
          <text class="event-title">{{ item.causeText }}</text>

          <!-- 下行：涨停标记 + 日期 | 时间 -->
          <view class="event-bottom">
            <view class="meta-left">
              <Badge v-if="item.is_limit_up" type="danger" size="sm">涨停</Badge>
              <text class="meta-text">{{ item.dateText }}</text>
            </view>
            <text class="meta-time">{{ item.timeText }}</text>
          </view>
        </Card>
        <!-- 触底分页轻量文案（复用 design token） -->
        <view v-if="loadingMore || !hasMore" class="load-more-tip">
          <text>{{ loadingMore ? '加载中...' : '没有更多' }}</text>
        </view>
      </view>

      <!-- 空态 -->
      <EmptyState v-else title="暂无自选股洞察" description="自选股出现异动时将在此生成洞察" />
    </view>
  </SubPageCard2>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { stockTraceApi, type StockTraceEvent } from '@/shared/api/modules/stockTrace'
// 逐文件引入（barrel `@/shared/components` 会连带编译 KLineChart.vue 的 renderjs 双 script，
// vitest 下编译失败；单文件引入是 AGENTS 4.8 的 ✅ 示例写法）
import Badge from '@/shared/components/Badge.vue'
import Card from '@/shared/components/Card.vue'
import EmptyState from '@/shared/components/EmptyState.vue'
import LoadingState from '@/shared/components/LoadingState.vue'
import Segmented from '@/shared/components/Segmented.vue'
import Tag from '@/shared/components/Tag.vue'
import SubPageCard2 from '@/shared/components/SubPageCard2.vue'
import { formatTime, shanghaiDateKeyDaysAgo } from '@/shared/utils/datetime'
import { isUnattributableMovement, dedupeDailyMovements, upsertEventById } from '@/modules/favorites/components/insightCards'

/** 统一展示模型：价格异动（stocktrace 链路） */
interface InsightListItem {
  event_id: string
  stock_name: string
  symbol: string
  direction: 'up' | 'down'
  /** 价格异动幅度（%） */
  change_pct?: number
  /** 涨停文章命中（强时效来源，下行展示「涨停」标记） */
  is_limit_up: boolean
  /** 主因正文：主因：xxx / 归因完成 / 归因中 / 待归因 */
  causeText: string
  /** MM-DD 日期 */
  dateText: string
  /** HH:mm（跨日含 MM-DD） */
  timeText: string
  /** 事件时间戳（按此倒序排列） */
  sortTime: number
}

/** 方向筛选（对齐 event-catcher 的周期筛选栏，前端本地过滤，不新增接口） */
const dirTabs = [
  { label: '全部', value: 'all' },
  { label: '上涨', value: 'up' },
  { label: '下跌', value: 'down' },
]
const activeDir = ref('all')

// 分页累积的原始行，渲染前统一重派生（跨页同股同日去重依赖整体 rawItems）
const rawItems = ref<StockTraceEvent[]>([])
/** nextCursor（后端复合键，不透明字符串）；以它判定 hasMore，不得用 items.length 推断 */
const cursor = ref<string | null>(null)
const hasMore = ref(false)
/** 触底防重入 */
const loadingMore = ref(false)
const loading = ref(false)

/** 统一重派生：rawItems → 过滤不可归因 → 同日同股去重 → map → 倒序（排序/去重规则保持现状） */
const insights = computed<InsightListItem[]>(() =>
  dedupeDailyMovements(rawItems.value.filter((m) => !isUnattributableMovement(m)))
    .map(fromMovement)
    .sort((a, b) => b.sortTime - a.sortTime),
)

const filteredInsights = computed(() =>
  activeDir.value === 'all'
    ? insights.value
    : insights.value.filter((item) => item.direction === activeDir.value),
)

function fmtDateMMDD(t?: string): string {
  if (!t) return '--'
  const date = new Date(t)
  if (Number.isNaN(date.getTime())) return '--'
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** 价格异动（stocktrace 链路）→ 统一模型 */
function fromMovement(m: StockTraceEvent): InsightListItem {
  let causeText = '待归因'
  if (m.primary_cause) causeText = `主因：${m.primary_cause}`
  else if (m.movement_view?.primaryCandidate?.verdict) causeText = `主因：${m.movement_view.primaryCandidate.verdict}`
  else if (m.analysis_status === 'completed') causeText = '归因完成'
  else if (m.analysis_status === 'processing') causeText = '归因中'
  else if (m.analysis_status === 'failed') causeText = '归因失败'
  // 最近触发时间优先：长窗口事件（连续涨停合并）按 window_end_at 展示最新异动日期，
  // 避免始终停留在首次触发日期（如 8/10 锚定的近岸显示 08-10 而非 08-21）
  const recent = m.window_end_at || m.triggered_at
  return {
    event_id: m.event_id,
    stock_name: m.stock_name,
    symbol: m.symbol,
    direction: m.direction,
    change_pct: m.change_pct,
    is_limit_up: m.is_limit_up === true,
    causeText,
    dateText: fmtDateMMDD(recent),
    timeText: formatTime(recent),
    sortTime: recent ? new Date(recent).getTime() : 0,
  }
}

/** 所有异动均为 stocktrace 价格事件，跳转到 insight-detail-move */
function goDetail(eventId: string) {
  uni.navigateTo({ url: `/modules/favorites/pages/insight-detail-move?event_id=${encodeURIComponent(eventId)}` })
}

/** 首屏/重置加载：清空分页状态并拉第 1 页（onShow 每次整表重拉，必须一并重置 cursor/rawItems/hasMore） */
async function fetchInsights() {
  loading.value = true
  // 请求前同步复位分页状态：若 loadMore 仍在飞行途中触达 onShow，旧 cursor/hasMore 会被同帧读到
  // 并发请求；在 await 之前复位可彻底关掉该竞态窗口（正常路径本就整表替换，无感知差异）。
  rawItems.value = []
  cursor.value = null
  hasMore.value = false
  loadingMore.value = false
  try {
    // 2026-09-02 链路合并：涨停雷达事件已并入 stock-trace（movements），列表只消费 movements
    const page = await stockTraceApi.list(20, undefined, { visibleOnly: true, since: shanghaiDateKeyDaysAgo(13) }).catch(() => ({ items: [] as StockTraceEvent[], nextCursor: null as string | null }))
    rawItems.value = page.items
    cursor.value = page.nextCursor
    hasMore.value = !!page.nextCursor
  } catch {
    // list 已在链上 .catch 兜底为空页，正常不会走到这里；状态已在请求前复位，无需重复置空
  } finally {
    loading.value = false
  }
}

/** 触底加载：失败不推进 cursor、不置 hasMore=false，下次触底用旧 cursor 重试；loadingMore 防重入 */
async function loadMore() {
  if (!hasMore.value || loadingMore.value) return
  loadingMore.value = true
  try {
    const page = await stockTraceApi.list(20, cursor.value ?? undefined, { visibleOnly: true, since: shanghaiDateKeyDaysAgo(13) })
    rawItems.value = upsertEventById(rawItems.value, page.items)
    cursor.value = page.nextCursor
    hasMore.value = !!page.nextCursor
  } catch (err) {
    // 请求失败：保持 cursor/hasMore 现状，等待下次触底重试；记录以便线上分页失败可观测
    console.warn('[insight] loadMore failed:', err)
  } finally {
    loadingMore.value = false
  }
}

onShow(() => {
  void fetchInsights()
})
</script>

<style lang="scss" scoped>
.page-insight {
  padding: $s-3;
  background: $bg-page;
}

/* 顶部筛选栏（对齐 event-catcher） */
.filter-bar {
  margin-bottom: $s-3;
}

.loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $s-10 0;
}

.insight-list {
  display: flex;
  flex-direction: column;
  gap: $s-2;
}

/* 触底分页轻量文案（复用 design token，不新增样式体系） */
.load-more-tip {
  padding: $s-3 0;
  text-align: center;
  font-size: $font-size-xs;
  color: $ink-mute;
}

/* ===== 卡片行（对齐 event-catcher 的三段式） ===== */
.event-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $s-2;
}

.event-stock {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex: 1;
  overflow: hidden;
}

.stock-name {
  font-size: $font-size-lg;
  font-weight: 600;
  color: $ink;
}

.stock-code {
  font-size: $font-size-xs;
  color: $ink-soft;
  padding: 2rpx 12rpx;
  background: $bg-soft;
  border-radius: $r-xs;
}

.stock-move {
  font-size: $font-size-sm;
  font-weight: 600;
}

.stock-move.up {
  color: $up;
}

.stock-move.down {
  color: $down;
}

.event-title {
  font-size: $font-size-md;
  font-weight: 500;
  color: $ink;
  line-height: 1.5;
  display: block;
  margin-bottom: $s-2;
}

.event-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: $s-2;
  border-top: 2rpx solid $line-soft;
}

.meta-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.meta-text {
  font-size: $font-size-xs;
  color: $ink-soft;
}

.meta-time {
  font-size: $font-size-xs;
  color: $ink-soft;
}
</style>
