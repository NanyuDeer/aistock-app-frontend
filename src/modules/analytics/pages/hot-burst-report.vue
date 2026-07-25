<template>
  <SubPageCard title="机构调研热门股分析">
    <view class="page-content">
      <view v-if="loading" class="loading-state">
        <text>报告加载中...</text>
      </view>

      <view v-else-if="report" class="report-content">
        <text class="report-date">{{ report.report_date }} · 仅供参考</text>

        <view class="conclusion-card">
          <text class="section-kicker">今日结论</text>
          <text class="conclusion-text">{{ streamedConclusion }}<text v-if="isStreaming" class="stream-cursor">|</text></text>
        </view>

        <view v-if="streamedOverview.length" class="section-card stream-section">
          <text class="section-title">热门方向</text>
          <view class="bullet-list">
            <text v-for="item in streamedOverview" :key="item" class="bullet-item">{{ item }}</text>
          </view>
        </view>

        <view v-if="visibleStockSection" class="section-card stream-section">
          <text class="section-title">重点个股分析</text>
          <view class="stock-list">
            <view v-for="(stock, index) in stocks.slice(0, visibleStockCount)" :key="stock.key" class="stock-card stream-section">
              <view class="stock-card-head">
                <view class="stock-name-wrap">
                  <text class="stock-name">{{ stock.name }}</text>
                  <text v-if="stock.code" class="stock-code">{{ stock.code }}</text>
                </view>
                <text class="popularity-tag">热门程度：{{ stock.popularity }}</text>
              </view>
              <text v-if="stockFactStreams[index] && stockPhase(index) >= 1" class="stock-headline stream-section">{{ stockFactStreams[index] }}</text>
              <text v-if="stockLogicStreams[index] && stockPhase(index) >= 2" class="stock-description stream-section">{{ stockLogicStreams[index] }}</text>
            </view>
          </view>
        </view>

        <view v-if="streamedSectorLogic.length" class="section-card stream-section">
          <text class="section-title">板块逻辑</text>
          <view class="bullet-list">
            <text v-for="item in streamedSectorLogic" :key="item" class="bullet-item">{{ item }}</text>
          </view>
        </view>

        <view v-if="streamedSustainability" class="section-card judgment-card stream-section">
          <text class="section-title">持续性判断</text>
          <text class="section-text">{{ streamedSustainability }}</text>
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
        <text class="empty-text">今日热门股报告尚未生成</text>
        <text class="empty-hint">报告生成后将自动显示</text>
      </view>
    </view>
  </SubPageCard>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { agentApi } from '@/shared/api/modules/agent'
import SubPageCard from '@/shared/components/SubPageCard.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import hotBurstMockContent from '../mock/hot-burst-report.json'

interface DisplayReport {
  summary?: string
  details?: string
  stocks?: string[]
  risks?: string[]
}

interface HotBurstReport {
  report_date: string
  content: {
    display_report?: DisplayReport
  }
}

interface StockCard {
  key: string
  name: string
  code: string
  popularity: string
  fact: string
  logic: string
  sustainability: string
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

function normalizeHotBurstReport(value: unknown): HotBurstReport | null {
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
    content: { display_report: display },
  }
}

const date = ref('')
const loading = ref(true)
const report = ref<HotBurstReport | null>(null)
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
const streamedOverview = ref<string[]>([])
const visibleStockSection = ref(false)
const visibleStockCount = ref(0)
const activeStockPhase = ref(0)
const stockFactStreams = ref<string[]>([])
const stockLogicStreams = ref<string[]>([])
const streamedSectorLogic = ref<string[]>([])
const streamedSustainability = ref('')
const streamedRisks = ref<string[]>([])
const streamedAdvice = ref('')

// ===== Markdown 解析（不变）=====
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
  return extractSection(display.value.details, heading).split('\n').map(cleanLine).filter(Boolean).slice(0, 3)
}

function extractField(markdown: string, label: string): string {
  const match = markdown.match(new RegExp(`^-\\s+\\*\\*${escapeRegExp(label)}\\*\\*[：:]?\\s*([\\s\\S]*?)(?=\\n-\\s+\\*\\*|(?![\\s\\S]))`, 'm'))
  return match ? cleanLine(match[1]) : ''
}

function popularityLabel(value: string): string {
  return value.match(/较高|中等|较低|高|低/)?.[0] || '关注中'
}

const overviewBullets = computed(() => sectionBullets('今日热门概览'))
const sectorLogicBullets = computed(() => sectionBullets('板块逻辑'))
const sustainabilityText = computed(() => extractSection(display.value.details, '持续性判断').split('\n').map(cleanLine).filter(Boolean).join(' '))
const attentionAdvice = computed(() => extractSection(display.value.details, '关注建议').split('\n').map(cleanLine).filter(Boolean).join(' '))

const stocks = computed<StockCard[]>(() => {
  const section = extractSection(display.value.details, '重点个股分析')
  const headings = [...section.matchAll(/^###\s+(.+?)\s*$/gm)]
  return headings.map((heading, index) => {
    const title = heading[1].trim()
    const match = title.match(/^(.*?)（(\d{6})）$/)
    const bodyStart = (heading.index || 0) + heading[0].length
    const bodyEnd = headings[index + 1]?.index ?? section.length
    const body = section.slice(bodyStart, bodyEnd)
    const name = match?.[1]?.trim() || title
    const code = match?.[2] || display.value.stocks[index] || ''
    return {
      key: `${code}-${index}`,
      name,
      code,
      popularity: popularityLabel(extractField(body, '热门程度')),
      fact: extractField(body, '核心事实'),
      logic: extractField(body, '板块逻辑'),
      sustainability: extractField(body, '持续性判断'),
    }
  })
})

function stockPhase(index: number): number {
  if (index < visibleStockCount.value - 1) return 3
  return activeStockPhase.value
}

// ===== 流式引擎 =====

/** 将文本逐字写入 setter，返回完成 Promise */
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

/** 逐条流式输出列表项，每条内部逐字 */
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

  // 重置所有流式状态
  streamedConclusion.value = ''
  streamedOverview.value = []
  visibleStockSection.value = false
  visibleStockCount.value = 0
  activeStockPhase.value = 0
  stockFactStreams.value = []
  stockLogicStreams.value = []
  streamedSectorLogic.value = []
  streamedSustainability.value = ''
  streamedRisks.value = []
  streamedAdvice.value = ''

  // 1. 结论
  await streamText((v) => { streamedConclusion.value = v }, display.value.summary || '暂无明确结论，请结合后续信息判断。')
  if (abortFlag) return

  // 2. 热门方向
  const bullets = overviewBullets.value
  if (bullets.length) {
    await streamList(streamedOverview, bullets)
    if (abortFlag) return
  }

  // 3. 重点个股：卡片逐个出现，每张卡片内 fact → logic 逐字输出
  const stockList = stocks.value
  if (stockList.length) {
    visibleStockSection.value = true
    stockFactStreams.value = stockList.map(() => '')
    stockLogicStreams.value = stockList.map(() => '')

    for (let idx = 0; idx < stockList.length; idx++) {
      if (abortFlag) break
      const stock = stockList[idx]
      visibleStockCount.value = idx + 1
      activeStockPhase.value = 0

      if (stock.fact) {
        activeStockPhase.value = 1
        await streamText((v) => { stockFactStreams.value[idx] = v }, stock.fact)
        if (abortFlag) break
      }
      if (stock.logic) {
        activeStockPhase.value = 2
        await streamText((v) => { stockLogicStreams.value[idx] = v }, stock.logic)
        if (abortFlag) break
      }
      activeStockPhase.value = 3
    }
  }
  if (abortFlag) { isStreaming.value = false; return }

  // 4. 板块逻辑
  const sectorItems = sectorLogicBullets.value
  if (sectorItems.length) {
    await streamList(streamedSectorLogic, sectorItems)
    if (abortFlag) { isStreaming.value = false; return }
  }

  // 5. 持续性判断
  const sustain = sustainabilityText.value
  if (sustain) {
    await streamText((v) => { streamedSustainability.value = v }, sustain, 2)
    if (abortFlag) { isStreaming.value = false; return }
  }

  // 6. 风险提示
  const risks = display.value.risks
  if (risks.length) {
    await streamList(streamedRisks, risks)
    if (abortFlag) { isStreaming.value = false; return }
  }

  // 7. 关注建议
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
    const res: unknown = await agentApi.getReport('hot_burst', date.value)
    const data = (res as Record<string, unknown>)?.data ?? res
    const nextReport = data
      ? normalizeHotBurstReport(data)
      : import.meta.env.DEV ? { report_date: date.value, content: hotBurstMockContent } : null
    report.value = nextReport
    if (nextReport) runStreamingFlow()
  } catch {
    report.value = import.meta.env.DEV
      ? { report_date: date.value, content: hotBurstMockContent }
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
.loading-state, .empty-state { display: flex; flex-direction: column; align-items: center; padding: 120rpx 0; font-size: 28rpx; color: #6b7280; }
.empty-text { margin-top: 24rpx; }
.empty-hint, .report-date { margin-top: 12rpx; font-size: 22rpx; color: #9ca3af; }
.report-date { display: block; margin: 0 0 16rpx; }
.report-content { display: flex; flex-direction: column; gap: 20rpx; }
.conclusion-card, .section-card { padding: 24rpx; border-radius: 16rpx; background: #ffffff; }
.conclusion-card { background: linear-gradient(135deg, #fff7ed, #ffedd5); border: 1rpx solid #fed7aa; }
.section-kicker { display: block; margin-bottom: 10rpx; font-size: 22rpx; font-weight: 600; color: #c2410c; }
.conclusion-text { display: block; font-size: 32rpx; font-weight: 600; line-height: 1.5; color: #1a1d24; }
.stream-cursor { margin-left: 4rpx; color: #ea580c; animation: cursor-blink 0.8s infinite; }
.stream-section { animation: section-in 0.28s ease-out both; }
@keyframes section-in { from { opacity: 0; transform: translateY(12rpx); } to { opacity: 1; transform: translateY(0); } }
@keyframes cursor-blink { 50% { opacity: 0; } }
.section-title { display: block; margin-bottom: 16rpx; font-size: 28rpx; font-weight: 600; color: #1a1d24; }
.bullet-list, .stock-list { display: flex; flex-direction: column; gap: 14rpx; }
.bullet-item, .risk-item, .section-text { display: block; font-size: 25rpx; line-height: 1.65; color: #4b5563; }
.bullet-item::before { content: '•'; margin-right: 10rpx; color: #f97316; }
.stock-card { padding: 24rpx; border-radius: 16rpx; background: #f8fafc; box-shadow: 0 4rpx 12rpx rgba(15, 23, 42, 0.04); }
.stock-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16rpx; }
.stock-name-wrap { flex: 1; min-width: 0; }
.stock-name { font-size: 30rpx; font-weight: 600; color: #1a1d24; }
.stock-code { display: inline-block; margin-left: 12rpx; padding: 2rpx 10rpx; border-radius: 8rpx; font-size: 21rpx; color: #64748b; background: #e2e8f0; }
.popularity-tag { flex-shrink: 0; padding: 6rpx 12rpx; border-radius: 8rpx; font-size: 21rpx; color: #ea580c; background: #fff7ed; }
.stock-headline { display: block; margin-top: 20rpx; font-size: 27rpx; line-height: 1.6; color: #1f2937; }
.stock-description { display: block; margin-top: 12rpx; font-size: 24rpx; line-height: 1.65; color: #64748b; }
.stock-footer { display: flex; flex-wrap: wrap; gap: 10rpx; margin-top: 20rpx; padding-top: 18rpx; border-top: 1rpx solid #e2e8f0; }
.stock-footer-tag { padding: 4rpx 12rpx; border-radius: 8rpx; font-size: 21rpx; color: #4d7cfe; background: #eff6ff; }
.stock-footer-tag.neutral { color: #64748b; background: #e2e8f0; }
.judgment-card { border-left: 6rpx solid #4d7cfe; }
.risk-card { background: #fff7f7; }
.risk-item::before { margin-right: 8rpx; font-weight: 600; color: #dc2626; }
</style>
