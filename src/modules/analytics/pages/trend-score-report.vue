<template>
  <SubPageCard title="趋势股评分分析">
    <view class="page-content">
      <view v-if="loading" class="loading-state">
        <text>报告加载中...</text>
      </view>

      <view v-else-if="report" class="report-content">
        <text class="report-date">{{ report.created_at ? formatDateTime(report.created_at) : report.report_date }} · 仅供参考</text>

        <view class="conclusion-card">
          <text class="section-kicker">今日结论</text>
          <text class="conclusion-text">{{ streamedConclusion }}<text v-if="isStreaming" class="stream-cursor">|</text></text>
        </view>

        <view v-if="streamedDimensions.length" class="section-card stream-section">
          <text class="section-title">维度解读</text>
          <view class="bullet-list">
            <text v-for="item in streamedDimensions" :key="item" class="bullet-item">{{ item }}</text>
          </view>
        </view>

        <view v-if="streamedTrendJudgment" class="section-card stream-section">
          <text class="section-title">趋势判断</text>
          <text class="section-text">{{ streamedTrendJudgment }}</text>
        </view>

        <view v-if="streamedTrackAnalysis.length" class="section-card stream-section">
          <text class="section-title">赛道分析</text>
          <view class="bullet-list">
            <text v-for="item in streamedTrackAnalysis" :key="item" class="bullet-item">{{ item }}</text>
          </view>
        </view>

        <view v-if="streamedRisks.length" class="section-card risk-card stream-section">
          <text class="section-title">风险提示</text>
          <view class="bullet-list">
            <text v-for="risk in streamedRisks" :key="risk" class="risk-item">{{ risk }}</text>
          </view>
        </view>

        <view v-if="streamedAdvice" class="section-card stream-section">
          <text class="section-title">关注建议</text>
          <text class="section-text">{{ streamedAdvice }}</text>
        </view>
      </view>

      <view v-else class="empty-state">
        <SvgIcon name="file-line" size="80rpx" color="#9ca3af" />
        <text class="empty-text">今日趋势股评分报告尚未生成</text>
        <text class="empty-hint">报告生成后将自动显示</text>
      </view>
    </view>
  </SubPageCard>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { agentApi } from '@/shared/api/modules/agent'
import { formatDateTime } from '@/shared/utils/datetime'
import SubPageCard from '@/shared/components/SubPageCard.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import trendScoreMockContent from '../mock/trend-score-report.json'

interface DisplayReport {
  summary?: string
  details?: string
  stocks?: string[]
  risks?: string[]
}

interface TrendScoreReport {
  report_date: string
  created_at?: string
  content: {
    display_report?: DisplayReport
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function asDisplayReport(value: unknown): DisplayReport | null {
  const record = asRecord(value)
  if (!record) return null
  const summary = typeof record.summary === 'string' ? record.summary : ''
  const details = typeof record.details === 'string' ? record.details : ''
  if (!summary && !details) return null
  return {
    summary,
    details,
    stocks: asStringArray(record.stocks),
    risks: asStringArray(record.risks),
  }
}

function extractEmbeddedDisplayReport(details: string): DisplayReport | null {
  const blocks = details.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)
  for (const block of blocks) {
    try {
      const parsed = JSON.parse(block[1]) as unknown
      const nested = asRecord(parsed)
      const display = asDisplayReport(nested?.display_report)
      if (display) return display
    } catch {
      // Keep checking later code blocks; malformed legacy content should not break the page.
    }
  }
  return null
}

function normalizeTrendScoreReport(value: unknown): TrendScoreReport | null {
  const record = asRecord(value)
  const content = asRecord(record?.content)
  if (!record || !content) return null

  const outerDisplay = asDisplayReport(content.display_report)
  const display = outerDisplay?.details
    ? extractEmbeddedDisplayReport(outerDisplay.details) ?? outerDisplay
    : outerDisplay
  if (!display) return null

  return {
    report_date: typeof record.report_date === 'string' ? record.report_date : '',
    created_at: typeof record.created_at === 'string' ? record.created_at : undefined,
    content: { display_report: display },
  }
}

const date = ref('')
const loading = ref(true)
const report = ref<TrendScoreReport | null>(null)
const isStreaming = ref(false)
let abortFlag = false

const display = computed(() => ({
  summary: report.value?.content.display_report?.summary || '',
  details: report.value?.content.display_report?.details || '',
  stocks: report.value?.content.display_report?.stocks || [],
  risks: report.value?.content.display_report?.risks || [],
}))

// ===== 流式文本状态：每个区块独立 ref，驱动逐字输出 =====
const streamedConclusion = ref('')
const streamedDimensions = ref<string[]>([])
const streamedTrendJudgment = ref('')
const streamedTrackAnalysis = ref<string[]>([])
const streamedRisks = ref<string[]>([])
const streamedAdvice = ref('')

// ===== Markdown 解析 =====
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function extractSection(markdown: string, heading: string): string {
  const match = markdown.match(new RegExp(`^##\\s+${escapeRegExp(heading)}\\s*\\n([\\s\\S]*?)(?=^##\\s+|(?![\\s\\S]))`, 'm'))
  return match?.[1]?.trim() || ''
}

function cleanLine(value: string): string {
  return value.replace(/^[-*]\s+/, '').replace(/\*\*/g, '').replace(/`/g, '').trim()
}

function sectionBullets(heading: string): string[] {
  return extractSection(display.value.details, heading).split('\n').map(cleanLine).filter(Boolean).slice(0, 5)
}

const dimensionsBullets = computed(() => sectionBullets('维度解读'))
const trackAnalysisBullets = computed(() => sectionBullets('赛道分析'))
const trendJudgmentText = computed(() => extractSection(display.value.details, '趋势判断').split('\n').map(cleanLine).filter(Boolean).join(' '))
const attentionAdvice = computed(() => extractSection(display.value.details, '关注建议').split('\n').map(cleanLine).filter(Boolean).join(' '))

// ===== 流式引擎 =====

function streamText(setText: (val: string) => void, fullText: string, speed = 3): Promise<void> {
  return new Promise(resolve => {
    if (!fullText) return resolve()
    let i = 0
    const timer = setInterval(() => {
      if (abortFlag) { clearInterval(timer); resolve(); return }
      i = Math.min(i + speed, fullText.length)
      setText(fullText.slice(0, i))
      if (i >= fullText.length) { clearInterval(timer); resolve() }
    }, 16)
  })
}

async function streamList(target: { value: string[] }, items: string[]): Promise<void> {
  target.value = []
  for (const item of items) {
    if (abortFlag) break
    const idx = target.value.length
    target.value.push('')
    await streamText((v) => { target.value[idx] = v }, item)
  }
}

async function runStreamingFlow() {
  abortFlag = false
  isStreaming.value = true

  streamedConclusion.value = ''
  streamedDimensions.value = []
  streamedTrendJudgment.value = ''
  streamedTrackAnalysis.value = []
  streamedRisks.value = []
  streamedAdvice.value = ''

  // 1. 结论
  await streamText((v) => { streamedConclusion.value = v }, display.value.summary || '暂无明确结论，请结合后续信息判断。')
  if (abortFlag) return

  // 2. 维度解读
  const dimBullets = dimensionsBullets.value
  if (dimBullets.length) {
    await streamList(streamedDimensions, dimBullets)
    if (abortFlag) return
  }

  // 3. 趋势判断
  const judgment = trendJudgmentText.value
  if (judgment) {
    await streamText((v) => { streamedTrendJudgment.value = v }, judgment, 2)
    if (abortFlag) { isStreaming.value = false; return }
  }

  // 4. 赛道分析
  const trackItems = trackAnalysisBullets.value
  if (trackItems.length) {
    await streamList(streamedTrackAnalysis, trackItems)
    if (abortFlag) { isStreaming.value = false; return }
  }

  // 5. 风险提示
  const risks = display.value.risks
  if (risks.length) {
    await streamList(streamedRisks, risks)
    if (abortFlag) { isStreaming.value = false; return }
  }

  // 6. 关注建议
  const advice = attentionAdvice.value
  if (advice) {
    await streamText((v) => { streamedAdvice.value = v }, advice, 2)
  }

  isStreaming.value = false
}

// ===== 生命周期 =====

function stopAll() {
  abortFlag = true
  isStreaming.value = false
}

async function loadReport() {
  loading.value = true
  try {
    const res: unknown = await agentApi.getReport('trend_score', date.value)
    const data = (res as Record<string, unknown>)?.data ?? res
    const nextReport = data
      ? normalizeTrendScoreReport(data)
      : import.meta.env.DEV ? { report_date: date.value, created_at: new Date().toISOString(), content: trendScoreMockContent } : null
    report.value = nextReport
    if (nextReport) runStreamingFlow()
  } catch {
    report.value = import.meta.env.DEV
      ? { report_date: date.value, created_at: new Date().toISOString(), content: trendScoreMockContent }
      : null
    if (report.value) runStreamingFlow()
  } finally {
    loading.value = false
  }
}

onLoad((options) => {
  date.value = options?.date || new Date().toISOString().split('T')[0]
  loadReport()
})

onUnmounted(stopAll)
</script>

<style lang="scss" scoped>
.page-content { padding: 24rpx; }
.loading-state, .empty-state { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; font-size: 28rpx; color: $ink-soft; }
.empty-text { margin-top: 24rpx; }
.empty-hint, .report-date { margin-top: 12rpx; font-size: 22rpx; color: #9ca3af; }
.report-date { display: block; margin: 0 0 16rpx; }
.report-content { display: flex; flex-direction: column; gap: 20rpx; }
.conclusion-card, .section-card { padding: 24rpx; border-radius: 16rpx; background: #ffffff; }
.conclusion-card { background: linear-gradient(135deg, #eff6ff, #dbeafe); border: 1rpx solid #bfdbfe; }
.section-kicker { display: block; margin-bottom: 10rpx; font-size: 22rpx; font-weight: 600; color: #1d4ed8; }
.conclusion-text { display: block; font-size: 32rpx; font-weight: 600; line-height: 1.5; color: $ink; }
.stream-cursor { margin-left: 4rpx; color: $primary; animation: cursor-blink 0.8s infinite; }
.stream-section { animation: section-in 0.28s ease-out both; }
@keyframes section-in { from { opacity: 0; transform: translateY(12rpx); } to { opacity: 1; transform: translateY(0); } }
@keyframes cursor-blink { 50% { opacity: 0; } }
.section-title { display: block; margin-bottom: 16rpx; font-size: 28rpx; font-weight: 600; color: $ink; }
.bullet-list { display: flex; flex-direction: column; gap: 14rpx; }
.bullet-item, .section-text { display: block; font-size: 25rpx; line-height: 1.65; color: #4b5563; }
.bullet-item::before { content: '•'; margin-right: 10rpx; color: $primary; }
.judgment-card { border-left: 6rpx solid $primary; }
.risk-card { background: #fff7f7; }
.risk-item { display: block; font-size: 25rpx; line-height: 1.65; color: #4b5563; }
.risk-item::before { content: '•'; margin-right: 8rpx; font-weight: 600; color: #dc2626; }
</style>
