<template>
  <SubPageCard title="机构调研热门股">
    <view class="hot-burst-content">
      <!-- 【新增】引导卡片：点击查看今日分析报告 -->
      <view class="report-guide-card" @tap="goAgentReport">
        <view class="guide-left">
          <SvgIcon name="file-line" color="#ffffff" size="40rpx" />
          <text class="guide-title">点击查看今日分析报告</text>
        </view>
        <SvgIcon name="arrow-right-line" color="#ffffff" size="32rpx" />
      </view>

      <!-- 统计概览 -->
      <view v-if="signals.length" class="stats-bar">
        <text class="stats-text">共 {{ signals.length }} 只热门股</text>
        <text class="stats-time">最近 {{ hours }} 小时</text>
      </view>

      <!-- 热门股列表 -->
      <view v-if="signals.length" class="signal-list">
        <view
          v-for="(sig, idx) in signals"
          :key="sig.symbol || idx"
          class="signal-card"
          :class="'level-' + (sig.resonanceLevel || 'low')"
          @tap="goStockDetail(sig.symbol)"
        >
          <!-- 卡片头部：股票名称 + 股票代码 + 板块标签 + 行情数据 -->
          <view class="signal-top">
            <view class="signal-stock">
              <view class="stock-name-row">
                <text class="stock-name">{{ sig.stockName || sig.symbol }}</text>
                <text v-if="sig.sectorInfo || sig.thsSectorName" class="sector-tag">
                  {{ sig.sectorInfo || sig.thsSectorName }}
                </text>
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

          <!-- 关键词标签 + 得分 + 等级标签 -->
          <view class="signal-meta">
            <view v-if="sig.triggerTags && sig.triggerTags.length" class="signal-tags">
              <text
                v-for="tag in sig.triggerTags.slice(0, 4)"
                :key="tag"
                class="kw-tag"
              >{{ tag }}</text>
            </view>
            <view class="signal-meta-right">
              <view v-if="sig.resonanceScore != null" class="signal-score">
                <text class="score-val">{{ sig.resonanceScore }}</text>
                <text class="score-label">分</text>
              </view>
              <text :class="['level-tag', sig.resonanceLevel || 'low']">
                {{ levelLabel(sig.resonanceLevel) }}
              </text>
            </view>
          </view>
        </view>
      </view>

      <!-- 无数据 -->
      <view v-else class="empty-state">
        <text class="empty-text">暂无机构调研热门股数据</text>
        <text class="empty-hint">数据更新后将自动显示</text>
      </view>
    </view>
  </SubPageCard>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { stockApi } from '@/shared/api/modules/stock'
import SubPageCard from '@/shared/components/SubPageCard.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'

interface HotBurstSignal {
  symbol: string
  stockName?: string
  price?: number | null
  changePct?: number | null
  resonanceLevel?: string
  resonanceScore?: number
  triggerTags?: string[]
  sectorInfo?: string
  thsSectorName?: string
}

const signals = ref<HotBurstSignal[]>([])
const hours = ref(6)

// Mock 数据（API 不可用时显示）
const mockSignals: HotBurstSignal[] = [
  {
    symbol: '300760',
    stockName: '迈瑞医疗',
    price: 288.50,
    changePct: 3.25,
    resonanceLevel: 'critical',
    resonanceScore: 95,
    triggerTags: ['医疗器械', '海外营收', '机构调研'],
    sectorInfo: '医疗器械',
  },
  {
    symbol: '002415',
    stockName: '海康威视',
    price: 32.80,
    changePct: 2.18,
    resonanceLevel: 'high',
    resonanceScore: 82,
    triggerTags: ['AI视觉', '边缘计算', '创新业务'],
    sectorInfo: '安防设备',
  },
  {
    symbol: '600519',
    stockName: '贵州茅台',
    price: 1480.00,
    changePct: -0.52,
    resonanceLevel: 'medium',
    resonanceScore: 68,
    triggerTags: ['消费复苏', '提价预期'],
    sectorInfo: '白酒',
  },
  {
    symbol: '300124',
    stockName: '汇川技术',
    price: 58.20,
    changePct: 4.15,
    resonanceLevel: 'high',
    resonanceScore: 78,
    triggerTags: ['工控自动化', '新能源车', '机器人'],
    sectorInfo: '工业自动化',
  },
  {
    symbol: '002371',
    stockName: '北方华创',
    price: 325.60,
    changePct: 1.85,
    resonanceLevel: 'medium',
    resonanceScore: 65,
    triggerTags: ['半导体设备', '国产替代'],
    sectorInfo: '半导体设备',
  },
]

function levelLabel(level?: string): string {
  const map: Record<string, string> = { critical: '极高', high: '高', medium: '中', low: '低' }
  return map[level || 'low'] || level || '低'
}

async function loadData() {
  try {
    const res: unknown = await stockApi.getHotBursts({ hours: hours.value, min_resonance: 0 })
    const data = (res as any)?.data ?? res
    const list = data?.outbreaks || data?.records || []
    signals.value = list.length ? list : mockSignals
  } catch {
    signals.value = mockSignals
  }
}

function goStockDetail(symbol: string) {
  if (!symbol) return
  uni.navigateTo({ url: `/modules/favorites/pages/detail?symbol=${symbol}` })
}

function goAgentReport() {
  const today = new Date().toISOString().split('T')[0]
  uni.navigateTo({
    url: `/modules/chat/pages/agent-report?intent=hot_burst&date=${today}`
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

/* ===== 引导卡片 ===== */
.report-guide-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 32rpx;
  margin-bottom: 24rpx;
  background: linear-gradient(135deg, #4d7cfe 0%, #667eea 100%);
  border-radius: 16rpx;
  box-shadow: 0 4rpx 12rpx rgba(77, 124, 254, 0.3);
}

.guide-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.guide-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #ffffff;
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
  color: #1a1d24;
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
  background: #ffffff;
  border-radius: 20rpx;
  padding: 24rpx 28rpx 20rpx;
  border-left: 6rpx solid #e2e8f0;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);

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
  gap: 12rpx;
}

.stock-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1d24;
}

.stock-code {
  font-size: 22rpx;
  color: #6b7280;
}

/* 板块标签（紧跟股票代码右侧） */
.sector-tag {
  display: inline-flex;
  align-items: center;
  padding: 2rpx 14rpx;
  border-radius: 8rpx;
  font-size: 20rpx;
  font-weight: 500;
  background: #4d7cfe;
  color: #ffffff;
}

.level-tag {
  display: inline-flex;
  align-items: center;
  padding: 4rpx 10rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
  font-weight: 600;

  &.critical { background: #ef4444; color: #ffffff; }
  &.high { background: #f97316; color: #ffffff; }
  &.medium { background: #f59e0b; color: #ffffff; }
  &.low { background: #e2e8f0; color: #64748b; }
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
  color: #1a1d24;
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

.kw-tag {
  display: inline-block;
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
  font-size: 20rpx;
  font-weight: 500;
  background: rgba(77, 124, 254, 0.08);
  color: #4d7cfe;
  border: 1rpx solid rgba(77, 124, 254, 0.2);
  white-space: nowrap;
}

/* ===== 空状态 ===== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
}

.empty-text {
  font-size: 28rpx;
  color: #6b7280;
  margin-bottom: 12rpx;
}

.empty-hint {
  font-size: 22rpx;
  color: #9ca3af;
}
</style>
