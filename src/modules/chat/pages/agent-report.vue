<template>
  <SubPageCard2 :title="pageTitle" :subtitle="pageSubtitle">
    <!-- 从概览进入详情时，右上角显示"概览"按钮 -->
    <template v-if="canBackToOverview" #header-right>
      <Button type="ghost" size="sm" @click="backToOverview">概览</Button>
    </template>

    <view class="report-content-wrap">
      <!-- 加载中 -->
      <LoadingState v-if="loading" :text="loadingText" />

      <!-- 概览模式：Agent 简报卡片列表 -->
      <template v-else-if="isOverview">
        <view class="overview-header">
          <text class="overview-date">{{ date }} · 今日 AI 分析</text>
        </view>

        <view v-if="agentBriefs.length" class="brief-card-list">
          <Card
            v-for="brief in agentBriefs"
            :key="brief.intent"
            clickable
            class="brief-card"
            @click="selectAgent(brief.intent)"
          >
            <view class="brief-icon-wrap" :style="{ background: brief.bgColor }">
              <SvgIcon :name="brief.icon" size="36rpx" color="#ffffff" />
            </view>
            <view class="brief-body">
              <view class="brief-top">
                <text class="brief-title">{{ brief.title }}</text>
                <Tag :type="brief.available ? 'down' : 'neutral'" size="sm">
                  {{ brief.available ? '已更新' : '待生成' }}
                </Tag>
              </view>
              <text class="brief-desc">{{ brief.desc }}</text>
              <text v-if="brief.summary" class="brief-summary">{{ brief.summary }}</text>
              <text v-else class="brief-summary brief-summary-empty">报告生成后将显示摘要</text>
            </view>
            <SvgIcon v-if="brief.available" name="arrow-right-s-line" size="32rpx" color="#c0c4cc" />
          </Card>
        </view>

        <EmptyState v-else title="今日报告尚未生成" description="请在 9:10 后查看" icon="file-line" />
      </template>

      <!-- 详情模式：单个 Agent 报告 -->
      <view v-else-if="report" class="report-body">
        <text class="report-date">{{ reportDateText }}</text>

        <!-- ===== 晨报（morning）：4步框架结构化 ===== -->
        <template v-if="isMorningIntent && displayReport">
          <Card v-if="reportSummary" class="conclusion-card conclusion-card--morning">
            <text class="section-kicker">今日结论</text>
            <text class="conclusion-text">{{ reportSummary }}</text>
          </Card>

          <Card v-if="morningOverseas.length" class="stream-section">
            <text class="section-title">隔夜外盘回顾</text>
            <view class="bullet-list">
              <text v-for="(item, i) in morningOverseas" :key="i" class="bullet-item">{{ item }}</text>
            </view>
          </Card>

          <Card v-if="morningDomestic.length" class="stream-section">
            <text class="section-title">国内宏观要闻</text>
            <view class="bullet-list">
              <text v-for="(item, i) in morningDomestic" :key="i" class="bullet-item">{{ item }}</text>
            </view>
          </Card>

          <Card v-if="morningSector.length" class="stream-section">
            <text class="section-title">板块与市场情绪</text>
            <view class="bullet-list">
              <text v-for="(item, i) in morningSector" :key="i" class="bullet-item">{{ item }}</text>
            </view>
          </Card>

          <Card v-if="morningFocus.length" class="stream-section">
            <text class="section-title">今日焦点板块预测</text>
            <view class="bullet-list">
              <text v-for="(item, i) in morningFocus" :key="i" class="bullet-item">{{ item }}</text>
            </view>
          </Card>

          <Card v-if="morningStrategy" class="stream-section">
            <text class="section-title">今日关注与策略</text>
            <text class="section-text">{{ morningStrategy }}</text>
          </Card>

          <Card v-if="risks.length" class="risk-card stream-section">
            <text class="section-title">风险提示</text>
            <view class="bullet-list">
              <text v-for="(risk, i) in risks" :key="i" class="risk-item">{{ risk }}</text>
            </view>
          </Card>
        </template>

        <!-- ===== 长线风口（wind_leader）：板块子卡片结构化 ===== -->
        <template v-else-if="effectiveIntent === 'wind_leader' && displayReport">
          <Card v-if="reportSummary" class="conclusion-card conclusion-card--wind">
            <text class="section-kicker">风口结论</text>
            <text class="conclusion-text">{{ reportSummary }}</text>
          </Card>

          <Card v-if="windOverview" class="stream-section">
            <text class="section-title">风口概览</text>
            <text class="section-text">{{ windOverview }}</text>
          </Card>

          <Card v-if="windSectors.length" class="stream-section">
            <text class="section-title">重点板块分析 TOP{{ windSectors.length }}</text>
            <view class="stock-list">
              <Card v-for="(sector, i) in windSectors" :key="i" flat class="stock-card">
                <view class="stock-card-head">
                  <text class="stock-name">{{ sector.title }}</text>
                </view>
                <text v-if="sector.body" class="stock-description">{{ sector.body }}</text>
              </Card>
            </view>
          </Card>

          <Card v-if="windStocks.length" class="stream-section">
            <text class="section-title">龙头股推荐</text>
            <view class="stock-tags">
              <Tag v-for="(code, i) in leaderStocks" :key="i" size="sm">{{ code }}</Tag>
            </view>
          </Card>

          <Card v-if="risks.length" class="risk-card stream-section">
            <text class="section-title">风险提示</text>
            <view class="bullet-list">
              <text v-for="(risk, i) in risks" :key="i" class="risk-item">{{ risk }}</text>
            </view>
          </Card>
        </template>

        <!-- ===== 趋势股评分（trend_score）：多维度结构化 ===== -->
        <template v-else-if="effectiveIntent === 'trend_score' && displayReport">
          <Card v-if="reportSummary" class="conclusion-card conclusion-card--trend">
            <text class="section-kicker">评分结论</text>
            <text class="conclusion-text">{{ reportSummary }}</text>
          </Card>

          <Card v-if="trendConclusion" class="stream-section">
            <text class="section-title">结论摘要</text>
            <text class="section-text">{{ trendConclusion }}</text>
          </Card>

          <Card v-if="trendDimensions" class="stream-section">
            <text class="section-title">维度解读</text>
            <text class="section-text">{{ trendDimensions }}</text>
          </Card>

          <Card v-if="trendJudgment" class="stream-section">
            <text class="section-title">趋势判断</text>
            <text class="section-text">{{ trendJudgment }}</text>
          </Card>

          <Card v-if="trendTrack" class="stream-section">
            <text class="section-title">赛道分析</text>
            <text class="section-text">{{ trendTrack }}</text>
          </Card>

          <Card v-if="leaderStocks.length" class="stream-section">
            <text class="section-title">相关个股</text>
            <view class="stock-tags">
              <Tag v-for="code in leaderStocks" :key="code" size="sm">{{ code }}</Tag>
            </view>
          </Card>

          <Card v-if="trendAdvice" class="judgment-card stream-section">
            <text class="section-title">关注建议</text>
            <text class="section-text">{{ trendAdvice }}</text>
          </Card>

          <Card v-if="risks.length" class="risk-card stream-section">
            <text class="section-title">风险提示</text>
            <view class="bullet-list">
              <text v-for="(risk, i) in risks" :key="i" class="risk-item">{{ risk }}</text>
            </view>
          </Card>
        </template>

        <!-- ===== 兜底：其他 intent（hot_burst 等）用 mp-html 渲染 ===== -->
        <template v-else-if="displayReport">
          <Card v-if="reportSummary" class="conclusion-card">
            <text class="section-kicker">今日结论</text>
            <text class="conclusion-text">{{ reportSummary }}</text>
          </Card>

          <Card v-if="leaderStocks.length" class="stream-section">
            <text class="section-title">相关个股</text>
            <view class="stock-tags">
              <Tag v-for="code in leaderStocks" :key="code" size="sm">{{ code }}</Tag>
            </view>
          </Card>

          <Card v-if="detailsText" class="stream-section">
            <text class="section-title">详细分析</text>
            <view class="report-text-wrap">
              <mp-html :content="markdownToHtml(detailsText)" class="report-html" />
            </view>
          </Card>

          <Card v-if="risks.length" class="risk-card stream-section">
            <text class="section-title">风险提示</text>
            <view class="bullet-list">
              <text v-for="(risk, i) in risks" :key="i" class="risk-item">{{ risk }}</text>
            </view>
          </Card>
        </template>

        <!-- 纯文本展示（broadcast 等） -->
        <template v-else>
          <Card class="stream-section">
            <view class="report-text-wrap">
              <text class="report-text">{{ reportText }}</text>
            </view>
          </Card>
        </template>
      </view>

      <!-- 无报告 -->
      <EmptyState v-else title="今日报告尚未生成" description="请在 9:10 后查看" icon="file-line" />
    </view>
  </SubPageCard2>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad, onBackPress } from '@dcloudio/uni-app'
import { agentApi, isPublicReportIntent } from '@/shared/api/modules/agent'
import { markdownToHtml } from '@/shared/utils/markdown'
import { formatDate, formatDateTime } from '@/shared/utils/datetime'
import { shanghaiDateString } from '@/shared/utils/tradingTime'
import SubPageCard2 from '@/shared/components/SubPageCard2.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import { LoadingState, EmptyState, Card, Tag, Button } from '@/shared/components'
import mpHtml from 'mp-html/dist/uni-app/components/mp-html/mp-html'

// ===== Markdown 分区解析工具（参考 hot-burst-report 模式）=====
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** 提取 ## 标题下的内容（到下一个 ## 或末尾） */
function extractSection(markdown: string, heading: string): string {
  const match = markdown.match(new RegExp(`^##\\s+${escapeRegExp(heading)}\\s*\\n([\\s\\S]*?)(?=^##\\s+|(?![\\s\\S]))`, 'm'))
  return match?.[1]?.trim() || ''
}

/** 清理 Markdown 行：去除列表符号和加粗 */
function cleanLine(value: string): string {
  return value.replace(/^[-*]\s+/, '').replace(/\*\*/g, '').replace(/`/g, '').trim()
}

/** 将 section 内容按行解析为 bullet 数组 */
function sectionBullets(markdown: string, heading: string): string[] {
  return extractSection(markdown, heading).split('\n').map(cleanLine).filter(Boolean)
}

/** 将 section 内容合并为纯文本段落 */
function sectionText(markdown: string, heading: string): string {
  return extractSection(markdown, heading).split('\n').map(cleanLine).filter(Boolean).join(' ')
}

/** 提取 ### 三级标题下的子区块（用于板块/股票子卡片） */
function extractSubSections(markdown: string, heading: string): Array<{ title: string; body: string }> {
  const section = extractSection(markdown, heading)
  if (!section) return []
  const headings = [...section.matchAll(/^###\s+(.+?)\s*$/gm)]
  return headings.map((h, i) => {
    const title = h[1].trim()
    const bodyStart = (h.index || 0) + h[0].length
    const bodyEnd = headings[i + 1]?.index ?? section.length
    return { title, body: section.slice(bodyStart, bodyEnd).trim() }
  })
}

/** 从子块 body 中提取 **字段名**：值 */
function extractField(body: string, label: string): string {
  const match = body.match(new RegExp(`^[-*]?\\s*\\*\\*${escapeRegExp(label)}\\*\\*[：:]?\\s*([\\s\\S]*?)(?=\\n[-*]?\\s*\\*\\*|(?![\\s\\S]))`, 'm'))
  return match ? cleanLine(match[1]) : ''
}

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

// ===== 晨报（morning）结构化分区 =====
const morningOverseas = computed(() => sectionBullets(detailsText.value, '第1步：隔夜外盘回顾'))
const morningDomestic = computed(() => sectionBullets(detailsText.value, '第2步：国内宏观要闻'))
const morningSector = computed(() => sectionBullets(detailsText.value, '第3步：板块与市场情绪'))
const morningFocus = computed(() => sectionBullets(detailsText.value, '今日焦点板块预测'))
const morningStrategy = computed(() => sectionText(detailsText.value, '第4步：今日关注与策略建议'))

// ===== 长线风口（wind_leader）结构化分区 =====
interface SectorCard { title: string; body: string }
const windOverview = computed(() => sectionText(detailsText.value, '风口概览'))
const windSectors = computed<SectorCard[]>(() => extractSubSections(detailsText.value, '重点板块分析'))
const windStocks = computed(() => sectionBullets(detailsText.value, '龙头股推荐'))

// ===== 趋势股评分（trend_score）结构化分区 =====
const trendConclusion = computed(() => sectionText(detailsText.value, '结论摘要'))
const trendDimensions = computed(() => sectionText(detailsText.value, '维度解读'))
const trendJudgment = computed(() => sectionText(detailsText.value, '趋势判断'))
const trendTrack = computed(() => sectionText(detailsText.value, '赛道分析'))
const trendAdvice = computed(() => sectionText(detailsText.value, '关注建议'))

/** intent 主题色映射（用于结论卡渐变和左边框） */
const intentThemeColor = computed(() => {
  const map: Record<string, string> = {
    morning: '$warning',
    wind_leader: '$primary',
    trend_score: '$success',
  }
  return map[effectiveIntent.value] || '$primary'
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
    report.value = null
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
  date.value = options?.date || shanghaiDateString()

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

/* 概览模式 */
.overview-header {
  margin-bottom: 24rpx;
}

.overview-date {
  font-size: 24rpx;
  color: $ink-mute;
}

.brief-card-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

/* 概览卡片边框：与其他卡片保持一致的 $line 边界 */
.brief-card {
  border: 2rpx solid $line;
}

.brief-card :deep(.as-card__body) {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
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
  color: $ink;
}

.brief-desc {
  font-size: 24rpx;
  color: $ink-mute;
  display: block;
  margin-bottom: 8rpx;
}

.brief-summary {
  font-size: 26rpx;
  color: $ink-soft;
  line-height: 1.6;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.brief-summary-empty {
  color: $ink-mute;
  font-style: italic;
}

/* 晨报摘要盒（Card 已处理容器，保留渐变背景和左边框强调） */
.summary-box {
  background: linear-gradient(135deg, $warning-soft 0%, $gold-soft 100%);
  border-left: 6rpx solid $warning;
  margin-bottom: 28rpx;
}

.summary-text {
  font-size: 28rpx;
  line-height: 1.6;
  color: $warning;
  font-weight: 500;
}

.report-date {
  font-size: 24rpx;
  color: $ink-mute;
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
  color: $ink;
  margin-bottom: 16rpx;
  display: block;
}

.stock-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
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
  color: $ink;
  line-height: 1.8;
}
:deep(.md-h2) { font-size: 32rpx; font-weight: 600; margin: 16rpx 0 8rpx; }
:deep(.md-h3) { font-size: 30rpx; font-weight: 600; margin: 12rpx 0 6rpx; }
:deep(.md-hr) { border: none; border-top: 1rpx solid $line; margin: 12rpx 0; }
:deep(.md-ul) { padding-left: 20rpx; margin: 8rpx 0; }
:deep(.md-ol) { padding-left: 20rpx; margin: 8rpx 0; }
:deep(.md-ul-li) { font-size: 28rpx; color: $ink; line-height: 1.8; }
:deep(.md-ol-li) { font-size: 28rpx; color: $ink; line-height: 1.8; }

.report-text {
  font-size: 28rpx;
  line-height: 1.8;
  color: $ink;
  white-space: pre-wrap;
}

/* ===== 参考 hot-burst-report 规整排版：流式动画、主题色、结构化列表 ===== */
.report-body {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

/* 流式入场动画：每个 stream-section 逐块淡入 */
.stream-section {
  animation: section-in 0.28s ease-out both;
}

@keyframes section-in {
  from { opacity: 0; transform: translateY(12rpx); }
  to { opacity: 1; transform: translateY(0); }
}

/* 结论卡片：kicker + 主题色变体 */
.section-kicker {
  display: block;
  margin-bottom: 10rpx;
  font-size: 22rpx;
  font-weight: 600;
  letter-spacing: 1rpx;
}

.conclusion-text {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  line-height: 1.5;
  color: $ink;
}

/* 晨报主题色：橙色（与 AGENT_META.morning 一致） */
.conclusion-card--morning {
  border-left: 6rpx solid #f59e0b;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.06), rgba(245, 158, 11, 0.02));

  .section-kicker { color: #f59e0b; }
}

/* 长线风口主题色：紫色 */
.conclusion-card--wind {
  border-left: 6rpx solid #8b5cf6;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.06), rgba(139, 92, 246, 0.02));

  .section-kicker { color: #8b5cf6; }
}

/* 趋势股评分主题色：绿色 */
.conclusion-card--trend {
  border-left: 6rpx solid #10b981;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.06), rgba(16, 185, 129, 0.02));

  .section-kicker { color: #10b981; }
}

/* 默认 conclusion-card（兜底模板）使用主品牌色 */
.conclusion-card {
  border-left: 6rpx solid $primary;

  .section-kicker { color: $primary; }
}

/* 列表：bullet 项目符号 + 间距 */
.bullet-list {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.bullet-item {
  display: block;
  font-size: 25rpx;
  line-height: 1.65;
  color: $ink-soft;

  &::before {
    content: '•';
    margin-right: 10rpx;
    color: $primary;
  }
}

/* 段落文本 */
.section-text {
  display: block;
  font-size: 25rpx;
  line-height: 1.65;
  color: $ink-soft;
}

/* 子卡片列表（长线风口板块、机构调研个股等） */
.stock-list {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.stock-card {
  padding: 20rpx;
  background: $bg-soft;
  border-radius: $r-sm;
  border: 1rpx solid $line-soft;
}

.stock-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 8rpx;
}

.stock-name {
  font-size: 30rpx;
  font-weight: 600;
  color: $ink;
}

.stock-description {
  display: block;
  font-size: 24rpx;
  line-height: 1.65;
  color: $ink-soft;
}

/* 判断卡片：左边框强调（关注建议、持续性判断等） */
.judgment-card {
  border-left: 6rpx solid $primary;
}

/* 风险卡片：红色调强调 */
.risk-card {
  border-left: 6rpx solid $up;
  background: linear-gradient(135deg, rgba(224, 69, 69, 0.04), rgba(224, 69, 69, 0.01));

  .section-title { color: $up; }

  .risk-item {
    display: block;
    font-size: 25rpx;
    line-height: 1.65;
    color: $ink-soft;
    margin-bottom: 12rpx;

    &::before {
      content: '!';
      margin-right: 8rpx;
      font-weight: 600;
      color: $up;
    }

    &:last-child { margin-bottom: 0; }
  }
}

.risk-item {
  margin-bottom: 12rpx;
}

.risk-text {
  font-size: 26rpx;
  line-height: 1.6;
  color: $ink-soft;
}
</style>
