<template>
  <SubPageCard title="机构调研热门股">
    <view class="hot-burst-content">
      <!-- 引导卡片：点击查看今日分析报告 -->
      <GuideCard title="点击查看今日分析报告" icon-name="file-line" theme="warning" @click="goAgentReport" />

      <!-- 统计概览 -->
      <view v-if="signals.length" class="stats-bar">
        <text class="stats-text">共 {{ signals.length }} 只热门股</text>
        <text class="stats-time">近三天</text>
      </view>

      <!-- 热门股列表 -->
      <view v-if="signals.length" class="signal-list">
        <view
          v-for="(sig, idx) in signals"
          :key="`${sig.symbol}-${sig.detectedAt || idx}`"
          class="signal-card"
          @tap="goStockDetail(sig.symbol)"
        >
          <!-- 卡片头部：股票名称 + 股票代码 + 板块标签 + 行情数据 -->
          <view class="signal-top">
            <view class="signal-stock">
              <view class="stock-name-row">
                <text class="stock-name">{{ sig.stockName || sig.symbol }}</text>
                <Tag :type="levelTagType(sig.resonanceLevel)">{{ levelLabel(sig.resonanceLevel) }}</Tag>
                <Tag v-if="sig.sectorInfo || sig.thsSectorName">{{ sig.sectorInfo || sig.thsSectorName }}</Tag>
              </view>
              <text class="stock-code">{{ sig.symbol }}</text>
            </view>
            <view class="signal-quote">
              <text v-if="sig.price != null" class="price-val">
                {{ Number(sig.price).toFixed(2) }}
              </text>
              <text
                v-if="sig.changePct != null"
                :class="['change-val', (sig.changePct ?? 0) >= 0 ? 'up' : 'down']"
              >
                {{ (sig.changePct ?? 0) >= 0 ? '+' : '' }}{{ Number(sig.changePct).toFixed(2) }}%
              </text>
            </view>
          </view>

          <!-- 关键词标签 -->
          <view class="signal-meta">
            <view v-if="visibleTriggerTags(sig).length" class="signal-tags">
              <Tag
                v-for="tag in visibleTriggerTags(sig)"
                :key="tag"
                size="sm"
              >{{ tag }}</Tag>
            </view>
          </view>
        </view>
      </view>

      <!-- 无数据 -->
      <EmptyState v-else title="暂无机构调研热门股数据" description="数据更新后将自动显示" />
    </view>
  </SubPageCard>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { stockApi, type HotBurstSignal } from '@/shared/api/modules/stock'
import SubPageCard from '@/shared/components/SubPageCard.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import { EmptyState, Tag, GuideCard } from '@/shared/components'

function visibleTriggerTags(signal: HotBurstSignal): string[] {
  const sector = (signal.sectorInfo || signal.thsSectorName || '').trim()
  return (signal.triggerTags || [])
    .filter(tag => tag && tag.trim() !== sector)
    .slice(0, 3)
}

function levelLabel(level: HotBurstSignal['resonanceLevel']): string {
  const labels: Record<NonNullable<HotBurstSignal['resonanceLevel']>, string> = {
    critical: '极高',
    high: '高',
    medium: '中',
    low: '低',
  }
  return labels[level || 'low']
}

function levelTagType(level: HotBurstSignal['resonanceLevel']): 'warning' | 'up' | 'neutral' | 'down' {
  switch (level) {
    case 'critical': return 'warning'
    case 'high': return 'up'
    case 'medium': return 'neutral'
    case 'low': return 'down'
    default: return 'down'
  }
}

const signals = ref<HotBurstSignal[]>([])
const HOT_BURST_CACHE_KEY = 'hot_burst_preview_cache_v2'
const HOT_BURST_CACHE_TTL = 2 * 60 * 1000

function readHomeCache(): HotBurstSignal[] | null {
  const cached = uni.getStorageSync(HOT_BURST_CACHE_KEY) as {
    cachedAt?: number
    outbreaks?: HotBurstSignal[]
  } | null
  if (!cached?.cachedAt || !Array.isArray(cached.outbreaks)) return null
  if (Date.now() - cached.cachedAt > HOT_BURST_CACHE_TTL) return null
  return cached.outbreaks
}

function sortByDetectedAt(items: HotBurstSignal[]): HotBurstSignal[] {
  return [...items].sort((a, b) => {
    const aTime = a.detectedAt ? Date.parse(a.detectedAt) : 0
    const bTime = b.detectedAt ? Date.parse(b.detectedAt) : 0
    return bTime - aTime
  })
}

async function loadData() {
  const cached = readHomeCache()
  if (cached) {
    signals.value = sortByDetectedAt(cached)
    return
  }
  try {
    // 只按检测时间排序，不按共振等级排序，保证用户优先看到最新抓取结果。
    signals.value = sortByDetectedAt(await stockApi.getHotBurstHistory({ days: 3, min_resonance: 2 }))
  } catch {
    signals.value = []
  }
}

function goStockDetail(symbol: string) {
  if (!symbol) return
  uni.navigateTo({ url: `/modules/favorites/pages/detail?symbol=${symbol}` })
}

function goAgentReport() {
  const today = new Date().toISOString().split('T')[0]
  uni.navigateTo({
    url: `/modules/analytics/pages/hot-burst-report?date=${today}`
  })
}

onShow(() => {
  loadData()
})
</script>

<style lang="scss" scoped>
.hot-burst-content {
  padding: 24rpx;
}

/* ===== 统计栏 ===== */
.stats-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.stats-text {
  font-size: 26rpx;
  color: $ink;
  font-weight: 500;
}

.stats-time {
  font-size: 22rpx;
  color: #9ca3af;
}

/* ===== 信号卡片 ===== */
.signal-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.signal-card {
  background: $bg-card;
  border: 2rpx solid $line;
  border-radius: $r-lg;
  padding: 24rpx 28rpx 20rpx;
  border-left: 6rpx solid $line-strong;
  box-shadow: $shadow-sm;

  &.level-critical { border-left-color: #ef4444; }
  &.level-high { border-left-color: #f97316; }
  &.level-medium { border-left-color: #f59e0b; }
  &.level-low { border-left-color: #e2e8f0; }
}

.signal-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.signal-stock {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4rpx;
}

.stock-name-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12rpx;
}

.stock-name {
  font-size: 30rpx;
  font-weight: 600;
  color: $ink;
}

.stock-code {
  font-size: 22rpx;
  color: $ink-soft;
}

/* ===== 行情（顶部右侧） ===== */
.signal-quote {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.price-val {
  font-size: 30rpx;
  font-weight: 600;
  color: $ink;
}

.change-val {
  font-size: 24rpx;
  font-weight: 500;

  &.up { color: #f43f5e; }
  &.down { color: #22c55e; }
}

/* ===== 关键词 + 得分 + 等级行 ===== */
.signal-meta {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 0;
}

.signal-meta .signal-tags {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex: 1;
  overflow-x: auto;
}

.signal-meta-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex-shrink: 0;
}

.signal-score {
  display: flex;
  align-items: baseline;
  gap: 2rpx;
}

.score-label {
  font-size: 20rpx;
  color: #9ca3af;
}

.score-val {
  font-size: 26rpx;
  font-weight: 700;
  color: #b45309;
}

/* ===== 关键词标签 ===== */
.signal-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}
</style>
