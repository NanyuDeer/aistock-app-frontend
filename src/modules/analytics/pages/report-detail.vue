<template>
  <SubPageCard title="财报详情">
    <!-- ===== 模块1：头部基础信息 ===== -->
    <view class="section section-header">
      <view class="header-top">
        <view class="header-top-left">
          <text class="header-stock-name">{{ stock.name }}</text>
          <text class="header-stock-code">{{ stock.code }}</text>
          <text class="header-period">{{ stock.period }}</text>
        </view>
        <text :class="['report-tag', tagClass(stock.tag)]">{{ stock.tag }}</text>
      </view>
      <view class="header-sub">
        <text class="header-meta">{{ stock.industry }}</text>
        <text class="header-meta-divider">|</text>
        <text class="header-meta">披露：{{ stock.disclosureDate }}</text>
        <text class="header-meta-divider">|</text>
        <text class="header-meta">更新：{{ stock.updateTime }}</text>
      </view>
      <view class="header-actions">
        <view class="header-action-btn" @tap="goBackToList">
          <SvgIcon name="list-check" size="24rpx" color="#4d7cfe" />
          <text class="action-btn-text">返回列表</text>
        </view>
        <view class="header-action-btn" @tap="addToFavorites">
          <SvgIcon :name="isFav ? 'star-fill' : 'star-line'" size="24rpx" :color="isFav ? '#f59f0b' : '#4d7cfe'" />
          <text class="action-btn-text">{{ isFav ? '已自选' : '加入自选' }}</text>
        </view>
        <view class="header-action-btn" @tap="exportReport">
          <SvgIcon name="share-line" size="24rpx" color="#4d7cfe" />
          <text class="action-btn-text">导出摘要</text>
        </view>
      </view>
    </view>

    <!-- ===== 模块2：AI 智能研判 ===== -->
    <view class="section section-ai">
      <view class="section-title-row">
        <SvgIcon name="robot-line" size="28rpx" color="#4d7cfe" />
        <text class="section-title-text">AI 智能研判</text>
      </view>

      <!-- 标签组 -->
      <view class="ai-tags">
        <view class="ai-tags-group">
          <text class="ai-tags-group-label">经营亮点</text>
          <view class="ai-tags-list">
            <text
              v-for="(tag, i) in aiTags.good"
              :key="i"
              class="ai-tag ai-tag-good"
              @tap="scrollToSection('table')"
            >{{ tag }}</text>
          </view>
        </view>
        <view class="ai-tags-group">
          <text class="ai-tags-group-label">潜在风险</text>
          <view class="ai-tags-list">
            <text
              v-for="(tag, i) in aiTags.risk"
              :key="i"
              class="ai-tag ai-tag-risk"
              @tap="scrollToSection('table')"
            >{{ tag }}</text>
          </view>
        </view>
      </view>

      <!-- AI 研判短文 -->
      <view class="ai-summary">
        <text class="ai-summary-text">{{ aiSummary }}</text>
      </view>
    </view>

    <!-- ===== 模块3：核心财务指标数据表 ===== -->
    <view id="table-section" class="section section-table">
      <view class="section-title-row">
        <SvgIcon name="file-list-line" size="28rpx" color="#4d7cfe" />
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
              <th v-for="p in displayPeriods" :key="p.key" class="th-value">{{ p.label }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in tableRows" :key="idx">
              <td class="td-category">{{ row.category }}</td>
              <td class="td-name">
                <text class="td-name-text">{{ row.name }}</text>
                <text v-if="row.tip" class="td-name-tip" @longtap="showTip(row.tip)">ⓘ</text>
              </td>
              <td v-for="p in displayPeriods" :key="p.key" class="td-value">
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
        <SvgIcon name="bar-chart-line" size="28rpx" color="#4d7cfe" />
        <text class="section-title-text">走势图表</text>
      </view>

      <!-- Tab 切换 -->
      <view class="chart-tabs">
        <text
          v-for="tab in chartTabs"
          :key="tab.key"
          :class="['chart-tab', activeChartTab === tab.key ? 'active' : '']"
          @tap="switchChartTab(tab.key)"
        >{{ tab.label }}</text>
      </view>

      <!-- 图表 -->
      <view class="chart-wrap">
        <canvas
          :id="chartCanvasId"
          :canvas-id="chartCanvasId"
          class="chart-canvas"
        />
      </view>
    </view>

    <!-- 底部留白 -->
    <view style="height: 60rpx" />
  </SubPageCard>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import uCharts from '@qiun/ucharts'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import SubPageCard from '@/shared/components/SubPageCard.vue'

// ===== 参数 =====
const symbol = ref('')
const isFav = ref(false)
const tableYearRange = ref(2)

// ===== 图表 =====
const chartCanvasId = `chart_rd_${Date.now()}`
const chartReady = ref(false)
const activeChartTab = ref('netProfit')
let chartInstance: InstanceType<typeof uCharts> | null = null

const chartTabs = [
  { key: 'revenue', label: '营收走势' },
  { key: 'netProfit', label: '归母净利走势' },
  { key: 'growth', label: '增速对比' },
  { key: 'grossMargin', label: '毛利率' },
  { key: 'cashFlow', label: '经营现金流' },
]

// ===== 股票基础数据（从参数中恢复） =====
const stock = ref({
  code: '',
  name: '',
  period: '',
  tag: '',
  industry: '',
  disclosureDate: '',
  updateTime: '',
})

// ===== Mock 多期财务数据 =====
interface PeriodData {
  key: string
  label: string
  revenue: number
  revenueYoy: number
  netProfit: number
  netProfitYoy: number
  deductProfit: number
  grossMargin: number
  netMargin: number
  roe: number
  cashFlow: number
  debtRatio: number
}

// 各股票的 Mock 财务数据
type MockDb = Record<string, PeriodData[]>

const mockFinancialDb: MockDb = {
  '600519': [
    { key: '2024h1', label: '2024半年报', revenue: 834.51, revenueYoy: 17.56, netProfit: 416.96, netProfitYoy: 15.88, deductProfit: 416.12, grossMargin: 91.76, netMargin: 49.96, roe: 17.85, cashFlow: 368.42, debtRatio: 19.42 },
    { key: '2023fy', label: '2023年报', revenue: 1505.60, revenueYoy: 18.04, netProfit: 747.34, netProfitYoy: 19.16, deductProfit: 745.68, grossMargin: 91.22, netMargin: 49.64, roe: 32.01, cashFlow: 651.83, debtRatio: 20.87 },
    { key: '2023h1', label: '2023半年报', revenue: 709.87, revenueYoy: 20.76, netProfit: 359.80, netProfitYoy: 20.76, deductProfit: 358.92, grossMargin: 90.86, netMargin: 50.68, roe: 16.42, cashFlow: 305.95, debtRatio: 18.36 },
    { key: '2022fy', label: '2022年报', revenue: 1275.54, revenueYoy: 16.53, netProfit: 627.16, netProfitYoy: 19.55, deductProfit: 625.74, grossMargin: 91.87, netMargin: 49.18, roe: 30.26, cashFlow: 586.47, debtRatio: 19.18 },
  ],
  '000858': [
    { key: '2024h1', label: '2024半年报', revenue: 506.48, revenueYoy: 11.30, netProfit: 190.57, netProfitYoy: 11.86, deductProfit: 189.88, grossMargin: 73.52, netMargin: 37.63, roe: 14.72, cashFlow: 218.56, debtRatio: 20.12 },
    { key: '2023fy', label: '2023年报', revenue: 832.72, revenueYoy: 12.58, netProfit: 302.11, netProfitYoy: 13.19, deductProfit: 301.21, grossMargin: 74.18, netMargin: 36.27, roe: 23.56, cashFlow: 425.83, debtRatio: 22.56 },
    { key: '2023h1', label: '2023半年报', revenue: 455.06, revenueYoy: 10.39, netProfit: 170.37, netProfitYoy: 12.83, deductProfit: 169.78, grossMargin: 73.12, netMargin: 37.44, roe: 13.58, cashFlow: 186.52, debtRatio: 18.94 },
    { key: '2022fy', label: '2022年报', revenue: 739.69, revenueYoy: 11.72, netProfit: 266.91, netProfitYoy: 14.17, deductProfit: 265.83, grossMargin: 75.42, netMargin: 36.08, roe: 22.83, cashFlow: 386.47, debtRatio: 21.36 },
  ],
  '300750': [
    { key: '2024h1', label: '2024半年报', revenue: 2716.12, revenueYoy: 40.12, netProfit: 228.65, netProfitYoy: 82.17, deductProfit: 216.45, grossMargin: 21.63, netMargin: 7.59, roe: 12.34, cashFlow: 386.28, debtRatio: 62.18 },
    { key: '2023fy', label: '2023年报', revenue: 4009.17, revenueYoy: 22.01, netProfit: 441.21, netProfitYoy: 43.58, deductProfit: 418.78, grossMargin: 22.91, netMargin: 11.00, roe: 24.21, cashFlow: 928.24, debtRatio: 63.52 },
    { key: '2023h1', label: '2023半年报', revenue: 2148.76, revenueYoy: 36.47, netProfit: 125.47, netProfitYoy: 54.33, deductProfit: 118.96, grossMargin: 21.85, netMargin: 5.84, roe: 7.68, cashFlow: 279.36, debtRatio: 60.41 },
    { key: '2022fy', label: '2022年报', revenue: 3285.94, revenueYoy: 152.07, netProfit: 307.29, netProfitYoy: 92.89, deductProfit: 289.85, grossMargin: 20.25, netMargin: 9.35, roe: 18.72, cashFlow: 612.52, debtRatio: 58.72 },
  ],
  '601318': [
    { key: '2024h1', label: '2024半年报', revenue: 4949.66, revenueYoy: 4.72, netProfit: 746.19, netProfitYoy: 6.84, deductProfit: 742.56, grossMargin: 22.45, netMargin: 15.08, roe: 8.56, cashFlow: 386.72, debtRatio: 89.52 },
    { key: '2023fy', label: '2023年报', revenue: 9537.89, revenueYoy: 3.82, netProfit: 1166.78, netProfitYoy: 4.21, deductProfit: 1162.35, grossMargin: 21.98, netMargin: 12.23, roe: 13.52, cashFlow: 742.56, debtRatio: 89.83 },
    { key: '2023h1', label: '2023半年报', revenue: 4726.44, revenueYoy: 5.18, netProfit: 698.42, netProfitYoy: 3.96, deductProfit: 694.87, grossMargin: 21.56, netMargin: 14.78, roe: 7.82, cashFlow: 356.48, debtRatio: 88.96 },
    { key: '2022fy', label: '2022年报', revenue: 9186.72, revenueYoy: 2.56, netProfit: 1119.56, netProfitYoy: 3.24, deductProfit: 1115.22, grossMargin: 22.18, netMargin: 12.18, roe: 12.86, cashFlow: 689.52, debtRatio: 89.24 },
  ],
}

// 多期数据，默认用宁德时代
const allPeriods = ref<PeriodData[]>(mockFinancialDb['300750'] || [])

const displayPeriods = computed(() => {
  if (tableYearRange.value === 2) {
    return allPeriods.value.slice(0, 4)
  }
  return allPeriods.value
})

// ===== Mock AI 研判（按股票差异化） =====
const aiTags = ref({ good: ['营收高速增长', '净利大幅提升', '现金流充裕', '毛利率稳定'], risk: ['增速放缓', '成本承压', '存货高增'] })

const aiSummary = ref('')

function buildAiSummary(item: typeof stock.value, periods: PeriodData[]) {
  const cur = periods[0]
  if (!cur) return '暂无数据'
  const prefix = cur.revenueYoy > 0 ? '+' : ''
  const profitPrefix = cur.netProfitYoy > 0 ? '+' : ''
  return `${item.name}${item.period}实现营收${cur.revenue.toFixed(2)}亿元，同比${prefix}${cur.revenueYoy.toFixed(2)}%；归母净利润${cur.netProfit.toFixed(2)}亿元，同比${profitPrefix}${cur.netProfitYoy.toFixed(2)}%。本期业绩判定为「${item.tag}」，成长属性突出。`
}

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
  if (row.isYoy) {
    return period[row.field] >= 0 ? 'val-up' : 'val-down'
  }
  return ''
}

function showTip(tip: string) {
  uni.showToast({ title: tip, icon: 'none', duration: 2000 })
}

// ===== AI 标签样式 =====
function tagClass(tag: string): string {
  const goodTags = ['向好', '高增', '修复', '扭盈']
  return goodTags.includes(tag) ? 'tag-good' : 'tag-bad'
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
function getChartData(tabKey: string) {
  const data = [...allPeriods.value].reverse()
  const categories = data.map(p => p.label.replace('年', '').replace('半年报', 'H1').replace('年报', 'FY'))

  if (tabKey === 'revenue') return { categories, series: [{ name: '营业总收入(亿)', data: data.map(p => p.revenue) }] }
  if (tabKey === 'netProfit') return { categories, series: [{ name: '归母净利润(亿)', data: data.map(p => p.netProfit) }] }
  if (tabKey === 'growth') return {
    categories,
    series: [
      { name: '营收增速(%)', data: data.map(p => p.revenueYoy) },
      { name: '净利增速(%)', data: data.map(p => p.netProfitYoy) },
    ],
  }
  if (tabKey === 'grossMargin') return { categories, series: [{ name: '毛利率(%)', data: data.map(p => p.grossMargin) }] }
  if (tabKey === 'cashFlow') return { categories, series: [{ name: '经营现金流(亿)', data: data.map(p => p.cashFlow) }] }
  return { categories: [], series: [] }
}

async function renderChart() {
  chartReady.value = false
  await nextTick()
  try {
    const chartData = getChartData(activeChartTab.value)
    if (!chartData.categories.length) return

    const ctx = getChartContext()
    const width = getChartWidth()
    if (!ctx || !width) return

    if (chartInstance) {
      try { (chartInstance as unknown as { dispose?: () => void }).dispose?.() } catch (_) {}
      chartInstance = null
    }

    chartInstance = new uCharts({
      type: 'line',
      dataLabel: false,
      dataPointShape: true,
      dataPointSize: 4,
      context: ctx,
      width,
      height: 240,
      // #ifdef H5
      pixelRatio: window.devicePixelRatio || 1,
      // #endif
      categories: chartData.categories,
      series: chartData.series,
      animation: true,
      background: '#ffffff',
      padding: [30, 20, 30, 45],
      color: ['#4d7cfe', '#9ca3af'],
      xAxis: {
        disableGrid: false,
        gridColor: '#f0f2f5',
        fontColor: '#9ca3af',
        fontSize: 10,
        itemCount: 6,
      },
      yAxis: {
        disableGrid: false,
        gridColor: '#f0f2f5',
        fontColor: '#9ca3af',
        fontSize: 10,
        splitNumber: 4,
      },
      legend: {
        show: chartData.series.length > 1,
        position: 'top',
        fontColor: '#6b7280',
        fontSize: 10,
      },
      extra: {
        line: {
          type: 'curve',
          width: 2,
          activeType: 'hollow',
        },
      },
    })
    chartReady.value = true
  } catch (e) {
    console.error('[ReportChart] render failed:', e)
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
    // 设置 canvas 像素缓冲区大小 = CSS 大小 * dpr
    // uCharts 通过 pixelRatio 参数在内部缩放所有绘制坐标，不需要 ctx.scale
    canvas.width = w * dpr
    canvas.height = 240 * dpr
    canvas.style.width = w + 'px'
    canvas.style.height = '240px'
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

// ===== 初始化 =====
onLoad((options?: Record<string, string>) => {
  if (options?.symbol) {
    symbol.value = options.symbol
    // 从 mock 数据库取对应数据
    const dbKey = options.symbol
    if (mockFinancialDb[dbKey]) {
      allPeriods.value = mockFinancialDb[dbKey]
    }
    // 恢复股票基础信息
    if (options?.stockInfo) {
      try {
        const info = JSON.parse(decodeURIComponent(options.stockInfo)) as Partial<typeof stock.value>
        stock.value = { ...stock.value, ...info }
      } catch (_) {}
    }
  }
  // 构建 AI 摘要
  aiSummary.value = buildAiSummary(stock.value, allPeriods.value)
})

onMounted(() => {
  setTimeout(() => renderChart(), 300)
})

watch(tableYearRange, () => {
  setTimeout(() => renderChart(), 100)
})
</script>

<style lang="scss" scoped>
/* ===== 通用区块 ===== */
.section {
  margin: 0 24rpx 24rpx;
  background: #ffffff;
  border-radius: 24rpx;
  padding: 28rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.section-title-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 20rpx;
}

.section-title-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #1a1d24;
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
  color: #1a1d24;
}

.header-stock-code {
  font-size: 24rpx;
  color: #6b7280;
  background: #f0f2f5;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
}

.header-period {
  font-size: 24rpx;
  color: #4d7cfe;
  font-weight: 500;
}

.report-tag {
  font-size: 24rpx;
  font-weight: 600;
  padding: 6rpx 20rpx;
  border-radius: 8rpx;
  flex-shrink: 0;

  &.tag-good { color: #f43f5e; background: rgba(244, 63, 94, 0.1); }
  &.tag-bad { color: #22c55e; background: rgba(34, 197, 94, 0.1); }
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
  color: #9ca3af;
}

.header-meta-divider {
  font-size: 22rpx;
  color: #e0e3e8;
}

.header-actions {
  display: flex;
  gap: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #f0f2f5;
}

.header-action-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 10rpx 20rpx;
  background: #f0f4ff;
  border-radius: 12rpx;
}

.action-btn-text {
  font-size: 22rpx;
  color: #4d7cfe;
  font-weight: 500;
}

/* ===== AI 研判 ===== */
.section-ai {
  background: #ffffff;
}

.ai-tags {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-bottom: 20rpx;
  background: #f8fafc;
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
  color: #6b7280;
  font-weight: 500;
}

.ai-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.ai-tag {
  font-size: 22rpx;
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
  font-weight: 500;

  &.ai-tag-good { color: #059669; background: rgba(5, 150, 105, 0.1); }
  &.ai-tag-risk { color: #dc2626; background: rgba(220, 38, 38, 0.1); }
}

.ai-summary {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 20rpx;
}

.ai-summary-text {
  font-size: 24rpx;
  color: #374151;
  line-height: 1.8;
}

/* ===== 表格 ===== */
.section-table {
  overflow: hidden;
}

.table-year-toggle {
  display: flex;
  margin-left: auto;
  background: #f0f2f5;
  border-radius: 8rpx;
  padding: 3rpx;
}

.year-toggle-btn {
  font-size: 20rpx;
  color: #6b7280;
  padding: 4rpx 14rpx;
  border-radius: 6rpx;
  font-weight: 500;

  &.active {
    color: #fff;
    background: #4d7cfe;
  }
}

.table-scroll {
  width: 100%;
}

.finance-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 22rpx;
  min-width: 600rpx;
}

.finance-table th,
.finance-table td {
  text-align: center;
  padding: 16rpx 12rpx;
  border-bottom: 1rpx solid #f5f7fa;
  white-space: nowrap;
}

.th-category {
  text-align: left;
  width: 100rpx;
  color: #9ca3af;
  font-weight: 500;
  font-size: 20rpx;
}

.th-name {
  text-align: left;
  width: 140rpx;
  color: #9ca3af;
  font-weight: 500;
  font-size: 20rpx;
}

.th-value {
  color: #374151;
  font-weight: 600;
  font-size: 20rpx;
  min-width: 120rpx;
}

.td-category {
  font-size: 20rpx;
  color: #9ca3af;
  text-align: left;
}

.td-name {
  text-align: left;
  font-weight: 500;
  color: #374151;
}

.td-name-text {
  font-size: 22rpx;
}

.td-name-tip {
  font-size: 20rpx;
  color: #9ca3af;
  margin-left: 4rpx;
}

.td-value {
  font-weight: 500;
  font-size: 22rpx;
}

.val-up { color: #dc2626; }
.val-down { color: #059669; }

/* ===== 图表 ===== */
.chart-tabs {
  display: flex;
  gap: 8rpx;
  margin-bottom: 20rpx;
  flex-wrap: wrap;
}

.chart-tab {
  font-size: 22rpx;
  color: #6b7280;
  padding: 8rpx 20rpx;
  border-radius: 12rpx;
  background: #f0f2f5;
  font-weight: 500;

  &.active {
    color: #ffffff;
    background: #4d7cfe;
  }
}

.chart-wrap {
  width: 100%;
  min-height: 240px;
}

.chart-canvas {
  width: 100%;
  height: 240px;
}
</style>
