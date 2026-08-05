<template>
  <view class="page-insight">
    <PageCard title="洞察">
      <view class="content-wrap">
        <!-- 机构调研热门股卡片 -->
        <Card clickable class="insight-card--burst" @click="goHotBurst">
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
          <view class="insight-preview">
            <view v-for="(item, idx) in hotBurstPreview" :key="idx" class="preview-item">
              <Badge size="sm" type="warning">{{ idx + 1 }}</Badge>
              <text class="preview-name">{{ item.name }}</text>
              <Tag size="sm" type="warning">{{ item.count }}家机构调研</Tag>
            </view>
          </view>
          <view class="insight-card-footer">
            <text class="insight-card-action insight-card-action--burst">查看详情 ›</text>
          </view>
        </Card>

        <!-- 趋势股评分卡片 -->
        <Card clickable class="insight-card--trend" @click="goTrendScore">
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
              <Badge size="sm">{{ idx + 1 }}</Badge>
              <text class="preview-name">{{ item.name }}</text>
              <Badge type="primary">{{ item.score }}分</Badge>
              <Tag size="sm" type="neutral">{{ item.label }}</Tag>
            </view>
          </view>
          <view class="insight-card-footer">
            <text class="insight-card-action insight-card-action--trend">查看详情 ›</text>
          </view>
        </Card>

        <!-- 自选股洞察卡片 -->
        <Card clickable class="insight-card--watchlist" @click="goWatchlistInsight">
          <view class="insight-card-header">
            <view class="insight-card-icon insight-card-icon--watchlist">
              <SvgIcon name="star-line" size="32rpx" color="#ffffff" />
            </view>
            <view class="insight-card-header-text">
              <text class="insight-card-title">自选股洞察</text>
              <text class="insight-card-desc">自选股出现异动时将在此生成洞察</text>
            </view>
            <text class="insight-card-more">›</text>
          </view>
          <view v-if="watchlistPreview.length" class="insight-preview">
            <view v-for="(item, idx) in watchlistPreview" :key="idx" class="preview-item">
              <Badge size="sm">{{ idx + 1 }}</Badge>
              <text class="preview-name">{{ item.name }}</text>
              <Tag size="sm" type="neutral">{{ item.label }}</Tag>
            </view>
          </view>
          <view class="insight-card-footer">
            <text class="insight-card-action insight-card-action--watchlist">查看详情 ›</text>
          </view>
        </Card>
      </view>
    </PageCard>

    <AppBottomBar current-tab="insight" />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import PageCard from '@/shared/components/PageCard.vue'
import AppBottomBar from '@/shared/components/AppBottomBar.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import { Card, Badge, Tag } from '@/shared/components'
import { trendScoreApi } from '@/shared/api/modules/trend-score'
import { watchlistInsightApi } from '@/shared/api/modules/insight'

const hotBurstPreview = ref([
  { name: '舒泰神', count: 3 },
  { name: '广生堂', count: 2 },
  { name: '药明康德', count: 5 },
])

const trendScorePreview = ref<Array<{ name: string; score: number; label: string }>>([])

const watchlistPreview = ref<Array<{ name: string; label: string }>>([])

async function loadTrendScorePreview() {
  try {
    const items = await trendScoreApi.getTop(3)
    trendScorePreview.value = items.map((item) => ({
      name: item.name || item.symbol,
      score: item.score,
      label: item.label,
    }))
  } catch {
    trendScorePreview.value = []
  }
}

function goHotBurst() {
  uni.navigateTo({ url: '/modules/market/pages/hot-burst' })
}

function goTrendScore() {
  uni.navigateTo({ url: '/modules/analytics/pages/trend-score' })
}

function goWatchlistInsight() {
  uni.navigateTo({ url: '/modules/favorites/pages/insight' })
}

// 与 insight.vue 保持一致的置信度文案
function confidenceText(c: string): string {
  return { high: '高置信', medium: '中置信', low: '低置信' }[c as 'high' | 'medium' | 'low'] || c
}

async function loadWatchlistPreview() {
  try {
    const items = await watchlistInsightApi.getInsights()
    watchlistPreview.value = items.slice(0, 3).map((item) => ({
      name: item.stock_name || item.symbol,
      label: item.confidence ? confidenceText(item.confidence) : '',
    }))
  } catch {
    watchlistPreview.value = []
  }
}

onShow(loadTrendScorePreview)
onShow(loadWatchlistPreview)
</script>

<style lang="scss" scoped>
.page-insight {
  height: 100%;
  background: $bg-soft;
}

.content-wrap {
  padding: 24rpx;
}

/* ===== 卡片装饰条（Card 组件已处理容器样式） ===== */
.insight-card--burst {
  position: relative;
  overflow: hidden;
  margin-bottom: 24rpx;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4rpx;
    background: $warning;
  }
}

/* 趋势股评分 — 顶部蓝色装饰条 */
.insight-card--trend {
  position: relative;
  overflow: hidden;
  margin-bottom: 24rpx;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4rpx;
    background: linear-gradient(90deg, $primary, $primary-600);
  }
}

/* 自选股洞察 — 顶部青色装饰条 */
.insight-card--watchlist {
  position: relative;
  overflow: hidden;
  margin-bottom: 24rpx;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4rpx;
    background: linear-gradient(90deg, $accent, $accent-deep);
  }
}

/* ===== 卡片头部 ===== */
.insight-card-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.insight-card-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.insight-card-icon--burst {
  background: linear-gradient(135deg, $warning, $gold);
  box-shadow: 0 4rpx 12rpx rgba(249, 115, 22, 0.3);
}

.insight-card-icon--trend {
  background: linear-gradient(135deg, $primary, $primary-600);
  box-shadow: 0 4rpx 12rpx rgba(77, 124, 254, 0.3);
}

.insight-card-icon--watchlist {
  background: linear-gradient(135deg, $accent, $accent-deep);
  box-shadow: 0 4rpx 12rpx rgba(0, 184, 255, 0.3);
}

.insight-card-header-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.insight-card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: $ink;
}

.insight-card-desc {
  font-size: 22rpx;
  color: $ink-soft;
}

.insight-card-more {
  font-size: 32rpx;
  color: $ink-mute;
  font-weight: 300;
}

/* ===== 预览列表 ===== */
.insight-preview {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
  background: $bg-card;
  border-radius: 14rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 20rpx;
  box-shadow: $shadow-xs;
}

.preview-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.preview-name {
  font-size: 26rpx;
  color: $ink;
  font-weight: 500;
  flex: 1;
}

/* ===== 底部操作 ===== */
.insight-card-footer {
  display: flex;
  justify-content: flex-end;
}

.insight-card-action {
  font-size: 24rpx;
  font-weight: 500;
  padding: 8rpx 20rpx;
  border-radius: 20rpx;
}

.insight-card-action--burst {
  color: $warning;
  background: $warning-soft;
}

.insight-card-action--trend {
  color: $primary;
  background: $primary-50;
}

.insight-card-action--watchlist {
  color: $accent;
  background: $accent-50;
}
</style>
