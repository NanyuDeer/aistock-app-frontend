<template>
  <SubPageCard2 title="异动监控" subtitle="AI 实时盯盘 · 自选股异动推送">
    <view class="page-monitor">

    <!-- 订阅状态 -->
    <view class="subscribe-card">
      <view class="subscribe-info">
        <text class="subscribe-label">监控范围</text>
        <text class="subscribe-value">{{ subscribedSymbols.length }} 只自选股</text>
      </view>
      <view
        :class="['subscribe-switch', alertEnabled ? 'on' : 'off']"
        @tap="toggleAlert"
      >
        <text class="switch-text">{{ alertEnabled ? '已开启' : '已关闭' }}</text>
      </view>
    </view>

    <!-- 异动列表 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">异动提醒</text>
        <view class="section-header-right">
          <text class="section-tip">{{ getMarketStatus() }}</text>
          <view
            class="detect-btn"
            :class="{ 'detecting': detecting }"
            @tap="handleDetect"
          >
            <text class="detect-text">{{ detecting ? '检测中...' : '立即检测' }}</text>
          </view>
        </view>
      </view>

      <view v-if="loading" class="loading-wrap">
        <text class="loading-text">加载中...</text>
      </view>

      <view v-else-if="alerts.length" class="alert-list">
        <Card
          v-for="alert in alerts"
          :key="alert.eventId"
          class="alert-item-card"
          clickable
          @click="goTrace(alert.eventId, alert.eventType)"
        >
          <view class="alert-card-header">
            <view class="alert-stock">
              <text class="alert-name">{{ alert.name || alert.symbol }}</text>
              <text class="stock-code">{{ alert.symbol }}</text>
            </view>
            <Tag :type="alert.direction === 'up' ? 'up' : 'down'">{{ alertBadgeLabel(alert.direction) }}</Tag>
          </view>
          <text class="alert-desc">{{ alert.message }}</text>
          <view class="alert-meta">
            <view class="meta-left">
              <text class="meta-type">{{ alert.type }}</text>
              <Tag v-if="alert.confidence" size="sm" type="neutral">{{ confidenceLabel(alert.confidence) }}</Tag>
            </view>
            <text class="meta-time">{{ formatTime(String(alert.time)) }}</text>
          </view>
        </Card>
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
import { formatTime } from '@/shared/utils/datetime'
import Card from '@/shared/components/Card.vue'
import Tag from '@/shared/components/Tag.vue'
import EmptyState from '@/shared/components/EmptyState.vue'
import { watchlistInsightApi, type WatchlistInsight } from '@/shared/api/modules/insight'
import SubPageCard2 from '@/shared/components/SubPageCard2.vue'
import { navigateToInsightDetail } from '@/shared/utils/insightNavigation'

interface AlertItem {
  eventId: string
  symbol: string
  name?: string
  direction: 'up' | 'down'
  type: string
  eventType?: string
  message: string
  time: string | number
  confidence?: 'high' | 'medium' | 'low' | 'unconfirmed'
}

const favoritesStore = useFavoritesStore()
const appStore = useAppStore()

const loading = ref(false)
const alerts = ref<AlertItem[]>([])
const wsConnected = ref(false)
const detecting = ref(false)
let wsTask: UniApp.SocketTask | null = null

const subscribedSymbols = computed(() => favoritesStore.stocks.map(s => s.symbol))
const alertEnabled = computed(() => appStore.config.alertEnabled)

function toggleAlert() {
  appStore.update({ alertEnabled: !alertEnabled.value })
  if (alertEnabled.value) {
    subscribeAlerts()
  } else {
    disconnectWs()
  }
}

function alertBadgeLabel(direction: 'up' | 'down'): string {
  return direction === 'up' ? '涨' : '跌'
}

function confidenceLabel(confidence: AlertItem['confidence']): string {
  switch (confidence) {
    case 'high': return '高置信'
    case 'medium': return '中置信'
    case 'low': return '低置信'
    case 'unconfirmed': return '待验证'
    default: return '归因中'
  }
}

/** 归因结果文案：已确认展示主因 label；unconfirmed 展示待验证；其余为归因中 */
function attributionMessage(e: WatchlistInsight): string {
  if (e.attribution_status === 'unconfirmed') return '主因待验证'
  if (e.attribution_status === 'confirmed' && e.primary_driver?.label) return `主因：${e.primary_driver.label}`
  return '归因中'
}

async function fetchAlerts() {
  loading.value = true
  try {
    // 自选股洞察数据源：展示自选股涨停雷达事件的 LLM/规则归因结果
    const data = await watchlistInsightApi.getInsights()
    alerts.value = data.map((e) => ({
      eventId: e.event_id,
      symbol: e.symbol,
      name: e.stock_name,
      direction: e.direction || 'up',
      type: e.event_type === 'limit_up_radar' ? '涨停雷达' : '异动',
      eventType: e.event_type,
      message: attributionMessage(e),
      time: String(e.trade_date || e.created_at || ''),
      confidence: e.confidence,
    }))
  } catch {
    // API 失败时显示空状态，不再使用 mock 数据兜底
    alerts.value = []
  } finally {
    loading.value = false
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
    const wsBase = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:3000/ws'
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
        const msg = JSON.parse(res.data as string)
        if (msg.type === 'alert') {
          alerts.value.unshift(msg.data)
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

.subscribe-switch { padding: 12rpx 24rpx; border-radius: 20rpx; }
.subscribe-switch.on { background: $primary; }
.subscribe-switch.off { background: $line; }
.switch-text { font-size: $font-size-xs; color: #ffffff; }
.subscribe-switch.off .switch-text { color: $ink-soft; }

.section { margin-bottom: $s-3; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: $s-2; }
.section-header-right { display: flex; align-items: center; gap: $s-2; }
.section-title { font-size: $font-size-lg; font-weight: 600; color: $ink; }
.section-tip { font-size: $font-size-xs; color: $ink-soft; }

.detect-btn {
  padding: 6rpx 20rpx;
  border-radius: 24rpx;
  background: $primary;
  /* #ifdef H5 */
  cursor: pointer;
  /* #endif */
}
.detect-btn.detecting { background: $line; }
.detect-text { font-size: $font-size-xs; color: #ffffff; }
.detect-btn.detecting .detect-text { color: $ink-soft; }

.loading-wrap { padding: $s-4; text-align: center; }
.loading-text { font-size: $font-size-sm; color: $ink-soft; }

.alert-list { display: flex; flex-direction: column; gap: $s-2; }
.alert-item-card { display: flex; flex-direction: column; gap: 8rpx; }
.alert-card-header { display: flex; align-items: center; justify-content: space-between; }
.alert-stock { display: flex; align-items: baseline; gap: $s-2; }
.alert-name { font-size: $font-size-base; font-weight: 600; color: $ink; }
.stock-code { font-size: $font-size-xs; color: $ink-soft; }
.alert-desc { font-size: $font-size-sm; color: $ink-soft; line-height: 1.4; }
.alert-meta { display: flex; justify-content: space-between; align-items: center; }
.meta-left { display: flex; align-items: center; gap: $s-2; }
.meta-type { font-size: $font-size-xs; color: $ink-soft; }
.meta-time { font-size: $font-size-xs; color: $ink-soft; }

.ws-status { display: flex; align-items: center; gap: 8rpx; padding: $s-2; justify-content: center; }
.ws-dot { width: 16rpx; height: 16rpx; border-radius: 50%; }
.ws-dot.online { background: $stock-down-color; }
.ws-dot.offline { background: $line; }
.ws-text { font-size: $font-size-xs; color: $ink-soft; }
</style>
