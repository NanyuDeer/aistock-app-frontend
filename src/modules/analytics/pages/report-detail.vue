<template>
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
        <text class="header-meta">{{ stock.industry }}</text>
        <text class="header-meta-divider">|</text>
        <text class="header-meta">披露：{{ stock.disclosureDate }}</text>
        <text class="header-meta-divider">|</text>
        <text class="header-meta">更新：{{ stock.updateTime }}</text>
      </view>
      <view class="header-actions">
        <Button type="secondary" size="sm" @click="goBackToList">返回列表</Button>
        <Button type="secondary" size="sm" @click="addToFavorites">{{ isFav ? '已自选' : '加入自选' }}</Button>
        <Button type="secondary" size="sm" @click="exportReport">导出摘要</Button>
      </view>
    </view>

    <!-- ===== 模块2：AI 智能研判（原有标签+分析 / partial状态） ===== -->
    <view class="section section-ai">
      <view class="section-title-row">
        <SvgIcon name="robot-line" size="28rpx" :color="primaryColor" />
        <text class="section-title-text">AI 智能研判</text>
        <text v-if="aiScoreData?.dataStatus === 'partial'" class="section-title-sub">
          {{ aiScoreData?.dataPeriod || '' }}
        </text>
      </view>

      <!-- partial 状态：数据不完整 -->
      <template v-if="aiScoreData?.dataStatus === 'partial'">
        <!-- 评分区 -->
        <view class="partial-score-card">
          <view class="partial-score-main">
            <text class="partial-score-number">--</text>
            <text class="partial-score-total">/100</text>
          </view>
          <view class="partial-badges">
            <view class="partial-status-badge">
              <text class="partial-status-text">数据待完善</text>
            </view>
            <view
              v-if="aiScoreData?.originalTag"
              class="partial-original-tag"
              :style="{ background: aiScoreData?.originalTagColor || '#378ADD' }"
            >
              <text class="partial-original-tag-text">{{ aiScoreData?.originalTag }}</text>
            </view>
          </view>
          <text class="partial-prompt">{{ aiScoreData?.prompt || '待更多数据披露后可生成完整研判' }}</text>
        </view>

        <!-- 已确认亮点 -->
        <template v-if="aiScoreData?.availableHighlights && aiScoreData.availableHighlights.length > 0">
          <text class="partial-highlights-title">已确认亮点</text>
          <view class="partial-highlights-list">
            <view
              v-for="(item, index) in aiScoreData.availableHighlights"
              :key="index"
              class="partial-highlight-card"
            >
              <text class="partial-highlight-icon" :style="{ color: item.color }">
                {{ partialHighlightIconMap[item.icon] || '•' }}
              </text>
              <view class="partial-highlight-content">
                <text class="partial-highlight-label">{{ item.label }}</text>
                <text class="partial-highlight-detail">{{ item.detail }}</text>
              </view>
            </view>
          </view>
        </template>
        <view v-else class="partial-highlights-empty">
          <text class="partial-highlights-empty-text">
            当前财报数据字段较少，待更多数据披露后可生成分析
          </text>
        </view>

        <!-- 缺失字段提示条 -->
        <view
          v-if="aiScoreData?.missingFieldLabels && aiScoreData.missingFieldLabels.length > 0"
          class="partial-missing-bar"
        >
          <SvgIcon name="alert-line" size="28rpx" :color="warningColor" class="partial-missing-icon" />
          <view class="partial-missing-content">
            <text class="partial-missing-main">
              当前缺失：{{ aiScoreData.missingFieldLabels.join('、') }}
            </text>
            <text class="partial-missing-sub">
              待相关数据披露后将自动生成完整AI研判
            </text>
          </view>
        </view>
      </template>

      <!-- 原有布局（非 partial） -->
      <template v-else>
        <!-- 标签组 -->
        <view class="ai-tags">
          <view class="ai-tags-group">
            <text class="ai-tags-group-label">经营亮点</text>
            <view class="ai-tags-list">
              <Tag
                v-for="(tag, i) in aiTags.good"
                :key="i"
                type="down"
                size="sm"
                @click="scrollToSection('table')"
              >{{ tag }}</Tag>
            </view>
          </view>
          <view class="ai-tags-group">
            <text class="ai-tags-group-label">潜在风险</text>
            <view class="ai-tags-list">
              <Tag
                v-for="(tag, i) in aiTags.risk"
                :key="i"
                type="up"
                size="sm"
                @click="scrollToSection('table')"
              >{{ tag }}</Tag>
            </view>
          </view>
        </view>

        <!-- AI 研判短文 -->
        <view class="ai-summary">
          <text class="ai-summary-text">{{ aiSummary }}</text>
        </view>
      </template>
    </view>

    <!-- ===== 模块3：四维分析评分（partial 时隐藏，内容已合并到模块2） ===== -->
    <view v-if="aiScoreData?.dataStatus !== 'partial'" class="section">
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
              <td class="td-category">{{ row.category }}</td>
              <td class="td-name">
                <text class="td-name-text">{{ row.name }}</text>
                <text v-if="row.tip" class="td-name-tip" @longtap="showTip(row.tip)">ⓘ</text>
              </td>
              <td v-for="(p, pi) in displayColumns" :key="`${p.key || pi}`" :class="['td-value', { 'td-pad-col': !p.key }]">
                <text :class="valueClass(row, p.key)">{{ getCellValue(row, p.key) }}</text>
              </td>
            </tr>
          </tbody>
        </table>
      </scroll-view>
    </view>

    <!-- ===== 模块4：多维度折线图 ===== -->
    <view class="section section-chart">
      <view class="section-title-row">
        <SvgIcon name="bar-chart-line" size="28rpx" :color="primaryColor" />
        <text class="section-title-text">走势图表</text>
        <view class="chart-filter-group">
          <view
            v-for="opt in chartFilterOptions"
            :key="opt.value"
            :class="['chart-filter-btn', chartPeriodFilter === opt.value ? 'active' : '']"
            @tap="switchChartFilter(opt.value)"
          >{{ opt.label }}</view>
        </view>
      </view>

      <!-- Tab 切换（下划线风格） -->
      <view class="chart-tabs-scroll">
        <view class="chart-tabs-underline">
          <view
            v-for="tab in chartTabs"
            :key="tab.key"
            :class="['chart-tab-item', activeChartTab === tab.key ? 'active' : '']"
            @tap="switchChartTab(tab.key)"
          >
            <text>{{ tab.label }}</text>
            <view v-if="activeChartTab === tab.key" class="chart-tab-ink" />
          </view>
        </view>
      </view>

      <!-- 大字数值区 -->
      <view class="chart-big-number">
        <text class="chart-big-value">{{ bigNumberValue }}</text>
        <text class="chart-big-unit">{{ bigNumberUnit }}</text>
        <text :class="['chart-big-yoy', bigNumberYoy >= 0 ? 'up' : 'down']">
          {{ bigNumberYoyText }}
        </text>
      </view>

      <!-- 图表区域 -->
      <view class="chart-area" :style="'min-height:' + chartHeight + 'px'">
        <canvas
          :id="chartCanvasId"
          :canvas-id="chartCanvasId"
          class="chart-canvas"
          :style="'height:' + chartHeight + 'px'"
        />
        <view v-if="chartNoData" class="chart-empty">暂无足够数据</view>
      </view>

      <!-- 图例 -->
      <view v-if="chartLegendItems.length" class="chart-legend">
        <view
          v-for="(item, li) in chartLegendItems"
          :key="li"
          class="chart-legend-item"
        >
          <view class="chart-legend-dot" :style="{ background: item.color }" />
          <text class="chart-legend-text">{{ item.name }}</text>
        </view>
      </view>

      <!-- 底部摘要卡片 -->
      <view class="chart-summary-row">
        <view
          v-for="(card, ci) in chartSummaryCards"
          :key="ci"
          class="chart-summary-card"
        >
          <text class="chart-summary-label">{{ card.label }}</text>
          <text class="chart-summary-value">{{ card.value }}</text>
        </view>
      </view>
    </view>

    <!-- 底部留白 -->
    <view style="height: 60rpx" />
    </template>
  </SubPageCard>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import uCharts from '@qiun/ucharts'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import SubPageCard from '@/shared/components/SubPageCard.vue'
import { Tag, Button } from '@/shared/components'
import LoadingState from '@/shared/components/LoadingState.vue'
import AiAnalysis from '@/modules/analytics/components/ai-analysis.vue'
import { stockApi } from '@/shared/api/modules/stock'

// ===== 设计令牌颜色（与组件库 tokens.json 对齐） =====
const primaryColor = '#0b5fff'
const warningColor = '#f0a020'

// ===== 参数 =====
const symbol = ref('')
const isFav = ref(false)
const tableYearRange = ref(2)
const loading = ref(true)
const error = ref(false)

// ===== 图表 =====
const chartCanvasId = `chart_rd_${Date.now()}`
const chartReady = ref(false)
const activeChartTab = ref('netProfit')
let chartInstance: InstanceType<typeof uCharts> | null = null

const chartTabs = [
  { key: 'revenue', label: '营收走势' },
  { key: 'netProfit', label: '归母净利' },
  { key: 'growth', label: '增速对比' },
  { key: 'grossMargin', label: '毛利率' },
  { key: 'cashFlow', label: '经营现金流' },
]

/** 口径筛选 */
const chartFilterOptions = [
  { value: 'annual', label: '年报' },
  { value: 'semi', label: '半年报' },
  { value: 'quarterly', label: '季报' },
] as const
type ChartFilterType = 'annual' | 'semi' | 'quarterly'
const chartPeriodFilter = ref<ChartFilterType>('annual')

/** 判断报告期属于哪个口径 */
function matchPeriodFilter(p: PeriodData, filter: ChartFilterType): boolean {
  if (filter === 'annual') {
    return p.key.endsWith('fy') || p.label.includes('年报')
  }
  if (filter === 'semi') {
    return p.key.endsWith('h1') || p.label.includes('半年报')
  }
  if (filter === 'quarterly') {
    // 季报：一季报(03) 或 三季报(09)
    return (p.key.endsWith('0331') || p.key.endsWith('0930'))
      || p.label.includes('一季报') || p.label.includes('三季报')
  }
  return false
}

/** 图表专用数据源：按口径筛选，按 end_date 升序 */
const chartPeriods = computed(() => {
  return allPeriods.value
    .filter(p => matchPeriodFilter(p, chartPeriodFilter.value))
    .sort((a, b) => a.key.localeCompare(b.key))
})

function switchChartFilter(val: ChartFilterType) {
  chartPeriodFilter.value = val
  setTimeout(() => renderChart(), 100)
}

/** 图表颜色映射：按指标区分（新配色） */
const chartColors: Record<string, string> = {
  revenue: '#378add',
  netProfit: '#1d9e75',
  growthRevenue: '#e24b4a',
  growthProfit: '#1d9e75',
  grossMargin: '#7f77dd',
  cashFlow: '#ef9f27',
}

// ===== 股票基础数据（从 API 获取） =====
const stock = ref({
  code: '',
  name: '',
  period: '',
  tag: '',
  industry: '',
  disclosureDate: '',
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
  return matchPeriodFilter(p, 'annual')
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

// ===== AI 研判（来自 API） =====
const aiTags = ref({ good: [] as string[], risk: [] as string[] })
const aiSummary = ref('')

// partial 状态：亮点图标映射
const partialHighlightIconMap: Record<string, string> = {
  trend_up: '▲',
  trend_down: '▼',
  cash: '$',
  shield: '⛨',
  warning: '!',
}

// ===== AI 四维评分 =====
const scoreLoading = ref(false)
const aiScoreData = ref<any>(null)

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
  { category: '营收规模', name: '营业总收入', field: 'revenue' },
  { category: '营收规模', name: '营收同比增速', field: 'revenueYoy', isYoy: true },
  { category: '盈利利润', name: '归母净利润', field: 'netProfit' },
  { category: '盈利利润', name: '归母净利同比', field: 'netProfitYoy', isYoy: true },
  { category: '盈利利润', name: '扣非净利润', field: 'deductProfit', tip: '剔除一次性收益，反映真实主业盈利' },
  { category: '盈利效率', name: '毛利率', field: 'grossMargin' },
  { category: '盈利效率', name: '净利率', field: 'netMargin' },
  { category: '盈利效率', name: 'ROE(加权)', field: 'roe' },
  { category: '现金流', name: '经营现金流净额', field: 'cashFlow' },
  { category: '偿债', name: '资产负债率', field: 'debtRatio' },
]

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

function showTip(tip: string) {
  uni.showToast({ title: tip, icon: 'none', duration: 2000 })
}

// ===== 报告标签类型（A股红涨绿跌：利好=up红色，利空=down绿色） =====
function tagType(tag: string): 'up' | 'down' {
  const goodTags = ['向好', '高增', '修复', '扭盈']
  return goodTags.includes(tag) ? 'up' : 'down'
}

// ===== 滚动 =====
function scrollToSection(id: string) {
  uni.createSelectorQuery().select(`#${id}-section`).boundingClientRect(rect => {
    if (rect && !Array.isArray(rect)) {
      const top = rect.top ?? 0
      const height = rect.height ?? 0
      uni.pageScrollTo({ scrollTop: top + height, duration: 300 })
    }
  }).exec()
}

// ===== 操作按钮 =====
function goBackToList() { uni.navigateBack() }

function addToFavorites() {
  isFav.value = !isFav.value
  uni.showToast({ title: isFav.value ? '已加入自选' : '已移除自选', icon: 'none' })
}

function exportReport() {
  uni.showToast({ title: '摘要已复制', icon: 'none' })
}

// ===== 图表 =====
/** 是否为百分比类指标 */
function isPercentTab(key: string): boolean {
  return ['growth', 'grossMargin'].includes(key)
}

/** 是否为金额类指标 */
function isMoneyTab(key: string): boolean {
  return ['revenue', 'netProfit', 'cashFlow'].includes(key)
}

/** 获取当前Tab最新一期数值（用于大字数值区） */
function getLatestValue(tabKey: string): number | null {
  const data = chartPeriods.value
  if (!data.length) return null
  const latest = data[data.length - 1]
  const map: Record<string, keyof PeriodData> = {
    revenue: 'revenue',
    netProfit: 'netProfit',
    growth: 'revenueYoy',
    grossMargin: 'grossMargin',
    cashFlow: 'cashFlow',
  }
  const field = map[tabKey]
  if (!field) return null
  const val = latest[field]
  return val != null ? Number(val) : null
}

/** 获取最新一期同比（用于大字数值区副标签） */
function getLatestYoy(tabKey: string): number | null {
  const data = chartPeriods.value
  if (!data.length) return null
  const latest = data[data.length - 1]
  const map: Record<string, keyof PeriodData> = {
    revenue: 'revenueYoy',
    netProfit: 'netProfitYoy',
    growth: 'revenueYoy',
    grossMargin: 'revenueYoy',
    cashFlow: 'revenueYoy',
  }
  const field = map[tabKey]
  if (!field) return null
  const val = latest[field]
  return val != null ? Number(val) : null
}

/** 计算复合年增长率 (CAGR) */
function calcCAGR(values: (number | null)[], years: number): number | null {
  const valid = values.filter(v => v != null && v > 0) as number[]
  if (valid.length < 2) return null
  const first = valid[0]
  const last = valid[valid.length - 1]
  const n = Math.min(valid.length - 1, years)
  if (first <= 0 || last <= 0 || n < 1) return null
  return (Math.pow(last / first, 1 / n) - 1) * 100
}

/** 获取指定Tab的数值数组（过滤null/0） */
function getTabValues(tabKey: string): (number | null)[] {
  const data = chartPeriods.value
  const map: Record<string, keyof PeriodData> = {
    revenue: 'revenue',
    netProfit: 'netProfit',
    growth: 'revenueYoy',
    grossMargin: 'grossMargin',
    cashFlow: 'cashFlow',
  }
  const field = map[tabKey]
  if (!field) return []
  return data.map(p => {
    const v = p[field]
    return v != null && v !== 0 ? Number(v) : null
  })
}

/** 大字数值 */
const bigNumberValue = computed(() => {
  const val = getLatestValue(activeChartTab.value)
  if (val == null) return '--'
  if (isPercentTab(activeChartTab.value)) {
    return val >= 0 ? `${val.toFixed(1)}` : `${val.toFixed(1)}`
  }
  return `${val.toFixed(2)}`
})

const bigNumberUnit = computed(() => {
  if (isPercentTab(activeChartTab.value)) return '%'
  return '亿元'
})

const bigNumberYoy = computed(() => {
  return getLatestYoy(activeChartTab.value) ?? 0
})

const bigNumberYoyText = computed(() => {
  const yoy = bigNumberYoy.value
  if (yoy === 0) return '同比 --'
  const prefix = yoy > 0 ? '+' : ''
  return `同比 ${prefix}${yoy.toFixed(1)}%`
})

/** 图例项 */
const chartLegendItems = computed(() => {
  const tab = activeChartTab.value
  if (tab === 'growth') {
    return [
      { name: '营收增速（%）', color: chartColors.growthRevenue },
      { name: '净利增速（%）', color: chartColors.growthProfit },
    ]
  }
  const nameMap: Record<string, string> = {
    revenue: '营业收入（亿元）',
    netProfit: '归母净利润（亿元）',
    grossMargin: '毛利率（%）',
    cashFlow: '经营现金流（亿元）',
  }
  const colorMap: Record<string, string> = {
    revenue: chartColors.revenue,
    netProfit: chartColors.netProfit,
    grossMargin: chartColors.grossMargin,
    cashFlow: chartColors.cashFlow,
  }
  return [{ name: nameMap[tab] || '', color: colorMap[tab] || '#888780' }]
})

/** 图表无数据 */
const chartNoData = ref(false)

/** 图表高度 */
const chartHeight = computed(() => {
  return activeChartTab.value === 'growth' ? 280 : 240
})

/** 底部摘要卡片 */
interface SummaryCard {
  label: string
  value: string
}

const chartSummaryCards = computed(() => {
  const tab = activeChartTab.value
  const values = getTabValues(tab)
  const validVals = values.filter(v => v != null) as number[]

  if (tab === 'growth') {
    // 增速对比模式
    const revValues = getTabValues('revenue')
    const profitValues = getTabValues('netProfit')
    const revCagr = calcCAGR(revValues, 5)
    const profitCagr = calcCAGR(profitValues, 5)
    let judge = '--'
    if (revCagr != null && profitCagr != null) {
      judge = revCagr >= 10 && profitCagr >= 10 ? '双高增长' : profitCagr > revCagr ? '利润增速领先' : '营收增速领先'
    }
    return [
      { label: '营收CAGR', value: revCagr != null ? `${revCagr >= 0 ? '+' : ''}${revCagr.toFixed(1)}%` : '--' },
      { label: '净利CAGR', value: profitCagr != null ? `${profitCagr >= 0 ? '+' : ''}${profitCagr.toFixed(1)}%` : '--' },
      { label: '盈利能力', value: judge },
    ]
  }

  if (tab === 'grossMargin') {
    const avg = validVals.length ? validVals.reduce((a, b) => a + b, 0) / validVals.length : null
    const latest = validVals.length ? validVals[validVals.length - 1] : null
    let trend = '--'
    if (avg != null && latest != null) {
      trend = latest >= avg ? '高于均值' : '低于均值'
    }
    return [
      { label: '6年均值', value: avg != null ? `${avg.toFixed(1)}%` : '--' },
      { label: '最新值', value: latest != null ? `${latest.toFixed(1)}%` : '--' },
      { label: '趋势判断', value: trend },
    ]
  }

  // 营收/净利/现金流模式
  const cagr = calcCAGR(values, 5)
  const peakVal = validVals.length ? Math.max(...validVals) : null
  const data = chartPeriods.value
  let peakYear = '--'
  if (peakVal != null) {
    for (let i = 0; i < values.length; i++) {
      if (values[i] != null && Number(values[i]) === peakVal) {
        peakYear = data[i]?.label?.replace(/[^0-9]/g, '') || '--'
        break
      }
    }
  }
  const latestYoy = getLatestYoy(tab)

  return [
    { label: `${validVals.length}年CAGR`, value: cagr != null ? `${cagr >= 0 ? '+' : ''}${cagr.toFixed(1)}%` : '--' },
    { label: '最新同比', value: latestYoy != null ? `${latestYoy >= 0 ? '+' : ''}${latestYoy.toFixed(1)}%` : '--' },
    { label: '峰值年份', value: peakYear },
  ]
})

function getChartData(tabKey: string) {
  const data = chartPeriods.value
  const filter = chartPeriodFilter.value

  // 分类标签：根据不同口径显示不同格式
  const categories = data.map(p => {
    if (filter === 'annual') {
      return p.label.replace('年报', '')
    }
    if (filter === 'semi') {
      return p.label.replace('半年报', 'H1')
    }
    if (filter === 'quarterly') {
      return p.label
        .replace('一季报', 'Q1')
        .replace('三季报', 'Q3')
    }
    return p.label
  })

  function getData(field: keyof PeriodData): (number | null)[] {
    return data.map(p => {
      const v = p[field]
      if (v === null || v === undefined || v === 0) return null
      return Number(v)
    })
  }

  if (tabKey === 'revenue') {
    return {
      categories,
      series: [{ name: '营业收入（亿元）', data: getData('revenue'), color: chartColors.revenue }],
    }
  }
  if (tabKey === 'netProfit') {
    return {
      categories,
      series: [{ name: '归母净利润（亿元）', data: getData('netProfit'), color: chartColors.netProfit }],
    }
  }
  if (tabKey === 'growth') {
    return {
      categories,
      series: [
        { name: '营收增速（%）', data: getData('revenueYoy'), color: chartColors.growthRevenue },
        { name: '净利增速（%）', data: getData('netProfitYoy'), color: chartColors.growthProfit },
      ],
    }
  }
  if (tabKey === 'grossMargin') {
    return {
      categories,
      series: [{ name: '毛利率（%）', data: getData('grossMargin'), color: chartColors.grossMargin }],
    }
  }
  if (tabKey === 'cashFlow') {
    return {
      categories,
      series: [{ name: '经营现金流（亿元）', data: getData('cashFlow'), color: chartColors.cashFlow }],
    }
  }
  return { categories: [], series: [] }
}

async function renderChart() {
  chartReady.value = false
  chartNoData.value = false
  await nextTick()
  try {
    const chartData = getChartData(activeChartTab.value)
    if (!chartData.categories.length || chartData.series.every(s => s.data.every(d => d == null))) {
      chartNoData.value = true
      return
    }

    const ctx = getChartContext()
    const width = getChartWidth()
    if (!ctx || !width) {
      console.warn('[ReportChart] canvas context not available')
      chartNoData.value = true
      return
    }

    if (chartInstance) {
      try { (chartInstance as unknown as { dispose?: () => void }).dispose?.() } catch (_) {}
      chartInstance = null
    }

    const isDual = chartData.series.length > 1
    const colors = chartData.series.map(s => s.color || '#378add')
    const isGrossMargin = activeChartTab.value === 'grossMargin'

    // 构建兼容的 uCharts opts
    const opts: Record<string, any> = {
      type: 'line',
      dataLabel: false,
      dataPointShape: true,
      dataPointSize: 4,
      context: ctx,
      width,
      height: chartHeight.value,
      pixelRatio: 1,
      categories: chartData.categories,
      series: chartData.series.map(s => ({ name: s.name, data: s.data })),
      animation: true,
      background: '#ffffff',
      padding: [30, 20, 30, 45],
      color: colors,
      xAxis: {
        disableGrid: false,
        gridColor: '#f1efe8',
        fontColor: '#888780',
        fontSize: 10,
        itemCount: chartData.categories.length,
        axisColor: '#d3d1c7',
        rotateLabel: true,
        rotateAngle: 45,
      },
      yAxis: {
        disableGrid: false,
        gridColor: '#f1efe8',
        fontColor: '#b4b2a9',
        fontSize: 9,
        splitNumber: 4,
        toFixed: 1,
      },
      legend: {
        show: chartData.series.length > 1,
        position: 'top',
        fontColor: '#4b5a7a',
        fontSize: 10,
      },
      extra: {
        line: {
          type: 'curve',
          width: 2,
          activeType: 'hollow',
        },
        tooltip: {
          bgColor: '#534ab7',
          fontColor: '#ffffff',
          fontSize: 11,
        },
      },
    }

    // 非金额类 (百分比) Y轴从0开始
    if (isPercentTab(activeChartTab.value)) {
      opts.yAxis.data = [{ min: 0 }]
    }

    // 毛利率：面积填充
    if (isGrossMargin) {
      opts.extra.line.meter = { border: true, fillColor: 'rgba(127,119,221,0.08)' }
    }

    // 增速对比模式Tooltip显示双线
    if (isDual) {
      opts.extra.tooltip.more = { isActive: true, moreList: chartData.series.map(s => s.name) }
    }

    console.log('[ReportChart] creating uCharts with', chartData.categories.length, 'categories')
    chartInstance = new uCharts(opts)
    console.log('[ReportChart] uCharts created successfully')

    chartReady.value = true
  } catch (e) {
    console.error('[ReportChart] render failed:', e)
    chartNoData.value = true
    chartReady.value = true
  }
}

/** 在 H5 下 uni-app <canvas> 渲染为 <uni-canvas> 包裹器，需取内部真实 canvas */
function getRealCanvas(): HTMLCanvasElement | null {
  const wrapper = document.getElementById(chartCanvasId)
  if (!wrapper) return null
  if (wrapper.tagName === 'CANVAS') return wrapper as HTMLCanvasElement
  return wrapper.querySelector('canvas')
}

function getChartContext(): CanvasRenderingContext2D | UniApp.CanvasContext | null {
  // #ifdef H5
  const canvas = getRealCanvas()
  if (canvas) {
    const dpr = window.devicePixelRatio || 1
    const parent = canvas.parentElement
    const w = parent?.offsetWidth || 300
    canvas.width = w * dpr
    canvas.height = chartHeight.value * dpr
    canvas.style.width = w + 'px'
    canvas.style.height = chartHeight.value + 'px'
    const ctx = canvas.getContext('2d')
    return ctx
  }
  return null
  // #endif
  // #ifndef H5
  return uni.createCanvasContext(chartCanvasId)
  // #endif
}

function getChartWidth(): number {
  // #ifdef H5
  const canvas = getRealCanvas()
  return canvas?.parentElement?.offsetWidth || 300
  // #endif
  // #ifndef H5
  return 300
  // #endif
}

function switchChartTab(key: string) {
  activeChartTab.value = key
  setTimeout(() => renderChart(), 100)
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
    const res: any = await stockApi.getReportAnalysis({ symbol: sym })
    if (!res) throw new Error('API 返回为空')
    const data = (res.data as Record<string, unknown>) || res
    const reportPeriod = String(data['报告期'] || '')
    const reportType = String(data['最新报告类型'] || '')
    const aiTag = String(data['AI研判'] || '')
    const goodTags = (data['经营亮点'] as string[]) || []
    const riskTags = (data['潜在风险'] as string[]) || []
    const analysisText = String(data['综合研判'] || '')
    const finData = (data['财务数据'] as Record<string, unknown>) || {}
    const periods = (finData['periods'] as any[]) || []

    // 填充股票基础信息
    stock.value.code = sym
    stock.value.name = String(data['股票名称'] || '')
    stock.value.period = reportPeriod + (reportType === 'express' ? '（快报）' : '')
    stock.value.tag = aiTag

    // 解析 stockInfo 参数中的行业/日期等额外信息
    if (options?.stockInfo) {
      try {
        const info = JSON.parse(decodeURIComponent(options.stockInfo))
        if (info.industry) stock.value.industry = info.industry
        if (info.disclosureDate) stock.value.disclosureDate = info.disclosureDate
        if (info.updateTime) stock.value.updateTime = info.updateTime
      } catch (_) {}
    }

    // 填充 AI 研判
    aiTags.value = { good: goodTags, risk: riskTags }
    aiSummary.value = analysisText

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

onMounted(() => {
  setTimeout(() => renderChart(), 300)
})

watch(tableYearRange, () => {
  setTimeout(() => renderChart(), 100)
})

// 数据加载完成后重绘图表
watch(allPeriods, () => {
  if (allPeriods.value.length > 0) {
    setTimeout(() => renderChart(), 100)
  }
})
</script>

<style lang="scss" scoped>
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

/* ===== AI 研判 ===== */
.section-ai {
  background: $bg-card;
}

.ai-tags {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-bottom: 20rpx;
  background: $bg-soft;
  border-radius: 16rpx;
  padding: 20rpx;
}

.ai-tags-group {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.ai-tags-group-label {
  font-size: 22rpx;
  color: $ink-soft;
  font-weight: 500;
}

.ai-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.ai-summary {
  background: $bg-card;
  border-radius: 16rpx;
  padding: 20rpx;
}

.ai-summary-text {
  font-size: 24rpx;
  color: $ink-soft;
  line-height: 1.8;
}

/* ===== AI 智能研判 - partial 状态 ===== */

// 评分区
.partial-score-card {
  background: $bg-soft;
  border-radius: 12rpx;
  padding: 32rpx 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.partial-score-main {
  display: flex;
  align-items: baseline;
}

.partial-score-number {
  font-size: 48rpx;
  font-weight: 700;
  color: $ink-faint;
  line-height: 1;
}

.partial-score-total {
  font-size: 24rpx;
  color: $ink-faint;
  margin-left: 4rpx;
}

.partial-badges {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-top: 12rpx;
  gap: 12rpx;
}

.partial-status-badge {
  display: inline-block;
  padding: 4rpx 16rpx;
  border-radius: 22rpx;
  background: $line-soft;
}

.partial-status-text {
  font-size: 22rpx;
  font-weight: 500;
  color: $ink-mute;
}

.partial-original-tag {
  display: inline-block;
  padding: 4rpx 16rpx;
  border-radius: 22rpx;
}

.partial-original-tag-text {
  font-size: 22rpx;
  font-weight: 500;
  color: #ffffff;
}

.partial-prompt {
  font-size: 24rpx;
  color: $ink-mute;
  margin-top: 12rpx;
  text-align: center;
}

// 已确认亮点
.partial-highlights-title {
  font-size: 24rpx;
  font-weight: 600;
  color: $ink;
  margin-bottom: 12rpx;
  display: block;
  padding-top: 8rpx;
}

.partial-highlights-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.partial-highlight-card {
  background: $bg-card;
  border: 1rpx solid $line;
  border-radius: 12rpx;
  padding: 20rpx;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 12rpx;
}

.partial-highlight-icon {
  font-size: 28rpx;
  flex-shrink: 0;
  line-height: 1.4;
}

.partial-highlight-content {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.partial-highlight-label {
  font-size: 24rpx;
  font-weight: 500;
  color: $ink;
}

.partial-highlight-detail {
  font-size: 22rpx;
  color: $ink-mute;
  line-height: 1.6;
  margin-top: 6rpx;
}

// 空亮点兜底
.partial-highlights-empty {
  background: $bg-soft;
  border-radius: 12rpx;
  padding: 32rpx 24rpx;
}

.partial-highlights-empty-text {
  font-size: 24rpx;
  color: $ink-mute;
  text-align: center;
}

// 缺失字段提示条
.partial-missing-bar {
  background: $warning-bg;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 12rpx;
  margin-top: 12rpx;
}

.partial-missing-icon {
  font-size: 24rpx;
  color: $warning;
  flex-shrink: 0;
  line-height: 1.4;
}

.partial-missing-content {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.partial-missing-main {
  font-size: 22rpx;
  color: $warning;
  font-weight: 500;
}

.partial-missing-sub {
  font-size: 20rpx;
  color: $ink-mute;
  margin-top: 6rpx;
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
  text-align: left;
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
  text-align: left;
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

/* ===== 走势图表（新设计） ===== */
.section-chart {
  margin: 0 24rpx 24rpx;
  background: $bg-card;
  border: 1rpx solid $line;
  border-radius: 12rpx;
  padding: 24rpx;
}

.chart-tab {
  font-size: 22rpx;
  color: $ink-soft;
  padding: 8rpx 20rpx;
  border-radius: 12rpx;
  background: $bg-soft;
  font-weight: 500;
  color: $ink;
}

.chart-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.chart-header-title {
  font-size: 30rpx;
  font-weight: 500;
  color: $ink;
}

.chart-header-badge {
  font-size: 22rpx;
  color: $ink-mute;
  background: $bg-soft;
  border-radius: 4rpx;
  padding: 4rpx 16rpx;
}

.chart-filter-group {
  display: flex;
  gap: 0;
  border: 1rpx solid $line-strong;
  border-radius: 6rpx;
  overflow: hidden;
}

.chart-filter-btn {
  font-size: 22rpx;
  color: $ink-mute;
  padding: 6rpx 20rpx;
  background: $bg-card;
  font-weight: 400;
  cursor: pointer;

  &.active {
    color: #ffffff;
    background: $primary;
    font-weight: 500;
  }

  &:not(:last-child) {
    border-right: 1rpx solid $line-strong;
  }
}

/* Tab栏（下划线风格，可横向滚动） */
.chart-tabs-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  margin-bottom: 0;
}

.chart-tabs-underline {
  display: flex;
  white-space: nowrap;
  border-bottom: 1rpx solid $line;
  gap: 0;
}

.chart-tab-item {
  position: relative;
  font-size: 24rpx;
  color: $ink-mute;
  padding: 16rpx 28rpx;
  flex-shrink: 0;
  font-weight: 400;
  cursor: pointer;
}

.chart-tab-item.active {
  color: $primary;
  font-weight: 500;
}

.chart-tab-ink {
  position: absolute;
  bottom: 0;
  left: 28rpx;
  right: 28rpx;
  height: 4rpx;
  background: $primary;
  border-radius: 2rpx;
}

/* 大字数值区 */
.chart-big-number {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
  margin: 20rpx 0 16rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid $line-soft;
}

.chart-big-value {
  font-size: 48rpx;
  font-weight: 500;
  color: $ink;
}

.chart-big-unit {
  font-size: 26rpx;
  color: $ink-mute;
}

.chart-big-yoy {
  font-size: 24rpx;
  margin-left: 8rpx;
}

.chart-big-yoy.up {
  color: $up;
}

.chart-big-yoy.down {
  color: $down;
}

/* 图表区域 */
.chart-area {
  position: relative;
  width: 100%;
  min-height: 240px;
  background: $bg-soft;
  border-radius: 8rpx;
  padding: 12rpx;
  box-sizing: border-box;
}

.chart-canvas {
  width: 100%;
  height: 240px;
}

.chart-empty {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 24rpx;
  color: $ink-faint;
  text-align: center;
}

/* 图例 */
.chart-legend {
  display: flex;
  gap: 32rpx;
  margin-top: 12rpx;
  padding-top: 12rpx;
  border-top: 1rpx solid $line-soft;
}

.chart-legend-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.chart-legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  flex-shrink: 0;
}

.chart-legend-text {
  font-size: 24rpx;
  color: $ink-mute;
}

/* 底部摘要卡片 */
.chart-summary-row {
  display: flex;
  gap: 8rpx;
  margin-top: 12rpx;
  padding-top: 12rpx;
  border-top: 1rpx solid $line-soft;
}

.chart-summary-card {
  flex: 1;
  background: $bg-soft;
  border-radius: 6rpx;
  padding: 8rpx 20rpx;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.chart-summary-label {
  font-size: 20rpx;
  color: $ink-mute;
}

.chart-summary-value {
  font-size: 32rpx;
  font-weight: 500;
  color: $ink;
}
</style>
