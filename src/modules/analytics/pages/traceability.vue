<template>
  <view class="page-traceability">
    <SubPageCard title="大盘溯源">
      <!-- 顶部摘要卡片 -->
      <view class="summary-card">
        <view class="summary-header">
          <view class="summary-icon">
            <SvgIcon name="bar-chart-line" size="32rpx" color="#ffffff" />
          </view>
          <view class="summary-text">
            <text class="summary-title">今日大盘溯源</text>
            <text class="summary-desc">追溯市场异动的源头与传导路径</text>
          </view>
          <view class="summary-status" :class="statusClass">
            <text class="status-text">{{ statusText }}</text>
          </view>
        </view>
        <view class="summary-body">
          <view class="summary-row">
            <text class="row-label">分析时间</text>
            <text class="row-value">{{ analysisTime || '--' }}</text>
          </view>
          <view class="summary-row">
            <text class="row-label">异动方向</text>
            <text :class="['row-value', directionClass]">{{ direction || '--' }}</text>
          </view>
          <view class="summary-row">
            <text class="row-label">影响板块</text>
            <text class="row-value">{{ affectedSectors || '--' }}</text>
          </view>
        </view>
      </view>

      <!-- 溯源分析内容 -->
      <view class="section-title">
        <text class="title-text">溯源分析</text>
      </view>

      <!-- 加载中 -->
      <view v-if="loading" class="loading-state">
        <LoadingState />
      </view>

      <!-- 错误状态 -->
      <view v-else-if="error" class="error-state">
        <SvgIcon name="cloud-off-line" size="80rpx" color="#d1d5db" />
        <text class="error-text">分析数据获取失败</text>
        <text class="error-desc">网络异常或服务暂时不可用，请稍后重试</text>
        <view class="retry-btn" @tap="retry">重试</view>
      </view>

      <!-- 空状态 -->
      <view v-else-if="!analysisList.length" class="empty-state">
        <EmptyState text="暂无溯源分析数据" />
      </view>

      <!-- 溯源分析列表 -->
      <view v-else class="analysis-list">
        <view
          v-for="(item, idx) in analysisList"
          :key="idx"
          class="analysis-card"
        >
          <view class="card-header">
            <view class="card-badge" :class="item.tagType">
              <text class="badge-text">{{ item.tagName }}</text>
            </view>
            <text class="card-title">{{ item.title }}</text>
          </view>
          <view class="card-content">
            <text class="content-text">{{ item.content }}</text>
          </view>
          <view class="card-footer">
            <view class="source-info">
              <text class="source-label">来源</text>
              <text class="source-value">{{ item.source }}</text>
            </view>
            <text class="time-text">{{ item.time }}</text>
          </view>
        </view>
      </view>

      <!-- 历史溯源记录 -->
      <view class="section-title">
        <text class="title-text">历史溯源记录</text>
        <text class="title-more" @tap="goHistory">全部 ›</text>
      </view>

      <view class="history-list">
        <view
          v-for="(item, idx) in historyList"
          :key="idx"
          class="history-item"
          @tap="goHistoryDetail(item.id)"
        >
          <view class="history-left">
            <view class="history-dot" :class="item.tagType"></view>
            <view class="history-info">
              <text class="history-title">{{ item.title }}</text>
              <text class="history-time">{{ item.time }}</text>
            </view>
          </view>
          <text class="history-arrow">›</text>
        </view>
      </view>
    </SubPageCard>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import SubPageCard from '@/shared/components/SubPageCard.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import LoadingState from '@/shared/components/LoadingState.vue'
import EmptyState from '@/shared/components/EmptyState.vue'

interface AnalysisItem {
  tagType: 'buy' | 'sell' | 'wash'
  tagName: string
  title: string
  content: string
  source: string
  time: string
}

interface HistoryItem {
  id: string
  tagType: 'buy' | 'sell' | 'wash'
  title: string
  time: string
}

const loading = ref(false)
const error = ref(false)
const analysisTime = ref('')
const direction = ref('')
const affectedSectors = ref('')
const analysisList = ref<AnalysisItem[]>([])
const historyList = ref<HistoryItem[]>([])

const statusClass = computed(() => {
  if (loading.value) return 'status-loading'
  if (error.value) return 'status-error'
  if (analysisList.value.length) return 'status-ready'
  return 'status-empty'
})

const statusText = computed(() => {
  if (loading.value) return '分析中'
  if (error.value) return '失败'
  if (analysisList.value.length) return '已更新'
  return '待更新'
})

const directionClass = computed(() => {
  if (direction.value.includes('上涨') || direction.value.includes('流入')) return 'text-up'
  if (direction.value.includes('下跌') || direction.value.includes('流出')) return 'text-down'
  return ''
})

async function fetchData() {
  loading.value = true
  error.value = false
  try {
    // TODO: 对接后端溯源 Agent API
    // const res = await traceApi.getTraceAnalysis()
    // 暂用 mock 数据
    await new Promise(resolve => setTimeout(resolve, 500))
    analysisTime.value = '2026-07-20 09:15'
    direction.value = '北向资金流入'
    affectedSectors.value = '半导体、新能源、医药生物'
    analysisList.value = [
      {
        tagType: 'buy',
        tagName: '利好',
        title: '北向资金大幅流入半导体板块',
        content: '今日北向资金净流入半导体板块达35.6亿元，主要流向设备类龙头。中芯国际、北方华创获主力资金加仓，行业景气度回升预期增强。',
        source: '资金流向监控',
        time: '09:15',
      },
      {
        tagType: 'wash',
        tagName: '关注',
        title: '新能源板块资金轮动加速',
        content: '新能源板块内部出现明显轮动，锂电设备涨幅居前，电池材料相对滞涨。主力资金从上游向中游传导，关注产业链利润重构。',
        source: '板块轮动分析',
        time: '10:30',
      },
      {
        tagType: 'sell',
        tagName: '利空',
        title: '医药生物板块遭遇获利了结',
        content: '经过前期上涨，医药生物板块今日遭遇获利了结压力。CXO板块跌幅较大，创新药相对抗跌，资金短期回避估值过高标的。',
        source: '市场情绪监测',
        time: '13:45',
      },
    ]
    historyList.value = [
      { id: '1', tagType: 'buy', title: '7月19日：央行降准预期升温', time: '2026-07-19' },
      { id: '2', tagType: 'wash', title: '7月18日：海外科技股回调传导', time: '2026-07-18' },
      { id: '3', tagType: 'sell', title: '7月17日：周期股资金大幅流出', time: '2026-07-17' },
    ]
  } catch (err) {
    console.error('Failed to fetch trace analysis:', err)
    error.value = true
  } finally {
    loading.value = false
  }
}

function retry() {
  error.value = false
  fetchData()
}

function goHistory() {
  uni.navigateTo({ url: '/modules/chat/pages/agent-report' })
}

function goHistoryDetail(id: string) {
  uni.navigateTo({ url: `/modules/chat/pages/agent-report?id=${id}` })
}

onShow(() => {
  fetchData()
})
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;

.page-traceability {
  height: 100%;
}

/* ===== 摘要卡片 ===== */
.summary-card {
  margin: $spacing-base;
  background: $bg-color-grey;
  border-radius: 20rpx;
  padding: $spacing-base;
  box-shadow: $shadow-card;
}

.summary-header {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  margin-bottom: $spacing-base;
}

.summary-icon {
  width: 60rpx;
  height: 60rpx;
  border-radius: 14rpx;
  background: $brand-gradient;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4rpx 12rpx rgba(77, 124, 254, 0.3);
}

.summary-text {
  flex: 1;
}

.summary-title {
  font-size: 30rpx;
  font-weight: 600;
  color: $text-color-title;
  display: block;
}

.summary-desc {
  font-size: 22rpx;
  color: $text-color-secondary;
  margin-top: 4rpx;
  display: block;
}

.summary-status {
  padding: 4rpx 14rpx;
  border-radius: $radius-pill;
  flex-shrink: 0;
}

.status-text {
  font-size: 22rpx;
  font-weight: 500;
}

.status-loading {
  background: rgba(239, 170, 23, 0.1);
  .status-text { color: #EFAA17; }
}

.status-error {
  background: rgba(232, 70, 58, 0.1);
  .status-text { color: #E8463A; }
}

.status-ready {
  background: rgba(29, 201, 129, 0.1);
  .status-text { color: #1DC981; }
}

.status-empty {
  background: $bg-color-grey;
  .status-text { color: $text-color-tertiary; }
}

.summary-body {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12rpx 0;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.04);

  &:last-child { border-bottom: none; }
}

.row-label {
  font-size: 24rpx;
  color: $text-color-secondary;
}

.row-value {
  font-size: 24rpx;
  color: $text-color-title;
  font-weight: 500;
}

.text-up { color: #f43f5e !important; }
.text-down { color: #22c55e !important; }

/* ===== 区块标题 ===== */
.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 $spacing-base;
  margin: $spacing-base 0 $spacing-sm;
}

.title-text {
  font-size: 28rpx;
  font-weight: 600;
  color: $text-color-title;
}

.title-more {
  font-size: 24rpx;
  color: $text-color-secondary;
}

/* ===== 状态 ===== */
.loading-state,
.empty-state,
.error-state {
  padding: 120rpx 0;
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.error-text {
  font-size: 28rpx;
  color: #374151;
  margin-top: 24rpx;
  font-weight: 500;
}

.error-desc {
  font-size: 24rpx;
  color: #9ca3af;
  margin-top: 12rpx;
}

.retry-btn {
  margin-top: 40rpx;
  padding: 16rpx 56rpx;
  font-size: 26rpx;
  color: #ffffff;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  border-radius: 40rpx;
}

/* ===== 分析列表 ===== */
.analysis-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  padding: 0 $spacing-base;
}

.analysis-card {
  background: #ffffff;
  border-radius: 16rpx;
  padding: $spacing-base;
  box-shadow: $shadow-card;
}

.card-header {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  margin-bottom: $spacing-sm;
}

.card-badge {
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
  flex-shrink: 0;

  &.buy { background: rgba(244, 63, 94, 0.1); .badge-text { color: #f43f5e; } }
  &.sell { background: rgba(34, 197, 94, 0.1); .badge-text { color: #22c55e; } }
  &.wash { background: rgba(239, 170, 23, 0.1); .badge-text { color: #EFAA17; } }
}

.badge-text {
  font-size: 22rpx;
  font-weight: 600;
}

.card-title {
  font-size: 26rpx;
  font-weight: 600;
  color: $text-color-title;
  flex: 1;
}

.card-content {
  margin-bottom: $spacing-sm;
}

.content-text {
  font-size: 24rpx;
  color: $text-color;
  line-height: 1.6;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: $spacing-sm;
  border-top: 1rpx solid rgba(0, 0, 0, 0.04);
}

.source-info {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.source-label {
  font-size: 22rpx;
  color: $text-color-tertiary;
}

.source-value {
  font-size: 22rpx;
  color: $text-color-secondary;
}

.time-text {
  font-size: 22rpx;
  color: $text-color-tertiary;
}

/* ===== 历史记录 ===== */
.history-list {
  margin: 0 $spacing-base;
  background: #ffffff;
  border-radius: 16rpx;
  padding: 0 $spacing-base;
  box-shadow: $shadow-card;
}

.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $spacing-sm 0;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.04);

  &:last-child { border-bottom: none; }
}

.history-left {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  flex: 1;
  min-width: 0;
}

.history-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  flex-shrink: 0;

  &.buy { background: #f43f5e; }
  &.sell { background: #22c55e; }
  &.wash { background: #EFAA17; }
}

.history-info {
  flex: 1;
  min-width: 0;
}

.history-title {
  font-size: 26rpx;
  color: $text-color-title;
  display: block;
}

.history-time {
  font-size: 22rpx;
  color: $text-color-tertiary;
  margin-top: 2rpx;
  display: block;
}

.history-arrow {
  font-size: 32rpx;
  color: $text-color-tertiary;
  flex-shrink: 0;
}
</style>
