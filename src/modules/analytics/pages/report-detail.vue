<template>
  <!-- 页面底色层：标签+分数双红→浅红底，双绿→浅绿底，其余→浅蓝底 -->
  <view class="glow-overlay" :class="glowClass" />
  <SubPageCard title="财报详情">
    <!-- 加载状态 -->
    <view v-if="loading" class="loading-state">
      <LoadingState />
    </view>

    <!-- 错误状态 -->
    <view v-else-if="error" class="error-state">
      <SvgIcon name="cloud-off-line" size="80rpx" color="#d1d5db" />
      <text class="error-text">数据获取失败</text>
      <text class="error-desc">网络异常或暂无该股票的业绩报告数据</text>
      <view class="retry-btn" @tap="fetchAnalysisData(symbol)">重试</view>
    </view>

    <!-- 正常内容 -->
    <template v-else>
    <!-- ===== 模块1：头部基础信息 ===== -->
    <view class="section section-header">
      <view class="header-top">
        <view class="header-top-left">
          <text class="header-stock-name">{{ stock.name }}</text>
          <text class="header-stock-code">{{ stock.code }}</text>
          <text class="header-period">{{ stock.period }}</text>
        </view>
        <Tag :type="tagType(stock.tag)">{{ stock.tag }}</Tag>
      </view>
      <view class="header-sub">
        <text v-if="stock.industry" class="header-meta">{{ stock.industry }}</text>
        <text v-if="stock.industry" class="header-meta-divider">|</text>
        <text class="header-meta">更新：{{ stock.updateTime }}</text>
      </view>
      <view class="header-actions">
        <Button type="secondary" size="sm" @click="goBackToList">返回列表</Button>
        <Button type="secondary" size="sm" @click="addToFavorites">{{ isFav ? '已自选' : '加入自选' }}</Button>
        <Button type="secondary" size="sm" @click="exportReport">导出摘要</Button>
      </view>
    </view>

    <!-- ===== 洞见卡：业绩一句话 + 优势/风险/建议 ===== -->
    <InsightCard
      v-if="reportInsight.content"
      type="fund"
      :title="reportInsight.content"
      :lines="reportInsight.lines"
      theme="light"
      line-style="plain"
      class="report-insight-card"
    />

    <!-- ===== 模块3：四维分析评分（数据不足/不完整/完整均展示，由 AiAnalysis 组件内部区分状态） ===== -->
    <view v-if="aiScoreData?.dataStatus" class="section">
      <AiAnalysis :loading="scoreLoading" :data="aiScoreData" />
    </view>

    <!-- ===== 模块4：核心财务指标数据表 ===== -->
    <view id="table-section" class="section section-table">
      <view class="section-title-row">
        <SvgIcon name="file-list-line" size="28rpx" :color="primaryColor" />
        <text class="section-title-text">核心财务指标</text>
        <view class="table-year-toggle">
          <text
            :class="['year-toggle-btn', tableYearRange === 2 ? 'active' : '']"
            @tap="tableYearRange = 2"
          >近2年</text>
          <text
            :class="['year-toggle-btn', tableYearRange === 3 ? 'active' : '']"
            @tap="tableYearRange = 3"
          >近3年</text>
        </view>
      </view>

      <scroll-view class="table-scroll" scroll-x>
        <table class="finance-table">
          <thead>
            <tr>
              <th class="th-category">指标分类</th>
              <th class="th-name">指标名称</th>
              <th v-for="(p, pi) in displayColumns" :key="`${p.key || pi}`" :class="['th-value', { 'th-pad-col': !p.key }]">{{ p.label }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in tableRows" :key="idx">
              <td
                v-if="categorySpans[idx] > 0"
                :id="`tip-cat-${idx}`"
                class="td-category"
                :rowspan="categorySpans[idx]"
                @tap="showTip(categoryTips[row.category], `tip-cat-${idx}`)"
              >{{ row.category }}</td>
              <td
                :id="`tip-name-${idx}`"
                class="td-name"
                @tap="showTip(row.tip, `tip-name-${idx}`)"
              >
                <text class="td-name-text">{{ row.name }}</text>
                <text v-if="row.tip" class="td-name-tip">ⓘ</text>
              </td>
              <td v-for="(p, pi) in displayColumns" :key="`${p.key || pi}`" :class="['td-value', { 'td-pad-col': !p.key }]">
                <text :class="valueClass(row, p.key)">{{ getCellValue(row, p.key) }}</text>
              </td>
            </tr>
          </tbody>
        </table>
      </scroll-view>
    </view>

    <!-- 底部留白 -->
    <view style="height: 60rpx" />
    </template>
  </SubPageCard>

  <!-- ===== 科目一句话解释气泡：点击表格左侧「指标分类 / 指标名称」单元格悬挂显示 =====
       气泡层自身不拦截点击（pointer-events: none），避免遮挡页面操作；
       收起方式：再次点击同一单元格、点击气泡本身、点击其他单元格切换、
       点击页面空白处，或上下滑动页面（由 showTip 中挂载的全局监听实现）。 -->
  <view id="tip-layer" class="tip-layer">
    <view v-if="tipVisible" class="subject-tip" :style="tipStyle" @tap="closeTip">{{ tipText }}</view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import SubPageCard from '@/shared/components/SubPageCard.vue'
import { Tag, Button } from '@/shared/components'
import LoadingState from '@/shared/components/LoadingState.vue'
import InsightCard from '@/shared/components/InsightCard.vue'
import AiAnalysis from '@/modules/analytics/components/ai-analysis.vue'
import { stockApi } from '@/shared/api/modules/stock'

// ===== 设计令牌颜色（与组件库 tokens.json 对齐） =====
const primaryColor = '#0b5fff'

// ===== 参数 =====
const symbol = ref('')
const isFav = ref(false)
const tableYearRange = ref(2)
const loading = ref(true)
const error = ref(false)

// ===== 股票基础数据（从 API 获取） =====
const stock = ref({
  code: '',
  name: '',
  period: '',
  tag: '',
  industry: '',
  updateTime: '',
})

// ===== 多期财务数据 =====
interface PeriodData {
  key: string
  label: string
  revenue: number | null
  revenueYoy: number | null
  netProfit: number | null
  netProfitYoy: number | null
  deductProfit: number | null
  grossMargin: number | null
  netMargin: number | null
  roe: number | null
  cashFlow: number | null
  debtRatio: number | null
}

const allPeriods = ref<PeriodData[]>([])

/** 是否为年报（key 以 'fy' 结尾或 label 包含 '年报'） */
function isAnnual(p: PeriodData): boolean {
  return p.key.endsWith('fy') || p.label.includes('年报')
}

/**
 * 显示多期财务数据
 * 当年：显示所有报告类型（季报、半年报、年报）
 * 往年：只显示年报
 */
const displayPeriods = computed(() => {
  const periods = allPeriods.value
  if (!periods.length) return []

  // 从第一条数据的 key 中提取最新年份
  const latest = periods[0]
  const latestYearMatch = latest.key.match(/^(\d{4})/)
  if (!latestYearMatch) return periods
  const latestYear = parseInt(latestYearMatch[1], 10)

  // 当年：所有报告类型
  const currentYearPeriods = periods.filter(p => {
    const m = p.key.match(/^(\d{4})/)
    return m && parseInt(m[1], 10) === latestYear
  })

  // 往年：仅年报
  const pastYears = tableYearRange.value === 2 ? 2 : 3
  const pastAnnuals: PeriodData[] = []
  for (let i = 1; i <= pastYears; i++) {
    const targetYear = latestYear - i
    const annual = periods.find(p => {
      const m = p.key.match(/^(\d{4})/)
      return m && parseInt(m[1], 10) === targetYear && isAnnual(p)
    })
    if (annual) pastAnnuals.push(annual)
  }

  return [...currentYearPeriods, ...pastAnnuals]
})

/** 透传 displayPeriods，保持模板不变 */
const displayColumns = computed(() => displayPeriods.value)

// ===== AI 四维评分 =====
const scoreLoading = ref(false)
const aiScoreData = ref<any>(null)

/**
 * 业绩洞见卡数据。
 * title=结论一句话；lines=优势/风险/建议 多行（risk 用金色高亮）。
 * 风险按评分生成：`risks` 非空才显示「风险」行，无则整行隐藏（不做占位兜底）。
 */
const reportInsight = computed(() => {
  const ai = aiScoreData.value
  if (!ai || ai.conclusion == null) return { content: '', lines: [] }
  const period = stock.value?.period ? `（${stock.value.period}）` : ''
  const lines: Array<{ key: string; text: string; tone?: 'default' | 'positive' | 'risk' }> = []
  if (Array.isArray(ai.strengths) && ai.strengths.length) {
    lines.push({ key: '优势', text: ai.strengths.join('；'), tone: 'positive' })
  }
  if (Array.isArray(ai.risks) && ai.risks.length) {
    lines.push({ key: '风险', text: ai.risks.join('；'), tone: 'risk' })
  }
  if (ai.advice) {
    lines.push({ key: '建议', text: ai.advice })
  }
  return {
    content: ai.conclusion ? `${ai.conclusion}${period}` : '',
    lines,
  }
})

// ===== 表格数据 =====
/** PeriodData 中数值型字段（排除 key/label 等字符串字段） */
type NumericField = 'revenue' | 'revenueYoy' | 'netProfit' | 'netProfitYoy' | 'deductProfit' | 'grossMargin' | 'netMargin' | 'roe' | 'cashFlow' | 'debtRatio'

interface TableRow {
  category: string
  name: string
  tip?: string
  field: NumericField
  isYoy?: boolean
}

const tableRows: TableRow[] = [
  { category: '营收规模', name: '营业总收入', field: 'revenue', tip: '公司经营业务带来的全部收入，是衡量企业规模最基础的指标' },
  { category: '营收规模', name: '营收同比增速', field: 'revenueYoy', isYoy: true, tip: '本期营收相对去年同期的增长百分比，反映业务扩张的快慢' },
  { category: '盈利利润', name: '归母净利润', field: 'netProfit', tip: '归属于母公司股东的净利润，是股东真正享有的那部分利润' },
  { category: '盈利利润', name: '归母净利同比', field: 'netProfitYoy', isYoy: true, tip: '本期归母净利润相对去年同期的增长百分比，反映盈利的变化方向与幅度' },
  { category: '盈利利润', name: '扣非净利润', field: 'deductProfit', tip: '剔除一次性收益，反映真实主业盈利' },
  { category: '盈利效率', name: '毛利率', field: 'grossMargin', tip: '收入扣除直接成本后的利润占比，反映产品定价能力与成本控制水平' },
  { category: '盈利效率', name: '净利率', field: 'netMargin', tip: '净利润占营业收入的比重，反映公司最终的盈利变现能力' },
  { category: '盈利效率', name: 'ROE(加权)', field: 'roe', tip: '加权平均净资产收益率，衡量股东每投入一元钱能获得多少回报' },
  { category: '现金流', name: '经营现金流净额', field: 'cashFlow', tip: '经营活动实际净流入的现金，持续为正说明利润有真金白银支撑' },
  { category: '偿债', name: '资产负债率', field: 'debtRatio', tip: '总负债占总资产的比重，数值越高说明财务杠杆与偿债压力越大' },
]

/** 指标分类列合并行数：每段相同分类的首行返回该段行数（用于 rowspan），其余行返回 0（不渲染该单元格） */
const categorySpans = computed<number[]>(() => {
  const spans = tableRows.map(() => 0)
  let i = 0
  while (i < tableRows.length) {
    let j = i + 1
    while (j < tableRows.length && tableRows[j].category === tableRows[i].category) j++
    spans[i] = j - i
    i = j
  }
  return spans
})

/** 指标分类的一句话解释（点击最左侧「指标分类」单元格时展示） */
const categoryTips: Record<string, string> = {
  营收规模: '公司主营业务产生的收入总量，反映业务体量与市场地位的扩张情况',
  盈利利润: '扣除成本费用后最终落到股东手里的利润，衡量赚钱的绝对水平',
  盈利效率: '每单位收入或净资产能转化为多少利润，衡量赚钱的质量与效率',
  现金流: '经营活动实际收到与付出的现金，衡量利润是否真的变成了钱',
  偿债: '负债相对资产的比例，衡量财务杠杆高低与偿债压力',
}

function getCellValue(row: TableRow, periodKey: string): string {
  const period = allPeriods.value.find(p => p.key === periodKey)
  if (!period) return '--'
  const val = period[row.field]
  if (val === undefined || val === null) return '--'
  // 所有字段已为 number
  if (row.isYoy) {
    const prefix = val > 0 ? '+' : ''
    return `${prefix}${val.toFixed(2)}%`
  }
  if (['grossMargin', 'netMargin', 'roe', 'debtRatio'].includes(row.field)) {
    return `${val.toFixed(2)}%`
  }
  return `${val.toFixed(2)}亿`
}

function valueClass(row: TableRow, periodKey: string): string {
  const period = allPeriods.value.find(p => p.key === periodKey)
  if (!period) return ''
  const val = period[row.field]
  if (val === null || val === undefined) return ''
  if (row.isYoy) {
    return val >= 0 ? 'val-up' : 'val-down'
  }
  return ''
}

/* ===== 科目一句话解释气泡 =====
   点击单元格后悬挂在单元格附近：优先挂下方，下方空间不足则翻到上方。
   气泡为 absolute 定位（以与可视区域等大的 tip-layer 为基准），避免被裁切。
   收起方式：再次点击同一单元格 / 点击气泡 / 点击其他单元格切换 /
   点击页面空白处 / 上下滑动页面。 */
const tipVisible = ref(false)
const tipText = ref('')
const tipStyle = ref<Record<string, string>>({})
/** 当前展示气泡的单元格 id，用于「再次点击同一单元格收起」 */
const tipCellId = ref('')

/** 气泡宽度（rpx），需与样式表 .subject-tip 的 width 保持一致 */
const TIP_WIDTH_RPX = 520
/** 气泡高度预估（rpx），用于判断下方是否放得下 */
const TIP_EST_HEIGHT_RPX = 200

/** 气泡展示期间在 document 上挂载的全局监听（点击空白 / 页面滑动时收起气泡） */
let globalDismissBound = false

/** 全局收起处理：点在气泡或当前单元格上时交给它们自身处理，其余情况收起气泡 */
function onGlobalDismiss(e: any) {
  const el = e?.target as HTMLElement | undefined
  if (el && typeof el.closest === 'function') {
    if (el.closest('.subject-tip')) return
    if (tipCellId.value && el.closest(`#${tipCellId.value}`)) return
  }
  closeTip()
}

function bindGlobalDismiss() {
  // #ifdef H5
  if (globalDismissBound || typeof document === 'undefined') return
  globalDismissBound = true
  // 点击空白处收起（捕获阶段，先于单元格自身的 tap）
  document.addEventListener('click', onGlobalDismiss, true)
  // 上下滑动收起（scroll 不冒泡，需捕获阶段监听；wheel / touchmove 兼容鼠标与触屏）
  document.addEventListener('scroll', onGlobalDismiss, true)
  document.addEventListener('wheel', onGlobalDismiss, { capture: true, passive: true })
  document.addEventListener('touchmove', onGlobalDismiss, { capture: true, passive: true })
  // #endif
}

function unbindGlobalDismiss() {
  // #ifdef H5
  if (!globalDismissBound || typeof document === 'undefined') return
  globalDismissBound = false
  document.removeEventListener('click', onGlobalDismiss, true)
  document.removeEventListener('scroll', onGlobalDismiss, true)
  document.removeEventListener('wheel', onGlobalDismiss, true)
  document.removeEventListener('touchmove', onGlobalDismiss, true)
  // #endif
}

function showTip(tip: string | undefined, cellId: string) {
  if (!tip) return
  // 再次点击同一单元格：收起
  if (tipVisible.value && tipCellId.value === cellId) {
    closeTip()
    return
  }
  // 同时测量单元格与气泡层：气泡层即 App 可视区域，二者的差值才是气泡的定位坐标。
  // 不能直接用 cellRect 的视口坐标 —— 页面存在 transform 祖先时 fixed 的定位基准
  // 是可视区域而非浏览器视口，会出现整体偏移。
  uni
    .createSelectorQuery()
    .select(`#${cellId}`)
    .boundingClientRect()
    .select('#tip-layer')
    .boundingClientRect()
    .exec((res: any[]) => {
      const cell = res?.[0]
      const layer = res?.[1]
      if (!cell || !layer) return
      const gap = uni.upx2px(12)
      const margin = uni.upx2px(24)
      const bubbleWidth = uni.upx2px(TIP_WIDTH_RPX)
      const cellTop = cell.top - layer.top
      const cellBottom = cell.bottom - layer.top
      // 水平方向以单元格中心对齐，并限制在可视区域内
      const centered = cell.left - layer.left + cell.width / 2 - bubbleWidth / 2
      const left = Math.max(margin, Math.min(centered, layer.width - bubbleWidth - margin))
      const belowTop = cellBottom + gap
      tipText.value = tip
      tipCellId.value = cellId
      tipStyle.value =
        belowTop + uni.upx2px(TIP_EST_HEIGHT_RPX) <= layer.height
          ? { left: `${left}px`, top: `${belowTop}px` }
          : { left: `${left}px`, bottom: `${layer.height - cellTop + gap}px` }
      tipVisible.value = true
      bindGlobalDismiss()
    })
}

function closeTip() {
  tipVisible.value = false
  tipCellId.value = ''
  unbindGlobalDismiss()
}

onUnmounted(() => unbindGlobalDismiss())

// ===== 报告标签类型（红=高增/扭盈，蓝=向好/修复/承压/走弱，绿=疲弱/转亏，灰=预告等兜底） =====
function tagType(tag: string): 'up' | 'down' | 'neutral' | 'gray' {
  if (['高增', '扭盈'].includes(tag)) return 'up'
  if (['疲弱', '转亏'].includes(tag)) return 'down'
  if (['向好', '修复', '承压', '走弱'].includes(tag)) return 'neutral'
  return 'gray' // 预告等兜底标签
}

/** 标签颜色等级：red/blue/green/null */
function tagLevelOf(tag: string): 'red' | 'blue' | 'green' | null {
  if (['高增', '扭盈'].includes(tag)) return 'red'
  if (['疲弱', '转亏'].includes(tag)) return 'green'
  if (['向好', '修复', '承压', '走弱'].includes(tag)) return 'blue'
  return null
}

/** 分数颜色等级：70-100 红 / 36-69 蓝 / 0-35 绿 */
function scoreLevelOf(score: number | null | undefined): 'red' | 'blue' | 'green' | null {
  if (score == null) return null
  if (score >= 70) return 'red'
  if (score >= 36) return 'blue'
  return 'green'
}

/**
 * 页面光晕：与正式报告一致的配色逻辑
 * 标签与分数双红→红光，双绿→绿光；标签无等级（快报"预告"兜底）时退化为按评分着色；
 * 无评分（数据不完整）时按头部标签等级着色，避免与页面标签语义矛盾。
 */
const glowClass = computed(() => {
  const tagLevel = tagLevelOf(stock.value.tag)
  const scoreLevel = scoreLevelOf(aiScoreData.value?.score)
  if (tagLevel === 'red' && scoreLevel === 'red') return 'glow-red'
  if (tagLevel === 'green' && scoreLevel === 'green') return 'glow-green'
  // 标签无等级（快报"预告"等）时：按评分等级着色，保证红/蓝/绿三色齐全
  if (tagLevel == null && scoreLevel) {
    if (scoreLevel === 'red') return 'glow-red'
    if (scoreLevel === 'green') return 'glow-green'
    return 'glow-blue'
  }
  // 无评分（数据不完整）时：按头部标签等级着色，与页面 Tag 语义一致
  if (scoreLevel == null && (tagLevel === 'red' || tagLevel === 'green')) {
    return tagLevel === 'red' ? 'glow-red' : 'glow-green'
  }
  return 'glow-blue'
})

// ===== 操作按钮 =====
function goBackToList() { uni.navigateBack() }

function addToFavorites() {
  isFav.value = !isFav.value
  uni.showToast({ title: isFav.value ? '已加入自选' : '已移除自选', icon: 'none' })
}

function exportReport() {
  // 组装摘要文本
  const s = stock.value
  const lines: string[] = [`${s.name}（${s.code}）${s.period}`]
  if (s.tag) lines.push(`评级：${s.tag}`)
  if (s.industry) lines.push(`行业：${s.industry}`)

  const latest = allPeriods.value[0]
  if (latest) {
    const fmt = (v: number | null, suffix = '') => (v == null ? '--' : `${v.toFixed(2)}${suffix}`)
    lines.push(
      `营收：${fmt(latest.revenue, '亿')}（同比 ${fmt(latest.revenueYoy, '%')}）`,
      `归母净利：${fmt(latest.netProfit, '亿')}（同比 ${fmt(latest.netProfitYoy, '%')}）`,
      `净利率：${fmt(latest.netMargin, '%')} | ROE：${fmt(latest.roe, '%')}`,
    )
  }

  const ai = aiScoreData.value
  if (ai?.dataStatus === 'complete' && ai.score != null) {
    lines.push(`四维评分：${ai.score}分（${ai.rating || ''}）`)
    if (ai.conclusion) lines.push(`洞见：${ai.conclusion}`)
    if (ai.advice) lines.push(`建议：${ai.advice}`)
  }

  const summary = lines.join('\n')
  uni.setClipboardData({
    data: summary,
    success: () => uni.showToast({ title: '摘要已复制', icon: 'none' }),
    fail: () => uni.showToast({ title: '复制失败，请重试', icon: 'none' }),
  })
}

// ===== 从 API 获取分析数据 =====
async function fetchAiScore(sym: string) {
  scoreLoading.value = true
  try {
    const res: any = await stockApi.getAiScore({ symbol: sym })
    const data = res?.data || res
    if (data?.dataStatus) {
      aiScoreData.value = data
    }
  } catch (err: any) {
    console.warn('[ReportDetail] 获取四维评分失败:', err.message)
  } finally {
    scoreLoading.value = false
  }
}

async function fetchAnalysisData(sym: string) {
  loading.value = true
  error.value = false
  try {
    const res: any = await stockApi.getReportAnalysis({
      symbol: sym,
      endDate: options?.endDate || undefined,
    })
    if (!res) throw new Error('API 返回为空')
    const data = (res.data as Record<string, unknown>) || res
    const reportPeriod = String(data['报告期'] || '')
    const reportType = String(data['最新报告类型'] || '')
    const aiTag = String(data['AI研判'] || '')
    const finData = (data['财务数据'] as Record<string, unknown>) || {}
    const periods = (finData['periods'] as any[]) || []

    // 填充股票基础信息
    stock.value.code = sym
    stock.value.name = String(data['股票名称'] || '')
    stock.value.period = reportPeriod + (reportType === 'express' ? '（快报）' : '')
    // 标签兜底：AI研判为空时，快报股票显示"预告"（与列表页一致）
    stock.value.tag = aiTag || (reportType === 'express' ? '预告' : '')

    // 更新时间以接口返回的最新报告时间为准（列表页传入的 stockInfo 作为兜底）
    const apiUpdateTime = String(data['更新时间'] || '')
    if (apiUpdateTime) stock.value.updateTime = apiUpdateTime

    // 解析 stockInfo 参数中的行业等额外信息
    if (options?.stockInfo) {
      try {
        const info = JSON.parse(decodeURIComponent(options.stockInfo))
        if (info.industry) stock.value.industry = info.industry
        if (info.updateTime && !apiUpdateTime) stock.value.updateTime = info.updateTime
      } catch (_) {}
    }

    // 获取 AI 四维评分
    fetchAiScore(sym)

    // 填充多期财务数据
    allPeriods.value = periods.map((p: any) => ({
      key: String(p.key || ''),
      label: String(p.label || ''),
      revenue: p.revenue != null ? Number(p.revenue) : null,
      revenueYoy: p.revenueYoy != null ? Number(p.revenueYoy) : null,
      netProfit: p.netProfit != null ? Number(p.netProfit) : null,
      netProfitYoy: p.netProfitYoy != null ? Number(p.netProfitYoy) : null,
      deductProfit: p.deductProfit != null ? Number(p.deductProfit) : null,
      grossMargin: p.grossMargin != null ? Number(p.grossMargin) : null,
      netMargin: p.netMargin != null ? Number(p.netMargin) : null,
      roe: p.roe != null ? Number(p.roe) : null,
      cashFlow: p.cashFlow != null ? Number(p.cashFlow) : null,
      debtRatio: p.debtRatio != null ? Number(p.debtRatio) : null,
    }))
  } catch (err: any) {
    console.error('[ReportDetail] 获取分析数据失败:', err)
    error.value = true
  } finally {
    loading.value = false
  }
}

let options: Record<string, string> | undefined

onLoad((opts?: Record<string, string>) => {
  options = opts
  if (opts?.symbol) {
    symbol.value = opts.symbol
    fetchAnalysisData(opts.symbol)
  }
})
</script>

<style lang="scss" scoped>
/* ===== 页面底色层：标签+分数双红→浅红底，双绿→浅绿底，其余→浅蓝底 =====
   作为全屏底层背景（z-index 0），SubPageCard 背景透明，白色卡片浮于浅色底之上 */

.report-insight-card {
  margin: 0 24rpx 24rpx;
}
.glow-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 0;
}

.glow-red {
  background: #fdeef0;
}

.glow-blue {
  background: #edf3ff;
}

.glow-green {
  background: #edf9f1;
}

/* 子页面容器背景透明，露出页面浅色底色 */
:deep(.as-sub1) {
  background: transparent;
}

/* ===== 加载/错误状态 ===== */
.loading-state {
  display: flex;
  justify-content: center;
  padding: 120rpx 0;
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 40rpx;
  gap: 16rpx;
}

.error-text {
  font-size: 28rpx;
  color: $ink-soft;
  font-weight: 500;
}

.error-desc {
  font-size: 24rpx;
  color: $ink-mute;
  text-align: center;
}

.retry-btn {
  margin-top: 24rpx;
  padding: 16rpx 48rpx;
  background: $primary;
  color: #fff;
  font-size: 26rpx;
  border-radius: 12rpx;
  font-weight: 500;
}

/* ===== 通用区块 ===== */
.section {
  margin: 0 24rpx 24rpx;
  background: $bg-card;
  border-radius: 24rpx;
  padding: 28rpx;
  box-shadow: $shadow-card;
}

.section-title-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 20rpx;

  &::before {
    content: '';
    width: 6rpx;
    height: 28rpx;
    background: $primary;
    border-radius: 3rpx;
    margin-right: 4rpx;
  }
}

.section-title-text {
  font-size: 28rpx;
  font-weight: 600;
  color: $ink;
}

.section-title-sub {
  margin-left: auto;
  font-size: 22rpx;
  color: #888780;
}

/* ===== 头部信息 ===== */
.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.header-top-left {
  display: flex;
  align-items: center;
  gap: 10rpx;
  flex-wrap: wrap;
}

.header-stock-name {
  font-size: 32rpx;
  font-weight: 700;
  color: $ink;
}

.header-stock-code {
  font-size: 24rpx;
  color: $ink-soft;
  background: $primary-50;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
}

.header-period {
  font-size: 24rpx;
  color: $primary;
  font-weight: 500;
}

.header-sub {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 20rpx;
  flex-wrap: wrap;
}

.header-meta {
  font-size: 22rpx;
  color: $ink-mute;
}

.header-meta-divider {
  font-size: 22rpx;
  color: $line-strong;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid $line-soft;
}

.header-actions :deep(.as-btn) {
  flex: 1;
  min-width: 0;
  box-sizing: border-box;
  white-space: nowrap;
}

/* ===== 核心财务指标表格 ===== */
.section-table {
  overflow: hidden;
}

.table-year-toggle {
  display: flex;
  margin-left: auto;
  background: $bg-soft;
  border-radius: 8rpx;
  padding: 3rpx;
}

.year-toggle-btn {
  font-size: 20rpx;
  color: $ink-soft;
  padding: 4rpx 14rpx;
  border-radius: 6rpx;
  font-weight: 500;

  &.active {
    color: #fff;
    background: $primary;
  }
}

.table-scroll {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.finance-table {
  border-collapse: collapse;
  font-size: 22rpx;
}

.finance-table th,
.finance-table td {
  text-align: center;
  padding: 16rpx 12rpx;
  border-bottom: 1rpx solid $line-soft;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
}

.th-category {
  text-align: center;
  width: 120rpx;
  color: $ink-mute;
  font-weight: 500;
  font-size: 22rpx;
}

.th-name {
  text-align: left;
  width: 160rpx;
  color: $ink-mute;
  font-weight: 500;
  font-size: 22rpx;
}

.th-value {
  width: 160rpx;
  color: $ink;
  font-weight: 600;
  font-size: 22rpx;
}

.td-category {
  font-size: 22rpx;
  color: $ink-mute;
  /* 相同分类合并为一个单元格，分类名称在合并格内居中展示 */
  text-align: center;
  vertical-align: middle;
}

.td-name {
  text-align: left;
  font-weight: 500;
  color: $ink;
  font-size: 22rpx;
}

.td-name-text {
  font-size: 22rpx;
}

.td-name-tip {
  font-size: 20rpx;
  color: $ink-mute;
  margin-left: 4rpx;
}

.td-value {
  font-weight: 500;
  font-size: 22rpx;
}

.val-up { color: $up; }
.val-down { color: $down; }

/* ===== 科目一句话解释气泡 ===== */
/* 气泡层：与 App 可视区域等大，作为气泡的定位基准；自身不拦截点击，避免影响页面操作 */
.tip-layer {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

/* 宽度需与 showTip 中的 TIP_WIDTH_RPX 保持一致 */
.subject-tip {
  position: absolute;
  width: 520rpx;
  box-sizing: border-box;
  padding: 20rpx 24rpx;
  background: rgba($ink, 0.94);
  color: #fff;
  font-size: 22rpx;
  line-height: 1.6;
  border-radius: 12rpx;
  box-shadow: 0 8rpx 28rpx rgba($ink, 0.22);
  word-break: break-word;
  pointer-events: auto;
  z-index: $z-tooltip;
}
</style>
