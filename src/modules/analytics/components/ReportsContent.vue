<template>
  <view class="reports-content">
    <!-- 搜索栏 + 筛选排序栏 -->
    <view class="reports-fixed">
      <view class="search-bar">
        <view class="search-input-wrap">
          <SvgIcon name="search-line" size="28rpx" color="#9ca3af" />
          <input
            v-model="keyword"
            class="search-input"
            placeholder="搜索股票代码/简称"
            confirm-type="search"
            @input="handleSearchInput"
            @confirm="handleSearch"
          />
          <text v-if="keyword" class="search-clear" @tap="handleReset">✕</text>
        </view>
      </view>

      <!-- 筛选 + 排序 单行 -->
      <view class="filter-sort-bar">
        <!-- 左侧：年份筛选 -->
        <view class="filter-section" @tap="toggleYearPicker">
          <SvgIcon name="filter-line" size="24rpx" color="#4d7cfe" />
          <text class="filter-text">{{ selectedYear }}年</text>
          <SvgIcon name="arrow-down-s" size="20rpx" color="#6b7280" />
        </view>

        <!-- 右侧：排序下拉 + 升降序 -->
        <view class="sort-section">
          <picker
            mode="selector"
            :range="sortLabels"
            :value="sortIndex"
            @change="onSortChange"
          >
            <view class="sort-picker">
              <text class="sort-picker-text">{{ currentSortLabel }}</text>
              <SvgIcon name="arrow-down-s" size="20rpx" color="#6b7280" />
            </view>
          </picker>
          <view class="sort-order">
            <text
              :class="['order-btn', sortAsc === false ? 'active' : '']"
              @tap="setOrder(false)"
            >降序</text>
            <text
              :class="['order-btn', sortAsc === true ? 'active' : '']"
              @tap="setOrder(true)"
            >升序</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 年份下拉弹窗 -->
    <view v-if="showYearPicker" class="industry-overlay" @tap="closeYearPicker">
      <view class="industry-popup" @tap.stop>
        <view class="industry-popup-header">
          <text class="industry-popup-title">选择年份</text>
          <text class="industry-popup-close" @tap="closeYearPicker">✕</text>
        </view>
        <scroll-view class="industry-list" scroll-y>
          <view
            v-for="yr in yearList"
            :key="yr"
            :class="['industry-item', selectedYear === yr ? 'active' : '']"
            @tap="selectYear(yr)"
          >{{ yr }}年</view>
        </scroll-view>
      </view>
    </view>

    <!-- 加载中 -->
    <view v-if="loading" class="loading-state">
      <LoadingState />
    </view>

    <!-- 空数据 -->
    <view v-else-if="!filteredList.length" class="empty-state">
      <EmptyState :text="emptyTip" />
    </view>

    <!-- 列表 -->
    <view v-if="filteredList.length" class="report-list">
      <view
        v-for="item in filteredList"
        :key="item.code"
        class="report-card"
        @tap="goStockDetail(item)"
      >
        <!-- 顶部：股票名称 + 代码｜报告期｜标签 -->
        <view class="report-top">
          <view class="report-top-left">
            <text class="stock-name">{{ item.name }}</text>
            <text class="stock-code">{{ item.code }}</text>
          </view>
          <view class="report-period">{{ item.period }}</view>
          <text :class="['report-tag', tagClass(item.tag)]">{{ item.tag }}</text>
        </view>

        <!-- 中部：AI 研判标签 -->
        <view class="report-mid">
          <view class="report-tags-wrap">
            <view class="report-tags-group">
              <text class="report-tags-label">经营亮点</text>
              <view class="report-tags-list">
                <text v-for="(gt, gi) in item.goodTags" :key="gi" class="report-tag-pill good">{{ gt }}</text>
              </view>
            </view>
            <view v-if="item.riskTags.length" class="report-tags-group">
              <text class="report-tags-label">潜在风险</text>
              <view class="report-tags-list">
                <text v-for="(rt, ri) in item.riskTags" :key="ri" class="report-tag-pill risk">{{ rt }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 底部：核心财务 + 更新时间 -->
        <view class="report-bottom">
          <view class="report-data-row">
            <view class="data-left">
              <text class="data-label">营业总收入</text>
              <text class="data-value">{{ item.revenue }} 亿元</text>
            </view>
            <view class="data-right">
              <text :class="['data-yoy', yoyClass(item.revenueYoy)]">同比 {{ formatYoy(item.revenueYoy) }}</text>
              <text :class="['data-arrow', yoyClass(item.revenueYoy)]">{{ item.revenueYoy >= 0 ? '↑' : '↓' }}</text>
            </view>
          </view>
          <view class="report-data-row">
            <view class="data-left">
              <text class="data-label">归母净利润</text>
              <text class="data-value">{{ item.netProfit }} 亿元</text>
            </view>
            <view class="data-right">
              <text :class="['data-yoy', yoyClass(item.profitYoy)]">同比 {{ formatYoy(item.profitYoy) }}</text>
              <text :class="['data-arrow', yoyClass(item.profitYoy)]">{{ item.profitYoy >= 0 ? '↑' : '↓' }}</text>
            </view>
          </view>
          <view class="report-time-row">
            <text class="update-time">更新时间：{{ item.updateTime }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="hasMore" class="load-more" @tap="loadMore">
      <text class="load-more-text">{{ loadingMore ? '加载中...' : '加载更多' }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import LoadingState from '@/shared/components/LoadingState.vue'
import EmptyState from '@/shared/components/EmptyState.vue'

interface ReportItem {
  code: string
  name: string
  period: string
  tag: string
  revenue: string
  revenueYoy: number
  netProfit: string
  profitYoy: number
  industry: string
  grossMargin: string
  cashFlow: string
  updateTime: string
  goodTags: string[]
  riskTags: string[]
}

type SortField = 'revenue' | 'revenueYoy' | 'netProfit' | 'profitYoy' | 'updateTime'

const SORT_KEYS: SortField[] = ['netProfit', 'profitYoy', 'revenue', 'revenueYoy', 'updateTime']
const SORT_LABELS: Record<SortField, string> = {
  netProfit: '净利规模',
  profitYoy: '净利增速',
  revenue: '营收规模',
  revenueYoy: '营收增速',
  updateTime: '更新时间',
}
const sortLabels = ['净利规模', '净利增速', '营收规模', '营收增速', '更新时间']

const STORAGE_KEY = 'report_filter_sort'

// ===== 年份列表（10年） =====
const yearList = ['2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017', '2016', '2015']

// ===== 状态 =====
const keyword = ref('')
const loading = ref(false)
const loadingMore = ref(false)
const rawList = ref<ReportItem[]>([])
const page = ref(1)
const pageSize = 20
const total = ref(0)
let searchTimer: ReturnType<typeof setTimeout> | null = null

// 年份筛选
const showYearPicker = ref(false)
const selectedYear = ref('2024')

// 排序
const sortFieldIndex = ref(0)        // 当前排序维度在 SORT_KEYS 中的索引
const sortAsc = ref(false)           // true=升序, false=降序

// ===== 持久化 =====
function loadPersistedState() {
  try {
    const saved = uni.getStorageSync(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      const idx = SORT_KEYS.indexOf(parsed.sortField)
      if (idx >= 0) sortFieldIndex.value = idx
      if (typeof parsed.sortAsc === 'boolean') sortAsc.value = parsed.sortAsc
      if (typeof parsed.year === 'string') selectedYear.value = parsed.year
    }
  } catch (_) { /* ignore */ }
}

function savePersistedState() {
  try {
    uni.setStorageSync(STORAGE_KEY, JSON.stringify({
      sortField: SORT_KEYS[sortFieldIndex.value],
      sortAsc: sortAsc.value,
      year: selectedYear.value,
    }))
  } catch (_) { /* ignore */ }
}

// ===== 计算属性 =====
const currentSortField = computed(() => SORT_KEYS[sortFieldIndex.value])
const currentSortLabel = computed(() => SORT_LABELS[currentSortField.value])
const sortIndex = computed(() => sortFieldIndex.value)

const hasMore = computed(() => {
  const shown = filteredList.value.length
  return shown > 0 && shown < total.value
})

// 筛选 + 排序联动逻辑：先筛选 → 后排序
const filteredList = computed(() => {
  let items = [...rawList.value]

  // 第一步：年份筛选
  if (selectedYear.value) {
    items = items.filter(item => item.period.startsWith(selectedYear.value))
  }

  // 第二步：排序
  const field = currentSortField.value
  const asc = sortAsc.value
  items.sort((a, b) => {
    let valA = 0
    let valB = 0

    if (field === 'revenue') {
      valA = parseFloat(a.revenue) || 0
      valB = parseFloat(b.revenue) || 0
    } else if (field === 'revenueYoy') {
      valA = a.revenueYoy ?? 0
      valB = b.revenueYoy ?? 0
    } else if (field === 'netProfit') {
      valA = parseFloat(a.netProfit) || 0
      valB = parseFloat(b.netProfit) || 0
    } else if (field === 'profitYoy') {
      valA = a.profitYoy ?? 0
      valB = b.profitYoy ?? 0
    } else if (field === 'updateTime') {
      valA = new Date(a.updateTime).getTime()
      valB = new Date(b.updateTime).getTime()
    }

    return asc ? valA - valB : valB - valA
  })

  return items
})

// 空数据提示
const emptyTip = computed(() => {
  if (keyword.value) return '未搜索到相关股票'
  if (selectedYear.value) return `暂无「${selectedYear.value}」年财报数据`
  return '暂无业绩报告数据'
})

// ===== Mock 数据 =====
function genTags(_item: Partial<ReportItem>): { goodTags: string[]; riskTags: string[] } {
  return {
    goodTags: ['营收高速增长', '净利大幅提升', '现金流充裕', '毛利率稳定'],
    riskTags: ['增速放缓', '成本承压', '存货高增'],
  }
}

function generateMockList(): ReportItem[] {
  const raw = [
    // 2024年
    { code: '600519', name: '贵州茅台', period: '2024年半年报', tag: '向好', revenue: '834.51', revenueYoy: 17.56, netProfit: '416.96', profitYoy: 15.88, industry: '食品饮料', grossMargin: '91.76', cashFlow: '368.42', updateTime: '2024-08-09' },
    { code: '300750', name: '宁德时代', period: '2024年半年报', tag: '高增', revenue: '2716.12', revenueYoy: 40.12, netProfit: '228.65', profitYoy: 82.17, industry: '电力设备', grossMargin: '21.63', cashFlow: '386.28', updateTime: '2024-07-26' },
    { code: '002594', name: '比亚迪', period: '2024年半年报', tag: '高增', revenue: '3011.27', revenueYoy: 28.46, netProfit: '136.31', profitYoy: 24.44, industry: '汽车', grossMargin: '20.01', cashFlow: '477.82', updateTime: '2024-08-29' },
    { code: '000333', name: '美的集团', period: '2024年半年报', tag: '向好', revenue: '2181.22', revenueYoy: 10.28, netProfit: '208.04', profitYoy: 14.11, industry: '家用电器', grossMargin: '27.25', cashFlow: '309.22', updateTime: '2024-08-20' },
    { code: '600900', name: '长江电力', period: '2024年半年报', tag: '向好', revenue: '348.17', revenueYoy: 12.38, netProfit: '131.22', profitYoy: 16.22, industry: '公用事业', grossMargin: '62.18', cashFlow: '238.56', updateTime: '2024-08-31' },
    { code: '000858', name: '五粮液', period: '2024年半年报', tag: '高增', revenue: '506.48', revenueYoy: 11.30, netProfit: '190.57', profitYoy: 11.86, industry: '食品饮料', grossMargin: '73.52', cashFlow: '218.56', updateTime: '2024-08-29' },
    // 2023年
    { code: '600519', name: '贵州茅台', period: '2023年报', tag: '向好', revenue: '1505.60', revenueYoy: 18.04, netProfit: '747.34', profitYoy: 19.16, industry: '食品饮料', grossMargin: '91.22', cashFlow: '651.83', updateTime: '2024-04-03' },
    { code: '300750', name: '宁德时代', period: '2023年报', tag: '高增', revenue: '4009.17', revenueYoy: 22.01, netProfit: '441.21', profitYoy: 43.58, industry: '电力设备', grossMargin: '22.91', cashFlow: '928.24', updateTime: '2024-03-15' },
    { code: '601318', name: '中国平安', period: '2023年报', tag: '修复', revenue: '9537.89', revenueYoy: 3.82, netProfit: '1166.78', profitYoy: 4.21, industry: '非银金融', grossMargin: '--', cashFlow: '742.56', updateTime: '2024-03-22' },
    { code: '600036', name: '招商银行', period: '2023年报', tag: '承压', revenue: '3398.67', revenueYoy: -1.64, netProfit: '1466.02', profitYoy: 6.22, industry: '银行', grossMargin: '--', cashFlow: '2768.46', updateTime: '2024-03-26' },
    { code: '002594', name: '比亚迪', period: '2023年年报', tag: '高增', revenue: '6023.42', revenueYoy: 42.04, netProfit: '300.41', profitYoy: 80.72, industry: '汽车', grossMargin: '20.21', cashFlow: '896.54', updateTime: '2024-03-27' },
    // 2022年
    { code: '600519', name: '贵州茅台', period: '2022年报', tag: '向好', revenue: '1275.54', revenueYoy: 16.53, netProfit: '627.16', profitYoy: 19.55, industry: '食品饮料', grossMargin: '91.87', cashFlow: '586.47', updateTime: '2023-03-31' },
    { code: '300750', name: '宁德时代', period: '2022年报', tag: '高增', revenue: '3285.94', revenueYoy: 152.07, netProfit: '307.29', profitYoy: 92.89, industry: '电力设备', grossMargin: '20.25', cashFlow: '612.52', updateTime: '2023-03-10' },
    { code: '000858', name: '五粮液', period: '2022年报', tag: '高增', revenue: '739.69', revenueYoy: 11.72, netProfit: '266.91', profitYoy: 14.17, industry: '食品饮料', grossMargin: '75.42', cashFlow: '386.47', updateTime: '2023-04-28' },
    { code: '601318', name: '中国平安', period: '2022年报', tag: '承压', revenue: '9186.72', revenueYoy: 2.56, netProfit: '1119.56', profitYoy: 3.24, industry: '非银金融', grossMargin: '--', cashFlow: '689.52', updateTime: '2023-03-16' },
    // 2021年
    { code: '600519', name: '贵州茅台', period: '2021年报', tag: '高增', revenue: '1094.64', revenueYoy: 10.96, netProfit: '524.60', profitYoy: 11.34, industry: '食品饮料', grossMargin: '91.54', cashFlow: '488.52', updateTime: '2022-03-31' },
    { code: '300750', name: '宁德时代', period: '2021年报', tag: '高增', revenue: '1303.56', revenueYoy: 159.06, netProfit: '159.31', profitYoy: 185.34, industry: '电力设备', grossMargin: '26.28', cashFlow: '429.18', updateTime: '2022-03-02' },
    { code: '000858', name: '五粮液', period: '2021年报', tag: '高增', revenue: '662.09', revenueYoy: 15.51, netProfit: '233.77', profitYoy: 17.15, industry: '食品饮料', grossMargin: '75.12', cashFlow: '342.58', updateTime: '2022-04-28' },
    { code: '002594', name: '比亚迪', period: '2021年年报', tag: '高增', revenue: '2161.42', revenueYoy: 38.02, netProfit: '30.45', profitYoy: -28.08, industry: '汽车', grossMargin: '12.17', cashFlow: '354.82', updateTime: '2022-03-30' },
  ]
  return raw.map(item => ({ ...item, ...genTags(item) }))
}

function fetchData(append = false) {
  if (!append) {
    loading.value = true
    rawList.value = []
    total.value = 0
    page.value = 1
  } else {
    loadingMore.value = true
  }

  // Mock：模拟异步
  setTimeout(() => {
    const all = generateMockList()
    const kw = keyword.value.trim().toLowerCase()
    const filtered = kw
      ? all.filter(item => item.code.includes(kw) || item.name.includes(kw))
      : all
    total.value = filtered.length
    const start = (page.value - 1) * pageSize
    const paged = filtered.slice(start, start + pageSize)

    if (append) {
      rawList.value = [...rawList.value, ...paged]
    } else {
      rawList.value = paged
    }
    if (paged.length && page.value * pageSize < total.value) page.value++
    loading.value = false
    loadingMore.value = false
  }, 300)
}

// ===== 搜索 =====
function handleSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { fetchData(false) }, 300)
}

function handleSearch() {
  fetchData(false)
}

function handleReset() {
  keyword.value = ''
  fetchData(false)
}

function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  fetchData(true)
}

// ===== 年份筛选 =====
function toggleYearPicker() {
  showYearPicker.value = !showYearPicker.value
}

function closeYearPicker() {
  showYearPicker.value = false
}

function selectYear(yr: string) {
  selectedYear.value = yr
  showYearPicker.value = false
  savePersistedState()
}

// ===== 排序 =====
function onSortChange(e: unknown) {
  const idx = (e as { detail: { value: number } }).detail.value
  if (idx !== sortFieldIndex.value) {
    sortFieldIndex.value = idx
    sortAsc.value = false  // 切换维度时默认降序
  } else {
    // 点击同一项切换升降序
    sortAsc.value = !sortAsc.value
  }
  savePersistedState()
}

function setOrder(asc: boolean) {
  sortAsc.value = asc
  savePersistedState()
}

// ===== 通用 =====
function tagClass(tag: string): string {
  const goodTags = ['向好', '高增', '修复', '扭盈']
  return goodTags.includes(tag) ? 'tag-good' : 'tag-bad'
}

function yoyClass(val: number): string {
  if (val === 0) return ''
  return val > 0 ? 'up' : 'down'
}

function formatYoy(val: number): string {
  if (val === 0) return '--'
  const prefix = val > 0 ? '+' : ''
  return `${prefix}${val.toFixed(2)}%`
}

function goStockDetail(item: ReportItem) {
  if (!item?.code) return
  const info = encodeURIComponent(JSON.stringify({
    code: item.code,
    name: item.name,
    period: item.period,
    tag: item.tag,
    industry: item.industry,
    updateTime: item.updateTime,
  }))
  uni.navigateTo({ url: `/modules/analytics/pages/report-detail?symbol=${item.code}&stockInfo=${info}` })
}

// ===== 初始化 =====
loadPersistedState()
fetchData(false)
</script>

<style lang="scss" scoped>
.reports-content {
  background: #ffffff;
}

/* 搜索栏 */
.reports-fixed {
  padding: 16rpx 24rpx 0;
}

.search-bar {
  margin-bottom: 16rpx;
}

.search-input-wrap {
  display: flex;
  align-items: center;
  gap: 12rpx;
  background: #ffffff;
  border-radius: 16rpx;
  padding: 16rpx 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.search-input {
  flex: 1;
  font-size: 26rpx;
  color: #1a1d24;
  height: 40rpx;
}

.search-clear {
  font-size: 28rpx;
  color: #9ca3af;
  padding: 8rpx;
}

/* ===== 筛选+排序单行 ===== */
.filter-sort-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
  padding: 12rpx 16rpx;
  background: #ffffff;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.filter-section {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 6rpx 12rpx;
  background: #f0f4ff;
  border-radius: 10rpx;
  flex-shrink: 0;
  max-width: 240rpx;
}

.filter-text {
  font-size: 24rpx;
  color: #4d7cfe;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 140rpx;
}

.sort-section {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-shrink: 0;
}

.sort-picker {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 6rpx 12rpx;
  border-radius: 8rpx;
  background: #f0f2f5;
}

.sort-picker-text {
  font-size: 22rpx;
  color: #4d7cfe;
  font-weight: 500;
}

.sort-order {
  display: flex;
  gap: 0;
  flex-shrink: 0;
  border-radius: 8rpx;
  overflow: hidden;
  border: 1rpx solid #e0e3e8;
}

.order-btn {
  font-size: 20rpx;
  color: #6b7280;
  padding: 6rpx 12rpx;
  background: #f9fafb;
  font-weight: 500;

  &.active {
    color: #fff;
    background: #4d7cfe;
  }

  &:first-child {
    border-right: 1rpx solid #e0e3e8;
  }
}

/* ===== 年份下拉弹窗 ===== */
.industry-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 1000;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 200rpx;
}

.industry-popup {
  width: 560rpx;
  max-height: 70vh;
  background: #ffffff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.15);
}

.industry-popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 28rpx;
  border-bottom: 1rpx solid #f0f2f5;
}

.industry-popup-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1a1d24;
}

.industry-popup-close {
  font-size: 28rpx;
  color: #9ca3af;
  padding: 8rpx;
}

.industry-list {
  max-height: 50vh;
  padding: 12rpx 0;
}

.industry-item {
  font-size: 26rpx;
  color: #374151;
  padding: 20rpx 28rpx;
  border-bottom: 1rpx solid #f5f5f5;

  &.active {
    color: #ffffff;
    background: #4d7cfe;
    font-weight: 600;
  }

  &:last-child {
    border-bottom: none;
  }
}

/* 加载/空 */
.loading-state,
.empty-state {
  padding: 200rpx 0;
}

/* ===== 报告卡片 ===== */
.report-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding: 0 24rpx 24rpx;
}

.report-card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 28rpx;
  border: 1rpx solid #e5e7eb;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

/* 顶部：股票 + 报告期 + 标签 */
.report-top {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 24rpx;
}

.report-top-left {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-shrink: 0;
}

.stock-name {
  font-size: 26rpx;
  font-weight: 600;
  color: #1a1d24;
}

.stock-code {
  font-size: 22rpx;
  color: #6b7280;
  background: #f0f2f5;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
}

.report-period {
  font-size: 22rpx;
  color: #9ca3af;
  flex-shrink: 0;
}

.report-tag {
  font-size: 22rpx;
  font-weight: 600;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
  margin-left: auto;
  flex-shrink: 0;

  &.tag-good {
    color: #f43f5e;
    background: rgba(244, 63, 94, 0.1);
  }

  &.tag-bad {
    color: #22c55e;
    background: rgba(34, 197, 94, 0.1);
  }
}

/* 中部：AI 研判标签 */
.report-mid {
  background: #f9fafb;
  border-radius: 14rpx;
  padding: 16rpx 20rpx;
  margin-bottom: 20rpx;
}

.report-tags-wrap {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.report-tags-group {
  display: flex;
  align-items: flex-start;
  gap: 8rpx;
}

.report-tags-label {
  font-size: 20rpx;
  color: #6b7280;
  flex-shrink: 0;
  margin-top: 4rpx;
  min-width: 64rpx;
}

.report-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6rpx;
}

.report-tag-pill {
  font-size: 22rpx;
  padding: 4rpx 14rpx;
  border-radius: 14rpx;
  font-weight: 400;

  &.good {
    color: #059669;
    background: rgba(5, 150, 105, 0.1);
  }
  &.risk {
    color: #dc2626;
    background: rgba(220, 38, 38, 0.1);
  }
}

.report-data-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6rpx 0;

  &:first-child { padding-top: 0; }
  &:last-child { padding-bottom: 0; }
}

.data-left {
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.data-right {
  display: flex;
  align-items: center;
  gap: 4rpx;
  flex-shrink: 0;
}

.data-label {
  font-size: 22rpx;
  color: #9ca3af;
  flex-shrink: 0;
}

.data-value {
  font-size: 22rpx;
  font-weight: 600;
  color: #374151;
  flex-shrink: 0;
  min-width: 100rpx;
}

.data-yoy {
  font-size: 20rpx;
  font-weight: 500;
  &.up { color: #f43f5e; }
  &.down { color: #22c55e; }
}

.data-arrow {
  font-size: 20rpx;
  font-weight: 700;
  &.up { color: #f43f5e; }
  &.down { color: #22c55e; }
}

/* 底部：辅助信息 */
.report-bottom {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.report-meta-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-wrap: wrap;
}

.meta-label {
  font-size: 22rpx;
  color: #9ca3af;
}

.meta-value {
  font-size: 22rpx;
  color: #374151;
  font-weight: 500;
}

.meta-divider {
  font-size: 22rpx;
  color: #e0e3e8;
  margin: 0 4rpx;
}

.report-time-row {
  display: flex;
  justify-content: flex-start;
}

.update-time {
  font-size: 22rpx;
  color: #9ca3af;
}

/* 加载更多 */
.load-more {
  text-align: center;
  padding: 32rpx 0;
}

.load-more-text {
  font-size: 26rpx;
  color: #4d7cfe;
}
</style>
