<template>
  <SubPageCard2 :title="pageTitle" :subtitle="pageSubtitle">
    <!-- 从概览进入详情时，右上角显示"概览"按钮 -->
    <template v-if="canBackToOverview" #header-right>
      <view class="back-overview-btn" @tap="backToOverview">
        <text class="back-overview-text">概览</text>
      </view>
    </template>

    <view class="report-content-wrap">
      <!-- 加载中 -->
      <view v-if="loading" class="loading-state">
        <text class="loading-text">{{ loadingText }}</text>
      </view>

      <!-- 概览模式：Agent 简报卡片列表 -->
      <template v-else-if="isOverview">
        <view class="overview-header">
          <text class="overview-date">{{ date }} · 今日 AI 分析</text>
        </view>

        <view v-if="agentBriefs.length" class="brief-card-list">
          <view
            v-for="brief in agentBriefs"
            :key="brief.intent"
            class="brief-card"
            @tap="selectAgent(brief.intent)"
          >
            <view class="brief-icon-wrap" :style="{ background: brief.bgColor }">
              <SvgIcon :name="brief.icon" size="36rpx" color="#ffffff" />
            </view>
            <view class="brief-body">
              <view class="brief-top">
                <text class="brief-title">{{ brief.title }}</text>
                <text :class="['brief-status', brief.available ? 'ready' : 'pending']">
                  {{ brief.available ? '已更新' : '待生成' }}
                </text>
              </view>
              <text class="brief-desc">{{ brief.desc }}</text>
              <text v-if="brief.summary" class="brief-summary">{{ brief.summary }}</text>
              <text v-else class="brief-summary brief-summary-empty">报告生成后将显示摘要</text>
            </view>
            <SvgIcon v-if="brief.available" name="arrow-right-s-line" size="32rpx" color="#c0c4cc" />
          </view>
        </view>

        <view v-else class="empty-state">
          <SvgIcon name="file-line" size="80rpx" color="#9ca3af" />
          <text class="empty-text">今日报告尚未生成</text>
          <text class="empty-hint">请在 9:10 后查看</text>
        </view>
      </template>

      <!-- 详情模式：单个 Agent 报告 -->
      <view v-else-if="report" class="report-body">
        <text class="report-date">{{ reportDateText }}</text>

        <!-- morning 晨报：摘要 + 详情 + 风险（不显示龙头股票，避免与长线风口混淆） -->
        <template v-if="isMorningIntent && displayReport">
          <view v-if="reportSummary" class="summary-box">
            <text class="summary-text">{{ reportSummary }}</text>
          </view>

          <view v-if="detailsText" class="section">
            <text class="section-title">详细分析</text>
            <view class="report-text-wrap">
              <mp-html :content="markdownToHtml(detailsText)" class="report-html" />
            </view>
          </view>

          <view v-if="risks.length" class="section">
            <text class="section-title">风险提示</text>
            <view v-for="(risk, idx) in risks" :key="idx" class="risk-item">
              <text class="risk-text">· {{ risk }}</text>
            </view>
          </view>
        </template>

        <!-- wind_leader / hot_burst / trend_score: 结构化展示（龙头股票+详细分析+风险提示） -->
        <template v-else-if="displayReport">
          <!-- 龙头股票 -->
          <view v-if="leaderStocks.length" class="section">
            <text class="section-title">龙头股票</text>
            <view class="stock-tags">
              <view v-for="code in leaderStocks" :key="code" class="stock-tag">
                <text class="stock-tag-text">{{ code }}</text>
              </view>
            </view>
          </view>

          <!-- 详细分析 -->
          <view v-if="detailsText" class="section">
            <text class="section-title">详细分析</text>
            <view class="report-text-wrap">
              <mp-html :content="markdownToHtml(detailsText)" class="report-html" />
            </view>
          </view>

          <!-- 风险提示 -->
          <view v-if="risks.length" class="section">
            <text class="section-title">风险提示</text>
            <view v-for="(risk, idx) in risks" :key="idx" class="risk-item">
              <text class="risk-text">· {{ risk }}</text>
            </view>
          </view>
        </template>

        <!-- 纯文本展示（broadcast 等） -->
        <template v-else>
          <view class="report-text-wrap">
            <text class="report-text">{{ reportText }}</text>
          </view>
        </template>
      </view>

      <!-- 无报告 -->
      <view v-else class="empty-state">
        <SvgIcon name="file-line" size="80rpx" color="#9ca3af" />
        <text class="empty-text">今日报告尚未生成</text>
        <text class="empty-hint">请在 9:10 后查看</text>
      </view>
    </view>
  </SubPageCard2>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad, onBackPress } from '@dcloudio/uni-app'
import { agentApi } from '@/shared/api/modules/agent'
import { markdownToHtml } from '@/shared/utils/markdown'
import { formatDate, formatDateTime } from '@/shared/utils/datetime'
import SubPageCard2 from '@/shared/components/SubPageCard2.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import mpHtml from 'mp-html/dist/uni-app/components/mp-html/mp-html'
import agentOverviewMock from '../mock/agent-overview.json'

interface DisplayReport {
  risks?: string[]
  stocks?: string[]
  details?: string
  summary?: string
}

interface AgentReport {
  report_type: string
  report_date: string
  created_at?: string
  content: {
    text?: string
    audio_path?: string | null
    display_report?: DisplayReport
    podcast_brief?: string
    schema_version?: string
  }
}

/** Agent 元信息：标题、图标、主题色、描述 */
interface AgentMeta {
  title: string
  icon: string
  color: string
  bgColor: string
  desc: string
}

const AGENT_META: Record<string, AgentMeta> = {
  morning: { title: '今日晨报', icon: 'sun-line', color: '#f59e0b', bgColor: '#f59e0b', desc: '每日开盘前市场概览' },
  wind_leader: { title: '长线风口', icon: 'windy-line', color: '#8b5cf6', bgColor: '#8b5cf6', desc: '中长期赛道与龙头股追踪' },
  hot_burst: { title: '机构调研', icon: 'eye-line', color: '#f97316', bgColor: '#f97316', desc: '机构调研热门股分析' },
  trend_score: { title: '趋势股评分', icon: 'line-chart-line', color: '#10b981', bgColor: '#10b981', desc: '趋势形态评分排名' },
  broadcast: { title: '双人播报', icon: 'broadcast-line', color: '#06b6d4', bgColor: '#06b6d4', desc: 'AI 双人对话播报' },
}

/** 概览模式下的 Agent 顺序（不含 broadcast，用户不需要在概览中看到双人播报） */
const OVERVIEW_ORDER = ['morning', 'wind_leader', 'hot_burst', 'trend_score']

const titleMap: Record<string, string> = {
  morning: '今日晨报',
  wind_leader: '长线风口分析',
  hot_burst: '机构调研分析',
  trend_score: '趋势股评分分析',
  broadcast: '双人播报',
}

// URL 参数（从其他页面跳转时携带）
const intent = ref('')
const date = ref('')

// 概览→详情切换状态
const selectedIntent = ref('')

const loading = ref(true)
const loadingText = ref('报告加载中...')
const report = ref<AgentReport | null>(null)

// 概览模式数据
interface AgentBrief {
  intent: string
  title: string
  icon: string
  color: string
  bgColor: string
  desc: string
  summary: string
  available: boolean
}
const agentBriefs = ref<AgentBrief[]>([])

/** 当前是否处于概览模式 */
const isOverview = computed(() => !selectedIntent.value && !intent.value)

/** 是否可以返回概览（从概览进入详情时） */
const canBackToOverview = computed(() => !intent.value && !!selectedIntent.value)

/** 当前生效的 intent */
const effectiveIntent = computed(() => selectedIntent.value || intent.value)

const pageTitle = computed(() => {
  if (isOverview.value) return '今日分析概览'
  return titleMap[effectiveIntent.value] || '分析报告'
})

const pageSubtitle = computed(() => {
  if (isOverview.value) {
    return `${date.value} · AI 生成内容，仅供参考`
  }
  // 优先用 created_at（实际生成时间），后端已用 AT TIME ZONE 'UTC' 修正为真UTC
  if (report.value?.created_at) {
    return `${formatDateTime(report.value.created_at)} · AI 生成内容，仅供参考`
  }
  // 降级：report_date 为 DATE（pg 返回上海午夜 Date），formatDate 转上海日期
  if (report.value?.report_date) {
    return `${formatDate(report.value.report_date)} · AI 生成内容，仅供参考`
  }
  return 'AI 生成内容，仅供参考'
})

const reportDateText = computed(() => {
  // 优先用 created_at（实际生成时间，含时分），降级用 report_date（仅日期）
  if (report.value?.created_at) {
    return formatDateTime(report.value.created_at)
  }
  if (report.value?.report_date) {
    return formatDate(report.value.report_date)
  }
  return ''
})

// wind_leader / hot_burst / trend_score 的结构化数据
const displayReport = computed(() => {
  return report.value?.content?.display_report || null
})

/** 当前是否为晨报（晨报使用专属布局：摘要+详情+风险，不显示龙头股票） */
const isMorningIntent = computed(() => effectiveIntent.value === 'morning')

/** 报告摘要（display_report.summary） */
const reportSummary = computed(() => {
  return displayReport.value?.summary || ''
})

const leaderStocks = computed(() => {
  return displayReport.value?.stocks || []
})

const risks = computed(() => {
  return displayReport.value?.risks || []
})

const detailsText = computed(() => {
  return displayReport.value?.details || ''
})

// broadcast / morning 的纯文本
const reportText = computed(() => {
  return report.value?.content?.text || ''
})

/** 从 AgentReport 提取简报摘要 */
function extractSummary(reportData: AgentReport): string {
  const content = reportData.content
  if (!content) return ''
  // 优先用 display_report.summary
  if (content.display_report?.summary) {
    return content.display_report.summary
  }
  // 其次用 podcast_brief
  if (content.podcast_brief) {
    return content.podcast_brief.length > 80
      ? content.podcast_brief.slice(0, 80) + '...'
      : content.podcast_brief
  }
  // 最后用 text 前80字
  if (content.text) {
    return content.text.length > 80
      ? content.text.slice(0, 80) + '...'
      : content.text
  }
  return ''
}

/** 加载所有 Agent 报告（概览模式） */
async function loadAllReports() {
  loading.value = true
  loadingText.value = '正在加载今日分析...'

  const results = await Promise.allSettled(
    OVERVIEW_ORDER.map((agentIntent) => agentApi.getReport(agentIntent, date.value))
  )

  const briefs: AgentBrief[] = OVERVIEW_ORDER.map((agentIntent, idx) => {
    const meta = AGENT_META[agentIntent]
    const result = results[idx]

    let summary = ''
    let available = false

    if (result.status === 'fulfilled' && result.value) {
      const data = result.value as AgentReport
      if (data?.content) {
        summary = extractSummary(data)
        available = true
      }
    } else if (import.meta.env.DEV) {
      // DEV 环境降级到 mock 数据
      const mockData = (agentOverviewMock as Record<string, AgentReport>)[agentIntent]
      if (mockData?.content) {
        summary = extractSummary(mockData)
        available = true
      }
    }

    return {
      intent: agentIntent,
      title: meta.title,
      icon: meta.icon,
      color: meta.color,
      bgColor: meta.bgColor,
      desc: meta.desc,
      summary,
      available,
    }
  })

  agentBriefs.value = briefs
  loading.value = false
}

/** 加载单个 Agent 报告（详情模式） */
async function loadReport() {
  const currentIntent = effectiveIntent.value
  if (!currentIntent || !date.value) return
  loading.value = true
  loadingText.value = '报告加载中...'
  try {
    const res: unknown = await agentApi.getReport(currentIntent, date.value)
    report.value = (res as AgentReport) || null
  } catch {
    // DEV 环境降级到 mock 数据
    if (import.meta.env.DEV) {
      const mockData = (agentOverviewMock as Record<string, AgentReport>)[currentIntent]
      report.value = mockData || null
    } else {
      report.value = null
    }
  } finally {
    loading.value = false
  }
}

/** 点击简报卡片，进入详情 */
function selectAgent(agentIntent: string) {
  selectedIntent.value = agentIntent
  report.value = null
  loadReport()
}

/** 返回概览 */
function backToOverview() {
  selectedIntent.value = ''
  report.value = null
  // 如果已有缓存数据则不重新加载
  if (!agentBriefs.value.length) {
    loadAllReports()
  }
}

onLoad((options) => {
  const requestedIntent = options?.intent || ''
  intent.value = isPublicReportIntent(requestedIntent) ? requestedIntent : ''
  date.value = options?.date || new Date().toISOString().split('T')[0]

  if (intent.value) {
    // 从 URL 参数直接进入详情
    loadReport()
  } else {
    // 无 intent 参数 → 概览模式
    loadAllReports()
  }
})

// 拦截返回键：从概览进入详情时，返回应回到概览而非退出页面
onBackPress(() => {
  if (canBackToOverview.value) {
    backToOverview()
    return true // 阻止默认返回
  }
  return false // 概览模式或 URL 直接进入详情，正常返回
})
</script>

<style lang="scss" scoped>
.report-content-wrap {
  padding: 32rpx;
}

/* 返回概览按钮 */
.back-overview-btn {
  padding: 8rpx 20rpx;
}

.back-overview-text {
  font-size: 26rpx;
  color: #2563eb;
}

/* 加载中 */
.loading-state {
  display: flex;
  justify-content: center;
  padding: 120rpx 0;
}

.loading-text {
  font-size: 28rpx;
  color: #6b7280;
}

/* 概览模式 */
.overview-header {
  margin-bottom: 24rpx;
}

.overview-date {
  font-size: 24rpx;
  color: #9ca3af;
}

.brief-card-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.brief-card {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
  background: #ffffff;
  border-radius: 20rpx;
  padding: 28rpx 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.brief-icon-wrap {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.brief-body {
  flex: 1;
  min-width: 0;
}

.brief-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}

.brief-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1d24;
}

.brief-status {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;

  &.ready {
    background: #ecfdf5;
    color: #10b981;
  }

  &.pending {
    background: #f3f4f6;
    color: #9ca3af;
  }
}

.brief-desc {
  font-size: 24rpx;
  color: #9ca3af;
  display: block;
  margin-bottom: 8rpx;
}

.brief-summary {
  font-size: 26rpx;
  color: #4b5563;
  line-height: 1.6;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.brief-summary-empty {
  color: #d1d5db;
  font-style: italic;
}

/* 详情模式 */
.report-body {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 32rpx;
}

/* 晨报摘要盒 */
.summary-box {
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
  border-left: 6rpx solid #f59e0b;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 28rpx;
}

.summary-text {
  font-size: 28rpx;
  line-height: 1.6;
  color: #92400e;
  font-weight: 500;
}

.report-date {
  font-size: 24rpx;
  color: #9ca3af;
  margin-bottom: 24rpx;
  display: block;
}

.section {
  margin-bottom: 32rpx;

  &:last-child {
    margin-bottom: 0;
  }
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1d24;
  margin-bottom: 16rpx;
  display: block;
}

.stock-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.stock-tag {
  background: #eff6ff;
  border-radius: 12rpx;
  padding: 8rpx 20rpx;
}

.stock-tag-text {
  font-size: 26rpx;
  color: #2563eb;
  font-weight: 500;
}

.report-text-wrap {
  margin-top: 8rpx;
}

/* mp-html 样式覆盖：keep-all 必须覆盖到内部所有子元素（p/div/span 等） */
:deep(.report-html),
:deep(.report-html *) {
  word-break: keep-all;
  overflow-wrap: break-word;
}
:deep(.report-html) {
  font-size: 28rpx;
  color: #1a1d24;
  line-height: 1.8;
}
:deep(.md-h2) { font-size: 32rpx; font-weight: 600; margin: 16rpx 0 8rpx; }
:deep(.md-h3) { font-size: 30rpx; font-weight: 600; margin: 12rpx 0 6rpx; }
:deep(.md-hr) { border: none; border-top: 1rpx solid #e5e7eb; margin: 12rpx 0; }
:deep(.md-ul) { padding-left: 20rpx; margin: 8rpx 0; }
:deep(.md-ol) { padding-left: 20rpx; margin: 8rpx 0; }
:deep(.md-ul-li) { font-size: 28rpx; color: #1a1d24; line-height: 1.8; }
:deep(.md-ol-li) { font-size: 28rpx; color: #1a1d24; line-height: 1.8; }

.report-text {
  font-size: 28rpx;
  line-height: 1.8;
  color: #1a1d24;
  white-space: pre-wrap;
}

.risk-item {
  margin-bottom: 12rpx;
}

.risk-text {
  font-size: 26rpx;
  line-height: 1.6;
  color: #6b7280;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
}

.empty-text {
  font-size: 28rpx;
  color: #6b7280;
  margin-top: 24rpx;
  margin-bottom: 12rpx;
}

.empty-hint {
  font-size: 22rpx;
  color: #9ca3af;
}
</style>
