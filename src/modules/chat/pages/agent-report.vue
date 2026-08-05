<template>
  <SubPageCard2 :title="pageTitle" :subtitle="pageSubtitle">
    <!-- 右上角：播报按钮（有播报稿时）+ 概览按钮（从概览进入详情时） -->
    <template v-if="canBackToOverview || podcastBriefForFloating" #header-right>
      <view class="header-right-actions">
        <view v-if="podcastBriefForFloating" class="header-podcast-btn" @tap="openFloatingPodcast">
          <SvgIcon name="broadcast-line" size="30rpx" color="#0b5fff" />
        </view>
        <Button v-if="canBackToOverview" type="ghost" size="sm" @click="backToOverview">概览</Button>
      </view>
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

        <EmptyState v-else title="当日报告尚未生成" description="请切换日期或于 9:10 后查看" icon="file-line" />
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

          <Card v-if="morningOverseasHtml" class="stream-section">
            <text class="section-title">隔夜外盘回顾</text>
            <view class="report-text-wrap">
              <mp-html :content="morningOverseasHtml" class="report-html" />
            </view>
          </Card>

          <Card v-if="morningDomesticHtml" class="stream-section">
            <text class="section-title">国内宏观要闻</text>
            <view class="report-text-wrap">
              <mp-html :content="morningDomesticHtml" class="report-html" />
            </view>
          </Card>

          <Card v-if="morningSectorHtml" class="stream-section">
            <text class="section-title">板块与市场情绪</text>
            <view class="report-text-wrap">
              <mp-html :content="morningSectorHtml" class="report-html" />
            </view>
          </Card>

          <Card v-if="morningFocusHtml" class="stream-section">
            <text class="section-title">今日焦点板块预测</text>
            <view class="report-text-wrap">
              <mp-html :content="morningFocusHtml" class="report-html" />
            </view>
          </Card>

          <Card v-if="morningStrategyHtml" class="stream-section">
            <text class="section-title">今日关注与策略</text>
            <view class="report-text-wrap">
              <mp-html :content="morningStrategyHtml" class="report-html" />
            </view>
          </Card>

          <Card v-if="risks.length" class="risk-card stream-section">
            <text class="section-title">风险提示</text>
            <view class="bullet-list">
              <text v-for="(risk, i) in risks" :key="i" class="risk-item">{{ risk }}</text>
            </view>
          </Card>
        </template>

        <!-- ===== 风口龙头（wind_leader）：mp-html 全文渲染 + 结构化增强 ===== -->
        <template v-else-if="effectiveIntent === 'wind_leader' && displayReport">
          <Card v-if="reportSummary" class="conclusion-card conclusion-card--wind">
            <text class="section-kicker">风口结论</text>
            <text class="conclusion-text">{{ reportSummary }}</text>
            <text class="cycle-hint">长线风口=长线影响≥30天且置信度≥0.5（月线/MA60确认）；短线风口=短线热度≥0.3（热度捕捉+资金博弈）</text>
          </Card>

          <Card v-if="leaderStocks.length" class="stream-section">
            <text class="section-title">龙头股</text>
            <view class="stock-tags">
              <Tag v-for="(code, i) in leaderStocks" :key="i" size="sm">{{ code }}</Tag>
            </view>
          </Card>

          <!-- 长线/短线研判两档切换 -->
          <view v-if="windLongSectors.length || windShortSectors.length" class="wind-tabs">
            <view
              v-for="opt in CYCLE_OPTIONS"
              :key="opt.value"
              class="wind-tab"
              :class="{ active: activeCycle === opt.value }"
              @tap="activeCycle = opt.value as 'long' | 'short'"
            >
              <text class="wind-tab-text">{{ opt.label }}</text>
            </view>
          </view>

          <!-- 板块卡片（两档：长线研判/短线研判） -->
          <Card v-if="windSectors.length" class="stream-section">
            <text class="section-title">{{ activeCycle === 'long' ? '长线研判' : '短线研判' }}</text>
            <view class="wind-sector-list">
              <view v-for="(sec, i) in windSectors" :key="i" class="wind-sector-card">
                <text class="wind-sector-title">{{ sec.title }}</text>
                <text class="wind-sector-body">{{ sec.body }}</text>
              </view>
            </view>
          </Card>

          <Card v-if="detailsText" class="stream-section">
            <text class="section-title">风口分析（长短线分类）</text>
            <view class="report-text-wrap">
              <mp-html :content="markdownToHtml(detailsText)" class="report-html" />
            </view>
          </Card>
        </template>

        <!-- ===== 趋势股评分（trend_score）：mp-html 全文渲染 + 结构化增强 ===== -->
        <template v-else-if="effectiveIntent === 'trend_score' && displayReport">
          <Card v-if="reportSummary" class="conclusion-card conclusion-card--trend">
            <text class="section-kicker">评分结论</text>
            <text class="conclusion-text">{{ reportSummary }}</text>
          </Card>

          <Card v-if="trendConclusionHtml" class="stream-section">
            <text class="section-title">结论摘要</text>
            <view class="report-text-wrap">
              <mp-html :content="trendConclusionHtml" class="report-html" />
            </view>
          </Card>

          <Card v-if="trendDimensionsHtml" class="stream-section">
            <text class="section-title">维度解读</text>
            <view class="report-text-wrap">
              <mp-html :content="trendDimensionsHtml" class="report-html" />
            </view>
          </Card>

          <Card v-if="trendJudgmentHtml" class="stream-section">
            <text class="section-title">趋势判断</text>
            <view class="report-text-wrap">
              <mp-html :content="trendJudgmentHtml" class="report-html" />
            </view>
          </Card>

          <Card v-if="trendTrackHtml" class="stream-section">
            <text class="section-title">赛道分析</text>
            <view class="report-text-wrap">
              <mp-html :content="trendTrackHtml" class="report-html" />
            </view>
          </Card>
          <Card v-if="leaderStocks.length" class="stream-section">
            <text class="section-title">相关个股</text>
            <view class="stock-tags">
              <Tag v-for="code in leaderStocks" :key="code" size="sm">{{ code }}</Tag>
            </view>
          </Card>

          <Card v-if="detailsText" class="stream-section">
            <text class="section-title">报告详情</text>
            <view class="report-text-wrap">
              <mp-html :content="markdownToHtml(detailsText)" class="report-html" />
            </view>
          </Card>

          <Card v-if="trendAdviceHtml" class="judgment-card stream-section">
            <text class="section-title">关注建议</text>
            <view class="report-text-wrap">
              <mp-html :content="trendAdviceHtml" class="report-html" />
            </view>
          </Card>

          <Card v-if="risks.length" class="risk-card stream-section">
            <text class="section-title">风险提示</text>
            <view class="bullet-list">
              <text v-for="(risk, i) in risks" :key="i" class="risk-item">{{ risk }}</text>
            </view>
          </Card>

          <!-- 兜底：结构化解析全空时用 mp-html 渲染 details 原始 markdown -->
          <Card v-if="!trendConclusionHtml && !trendDimensionsHtml && !trendJudgmentHtml && !trendTrackHtml && !trendAdviceHtml && detailsText" class="stream-section">
            <text class="section-title">详细分析</text>
            <view class="report-text-wrap">
              <mp-html :content="markdownToHtml(detailsText)" class="report-html" />
            </view>
          </Card>
        </template>

        <!-- ===== 机构调研（hot_burst）：结构化卡片 ===== -->
        <template v-else-if="effectiveIntent === 'hot_burst' && displayReport">
          <Card v-if="reportSummary" class="conclusion-card conclusion-card--hot">
            <text class="section-kicker">调研结论</text>
            <text class="conclusion-text">{{ reportSummary }}</text>
          </Card>

          <Card v-if="hotOverviewBullets.length" class="stream-section">
            <text class="section-title">今日热门概览</text>
            <view class="bullet-list">
              <text v-for="(item, i) in hotOverviewBullets" :key="i" class="bullet-item">{{ item }}</text>
            </view>
          </Card>

          <Card v-if="hotStocks.length" class="stream-section">
            <text class="section-title">重点个股分析</text>
            <view class="stock-list">
              <Card v-for="(stock, i) in hotStocks" :key="i" flat class="stock-card hot-stock-card">
                <view class="stock-card-head">
                  <text class="stock-name">{{ stock.title }}</text>
                </view>
                <view v-if="stock.popularity" class="stock-field">
                  <text class="stock-field-label">热门程度</text>
                  <text class="stock-field-value">{{ stock.popularity }}</text>
                </view>
                <view v-if="stock.facts" class="stock-field">
                  <text class="stock-field-label">核心事实</text>
                  <text class="stock-field-value">{{ stock.facts }}</text>
                </view>
                <view v-if="stock.sectorLogic" class="stock-field">
                  <text class="stock-field-label">板块逻辑</text>
                  <text class="stock-field-value">{{ stock.sectorLogic }}</text>
                </view>
                <view v-if="stock.duration" class="stock-field">
                  <text class="stock-field-label">持续性判断</text>
                  <text class="stock-field-value">{{ stock.duration }}</text>
                </view>
              </Card>
            </view>
          </Card>

          <Card v-if="hotSectorLogic" class="stream-section">
            <text class="section-title">板块逻辑</text>
            <text class="section-text">{{ hotSectorLogic }}</text>
          </Card>

          <Card v-if="hotDuration" class="stream-section">
            <text class="section-title">持续性判断</text>
            <text class="section-text">{{ hotDuration }}</text>
          </Card>

          <Card v-if="leaderStocks.length" class="stream-section">
            <text class="section-title">相关个股</text>
            <view class="stock-tags">
              <Tag v-for="code in leaderStocks" :key="code" size="sm">{{ code }}</Tag>
            </view>
          </Card>

          <Card v-if="hotAdvice" class="judgment-card stream-section">
            <text class="section-title">关注建议</text>
            <text class="section-text">{{ hotAdvice }}</text>
          </Card>

          <Card v-if="risks.length" class="risk-card stream-section">
            <text class="section-title">风险提示</text>
            <view class="bullet-list">
              <text v-for="(risk, i) in risks" :key="i" class="risk-item">{{ risk }}</text>
            </view>
          </Card>
        </template>

        <!-- ===== 收盘复盘（review）：大盘溯源结构化（参考晨报分区） ===== -->
        <template v-else-if="isReviewIntent && displayReport">
          <Card v-if="reportSummary" class="conclusion-card conclusion-card--review">
            <text class="section-kicker">收盘结论</text>
            <text class="conclusion-text">{{ reportSummary }}</text>
          </Card>

          <Card v-if="reviewPhenomenonHtml" class="stream-section">
            <text class="section-title">确认的市场现象</text>
            <view class="report-text-wrap">
              <mp-html :content="reviewPhenomenonHtml" class="report-html" />
            </view>
          </Card>

          <Card v-if="reviewAttributionHtml" class="stream-section">
            <text class="section-title">归因结论</text>
            <view class="report-text-wrap">
              <mp-html :content="reviewAttributionHtml" class="report-html" />
            </view>
          </Card>

          <Card v-if="reviewPredictionHtml" class="stream-section">
            <text class="section-title">预判对照</text>
            <view class="report-text-wrap">
              <mp-html :content="reviewPredictionHtml" class="report-html" />
            </view>
          </Card>

          <Card v-if="reviewCandidatesHtml" class="stream-section">
            <text class="section-title">候选解释与反证</text>
            <view class="report-text-wrap">
              <mp-html :content="reviewCandidatesHtml" class="report-html" />
            </view>
          </Card>

          <Card v-if="risks.length" class="risk-card stream-section">
            <text class="section-title">风险提示</text>
            <view class="bullet-list">
              <text v-for="(risk, i) in risks" :key="i" class="risk-item">{{ risk }}</text>
            </view>
          </Card>
        </template>

        <!-- ===== 兜底：其他 intent 用 mp-html 渲染 ===== -->
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
      <EmptyState v-else title="当日报告尚未生成" description="请切换日期或于 9:10 后查看" icon="file-line" />
    </view>

    <!-- 日期切换（放在 footer 插槽，固定在底部不依赖 scroll-view 滚动） -->
    <template v-if="!loading" #footer>
      <view class="date-nav">
        <view class="date-btn" @click="changeDate(-1)">
          <SvgIcon name="arrow-left-line" size="32rpx" color="#0b5fff" />
          <text class="date-btn-text">前一天</text>
        </view>
        <view class="date-btn" @click="changeDate(1)">
          <text class="date-btn-text">后一天</text>
          <SvgIcon name="arrow-right-line" size="32rpx" color="#0b5fff" />
        </view>
      </view>
    </template>
  </SubPageCard2>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad, onBackPress } from '@dcloudio/uni-app'
import { agentApi, isPublicReportIntent } from '@/shared/api/modules/agent'
import { markdownToHtml } from '@/shared/utils/markdown'
import { formatDate, formatDateTime } from '@/shared/utils/datetime'
import { shanghaiDateString, addCalendarDays } from '@/shared/utils/tradingTime'
import SubPageCard2 from '@/shared/components/SubPageCard2.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import { usePodcastStore } from '@/shared/store/modules/podcast'
import { LoadingState, EmptyState, Card, Tag, Button } from '@/shared/components'
import mpHtml from 'mp-html/dist/uni-app/components/mp-html/mp-html'

// ===== Markdown 分区解析工具（参考 hot-burst-report 模式）=====
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** 提取 ## 标题下的内容（到下一个 ## 或末尾）
 *  容忍标题中的 emoji、序号前缀（如"一、"）和额外修饰，只要标题包含指定 heading 文本即匹配。
 *  同时兼容 ### 三级标题（当 LLM 把章节写成 ### 而非 ## 时）。
 */
function extractSection(markdown: string, heading: string): string {
  const tryMatch = (prefix: string, nextPrefix: string): string => {
    // 严格匹配
    const strictRe = new RegExp(`^${prefix}\\s+${escapeRegExp(heading)}\\s*$`, 'm')
    if (strictRe.test(markdown)) {
      const re = new RegExp(`^${prefix}\\s+${escapeRegExp(heading)}\\s*\\n([\\s\\S]*?)(?=${nextPrefix}|(?![\\s\\S]))`, 'm')
      const m = markdown.match(re)
      if (m?.[1]) return m[1].trim()
    }
    // 包含匹配（容忍 emoji/序号/修饰）
    const looseRe = new RegExp(`^${prefix}\\s+[^\\n]*${escapeRegExp(heading)}[^\\n]*$`, 'm')
    const looseMatch = markdown.match(looseRe)
    if (looseMatch) {
      const startIdx = (looseMatch.index ?? 0) + looseMatch[0].length
      const nextRe = new RegExp(nextPrefix, 'm')
      const nextIdx = markdown.slice(startIdx).search(nextRe)
      const content = nextIdx === -1 ? markdown.slice(startIdx) : markdown.slice(startIdx, startIdx + nextIdx)
      return content.trim()
    }
    return ''
  }
  // 优先 ## 匹配，降级 ### 匹配
  return tryMatch('##', '^##\\s+') || tryMatch('###', '^##\\s+|^###\\s+') || ''
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

/** 将 section 内容转为 HTML（保留 ###、表格、列表等完整 markdown 语法） */
function sectionHtml(markdown: string, heading: string): string {
  const section = extractSection(markdown, heading)
  return section ? markdownToHtml(section) : ''
}

/** 提取 ### 三级标题下的子区块（用于板块/股票子卡片）
 *  兼容 #### 四级标题（当 LLM 误用四级标题时）。
 */
function extractSubSections(markdown: string, heading: string): Array<{ title: string; body: string }> {
  const section = extractSection(markdown, heading)
  if (!section) return []
  // 优先 ### 三级标题，降级 #### 四级标题
  let headings = [...section.matchAll(/^###\s+(.+?)\s*$/gm)]
  if (headings.length === 0) {
    headings = [...section.matchAll(/^####\s+(.+?)\s*$/gm)]
  }
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
  morning: { title: '今日晨报', icon: 'sun-line', color: '#f0a020', bgColor: '#f0a020', desc: '每日开盘前市场概览' },
  wind_leader: { title: '风口龙头', icon: 'windy-line', color: '#0b5fff', bgColor: '#0b5fff', desc: '长短线风口与龙头股追踪' },
  hot_burst: { title: '机构调研', icon: 'eye-line', color: '#00b8ff', bgColor: '#00b8ff', desc: '机构推荐热门股分析' },
  trend_score: { title: '趋势股评分', icon: 'line-chart-line', color: '#18a058', bgColor: '#18a058', desc: '趋势形态评分排名' },
  review: { title: '收盘复盘', icon: 'moon-line', color: '#7c5cff', bgColor: '#7c5cff', desc: '收盘后大盘归因分析' },
  broadcast: { title: '双人播报', icon: 'broadcast-line', color: '#0b5fff', bgColor: '#0b5fff', desc: 'AI 双人对话播报' },
}

/** 概览模式下的 Agent 顺序（不含 broadcast，用户不需要在概览中看到双人播报） */
const OVERVIEW_ORDER = ['morning', 'wind_leader', 'hot_burst', 'trend_score', 'review']

const titleMap: Record<string, string> = {
  morning: '今日晨报',
  wind_leader: '风口龙头分析',
  hot_burst: '机构调研分析',
  trend_score: '趋势股评分分析',
  review: '收盘复盘',
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
/** 降级标记：后端返回的是最近一份报告（非当日），用于标题标注 */
const isFallbackReport = ref(false)

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

/** 当前报告的播报稿（详情模式有 podcast_brief 时标题栏显示播报按钮） */
const podcastStore = usePodcastStore()
const podcastBriefForFloating = computed(() => {
  if (isOverview.value) return ''
  const brief = report.value?.content?.podcast_brief
  return typeof brief === 'string' ? brief : ''
})

/** 打开悬浮播报窗 */
function openFloatingPodcast() {
  const brief = podcastBriefForFloating.value
  if (!brief) return
  void podcastStore.open(
    brief,
    `report_${effectiveIntent.value}_${report.value?.report_date || date.value || 'latest'}`,
    pageTitle.value
  )
}

const pageSubtitle = computed(() => {
  if (isOverview.value) {
    return `${date.value} · AI 生成内容，仅供参考`
  }
  // 降级报告：标注实际报告日期
  if (isFallbackReport.value && report.value?.report_date) {
    return `${formatDate(report.value.report_date)} 生成 · 当日尚未生成，显示最近报告 · 仅供参考`
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

/** 当前是否为收盘复盘（复盘使用专属布局：市场现象+归因+预判对照+候选解释） */
const isReviewIntent = computed(() => effectiveIntent.value === 'review')

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
const morningOverseasHtml = computed(() => sectionHtml(detailsText.value, '第1步：隔夜外盘回顾'))
const morningDomesticHtml = computed(() => sectionHtml(detailsText.value, '第2步：国内宏观要闻'))
const morningSectorHtml = computed(() => sectionHtml(detailsText.value, '第3步：板块与市场情绪'))
const morningFocusHtml = computed(() => sectionHtml(detailsText.value, '今日焦点板块预测'))
const morningStrategyHtml = computed(() => sectionHtml(detailsText.value, '第4步：今日关注与策略建议'))

// ===== 收盘复盘（review）结构化分区 =====
const reviewPhenomenonHtml = computed(() => sectionHtml(detailsText.value, '确认的市场现象'))
const reviewAttributionHtml = computed(() => sectionHtml(detailsText.value, '归因结论'))
const reviewPredictionHtml = computed(() => sectionHtml(detailsText.value, '预判对照'))
const reviewCandidatesHtml = computed(() => sectionHtml(detailsText.value, '候选解释与反证'))

// ===== 风口龙头（wind_leader）结构化分区 =====
interface SectorCard { title: string; body: string }
const windOverviewHtml = computed(() => sectionHtml(detailsText.value, '风口概览'))
// B2 报告结构：长线研判 / 短线研判 两节（both 板块同时出现）
const windLongSectors = computed<SectorCard[]>(() => extractSubSections(detailsText.value, '长线研判'))
const windShortSectors = computed<SectorCard[]>(() => extractSubSections(detailsText.value, '短线研判'))

// 长线/短线研判两档切换（与 leaders.vue 一致的 two-tab）
const CYCLE_OPTIONS = [
  { label: '长线研判', value: 'long' },
  { label: '短线研判', value: 'short' },
]
const activeCycle = ref<'long' | 'short'>('long')
const windSectors = computed<SectorCard[]>(() =>
  activeCycle.value === 'long' ? windLongSectors.value : windShortSectors.value
)
const windStocks = computed(() => sectionBullets(detailsText.value, '龙头股推荐'))

// ===== 趋势股评分（trend_score）结构化分区 =====
const trendConclusionHtml = computed(() => sectionHtml(detailsText.value, '结论摘要'))
const trendDimensionsHtml = computed(() => sectionHtml(detailsText.value, '维度解读'))
const trendJudgmentHtml = computed(() => sectionHtml(detailsText.value, '趋势判断'))
const trendTrackHtml = computed(() => sectionHtml(detailsText.value, '赛道分析'))
const trendAdviceHtml = computed(() => sectionHtml(detailsText.value, '关注建议'))
// ===== 机构调研（hot_burst）结构化分区 =====
interface HotStockCard {
  title: string
  popularity: string
  facts: string
  sectorLogic: string
  duration: string
}
const hotOverviewBullets = computed(() => sectionBullets(detailsText.value, '今日热门概览'))
const hotStocks = computed<HotStockCard[]>(() => {
  return extractSubSections(detailsText.value, '重点个股分析').map(s => ({
    title: s.title,
    popularity: extractField(s.body, '热门程度'),
    facts: extractField(s.body, '核心事实'),
    sectorLogic: extractField(s.body, '板块逻辑'),
    duration: extractField(s.body, '持续性判断'),
  }))
})
const hotSectorLogic = computed(() => sectionText(detailsText.value, '板块逻辑'))
const hotDuration = computed(() => sectionText(detailsText.value, '持续性判断'))
const hotAdvice = computed(() => sectionText(detailsText.value, '关注建议'))

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
      // 检查 report_date 是否与请求日期匹配：后端在指定日期无报告时会降级返回最近一份报告，
      // 不匹配时视为当日无报告（显示"待生成"而非"已更新"）
      if (data?.content && data.report_date === date.value) {
        summary = extractSummary(data)
        available = true
      } else if (data?.content) {
        // 降级：当日无报告但后端返回了最近一份报告，显示摘要但标记为待生成
        summary = extractSummary(data)
        available = false
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
    const data = (res as AgentReport) || null
    // 后端在指定日期无报告时会降级返回最近一份报告。
    // 保留降级报告内容供用户查看，但记录实际报告日期用于标题标注。
    if (data && data.report_date && data.report_date !== date.value) {
      isFallbackReport.value = true
    } else {
      isFallbackReport.value = false
    }
    report.value = data
  } catch {
    report.value = null
    isFallbackReport.value = false
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

/** 切换日期（前一天/后一天），重新加载当前模式的报告 */
function changeDate(delta: number) {
  date.value = addCalendarDays(date.value, delta)
  report.value = null
  agentBriefs.value = []
  if (selectedIntent.value) {
    loadReport()
  } else {
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
/* 标题栏右侧：播报按钮 + 概览按钮 */
.header-right-actions {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.header-podcast-btn {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

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
:deep(.md-h2) { font-size: 32rpx; font-weight: 600; margin: 16rpx 0 8rpx; color: $ink; }
:deep(.md-h3) { font-size: 28rpx; font-weight: 600; margin: 12rpx 0 6rpx; color: $ink; padding-left: 12rpx; border-left: 4rpx solid $primary; }
:deep(.md-h4) { font-size: 26rpx; font-weight: 600; margin: 10rpx 0 4rpx; color: $ink-soft; }
:deep(.md-hr) { border: none; border-top: 1rpx solid $line; margin: 12rpx 0; }
:deep(.md-ul) { padding-left: 20rpx; margin: 8rpx 0; }
:deep(.md-ol) { padding-left: 20rpx; margin: 8rpx 0; }
:deep(.md-ul-li) { font-size: 26rpx; color: $ink-soft; line-height: 1.8; }
:deep(.md-ol-li) { font-size: 26rpx; color: $ink-soft; line-height: 1.8; }
:deep(.md-table) {
  width: 100%;
  border-collapse: collapse;
  margin: 12rpx 0;
  font-size: 24rpx;
}
:deep(.md-table th) {
  background: $bg-soft;
  color: $ink;
  font-weight: 600;
  padding: 10rpx 12rpx;
  border: 1rpx solid $line;
  text-align: left;
}
:deep(.md-table td) {
  color: $ink-soft;
  padding: 10rpx 12rpx;
  border: 1rpx solid $line;
}
:deep(.md-table tr:nth-child(even) td) {
  background: $bg-soft;
}
:deep(strong) { color: $ink; font-weight: 600; }

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

/* 风口分类提示：浅灰小字，说明短线/长线分类依据（对齐页面 $ink-mute 辅助文字） */
.cycle-hint {
  display: block;
  margin-top: 14rpx;
  font-size: 22rpx;
  line-height: 1.6;
  color: $ink-mute;
}

/* 长线/短线研判两档切换 */
.wind-tabs {
  display: flex;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.wind-tab {
  flex: 1;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid $line;
  border-radius: $r-md;
  background: $bg-card;
}

.wind-tab.active {
  border-color: $primary;
  background: rgba(11, 95, 255, 0.06);
}

.wind-tab-text {
  font-size: 28rpx;
  color: $ink-mute;
}

.wind-tab.active .wind-tab-text {
  color: $primary;
  font-weight: 600;
}

/* 板块研判卡片（两档） */
.wind-sector-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.wind-sector-card {
  border: 2rpx solid $line;
  border-radius: $r-md;
  padding: 20rpx;
}

.wind-sector-title {
  font-size: 28rpx;
  font-weight: 600;
  color: $ink;
}

.wind-sector-body {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  line-height: 1.7;
  color: $ink-2;
}

/* 晨报主题色：$warning（与 AGENT_META.morning 一致） */
.conclusion-card--morning {
  border-left: 6rpx solid $warning;
  background: $bg-card;

  .section-kicker { color: $warning; }
}

/* 长线风口主题色：$primary 主品牌蓝 */
.conclusion-card--wind {
  border-left: 6rpx solid $primary;
  background: linear-gradient(135deg, rgba(11, 95, 255, 0.06), rgba(11, 95, 255, 0.02));

  .section-kicker { color: $primary; }
}

/* 机构调研主题色：$accent 青 */
.conclusion-card--hot {
  border-left: 6rpx solid $accent;
  background: linear-gradient(135deg, rgba(0, 184, 255, 0.06), rgba(0, 184, 255, 0.02));

  .section-kicker { color: $accent; }
}

/* 趋势股评分主题色：$down 绿 */
.conclusion-card--trend {
  border-left: 6rpx solid $down;
  background: linear-gradient(135deg, rgba(24, 160, 88, 0.06), rgba(24, 160, 88, 0.02));

  .section-kicker { color: $down; }
}

/* 收盘复盘主题色：紫（晚间报告，与晨报 sun/橙 区分） */
.conclusion-card--review {
  border-left: 6rpx solid #7c5cff;
  background: linear-gradient(135deg, rgba(124, 92, 255, 0.06), rgba(124, 92, 255, 0.02));

  .section-kicker { color: #7c5cff; }
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

/* 机构调研个股字段（label: value 结构） */
.hot-stock-card {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.stock-field {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
}

.stock-field-label {
  flex-shrink: 0;
  font-size: 22rpx;
  font-weight: 600;
  color: $ink-mute;
  background: $bg-deep;
  padding: 4rpx 12rpx;
  border-radius: $r-xs;
  line-height: 1.5;
}

.stock-field-value {
  flex: 1;
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

/* 日期切换（参考早点听样式，放在 footer 插槽固定显示） */
.date-nav {
  display: flex;
  justify-content: space-between;
  padding: 16rpx 32rpx;
  background: $bg-page;
  border-top: 2rpx solid $line-soft;
}

.date-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 14rpx 22rpx;
  background: #ffffff;
  border-radius: 999rpx;
  box-shadow: 0 2rpx 8rpx rgba(11, 95, 255, 0.08);
}

.date-btn-text {
  font-size: 24rpx;
  color: $primary;
}
</style>
