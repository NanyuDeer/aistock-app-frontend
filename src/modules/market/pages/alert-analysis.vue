<template>
  <SubPageCard2 title="AI 异动解读" :subtitle="`${symbol} ${cycleLabel}`">
    <view class="page-alert-analysis">
      <!-- AI 播报卡片（最上方，有 podcast_brief 时显示） -->
      <PodcastCard
        v-if="podcastBrief"
        :text="podcastBrief"
        :cache-key="podcastCacheKey"
        title="AI 异动播报"
      />

      <!-- 状态徽标 + 强制刷新按钮 -->
      <view class="status-row">
        <view class="status-left">
          <Badge v-if="loading && !done" type="info" size="sm">分析中</Badge>
          <Badge v-else-if="done" type="success" size="sm">完成</Badge>
          <Badge v-if="done" type="info" size="sm">当日缓存</Badge>
        </view>
        <view v-if="done && !loading" class="refresh-btn" @click="forceRefresh">
          <SvgIcon name="refresh-line" size="24rpx" color="#4b5a7a" />
          <text class="refresh-text">重新分析</text>
        </view>
      </view>

      <!-- 错误状态 -->
      <Card v-if="error" class="error-section">
        <EmptyState title="分析失败" :description="error">
          <Button size="sm" @click="retry">重试</Button>
        </EmptyState>
      </Card>

      <template v-else>
        <!-- impact + keywords 标签行 -->
        <view v-if="impactBadgeType || displayKeywords.length" class="keywords-row">
          <Tag v-if="impactBadgeType" :type="impactBadgeType" size="sm">{{ impactLabel }}</Tag>
          <Tag
            v-for="(kw, idx) in displayKeywords"
            :key="idx"
            :type="keywordTagType(idx)"
            size="sm"
          >{{ kw }}</Tag>
        </view>

        <!-- 一句话速览 -->
        <Card v-if="summary || loading" class="summary-section">
          <view class="summary-header">
            <SvgIcon name="flashlight-line" size="24rpx" color="#92400e" />
            <text class="summary-title">一句话速览</text>
          </view>
          <view v-if="summary" class="summary-body">
            <text class="summary-text">{{ summary }}</text>
          </view>
          <view v-else class="summary-loading">
            <text class="summary-loading-text">正在提取核心结论...</text>
          </view>
        </Card>

        <!-- 分析进度 -->
        <view v-if="toolSteps.length" class="analysis-tools-section">
          <text class="section-label">分析进度</text>
          <view class="analysis-tools-list">
            <Tag
              v-for="(step, idx) in toolSteps"
              :key="idx"
              :type="step.endTime != null ? 'down' : 'neutral'"
              size="sm"
            >{{ step.label }}</Tag>
          </view>
        </view>

        <!-- 详细分析 -->
        <Card v-if="detailsHtml" class="content-section">
          <text class="section-label">详细分析</text>
          <view class="analysis-body">
            <mp-html :content="detailsHtml" class="analysis-html" />
          </view>
        </Card>

        <!-- 相关股票 -->
        <Card v-if="stocks.length" class="stocks-section">
          <text class="section-label">相关股票</text>
          <view class="stocks-list">
            <view
              v-for="(code, idx) in stocks"
              :key="idx"
              class="stock-chip"
              @click="goStock(code)"
            >
              <Tag type="neutral" size="sm">{{ code }}</Tag>
            </view>
          </view>
        </Card>

        <!-- 风险提示 -->
        <Card v-if="risks.length" class="risks-section">
          <view class="risks-header">
            <SvgIcon name="alert-line" size="24rpx" color="#dc2626" />
            <text class="risks-title">风险提示</text>
          </view>
          <view class="risks-list">
            <view v-for="(risk, idx) in risks" :key="idx" class="risk-item">
              <text class="risk-text">{{ risk }}</text>
            </view>
          </view>
        </Card>

        <!-- 加载中（初始，无结构化结果） -->
        <Card v-if="!summary && !detailsHtml && loading" class="content-section">
          <LoadingState text="AI 正在分析异动数据..." />
        </Card>

        <!-- 兜底：解析失败时用 raw 渲染 -->
        <Card v-if="!summary && !detailsHtml && rawContent && done" class="content-section">
          <text class="section-label">详细分析</text>
          <view class="analysis-body">
            <mp-html :content="rawHtml" class="analysis-html" />
          </view>
        </Card>
      </template>
    </view>
  </SubPageCard2>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useAlertSSE } from '@/modules/market/utils/useAlertSSE'
import { markdownToHtml } from '@/shared/utils/markdown'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import SubPageCard2 from '@/shared/components/SubPageCard2.vue'
import { LoadingState, EmptyState, Tag, Badge, Button, Card, PodcastCard } from '@/shared/components'
import mpHtml from 'mp-html/dist/uni-app/components/mp-html/mp-html'

const symbol = ref('')
const cycle = ref('')

const { content, toolSteps, loading, error, done, result, start, stop, loadFromCache } = useAlertSSE()

const cycleLabel = computed(() => {
  switch (cycle.value) {
    case 'short': return '短线分析'
    case 'mid': return '中线分析'
    case 'long': return '长线分析'
    default: return ''
  }
})

/** 结构化展示字段（来自 result 事件） */
const summary = computed(() => result.value?.displayReport?.summary || '')
const details = computed(() => result.value?.displayReport?.details || '')
const detailsHtml = computed(() => (details.value ? markdownToHtml(details.value) : ''))
const stocks = computed(() => result.value?.displayReport?.stocks || [])
const risks = computed(() => result.value?.displayReport?.risks || [])
const displayKeywords = computed(() => result.value?.displayReport?.keywords || [])
const podcastBrief = computed(() => result.value?.podcastBrief || '')
const rawContent = computed(() => result.value?.raw || content.value)
const rawHtml = computed(() => (rawContent.value ? markdownToHtml(rawContent.value) : ''))

/** impact 映射为 Badge/Tag 类型 */
const impactLabel = computed(() => {
  const impact = result.value?.displayReport?.impact || ''
  return impact
})

const impactBadgeType = computed<'up' | 'down' | 'neutral' | ''>(() => {
  const impact = result.value?.displayReport?.impact || ''
  if (impact.includes('利好')) return 'up'
  if (impact.includes('利空')) return 'down'
  if (impact.includes('中性')) return 'neutral'
  return ''
})

/** 播报缓存键：alert_{symbol}_{date} */
const podcastCacheKey = computed(() => {
  return `alert_${symbol.value}_${todayStr.value}`
})

/** 今日日期字符串 YYYY-MM-DD（上海时区） */
const todayStr = computed(() => {
  const now = new Date()
  // 用上海时区构造日期字符串（UTC+8）
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  const shanghai = new Date(utc + 8 * 3600000)
  const y = shanghai.getFullYear()
  const m = String(shanghai.getMonth() + 1).padStart(2, '0')
  const d = String(shanghai.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
})

function keywordTagType(idx: number): 'neutral' | 'warning' | 'up' | 'down' {
  const types: Array<'neutral' | 'warning' | 'up' | 'down'> = ['neutral', 'warning', 'up', 'down']
  return types[idx % 4]
}

function goStock(code: string) {
  uni.navigateTo({ url: `/modules/favorites/pages/detail?symbol=${code}` })
}

/** 进入页面：先查当日缓存，命中直接展示，未命中才 SSE 流式分析 */
async function begin() {
  loading.value = true
  const cached = await loadFromCache(symbol.value, todayStr.value)
  if (!cached) {
    // 缓存未命中，发起 SSE 流式分析
    start(symbol.value, cycle.value)
  }
}

/** 强制刷新：忽略缓存，重新发起 SSE 分析 */
function forceRefresh() {
  stop()
  result.value = null
  done.value = false
  error.value = ''
  start(symbol.value, cycle.value)
}

function retry() {
  stop()
  begin()
}

onLoad((options: any) => {
  symbol.value = options?.symbol || ''
  cycle.value = options?.cycle || ''
  if (symbol.value) {
    begin()
  }
})

onUnmounted(() => {
  stop()
})
</script>

<style lang="scss" scoped>
.page-alert-analysis {
  padding: $s-3;
  background: $bg-soft;
}

/* 状态徽标 + 强制刷新 */
.status-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $s-2;
}

.status-left {
  display: flex;
  gap: 8rpx;
  align-items: center;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 4rpx 12rpx;
  border-radius: $r-sm;
  background: $bg-soft;
  /* #ifdef H5 */
  cursor: pointer;
  /* #endif */
}

.refresh-text {
  font-size: 22rpx;
  color: $ink-soft;
}

/* 错误 */
.error-section {
  margin-bottom: $s-3;
}

/* 关键词标签行 */
.keywords-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-bottom: $s-3;
}

/* 一句话速览 */
.summary-section {
  margin-bottom: $s-3;
}

.summary-header {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 10rpx;
}

.summary-title { font-size: 24rpx; font-weight: 600; color: #92400e; }

.summary-text {
  font-size: 28rpx;
  color: $ink;
  line-height: 1.6;
  font-weight: 500;
}

.summary-loading {
  padding: 12rpx 0;
}

.summary-loading-text {
  font-size: 24rpx;
  color: $ink-mute;
}

/* 分析进度 */
.analysis-tools-section { margin-bottom: $s-3; }

.section-label {
  font-size: 24rpx;
  color: $ink-mute;
  margin-bottom: 10rpx;
  display: block;
  padding-left: 4rpx;
}

.analysis-tools-list { display: flex; flex-wrap: wrap; gap: 10rpx; }

/* 详细分析 */
.content-section {
  margin-bottom: $s-3;
}

.analysis-body { position: relative; }

.analysis-html {
  word-break: keep-all;
  overflow-wrap: break-word;
  :deep(h2.md-h2) {
    font-size: 32rpx; font-weight: 600; color: $ink;
    margin: 24rpx 0 16rpx; padding-bottom: 12rpx;
    border-bottom: 2rpx solid $line-soft;
  }
  :deep(h3.md-h3) { font-size: 28rpx; font-weight: 600; color: $ink-soft; margin: 20rpx 0 10rpx; }
  :deep(hr.md-hr) {
    border: none; height: 1rpx;
    background: linear-gradient(90deg, transparent, $line, transparent);
    margin: 20rpx 0;
  }
  :deep(strong) { color: $ink; font-weight: 600; }
  :deep(table.md-table) {
    width: 100%; border-collapse: collapse; margin: 12rpx 0;
    font-size: 24rpx; border-radius: 12rpx; overflow: hidden;
    th { background: $bg-soft; padding: 12rpx 16rpx; text-align: left; font-weight: 600; color: $primary; }
    td { padding: 10rpx 16rpx; border-bottom: 1rpx solid $line-soft; color: $ink-soft; }
    tr:last-child td { border-bottom: none; }
  }
  :deep(ol.md-ol), :deep(ul.md-ul) { padding-left: 32rpx; margin: 8rpx 0; }
  :deep(li) { font-size: 26rpx; color: $ink-soft; line-height: 1.8; }
}

/* 相关股票 */
.stocks-section {
  margin-bottom: $s-3;
}

.stocks-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.stock-chip {
  /* #ifdef H5 */
  cursor: pointer;
  /* #endif */
}

/* 风险提示 */
.risks-section {
  margin-bottom: $s-3;
}

.risks-header {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 10rpx;
}

.risks-title {
  font-size: 24rpx;
  font-weight: 600;
  color: #dc2626;
}

.risks-list {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.risk-item {
  background: $warning-bg;
  padding: 10rpx 16rpx;
  border-radius: $r-sm;
  border-left: 4rpx solid #dc2626;
}

.risk-text {
  font-size: 24rpx;
  color: $ink-soft;
  line-height: 1.5;
}
</style>
