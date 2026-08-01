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

      <!-- 幅度分级筛选（借鉴 alert-catcher） -->
      <view class="filter-bar">
        <Segmented :items="amplitudeTabs" v-model="activeAmplitude" fullWidth />
      </view>

      <view v-if="loading" class="loading-wrap">
        <text class="loading-text">加载中...</text>
      </view>

      <view v-else-if="filteredAlerts.length" class="alert-list">
        <Card
          v-for="alert in filteredAlerts"
          :key="alert.eventId"
          class="alert-item-card"
          clickable
          @click="goTrace(alert.eventId)"
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
            <text class="meta-type">{{ alert.type }}</text>
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
import Segmented from '@/shared/components/Segmented.vue'
import EmptyState from '@/shared/components/EmptyState.vue'
import { stockTraceApi } from '@/shared/api/modules/stockTrace'
import SubPageCard2 from '@/shared/components/SubPageCard2.vue'

interface AlertItem {
  eventId: string
  symbol: string
  name?: string
  direction: 'up' | 'down'
  type: string
  message: string
  time: string | number
}

const favoritesStore = useFavoritesStore()
const appStore = useAppStore()

const loading = ref(false)
const alerts = ref<AlertItem[]>([])
const wsConnected = ref(false)
const detecting = ref(false)
let wsTask: UniApp.SocketTask | null = null

/** 幅度分级筛选（借鉴 alert-catcher） */
const amplitudeTabs = [
  { label: '全部', value: 'all' as const },
  { label: '大涨', value: 'up' as const },
  { label: '大跌', value: 'down' as const },
]
const activeAmplitude = ref<'all' | 'up' | 'down'>('all')
const filteredAlerts = computed(() => {
  if (activeAmplitude.value === 'all') return alerts.value
  return alerts.value.filter(a => a.direction === activeAmplitude.value)
})

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

async function fetchAlerts() {
  loading.value = true
  try {
    const data = await stockTraceApi.list(50)
    alerts.value = data.items.map((event) => ({
      eventId: event.event_id,
      symbol: event.symbol,
      name: event.stock_name,
      direction: event.direction,
      type: event.direction === 'up' ? '大涨' : '大跌',
      message: `价格异动 ${event.change_pct >= 0 ? '+' : ''}${event.change_pct.toFixed(2)}%，阈值 ${event.threshold_pct.toFixed(0)}%`,
      time: event.triggered_at,
    }))
  } catch {
    // API 失败时显示空状态，不再使用 mock 数据兜底
    alerts.value = []
  } finally {
    loading.value = false
  }
}

/** 手动触发异动检测（绕过交易时段限制），检测完刷新列表 */
async function handleDetect() {
  if (detecting.value) return
  detecting.value = true
  try {
    await stockTraceApi.detect()
    // 检测完成，延迟 1 秒刷新列表（等待事件写入 DB）
    setTimeout(() => {
      fetchAlerts()
      detecting.value = false
    }, 1000)
  } catch {
    detecting.value = false
    uni.showToast({ title: '检测失败，请稍后重试', icon: 'none' })
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

.filter-bar { margin-bottom: $s-2; }

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
.meta-type { font-size: $font-size-xs; color: $ink-soft; }
.meta-time { font-size: $font-size-xs; color: $ink-soft; }

.ws-status { display: flex; align-items: center; gap: 8rpx; padding: $s-2; justify-content: center; }
.ws-dot { width: 16rpx; height: 16rpx; border-radius: 50%; }
.ws-dot.online { background: $stock-down-color; }
.ws-dot.offline { background: $line; }
.ws-text { font-size: $font-size-xs; color: $ink-soft; }
</style>
