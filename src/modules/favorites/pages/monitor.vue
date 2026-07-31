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
        <text class="section-tip">{{ getMarketStatus() }}</text>
      </view>

      <view v-if="loading" class="loading-wrap">
        <text class="loading-text">加载中...</text>
      </view>

      <view v-else-if="alerts.length" class="alert-list">
        <view v-for="alert in alerts" :key="alert.eventId" class="alert-item" @tap="goTrace(alert.eventId)">
          <view class="alert-left">
            <SvgIcon :name="alertIcon(alert.type).name" :color="alertIcon(alert.type).color" size="24rpx" />
            <view class="alert-info">
              <text class="alert-name">{{ alert.name || alert.symbol }}</text>
              <text class="alert-desc">{{ alert.message }}</text>
              <text class="alert-time">{{ formatTime(String(alert.time)) }}</text>
            </view>
          </view>
          <text class="alert-arrow">›</text>
        </view>
      </view>

      <view v-else class="empty-wrap">
        <SvgIcon name="bell-line" size="80rpx" color="#d1d5db" />
        <text class="empty-text">暂无异动提醒</text>
        <text class="empty-desc">{{ alertEnabled ? '盘中如有异动将实时推送' : '已关闭异动监控' }}</text>
      </view>
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
import SvgIcon from '@/shared/components/SvgIcon.vue'
import { stockTraceApi } from '@/shared/api/modules/stockTrace'
import SubPageCard2 from '@/shared/components/SubPageCard2.vue'

interface AlertItem {
  eventId: string
  symbol: string
  name?: string
  type: string
  message: string
  time: string | number
}

/** 仅开发预览：接口暂无数据时保留完整的异动卡片视觉。 */
const MONITOR_MOCK_ALERTS: AlertItem[] = [
  { eventId: 'mock-monitor-001', symbol: '300204', name: '舒泰神', type: '大涨', message: '价格异动 +9.84%，封板资金持续流入', time: '2026-07-31T10:15:00+08:00' },
  { eventId: 'mock-monitor-002', symbol: '300760', name: '迈瑞医疗', type: '大跌', message: '价格异动 -4.21%，短线成交量放大', time: '2026-07-31T13:45:00+08:00' },
  { eventId: 'mock-monitor-003', symbol: '600276', name: '恒瑞医药', type: '放量', message: '成交额较昨日同期放大 2.6 倍', time: '2026-07-31T13:58:00+08:00' },
]

const favoritesStore = useFavoritesStore()
const appStore = useAppStore()

const loading = ref(false)
const alerts = ref<AlertItem[]>([])
const wsConnected = ref(false)
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

function alertIcon(type: string): { name: string; color: string } {
  if (type.includes('涨停') || type.includes('大涨')) return { name: 'checkbox-blank-circle-fill', color: '#f43f5e' }
  if (type.includes('跌停') || type.includes('大跌')) return { name: 'checkbox-blank-circle-fill', color: '#22c55e' }
  if (type.includes('放量')) return { name: 'arrow-up-line', color: '#f43f5e' }
  if (type.includes('缩量')) return { name: 'arrow-down-line', color: '#22c55e' }
  if (type.includes('资金')) return { name: 'money-cny-circle-line', color: '#f59f0b' }
  return { name: 'flashlight-line', color: '#f59f0b' }
}

async function fetchAlerts() {
  loading.value = true
  try {
    const data = await stockTraceApi.list(50)
    alerts.value = data.items.map((event) => ({
      eventId: event.event_id,
      symbol: event.symbol,
      name: event.stock_name,
      type: event.direction === 'up' ? '大涨' : '大跌',
      message: `价格异动 ${event.change_pct >= 0 ? '+' : ''}${event.change_pct.toFixed(2)}%，阈值 ${event.threshold_pct.toFixed(0)}%`,
      time: event.triggered_at,
    }))
    if (import.meta.env.DEV && !alerts.value.length) {
      alerts.value = MONITOR_MOCK_ALERTS
    }
  } catch {
    alerts.value = import.meta.env.DEV ? MONITOR_MOCK_ALERTS : []
  } finally {
    loading.value = false
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

function goTrace(eventId: string) {
  uni.navigateTo({ url: `/modules/favorites/pages/stock-trace?event_id=${encodeURIComponent(eventId)}` })
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
  padding: 24rpx; background: #ffffff; border-radius: 12rpx; margin-bottom: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}
.subscribe-info { display: flex; flex-direction: column; gap: 4rpx; }
.subscribe-label { font-size: 24rpx; color: $ink-soft; }
.subscribe-value { font-size: 28rpx; font-weight: 600; color: $ink; }

.subscribe-switch { padding: 12rpx 24rpx; border-radius: 20rpx; }
.subscribe-switch.on { background: $primary; }
.subscribe-switch.off { background: $line; }
.switch-text { font-size: 24rpx; color: #ffffff; }
.subscribe-switch.off .switch-text { color: $ink-soft; }

.section { margin-bottom: 24rpx; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.section-title { font-size: 30rpx; font-weight: 600; color: $ink; }
.section-tip { font-size: 22rpx; color: $ink-soft; }

.loading-wrap { padding: 40rpx; text-align: center; }
.loading-text { font-size: 26rpx; color: #9ca3af; }

.alert-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 24rpx; background: #ffffff; border-radius: 12rpx; margin-bottom: 12rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}
.alert-left { display: flex; gap: 16rpx; align-items: flex-start; flex: 1; }
.alert-icon { font-size: 36rpx; }
.alert-info { display: flex; flex-direction: column; gap: 4rpx; flex: 1; }
.alert-name { font-size: 28rpx; font-weight: 600; color: $ink; }
.alert-desc { font-size: 24rpx; color: $ink-soft; line-height: 1.4; }
.alert-time { font-size: 20rpx; color: #9ca3af; }
.alert-arrow { font-size: 32rpx; color: #d1d5db; }

.empty-wrap { padding: 80rpx 40rpx; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12rpx; }
.empty-icon { font-size: 80rpx; }
.empty-text { font-size: 28rpx; color: $ink-soft; }
.empty-desc { font-size: 22rpx; color: #9ca3af; }

.ws-status { display: flex; align-items: center; gap: 8rpx; padding: 16rpx; justify-content: center; }
.ws-dot { width: 16rpx; height: 16rpx; border-radius: 50%; }
.ws-dot.online { background: #22c55e; }
.ws-dot.offline { background: #d1d5db; }
.ws-text { font-size: 22rpx; color: #9ca3af; }
</style>
