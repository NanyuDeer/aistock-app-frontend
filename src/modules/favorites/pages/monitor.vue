<template>
  <SubPageCard2 title="自选股异动" subtitle="AI 实时盯盘 · 盘中异动推送" @scrolltolower="loadMore">
    <view class="page-monitor">

    <!-- 订阅状态 -->
    <view class="subscribe-card">
      <view class="subscribe-info">
        <text class="subscribe-label">监控范围</text>
        <text class="subscribe-value">{{ subscribedSymbols.length }} 只自选股</text>
      </view>
      <Switch :model-value="alertEnabled" @change="onAlertToggle" />
    </view>

    <!-- 异动列表 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">异动提醒</text>
        <view class="section-header-right">
          <text class="section-tip">{{ getMarketStatus() }}</text>
          <Button type="primary" size="sm" @click="handleDetect">
            {{ detecting ? '检测中...' : '立即检测' }}
          </Button>
        </view>
      </view>

      <!-- 方向筛选：与自选股洞察页 / 个股情报页同一模板 -->
      <view class="filter-bar">
        <Segmented :items="dirTabs" v-model="activeDir" fullWidth />
      </view>

      <view v-if="loading" class="loading-wrap">
        <LoadingState />
      </view>

      <view v-else-if="filteredAlerts.length" class="alert-list">
        <Card
          v-for="alert in filteredAlerts"
          :key="alert.eventId"
          clickable
          @click="goTrace(alert.eventId, alert.eventType)"
        >
          <!-- 上行：股票名 + 代码 + 涨跌幅 | 方向标签 -->
          <view class="event-top">
            <view class="event-stock">
              <text class="stock-name">{{ alert.name || alert.symbol }}</text>
              <text class="stock-code">{{ alert.symbol }}</text>
              <text
                v-if="alert.changePct !== undefined"
                class="stock-move"
                :class="alert.changePct >= 0 ? 'up' : 'down'"
              >{{ alert.changePct >= 0 ? '+' : '' }}{{ alert.changePct }}%</text>
            </view>
            <Tag :type="alert.direction">{{ alert.direction === 'up' ? '上涨异动' : '下跌异动' }}</Tag>
          </view>

          <!-- 中行：主因正文 -->
          <text class="event-title">{{ alert.causeText }}</text>

          <!-- 下行：涨停标记 + 日期 | 报告入口 + 时间 -->
          <view class="event-bottom">
            <view class="meta-left">
              <Badge v-if="alert.isLimitUp" type="danger" size="sm">涨停</Badge>
              <text class="meta-text">{{ alert.dateText }}</text>
            </view>
            <view class="meta-right">
              <text
                v-if="alert.reportable"
                class="report-link"
                @tap.stop="onReport(alert.eventId)"
              >报告 ›</text>
              <text class="meta-time">{{ alert.timeText }}</text>
            </view>
          </view>
        </Card>
        <!-- 触底分页轻量文案（复用 design token） -->
        <view v-if="loadingMore || !hasMore" class="load-more-tip">
          <text>{{ loadingMore ? '加载中...' : '没有更多' }}</text>
        </view>
      </view>

      <EmptyState v-else :title="alertEnabled ? '暂无异动提醒' : '异动监控已关闭'" :description="alertEnabled ? '盘中如有异动将实时推送' : '点击上方开关开启监控'" />
    </view>

    <!-- WS 连接状态 -->
    <!-- #ifdef APP-PLUS -->
    <view class="ws-status">
      <view :class="['ws-dot', wsConnected ? 'online' : 'offline']" />
      <text class="ws-text">{{ wsConnected ? '实时连接中' : '未连接（仅 App 支持）' }}</text>
    </view>
    <!-- #endif -->
    </view>
  </SubPageCard2>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useFavoritesStore } from '@/shared/store/modules/favorites'
import { useAppStore } from '@/shared/store/modules/app'
import { getMarketStatus } from '@/shared/utils/tradingTime'
import { formatTime, shanghaiDateKeyDaysAgo } from '@/shared/utils/datetime'
import EmptyState from '@/shared/components/EmptyState.vue'
import LoadingState from '@/shared/components/LoadingState.vue'
import Badge from '@/shared/components/Badge.vue'
import Button from '@/shared/components/Button.vue'
import Card from '@/shared/components/Card.vue'
import Segmented from '@/shared/components/Segmented.vue'
import Switch from '@/shared/components/Switch.vue'
import Tag from '@/shared/components/Tag.vue'
// 逐文件引入（barrel `@/shared/components` 会连带编译 KLineChart.vue 的 renderjs 双 script，
// vitest 下编译失败；单文件引入是 AGENTS 4.8 的 ✅ 示例写法）
import SubPageCard2 from '@/shared/components/SubPageCard2.vue'
import { stockTraceApi, type StockTraceEvent } from '@/shared/api/modules/stockTrace'
import { WS_BASE_URL } from '@/shared/utils/constants'
import { navigateToInsightDetail } from '@/shared/utils/insightNavigation'
import { isUnattributableMovement, dedupeDailyMovements, upsertEventById } from '@/modules/favorites/components/insightCards'

/** 统一展示模型：与自选股洞察列表页（insight.vue）同款三段式卡片入参 */
interface AlertItem {
  eventId: string
  symbol: string
  name: string
  direction: 'up' | 'down'
  eventType?: string
  /** 价格异动幅度（%） */
  changePct?: number
  /** 涨停文章命中（强时效来源，下行展示「涨停」标记） */
  isLimitUp: boolean
  /** 主因正文：主因：xxx / 归因完成 / 归因中 / 待归因 */
  causeText: string
  /** MM-DD 日期 */
  dateText: string
  /** HH:mm（跨日含 MM-DD） */
  timeText: string
  /** 归因已完成 → 下行展示「报告 ›」下载入口 */
  reportable: boolean
  /** 事件时间戳（按此倒序排列） */
  sortTime: number
}

/** 方向筛选（与自选股洞察页一致，前端本地过滤，不新增接口） */
const dirTabs = [
  { label: '全部', value: 'all' },
  { label: '上涨', value: 'up' },
  { label: '下跌', value: 'down' },
]
const activeDir = ref('all')

const favoritesStore = useFavoritesStore()
const appStore = useAppStore()

const loading = ref(false)
// 分页累积的原始行（API 分页 + WS 事件），渲染前统一重派生（跨页同股同日去重依赖整体 rawItems）
const rawItems = ref<StockTraceEvent[]>([])
/** nextCursor（后端复合键，不透明字符串）；以它判定 hasMore，不得用 items.length 推断 */
const cursor = ref<string | null>(null)
const hasMore = ref(false)
/** 触底防重入 */
const loadingMore = ref(false)
const wsConnected = ref(false)
const detecting = ref(false)
let wsTask: UniApp.SocketTask | null = null

const subscribedSymbols = computed(() => favoritesStore.stocks.map(s => s.symbol))
const alertEnabled = computed(() => appStore.config.alertEnabled)

/** 统一重派生：rawItems → 过滤不可归因 → 同日同股去重 → map → 倒序（排序/去重规则保持现状） */
const alerts = computed<AlertItem[]>(() =>
  dedupeDailyMovements(rawItems.value.filter((m) => !isUnattributableMovement(m)))
    .map(movementToAlertItem)
    .sort((a, b) => b.sortTime - a.sortTime),
)

const filteredAlerts = computed(() =>
  activeDir.value === 'all'
    ? alerts.value
    : alerts.value.filter((alert) => alert.direction === activeDir.value),
)

/** 订阅开关（组件库 Switch 回传目标态，直接落库避免二次取反） */
function onAlertToggle(next: boolean) {
  appStore.update({ alertEnabled: next })
  if (next) {
    subscribeAlerts()
  } else {
    disconnectWs()
  }
}

function fmtDateMMDD(t?: string): string {
  if (!t) return '--'
  const date = new Date(t)
  if (Number.isNaN(date.getTime())) return '--'
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** 价格异动（stocktrace 链路）→ 三段式卡片模型 */
function movementToAlertItem(m: StockTraceEvent): AlertItem {
  let causeText = '待归因'
  if (m.primary_cause) causeText = `主因：${m.primary_cause}`
  else if (m.movement_view?.primaryCandidate?.verdict) causeText = `主因：${m.movement_view.primaryCandidate.verdict}`
  else if (m.analysis_status === 'completed') causeText = '归因完成'
  else if (m.analysis_status === 'processing') causeText = '归因中'
  else if (m.analysis_status === 'failed') causeText = '归因失败'
  // 最近触发时间优先（长窗口事件按 window_end_at 展示最新异动）
  const recent = m.window_end_at || m.triggered_at
  return {
    eventId: m.event_id,
    symbol: m.symbol,
    name: m.stock_name,
    direction: m.direction,
    eventType: 'price',
    changePct: m.change_pct,
    isLimitUp: m.is_limit_up === true,
    causeText,
    dateText: fmtDateMMDD(recent),
    timeText: formatTime(recent),
    reportable: m.analysis_status === 'completed',
    sortTime: recent ? new Date(recent).getTime() : 0,
  }
}

/**
 * 是否 stock-trace 价格异动报文。
 * WS 的 `alert` 外壳下还混着老涨停雷达洞察的 `insight.created`（形状为
 * `{ eventId, content, symbol }`，无 stock_name/direction/triggered_at）——不过滤会插入残缺卡片。
 */
function isPriceMovementPayload(data: unknown): data is StockTraceEvent {
  const payload = data as Record<string, unknown> | null
  return !!payload && typeof payload.event_id === 'string' && payload.event_type === 'price'
}

/**
 * 二次推送就地上报（`movement.updated`）改为「按 event_id 浅合并进 rawItems」——
 * upsert 后统一重派生，避免翻页重派生把 WS 推来的卡片冲掉；payload 部分字段浅合并不会清空既有 primary_cause/confidence_level。
 */

/** 首屏/重置加载：清空分页状态并拉第 1 页（onShow 每次整表重拉，必须一并重置 cursor/rawItems/hasMore） */
async function fetchAlerts() {
  loading.value = true
  // 请求前同步复位分页状态：若 loadMore 仍在飞行途中触达 onShow，旧 cursor/hasMore 会被同帧读到
  // 并发请求；在 await 之前复位可彻底关掉该竞态窗口（正常路径本就整表替换，无感知差异）。
  rawItems.value = []
  cursor.value = null
  hasMore.value = false
  loadingMore.value = false
  try {
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
    console.warn('[monitor] loadMore failed:', err)
  } finally {
    loadingMore.value = false
  }
}

/** 手动触发检测：洞察数据由后端 cron 周期采集，此处仅刷新列表 */
async function handleDetect() {
  if (detecting.value) return
  detecting.value = true
  try {
    fetchAlerts()
  } finally {
    detecting.value = false
  }
}

function subscribeAlerts() {
  // #ifdef APP-PLUS
  if (!subscribedSymbols.value.length) return
  try {
    const token = uni.getStorageSync('token')
    const wsBase = WS_BASE_URL
    wsTask = uni.connectSocket({
      url: `${wsBase}?token=${token}`,
      success: () => console.log('[Monitor WS] connecting...')
    })
    wsTask.onOpen(() => {
      wsConnected.value = true
      wsTask?.send({ data: JSON.stringify({ type: 'subscribe', symbols: subscribedSymbols.value }) })
    })
    wsTask.onMessage((res) => {
      try {
        const msg = JSON.parse(res.data as string) as { type?: string; data?: unknown }
        // ① 新建异动：外壳 type='alert'，内层 data.type='movement.created' → upsert 进 rawItems 统一重派生
        if (msg.type === 'alert') {
          if (!isPriceMovementPayload(msg.data)) return
          rawItems.value = upsertEventById(rawItems.value, [msg.data])
          return
        }
        // ② 二次推送（严重度升级 / 主因确认）：外壳 type='movement.updated'，部分字段 payload 浅合并进 rawItems
        if (msg.type === 'movement.updated') {
          const data = msg.data as StockTraceEvent | undefined
          const eventId = typeof data?.event_id === 'string' ? data.event_id : ''
          if (!data || !eventId) return
          const update: StockTraceEvent = { ...data }
          // 主因确认（a_grade_major_cause）意味着归因已完成 → 派生模型据此放行「报告 ›」入口
          if (data.movement_view?.status === 'confirmed') update.analysis_status = 'completed'
          rawItems.value = upsertEventById(rawItems.value, [update])
          return
        }
      } catch {}
    })
    wsTask.onClose(() => { wsConnected.value = false })
    wsTask.onError(() => { wsConnected.value = false })
  } catch (e) {
    console.warn('[Monitor WS] connect failed:', e)
  }
  // #endif
}

function disconnectWs() {
  wsTask?.close({})
  wsTask = null
  wsConnected.value = false
}

/** 洞察详情：按事件类型分流（涨停雷达 → insight-detail，价格异动 → insight-detail-move） */
function goTrace(eventId: string, eventType?: string) {
  navigateToInsightDetail(eventId, eventType)
}

/** 洞察报告：跳详情页并自动开始流式生成（列表页不展开长报告） */
function onReport(eventId: string): void {
  if (!eventId) return
  navigateToInsightDetail(eventId, 'price', { autostart: '1' })
}

onShow(() => {
  favoritesStore.fetchFavorites()
  fetchAlerts()
})

onMounted(() => {
  if (alertEnabled.value) subscribeAlerts()
})

onUnmounted(() => disconnectWs())
</script>

<style lang="scss" scoped>
.page-monitor {
  min-height: 100%;
  padding: $s-3;
  background: $bg-page;
}

.subscribe-card {
  display: flex; align-items: center; justify-content: space-between;
  padding: $s-3; background: $bg-card; border: 2rpx solid $line; border-radius: $r-md; margin-bottom: $s-3;
}
.subscribe-info { display: flex; flex-direction: column; gap: 4rpx; }
.subscribe-label { font-size: $font-size-xs; color: $ink-soft; }
.subscribe-value { font-size: $font-size-base; font-weight: 600; color: $ink; }

.section { margin-bottom: $s-3; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: $s-2; }
.section-header-right { display: flex; align-items: center; gap: $s-2; }
.section-title { font-size: $font-size-lg; font-weight: 600; color: $ink; }
.section-tip { font-size: $font-size-xs; color: $ink-soft; }

/* 顶部筛选栏（与 insight.vue / event-catcher.vue 一致） */
.filter-bar { margin-bottom: $s-3; }

.loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $s-10 0;
}

.alert-list { display: flex; flex-direction: column; gap: $s-2; }

/* 触底分页轻量文案（复用 design token，不新增样式体系） */
.load-more-tip {
  padding: $s-3 0;
  text-align: center;
  font-size: $font-size-xs;
  color: $ink-mute;
}

/* ===== 卡片行（三段式，与 insight.vue 完全同款） ===== */
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

.stock-move.up { color: $up; }
.stock-move.down { color: $down; }

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

.meta-right {
  display: flex;
  align-items: center;
  gap: $s-2;
}

.meta-text {
  font-size: $font-size-xs;
  color: $ink-soft;
}

.meta-time {
  font-size: $font-size-xs;
  color: $ink-soft;
}

/* 洞察报告入口（下行右侧小按钮，仅归因完成的行渲染） */
.report-link {
  font-size: $font-size-xs;
  font-weight: 600;
  color: $primary;
  /* #ifdef H5 */
  cursor: pointer;
  /* #endif */
}

.ws-status { display: flex; align-items: center; gap: 8rpx; padding: $s-2; justify-content: center; }
.ws-dot { width: 16rpx; height: 16rpx; border-radius: 50%; }
.ws-dot.online { background: $stock-down-color; }
.ws-dot.offline { background: $line; }
.ws-text { font-size: $font-size-xs; color: $ink-soft; }
</style>
