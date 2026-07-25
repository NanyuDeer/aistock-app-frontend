<template>
  <SubPageCard title="个股情报">
    <view class="event-catcher-content">
      <!-- 周期筛选 -->
      <view class="filter-bar">
        <view
          v-for="tab in cycleTabs"
          :key="tab.value"
          :class="['filter-tab', activeCycle === tab.value ? 'active' : '']"
          @tap="switchCycle(tab.value)"
        >
          <text class="filter-tab-text">{{ tab.label }}</text>
        </view>
      </view>

      <!-- 加载中 -->
      <view v-if="loading && !events.length" class="loading">
        <text class="loading-text">加载中...</text>
      </view>

      <!-- 事件列表 -->
      <view v-if="events.length" class="event-list">
        <view
          v-for="evt in events"
          :key="evt.event_id"
          class="event-card"
          @tap="goStockDetail(evt.stock_code)"
        >
          <view class="event-top">
            <view class="event-stock">
              <text class="stock-name">{{ evt.stock_name }}</text>
              <text class="stock-code">{{ evt.stock_code }}</text>
              <text v-if="evt.industry" class="stock-industry">{{ evt.industry }}</text>
            </view>
            <view :class="['impact-tag', impactClass(evt.ai_impact)]">
              <text class="impact-tag-text">{{ evt.ai_impact || '中性' }}</text>
            </view>
          </view>
          <text class="event-title">{{ evt.title }}</text>
          <text v-if="evt.summary" class="event-summary">{{ evt.summary }}</text>
          <view v-if="evt.ai_keywords && evt.ai_keywords.length" class="keyword-row">
            <text
              v-for="(kw, idx) in evt.ai_keywords.slice(0, 4)"
              :key="idx"
              class="keyword-tag"
            >{{ kw }}</text>
          </view>
          <view class="event-bottom">
            <view class="meta-left">
              <text :class="['cycle-pill', cycleClass(evt.cycle)]">{{ evt.cycle }}</text>
              <text class="meta-text">{{ evt.change_type_name || evt.info_type }}</text>
            </view>
            <view class="meta-right">
              <view class="ai-btn" @tap.stop="goAlertAnalysis(evt.stock_code, evt.cycle)">
                <text class="ai-btn-text">AI解读</text>
              </view>
              <text class="meta-time">{{ formatTime(evt.event_time) }}</text>
            </view>
          </view>
        </view>
        <view v-if="hasMore" class="load-more" @tap="loadMore">
          <text class="load-more-text">{{ loadingMore ? '加载中...' : '加载更多' }}</text>
        </view>
      </view>

      <!-- mock数据（API不可用时显示） -->
      <view v-if="!loading && !events.length" class="event-list">
        <view
          v-for="evt in mockEvents"
          :key="evt.event_id"
          class="event-card"
          @tap="goNewsDetail(evt.event_id)"
        >
          <view class="event-top">
            <view class="event-stock">
              <text class="stock-name">{{ evt.stock_name }}</text>
              <text class="stock-code">{{ evt.stock_code }}</text>
              <text v-if="evt.industry" class="stock-industry">{{ evt.industry }}</text>
            </view>
            <view :class="['impact-tag', impactClass(evt.ai_impact)]">
              <text class="impact-tag-text">{{ evt.ai_impact || '中性' }}</text>
            </view>
          </view>
          <text class="event-title">{{ evt.title }}</text>
          <text v-if="evt.summary" class="event-summary">{{ evt.summary }}</text>
          <view v-if="evt.ai_keywords && evt.ai_keywords.length" class="keyword-row">
            <text
              v-for="(kw, idx) in evt.ai_keywords.slice(0, 4)"
              :key="idx"
              class="keyword-tag"
            >{{ kw }}</text>
          </view>
          <view class="event-bottom">
            <view class="meta-left">
              <text :class="['cycle-pill', cycleClass(evt.cycle)]">{{ cycleLabel(evt.cycle) }}</text>
              <text class="meta-text">{{ evt.info_type }}</text>
            </view>
            <view class="meta-right">
              <view class="ai-btn" @tap.stop="goAlertAnalysis(evt.stock_code, evt.cycle)">
                <text class="ai-btn-text">AI解读</text>
              </view>
              <text class="meta-time">{{ evt.event_time }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </SubPageCard>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { stockApi } from '@/shared/api/modules/stock'
import SubPageCard from '@/shared/components/SubPageCard.vue'

interface TrendEvent {
  event_id: string
  symbol: string
  stock_code: string
  stock_name: string
  industry?: string
  change_type?: string
  change_type_name?: string
  level?: string
  cycle: string
  event_time: string
  title: string
  summary?: string
  detail_url?: string
  info_type?: string
  ai_impact?: string
  ai_horizon?: string
  ai_keywords?: string[]
  source?: string
}

const cycleTabs = [
  { label: '全部', value: 'all' },
  { label: '短期', value: 'short' },
  { label: '中期', value: 'mid' },
  { label: '长期', value: 'long' },
]

const loading = ref(false)
const loadingMore = ref(false)
const events = ref<TrendEvent[]>([])
const activeCycle = ref('all')
const total = ref(0)
const page = ref(0)
const pageSize = 20

const hasMore = computed(() => events.value.length < total.value)

async function loadEvents(append = false) {
  if (!append) {
    loading.value = true
    page.value = 0
  } else {
    loadingMore.value = true
  }
  try {
    const offset = page.value * pageSize
    const res: any = await stockApi.getTrendEvents({
      cycle: activeCycle.value,
      limit: pageSize,
      offset,
    })
    const list = res?.events || res?.data?.events || []
    total.value = res?.total || res?.data?.total || 0
    if (append) {
      events.value = [...events.value, ...list]
    } else {
      events.value = list
    }
    if (list.length) page.value++
  } catch (err) {
    if (!append) events.value = []
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

function switchCycle(cycle: string) {
  if (activeCycle.value === cycle) return
  activeCycle.value = cycle
  loadEvents(false)
}

function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  loadEvents(true)
}

function impactClass(impact?: string): string {
  if (!impact) return 'neutral'
  if (impact.includes('重大利好')) return 'major-up'
  if (impact.includes('利好')) return 'up'
  if (impact.includes('重大利空')) return 'major-down'
  if (impact.includes('利空')) return 'down'
  return 'neutral'
}

function cycleClass(cycle?: string): string {
  switch (cycle) {
    case 'short': return 'cycle-short'
    case 'mid': return 'cycle-mid'
    case 'long': return 'cycle-long'
    default: return 'cycle-all'
  }
}

function formatTime(t?: string): string {
  if (!t) return ''
  const d = new Date(t)
  if (isNaN(d.getTime())) return t.replace('T', ' ').slice(0, 16)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  if (sameDay) return `${hh}:${mm}`
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${mo}-${dd} ${hh}:${mm}`
}

function goStockDetail(symbol: string) {
  if (!symbol) return
  uni.navigateTo({ url: `/modules/favorites/pages/detail?symbol=${symbol}` })
}

function goAlertAnalysis(symbol: string, cycle: string) {
  if (!symbol) return
  uni.navigateTo({ url: `/modules/market/pages/alert-analysis?symbol=${symbol}&cycle=${cycle}` })
}

function goNewsDetail(id: string) {
  uni.navigateTo({ url: `/modules/news/pages/detail?id=${id}` })
}

function cycleLabel(cycle?: string): string {
  switch (cycle) {
    case 'short': return '短期'
    case 'mid': return '中期'
    case 'long': return '长期'
    default: return '全部'
  }
}

// Mock 数据（本地降级模式）
const mockEvents: TrendEvent[] = [
  {
    event_id: 'mock-1',
    symbol: '600740',
    stock_code: '600740',
    stock_name: '山西焦化',
    industry: '煤炭',
    cycle: 'mid',
    event_time: '06-30 14:22',
    title: '动力煤需求阶段性回落，旺季预期仍存反弹机会',
    summary: '动力煤价格阶段性承压，但夏季用电高峰预期强烈，叠加进口煤政策收紧，中期偏强格局未改。',
    info_type: '行业研究',
    ai_impact: '利好',
    ai_keywords: ['动力煤', '旺季', '反弹'],
    source: '财联社',
  },
  {
    event_id: 'mock-2',
    symbol: '603259',
    stock_code: '603259',
    stock_name: '药明康德',
    industry: '创新药',
    cycle: 'long',
    event_time: '06-30 11:05',
    title: '美国标普生物科技指数大涨，创新药出海预期升温',
    summary: '海外临床进展密集发布，FDA审评加速，国内创新药企海外授权交易活跃，长期利好确定性高。',
    info_type: '行业事件',
    ai_impact: '重大利好',
    ai_keywords: ['创新药', 'FDA', '出海'],
    source: '财联社',
  },
  {
    event_id: 'mock-3',
    symbol: '300308',
    stock_code: '300308',
    stock_name: '中际旭创',
    industry: '光模块',
    cycle: 'long',
    event_time: '06-30 09:30',
    title: '英伟达再创新高，800G光模块需求持续爆发',
    summary: 'AI大模型训练推理需求指数级增长，算力基础设施扩容确定性强，光模块龙头订单饱满。',
    info_type: '行业驱动',
    ai_impact: '利好',
    ai_keywords: ['AI算力', '光模块', '英伟达'],
    source: '财联社',
  },
  {
    event_id: 'mock-4',
    symbol: '601012',
    stock_code: '601012',
    stock_name: '隆基绿能',
    industry: '光伏',
    cycle: 'mid',
    event_time: '06-29 16:40',
    title: '硅料价格企稳信号明确，组件排产环比提升15%',
    summary: '硅料价格连续两周持平，下游组件厂商排产回升，欧洲能源转型需求旺盛。',
    info_type: '行业数据',
    ai_impact: '利好',
    ai_keywords: ['光伏', '硅料', '排产'],
    source: '财联社',
  },
  {
    event_id: 'mock-5',
    symbol: '002594',
    stock_code: '002594',
    stock_name: '比亚迪',
    industry: '新能源车',
    cycle: 'short',
    event_time: '06-29 10:15',
    title: '6月新能源车销量数据超预期，比亚迪单月交付破40万',
    summary: '6月新能源汽车渗透率突破50%，比亚迪月度交付量创新高，短期情绪面积极。',
    info_type: '销售数据',
    ai_impact: '利好',
    ai_keywords: ['新能源车', '销量', '比亚迪'],
    source: '财联社',
  },
]

onShow(() => {
  loadEvents(false)
})
</script>

<style lang="scss" scoped>
.event-catcher-content {
  padding: 0 24rpx 24rpx;
}

/* 周期筛选 */
.filter-bar {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
  background: #ffffff;
  padding: 12rpx;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.filter-tab {
  flex: 1;
  padding: 16rpx 0;
  border-radius: 12rpx;
  text-align: center;

  &.active {
    background: #4d7cfe;

    .filter-tab-text {
      color: #ffffff;
    }
  }
}

.filter-tab-text {
  font-size: 26rpx;
  color: #6b7280;
}

/* 加载/空状态 */
.loading, .empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 0;
  gap: 16rpx;
}

.loading-text, .empty-text {
  font-size: 28rpx;
  color: #6b7280;
}

.empty-icon {
  font-size: 64rpx;
}

/* 事件列表 */
.event-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.event-card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 28rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.event-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.event-stock {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex: 1;
  overflow: hidden;
}

.stock-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1d24;
}

.stock-code {
  font-size: 22rpx;
  color: #6b7280;
  padding: 2rpx 12rpx;
  background: #f0f2f5;
  border-radius: 8rpx;
}

.stock-industry {
  font-size: 22rpx;
  color: #4d7cfe;
  padding: 2rpx 12rpx;
  background: rgba(77, 124, 254, 0.08);
  border-radius: 8rpx;
}

.impact-tag {
  padding: 6rpx 16rpx;
  border-radius: 8rpx;

  &.major-up { background: rgba(244, 63, 94, 0.15); }
  &.up { background: rgba(244, 63, 94, 0.08); }
  &.major-down { background: rgba(34, 197, 94, 0.15); }
  &.down { background: rgba(34, 197, 94, 0.08); }
  &.neutral { background: #f0f2f5; }
}

.impact-tag-text {
  font-size: 22rpx;
  font-weight: 500;
  color: #1a1d24;
}

.impact-tag.major-up .impact-tag-text { color: #f43f5e; }
.impact-tag.up .impact-tag-text { color: #f43f5e; }
.impact-tag.major-down .impact-tag-text { color: #22c55e; }
.impact-tag.down .impact-tag-text { color: #22c55e; }
.impact-tag.neutral .impact-tag-text { color: #6b7280; }

.event-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #1a1d24;
  line-height: 1.5;
  display: block;
  margin-bottom: 12rpx;
}

.event-summary {
  font-size: 26rpx;
  color: #6b7280;
  line-height: 1.6;
  display: block;
  margin-bottom: 16rpx;
}

.keyword-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-bottom: 16rpx;
}

.keyword-tag {
  font-size: 22rpx;
  color: #4d7cfe;
  padding: 4rpx 12rpx;
  background: rgba(77, 124, 254, 0.08);
  border-radius: 8rpx;
}

.event-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16rpx;
  border-top: 1rpx solid #f0f2f5;
}

.meta-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.cycle-pill {
  font-size: 20rpx;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;

  &.cycle-short { background: rgba(244, 63, 94, 0.1); color: #f43f5e; }
  &.cycle-mid { background: rgba(245, 158, 11, 0.1); color: #f59f0b; }
  &.cycle-long { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
  &.cycle-all { background: #f0f2f5; color: #6b7280; }
}

.meta-text {
  font-size: 22rpx;
  color: #9ca3af;
}

.meta-time {
  font-size: 22rpx;
  color: #9ca3af;
}

.meta-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.ai-btn {
  padding: 6rpx 20rpx;
  background: linear-gradient(135deg, #4d7cfe, #6c5ce7);
  border-radius: 20rpx;
}

.ai-btn-text {
  font-size: 20rpx;
  color: #ffffff;
  font-weight: 500;
}

.load-more {
  text-align: center;
  padding: 32rpx 0;
}

.load-more-text {
  font-size: 26rpx;
  color: #4d7cfe;
}
</style>
