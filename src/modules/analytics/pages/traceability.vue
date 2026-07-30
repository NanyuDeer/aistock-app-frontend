<template>
  <view class="page-traceability">
    <SubPageCard title="大盘溯源">
      <!-- 顶部摘要卡片 -->
      <Card class="summary-card">
        <view class="summary-header">
          <view class="summary-icon">
            <SvgIcon name="bar-chart-line" size="32rpx" color="#ffffff" />
          </view>
          <view class="summary-text">
            <text class="summary-title">今日大盘溯源</text>
            <text class="summary-desc">追溯市场异动的源头与传导路径</text>
          </view>
          <Badge :type="statusBadgeType">{{ statusText }}</Badge>
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
      </Card>

      <!-- 溯源分析内容 -->
      <view class="section-title">
        <text class="title-text">溯源分析</text>
      </view>

      <!-- 加载中 -->
      <LoadingState v-if="loading" />

      <!-- 错误状态 -->
      <Card v-else-if="error" class="error-state">
        <EmptyState title="分析数据获取失败" description="网络异常或服务暂时不可用，请稍后重试" icon="cloud-off-line">
          <Button size="sm" @click="retry">重试</Button>
        </EmptyState>
      </Card>

      <!-- 空状态 -->
      <EmptyState v-else-if="!analysisList.length" text="暂无溯源分析数据" />

      <!-- 溯源分析列表 -->
      <view v-else class="analysis-list">
        <Card
          v-for="(item, idx) in analysisList"
          :key="idx"
          class="analysis-card"
        >
          <view class="card-header">
            <Tag :type="badgeTagType(item.tagType)">{{ item.tagName }}</Tag>
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
        </Card>
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
import { LoadingState, EmptyState, Tag, Badge, Button, Card } from '@/shared/components'

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

// 状态徽章类型：loading→warning, error→danger, ready→success, empty→info
const statusBadgeType = computed<'warning' | 'danger' | 'success' | 'info'>(() => {
  if (loading.value) return 'warning'
  if (error.value) return 'danger'
  if (analysisList.value.length) return 'success'
  return 'info'
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

// A股红涨绿跌：buy(利好)→up(红), sell(利空)→down(绿), wash(关注)→warning(黄)
function badgeTagType(tagType: 'buy' | 'sell' | 'wash'): 'up' | 'down' | 'warning' {
  const map: Record<string, 'up' | 'down' | 'warning'> = {
    buy: 'up',
    sell: 'down',
    wash: 'warning'
  }
  return map[tagType] || 'warning'
}

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
  border-bottom: 1rpx solid $line-soft;

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

.text-up { color: $up !important; }
.text-down { color: $down !important; }

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

/* ===== 分析列表 ===== */
.analysis-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  padding: 0 $spacing-base;
}

.card-header {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  margin-bottom: $spacing-sm;
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
  border-top: 1rpx solid $line-soft;
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
  background: $bg-card;
  border-radius: 16rpx;
  padding: 0 $spacing-base;
  box-shadow: $shadow-card;
}

.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $spacing-sm 0;
  border-bottom: 1rpx solid $line-soft;

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

  &.buy { background: $up; }
  &.sell { background: $down; }
  &.wash { background: $warning; }
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
