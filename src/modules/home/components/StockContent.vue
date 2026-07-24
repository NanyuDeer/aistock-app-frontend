<template>
  <view class="stock-content">
    <view class="content-wrap">
      <!-- 趋势股评分卡片 -->
      <view class="insight-card insight-card--trend" @tap="goTrendScore">
        <view class="insight-card-header">
          <view class="insight-card-icon insight-card-icon--trend">
            <SvgIcon name="bar-chart-line" size="32rpx" color="#ffffff" />
          </view>
          <view class="insight-card-header-text">
            <text class="insight-card-title">趋势股评分</text>
            <text class="insight-card-desc">基于多维度模型对A股趋势打分</text>
          </view>
          <text class="insight-card-more">›</text>
        </view>
        <view class="insight-preview">
          <view v-for="(item, idx) in trendScorePreview" :key="idx" class="preview-item">
            <text class="preview-rank preview-rank--trend">{{ idx + 1 }}</text>
            <text class="preview-name">{{ item.name }}</text>
            <text class="preview-score">{{ item.score }}分</text>
            <text :class="['preview-trend', item.trend === 'up' ? 'up' : 'down']">{{ item.trend === 'up' ? '↑' : '↓' }}</text>
          </view>
        </view>
      </view>

      <!-- 机构调研热门股卡片 -->
      <view class="insight-card insight-card--burst" @tap="goHotBurst">
        <view class="insight-card-header">
          <view class="insight-card-icon insight-card-icon--burst">
            <SvgIcon name="search-eye-line" size="32rpx" color="#ffffff" />
          </view>
          <view class="insight-card-header-text">
            <text class="insight-card-title">机构调研热门股</text>
            <text class="insight-card-desc">机构调研共振检测，发现潜在机会</text>
          </view>
          <text class="insight-card-more">›</text>
        </view>
        <view v-if="hotBurstLoading" class="insight-preview insight-preview--state">
          <text class="preview-state">热门股数据加载中…</text>
        </view>
        <view v-else-if="hotBurstPreview.length" class="insight-preview">
          <view v-for="(item, idx) in hotBurstPreview" :key="item.symbol" class="preview-item">
            <text class="preview-rank preview-rank--burst">{{ idx + 1 }}</text>
            <text class="preview-name">{{ item.name }}</text>
            <text class="preview-tag preview-tag--burst">{{ item.level }}</text>
          </view>
        </view>
        <view v-else class="insight-preview insight-preview--state">
          <text class="preview-state">{{ hotBurstError || '暂无机构调研热门股数据' }}</text>
        </view>
      </view>

      <!-- 业绩预测入口 -->
      <view class="insight-card insight-card--forecast" @tap="goForecast">
        <view class="insight-card-header">
          <view class="insight-card-icon insight-card-icon--forecast">
            <SvgIcon name="file-chart-line" size="32rpx" color="#ffffff" />
          </view>
          <view class="insight-card-header-text">
            <text class="insight-card-title">业绩预测</text>
            <text class="insight-card-desc">机构盈利预测与财报分析</text>
          </view>
          <text class="insight-card-more">›</text>
        </view>
        <view class="insight-preview">
          <view v-for="(item, idx) in forecastPreview" :key="idx" class="preview-item">
            <text class="preview-name">{{ item.name }}</text>
            <text class="preview-tag preview-tag--forecast">{{ item.label }}</text>
            <text :class="['preview-trend', item.growth.startsWith('+') || item.growth.startsWith('0') ? 'up' : 'down']">{{ item.growth }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import { stockApi, type HotBurstSignal } from '@/shared/api/modules/stock'

const trendScorePreview = ref([
  { name: '贵州茅台', score: 92, trend: 'up' },
  { name: '宁德时代', score: 88, trend: 'down' },
  { name: '中国平安', score: 85, trend: 'up' },
])

const hotBurstPreview = ref<{ symbol: string; name: string; level: string }[]>([])
const hotBurstLoading = ref(true)
const hotBurstError = ref('')
const HOT_BURST_CACHE_KEY = 'hot_burst_preview_cache_v2'

function levelLabel(level: HotBurstSignal['resonanceLevel']): string {
  const labels: Record<NonNullable<HotBurstSignal['resonanceLevel']>, string> = {
    critical: '极高',
    high: '高',
    medium: '中',
    low: '低',
  }
  return labels[level || 'low']
}

async function loadHotBurstPreview() {
  hotBurstLoading.value = true
  hotBurstError.value = ''
  try {
    const outbreaks = await stockApi.getHotBurstHistory({ days: 3, min_resonance: 3 })
    uni.setStorageSync(HOT_BURST_CACHE_KEY, {
      cachedAt: Date.now(),
      outbreaks,
    })
    hotBurstPreview.value = [...outbreaks].sort((a, b) => {
      const aTime = a.detectedAt ? Date.parse(a.detectedAt) : 0
      const bTime = b.detectedAt ? Date.parse(b.detectedAt) : 0
      return bTime - aTime
    }).slice(0, 3).map((item) => ({
      symbol: item.symbol,
      name: item.stockName || item.symbol,
      level: levelLabel(item.resonanceLevel),
    }))
  } catch {
    hotBurstPreview.value = []
    hotBurstError.value = '热门股数据加载失败'
  } finally {
    hotBurstLoading.value = false
  }
}

const forecastPreview = ref([
  { name: '贵州茅台', label: '净利润预测 386亿', growth: '+15.3%' },
  { name: '宁德时代', label: '净利润预测 128亿', growth: '+22.1%' },
  { name: '比亚迪', label: '营收预测 4200亿', growth: '-2.4%' },
])

function goTrendScore() {
  uni.navigateTo({ url: '/modules/analytics/pages/trend-score' })
}

function goHotBurst() {
  uni.navigateTo({ url: '/modules/market/pages/hot-burst' })
}

function goForecast() {
  // 切换到预测子 tab（由 MainTabs 的 stockSubTab 控制）
  // 这里直接跳转到独立页面也可以
  uni.navigateTo({ url: '/modules/analytics/pages/forecast' })
}

onMounted(() => {
  loadHotBurstPreview()
})
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;

.stock-content {
  background: #ffffff;
}

.content-wrap {
  padding: $spacing-base;
}

/* ===== 卡片基础 ===== */
.insight-card {
  background: $bg-color-grey;
  border-radius: 20rpx;
  padding: 20rpx;
  margin-bottom: $spacing-base;
  position: relative;
  overflow: hidden;
  box-shadow: $shadow-card;
  transition: transform 0.2s ease;

  &:active {
    transform: scale(0.98);
  }
}

/* 趋势股评分 — 蓝色装饰条 */
.insight-card--trend::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4rpx;
  background: $brand-gradient;
}

/* 机构调研 — 橙色装饰条 */
.insight-card--burst::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4rpx;
  background: linear-gradient(90deg, #f97316, #fb923c);
}

/* 业绩预测 — 绿色装饰条 */
.insight-card--forecast::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4rpx;
  background: linear-gradient(90deg, #22c55e, #4ade80);
}

/* ===== 卡片头部 ===== */
.insight-card-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 12rpx;
}

.insight-card-icon {
  width: 60rpx;
  height: 60rpx;
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.insight-card-icon--trend {
  background: $brand-gradient;
  box-shadow: 0 4rpx 12rpx rgba(77, 124, 254, 0.3);
}

.insight-card-icon--burst {
  background: linear-gradient(135deg, #f97316, #fb923c);
  box-shadow: 0 4rpx 12rpx rgba(249, 115, 22, 0.3);
}

.insight-card-icon--forecast {
  background: linear-gradient(135deg, #22c55e, #4ade80);
  box-shadow: 0 4rpx 12rpx rgba(34, 197, 94, 0.3);
}

.insight-card-header-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.insight-card-title {
  font-size: 28rpx;
  font-weight: 600;
  color: $text-color-title;
}

.insight-card-desc {
  font-size: 20rpx;
  color: $text-color-secondary;
}

.insight-card-more {
  font-size: 32rpx;
  color: $text-color-tertiary;
  font-weight: 300;
}

/* ===== 预览列表 ===== */
.insight-preview {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  background: #ffffff;
  border-radius: 12rpx;
  padding: 14rpx 16rpx;
  margin-bottom: 14rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.insight-preview--state {
  align-items: center;
  justify-content: center;
  min-height: 104rpx;
}

.preview-state {
  font-size: 22rpx;
  color: $text-color-secondary;
}

.preview-item {
  display: flex;
  align-items: center;
  gap: 10rpx;
  min-width: 0;
}

.preview-name {
  font-size: 24rpx;
  color: $text-color-title;
  font-weight: 500;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-rank {
  font-size: 20rpx;
  font-weight: 700;
  width: 32rpx;
  height: 32rpx;
  text-align: center;
  line-height: 32rpx;
  border-radius: 6rpx;
  flex-shrink: 0;
}

.preview-rank--burst {
  color: #f97316;
  background: rgba(249, 115, 22, 0.1);
}

.preview-rank--trend {
  color: $brand-color;
  background: rgba($brand-color, 0.1);
}

.preview-tag {
  font-size: 20rpx;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  flex-shrink: 0;
}

.preview-tag--burst {
  color: #f97316;
  background: rgba(249, 115, 22, 0.1);
}

.preview-tag--forecast {
  color: #22c55e;
  background: rgba(34, 197, 94, 0.1);
}

.preview-score {
  font-size: 24rpx;
  color: $text-color-title;
  font-weight: 600;
  flex-shrink: 0;
}

.preview-trend {
  font-size: 22rpx;
  font-weight: 600;
  flex-shrink: 0;

  &.up { color: #f43f5e; }
  &.down { color: #22c55e; }
}
</style>
