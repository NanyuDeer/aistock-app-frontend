<template>
  <view class="page-insight">
    <PageCard title="洞察">
      <view class="content-wrap">
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
          <view class="insight-preview">
            <view v-for="(item, idx) in hotBurstPreview" :key="idx" class="preview-item">
              <text class="preview-rank preview-rank--burst">{{ idx + 1 }}</text>
              <text class="preview-name">{{ item.name }}</text>
              <text class="preview-tag preview-tag--burst">{{ item.count }}家机构调研</text>
            </view>
          </view>
          <view class="insight-card-footer">
            <text class="insight-card-action insight-card-action--burst">查看详情 ›</text>
          </view>
        </view>

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
              <text class="preview-grade">{{ item.label }}</text>
            </view>
          </view>
          <view class="insight-card-footer">
            <text class="insight-card-action insight-card-action--trend">查看详情 ›</text>
          </view>
        </view>
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
import { trendScoreApi } from '@/shared/api/modules/trend-score'

const hotBurstPreview = ref([
  { name: '舒泰神', count: 3 },
  { name: '广生堂', count: 2 },
  { name: '药明康德', count: 5 },
])

const trendScorePreview = ref<Array<{ name: string; score: number; label: string }>>([])

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

onShow(loadTrendScorePreview)
</script>

<style lang="scss" scoped>
.page-insight {
  height: 100%;
  background: #f5f7fb;
}

.content-wrap {
  padding: 24rpx;
}

/* ===== 卡片基础 ===== */
.insight-card {
  background: #f5f7fb;
  border-radius: 20rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
}

/* 机构调研热门股 — 顶部橙色装饰条 */
.insight-card--burst {
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4rpx;
    background: linear-gradient(90deg, #f97316, #fb923c);
  }
}

/* 趋势股评分 — 顶部蓝色装饰条 */
.insight-card--trend {
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4rpx;
    background: linear-gradient(90deg, #4d7cfe, #6366f1);
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
  background: linear-gradient(135deg, #f97316, #fb923c);
  box-shadow: 0 4rpx 12rpx rgba(249, 115, 22, 0.3);
}

.insight-card-icon--trend {
  background: linear-gradient(135deg, #4d7cfe, #6366f1);
  box-shadow: 0 4rpx 12rpx rgba(77, 124, 254, 0.3);
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
  color: #1a1d24;
}

.insight-card-desc {
  font-size: 22rpx;
  color: #6b7280;
}

.insight-card-more {
  font-size: 32rpx;
  color: #9ca3af;
  font-weight: 300;
}

/* ===== 预览列表 ===== */
.insight-preview {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
  background: #ffffff;
  border-radius: 14rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.preview-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.preview-name {
  font-size: 26rpx;
  color: #1a1d24;
  font-weight: 500;
  flex: 1;
}

.preview-rank {
  font-size: 22rpx;
  font-weight: 700;
  width: 36rpx;
  height: 36rpx;
  text-align: center;
  line-height: 36rpx;
  border-radius: 8rpx;
}

.preview-rank--burst {
  color: #f97316;
  background: rgba(249, 115, 22, 0.1);
}

.preview-rank--trend {
  color: #4d7cfe;
  background: rgba(77, 124, 254, 0.1);
}

.preview-tag {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}

.preview-tag--burst {
  color: #f97316;
  background: rgba(249, 115, 22, 0.1);
}

.preview-score {
  font-size: 26rpx;
  color: #1a1d24;
  font-weight: 600;
}

.preview-grade {
  min-width: 32rpx;
  color: #4d7cfe;
  font-size: 24rpx;
  font-weight: 700;
  text-align: center;
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
  color: #f97316;
  background: rgba(249, 115, 22, 0.1);
}

.insight-card-action--trend {
  color: #4d7cfe;
  background: rgba(77, 124, 254, 0.1);
}
</style>
