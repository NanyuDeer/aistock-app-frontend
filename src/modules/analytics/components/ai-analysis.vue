<template>
  <view class="ai-analysis-section">
    <!-- 标题栏 -->
    <view class="section-header">
      <view class="title-bar" />
      <text class="title-text">四维分析评分</text>
      <text class="subtitle">{{ dataPeriod || '' }}</text>
    </view>

    <!-- 加载中 -->
    <template v-if="loading">
      <view class="skeleton-card" />
    </template>

    <!-- 无数据 -->
    <template v-else-if="!data || data.dataStatus === 'empty'">
      <view class="empty-card">
        <text class="empty-text">暂无财报数据</text>
      </view>
    </template>

    <!-- 数据不足 -->
    <template v-else-if="data.dataStatus === 'insufficient'">
      <view class="insufficient-card">
        <text class="insufficient-icon">⚠</text>
        <text class="insufficient-title">数据不足</text>
        <text class="insufficient-desc">暂无法进行AI研判</text>
        <text class="insufficient-note">
          该股票年报数据少于2期，建议等待更多报告披露后再查看
        </text>
      </view>
      <view class="advice-bar" v-if="data.message">
        <text class="advice-icon">💡</text>
        <text class="advice-text">{{ data.message }}</text>
      </view>
    </template>

    <!-- 完整数据 -->
    <template v-else-if="data.dataStatus === 'complete' && data.score != null">
      <!-- 评分区 -->
      <view class="score-card">
        <view class="score-left">
          <view class="score-number-row">
            <text class="score-number">{{ data.score }}</text>
            <text class="score-total">/100</text>
          </view>
          <view class="rating-badge" :style="{ background: data.ratingColor }">
            {{ data.rating }}
          </view>
        </view>
        <view class="score-right">
          <text class="conclusion-main">{{ data.conclusion }}</text>
          <text class="conclusion-sub">{{ data.conclusionSub }}</text>
        </view>
      </view>

      <!-- 四维卡片 -->
      <view class="dimensions-grid">
        <view
          v-for="dim in data.dimensions"
          :key="dim.name"
          class="dimension-card"
        >
          <view class="dim-header">
            <text class="dim-name">{{ dim.name }}</text>
            <text
              class="dim-score"
              :style="{ color: dim.color }"
            >
              {{ dim.score }}/{{ dim.maxScore }}
            </text>
          </view>
          <view class="progress-bar-bg">
            <view
              class="progress-bar-fill"
              :style="{
                width: (dim.scoreRate * 100) + '%',
                background: dim.color,
              }"
            />
          </view>
          <view class="dim-metrics">
            <text v-for="(value, key) in dim.keyMetrics" :key="key" class="metric-item">
              {{ formatMetricKey(key) }}: {{ value }}
            </text>
          </view>
        </view>
      </view>

      <!-- 优势与风险 -->
      <view class="strength-risk">
        <view class="strength-col">
          <text class="col-title strength-title">核心优势</text>
          <view v-if="data.strengths.length === 0" class="no-risk">
            <view class="placeholder-row" />
          </view>
          <view v-for="(s, i) in data.strengths" :key="'s' + i" class="list-item">
            <view class="dot strength-dot" />
            <text class="item-text">{{ s }}</text>
          </view>
        </view>
        <view class="risk-col">
          <text class="col-title risk-title">潜在风险</text>
          <view v-if="data.risks.length === 0" class="no-risk">
            <text class="no-risk-text">暂无明显风险</text>
          </view>
          <view v-for="(r, i) in data.risks" :key="'r' + i" class="list-item">
            <view class="dot risk-dot" />
            <text class="item-text">{{ r }}</text>
          </view>
        </view>
      </view>

      <!-- 建议条 -->
      <view class="advice-bar" v-if="data.advice">
        <text class="advice-icon">💡</text>
        <text class="advice-text">{{ data.advice }}</text>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  loading: boolean
  data: any
}>()

const dataPeriod = computed(() => {
  return props.data?.dataPeriod || ''
})

function formatMetricKey(key: string): string {
  const map: Record<string, string> = {
    roe: 'ROE',
    grossMargin: '毛利率',
    netMargin: '净利率',
    stability: '波动性',
    revenueCAGR: '营收CAGR',
    profitCAGR: '净利CAGR',
    latestTrend: '最新趋势',
    debtRatio: '负债率',
    debtTrend: '负债趋势',
    anomalies: '异常状态',
    cfToProfit: 'CF/净利',
    cashReceiptRatio: '收现比',
    trend: '现金流趋势',
  }
  return map[key] || key
}
</script>

<style lang="scss" scoped>
.ai-analysis-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

// 标题栏
.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 0 12px 0;
  border-bottom: 0.5px solid #f1efe8;

  .title-bar {
    width: 3px;
    height: 16px;
    background: #534ab7;
    border-radius: 2px;
    flex-shrink: 0;
  }

  .title-text {
    font-size: 15px;
    font-weight: 600;
    color: #2c2c2a;
  }

  .subtitle {
    margin-left: auto;
    font-size: 11px;
    color: #888780;
  }
}

// 评分区
.score-card {
  background: #eeedfe;
  border-radius: 12px;
  padding: 20px 16px;
  display: flex;
  align-items: center;
  gap: 16px;

  .score-left {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  .score-number-row {
    display: flex;
    align-items: baseline;
  }

  .score-number {
    font-size: 36px;
    font-weight: 700;
    color: #534ab7;
    line-height: 1;
  }

  .score-total {
    font-size: 14px;
    color: #888780;
    margin-left: 2px;
  }

  .rating-badge {
    display: inline-flex;
    padding: 2px 12px;
    border-radius: 11px;
    font-size: 12px;
    font-weight: 500;
    color: #ffffff;
    line-height: 1.6;
  }

  .score-right {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .conclusion-main {
    font-size: 15px;
    font-weight: 500;
    color: #2c2c2a;
  }

  .conclusion-sub {
    font-size: 12px;
    color: #888780;
    line-height: 1.4;
  }
}

// 四维卡片网格
.dimensions-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.dimension-card {
  background: #f8f7f4;
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;

  .dim-header {
    display: flex;
    align-items: center;
    justify-content: space-between;

    .dim-name {
      font-size: 12px;
      color: #888780;
    }

    .dim-score {
      font-size: 14px;
      font-weight: 600;
    }
  }

  .progress-bar-bg {
    background: #e5e2d8;
    border-radius: 3px;
    height: 5px;
    width: 100%;
    overflow: hidden;
  }

  .progress-bar-fill {
    border-radius: 3px;
    height: 100%;
    transition: width 0.3s ease;
  }

  .dim-metrics {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .metric-item {
    font-size: 11px;
    color: #888780;
    line-height: 1.6;
  }
}

// 优势与风险
.strength-risk {
  display: flex;
  gap: 12px;
  padding: 4px 0;

  .strength-col,
  .risk-col {
    flex: 1;
  }

  .col-title {
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 4px;
    display: block;
  }

  .strength-title {
    color: #1d9e75;
  }

  .risk-title {
    color: #ef9f27;
  }

  .list-item {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    margin-bottom: 2px;
  }

  .dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    flex-shrink: 0;
    margin-top: 8px;
  }

  .strength-dot {
    background: #1d9e75;
  }

  .risk-dot {
    background: #ef9f27;
  }

  .item-text {
    font-size: 12px;
    color: #444441;
    line-height: 1.8;
  }

  .no-risk {
    .no-risk-text {
      font-size: 12px;
      color: #888780;
    }
  }

  .placeholder-row {
    height: 18px;
  }
}

// 建议条
.advice-bar {
  background: #f5f0e1;
  border-radius: 8px;
  padding: 12px 14px;
  display: flex;
  gap: 6px;
  align-items: flex-start;

  .advice-icon {
    font-size: 14px;
    flex-shrink: 0;
    line-height: 1.7;
  }

  .advice-text {
    font-size: 12px;
    color: #854f0b;
    line-height: 1.7;
  }
}

// 数据不足
.insufficient-card {
  background: #f8f7f4;
  border-radius: 12px;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;

  .insufficient-icon {
    font-size: 28px;
  }

  .insufficient-title {
    font-size: 15px;
    font-weight: 500;
    color: #888780;
  }

  .insufficient-desc {
    font-size: 13px;
    color: #888780;
  }

  .insufficient-note {
    font-size: 12px;
    color: #888780;
    text-align: center;
    margin-top: 4px;
    line-height: 1.5;
  }
}

// 无数据
.empty-card {
  padding: 32px 0;
  display: flex;
  justify-content: center;

  .empty-text {
    font-size: 14px;
    color: #888780;
  }
}

// 骨架屏
.skeleton-card {
  background: #f8f7f4;
  border-radius: 12px;
  height: 180px;
  animation: skeleton-pulse 1.2s ease-in-out infinite;
}

@keyframes skeleton-pulse {
  0%,
  100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
}
</style>
