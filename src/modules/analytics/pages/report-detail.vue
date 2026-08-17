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

    <!-- ===== 模块3：四维分析评分（仅数据完整可评分时显示，无法评分的删去该模块） ===== -->
    <view v-if="aiScoreData?.dataStatus === 'complete'" class="section">
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

    <!-- 底部留白 -->
    <view style="height: 60rpx" />
    </template>
  </SubPageCard>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import SubPageCard from '@/shared/components/SubPageCard.vue'
import { Tag, Button } from '@/shared/components'
import LoadingState from '@/shared/components/LoadingState.vue'
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

/** 页面光晕：标签与分数双红→红光，双绿→绿光，其余情况（双蓝/不同色/无分数）→蓝光 */
const glowClass = computed(() => {
  const tagLevel = tagLevelOf(stock.value.tag)
  const scoreLevel = scoreLevelOf(aiScoreData.value?.score)
  if (tagLevel === 'red' && scoreLevel === 'red') return 'glow-red'
  if (tagLevel === 'green' && scoreLevel === 'green') return 'glow-green'
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
    const res: any = await stockApi.getReportAnalysis({ symbol: sym })
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

    // 解析 stockInfo 参数中的行业/日期等额外信息
    if (options?.stockInfo) {
      try {
        const info = JSON.parse(decodeURIComponent(options.stockInfo))
        if (info.industry) stock.value.industry = info.industry
        if (info.disclosureDate) stock.value.disclosureDate = info.disclosureDate
        if (info.updateTime) stock.value.updateTime = info.updateTime
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
</style>
