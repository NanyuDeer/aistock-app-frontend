<template>
  <SubPageCard title="个股情报">
    <view class="event-catcher-content">
      <!-- 周期筛选 -->
      <view class="filter-bar">
        <Segmented :items="cycleTabs" v-model="activeCycle" fullWidth @change="onCycleChange" />
      </view>

      <!-- 加载中 -->
      <view v-if="loading && !events.length" class="loading">
        <LoadingState />
      </view>

      <!-- 事件列表 -->
      <view v-if="events.length" class="event-list">
        <Card
          v-for="evt in events"
          :key="evt.event_id"
          clickable
          @click="goStockDetail(evt.stock_code)"
        >
          <view class="event-top">
            <view class="event-stock">
              <text class="stock-name">{{ evt.stock_name }}</text>
              <text class="stock-code">{{ evt.stock_code }}</text>
              <text v-if="evt.industry" class="stock-industry">{{ evt.industry }}</text>
            </view>
            <Tag :type="impactTagType(evt.ai_impact)">{{ evt.ai_impact || '中性' }}</Tag>
          </view>
          <text class="event-title">{{ evt.title }}</text>
          <text v-if="evt.summary" class="event-summary">{{ evt.summary }}</text>
          <view v-if="evt.ai_keywords && evt.ai_keywords.length" class="keyword-row">
            <Tag
              v-for="(kw, idx) in evt.ai_keywords.slice(0, 4)"
              :key="idx"
              size="sm"
            >{{ kw }}</Tag>
          </view>
          <view class="event-bottom">
            <view class="meta-left">
              <Badge :type="cycleBadgeType(evt.cycle)">{{ evt.cycle }}</Badge>
              <text class="meta-text">{{ evt.change_type_name || evt.info_type }}</text>
            </view>
            <view class="meta-right">
              <Button size="sm" @click.stop="goAlertAnalysis(evt.stock_code, evt.cycle)">AI解读</Button>
              <text class="meta-time">{{ formatTime(evt.event_time) }}</text>
            </view>
          </view>
        </Card>
        <Button v-if="hasMore" type="ghost" size="sm" @click="loadMore">
          {{ loadingMore ? '加载中...' : '加载更多' }}
        </Button>
      </view>

      <!-- 空状态（API成功但无数据） -->
      <EmptyState
        v-if="!loading && !events.length && !apiFailed"
        title="暂无情报"
        :description="activeCycle === 'all' ? '当前暂无情报数据' : '该周期暂无情报数据'"
      />

      <!-- mock数据（API不可用时显示） -->
      <view v-if="!loading && !events.length && apiFailed" class="event-list">
        <Card
          v-for="evt in mockEvents"
          :key="evt.event_id"
          clickable
          @click="goNewsDetail(evt.event_id)"
        >
          <view class="event-top">
            <view class="event-stock">
              <text class="stock-name">{{ evt.stock_name }}</text>
              <text class="stock-code">{{ evt.stock_code }}</text>
              <text v-if="evt.industry" class="stock-industry">{{ evt.industry }}</text>
            </view>
            <Tag :type="impactTagType(evt.ai_impact)">{{ evt.ai_impact || '中性' }}</Tag>
          </view>
          <text class="event-title">{{ evt.title }}</text>
          <text v-if="evt.summary" class="event-summary">{{ evt.summary }}</text>
          <view v-if="evt.ai_keywords && evt.ai_keywords.length" class="keyword-row">
            <Tag
              v-for="(kw, idx) in evt.ai_keywords.slice(0, 4)"
              :key="idx"
              size="sm"
            >{{ kw }}</Tag>
          </view>
          <view class="event-bottom">
            <view class="meta-left">
              <Badge :type="cycleBadgeType(evt.cycle)">{{ cycleLabel(evt.cycle) }}</Badge>
              <text class="meta-text">{{ evt.info_type }}</text>
            </view>
            <view class="meta-right">
              <Button size="sm" @click.stop="goAlertAnalysis(evt.stock_code, evt.cycle)">AI解读</Button>
              <text class="meta-time">{{ evt.event_time }}</text>
            </view>
          </view>
        </Card>
      </view>
    </view>
  </SubPageCard>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { stockApi } from '@/shared/api/modules/stock'
import SubPageCard from '@/shared/components/SubPageCard.vue'
import { LoadingState, Tag, Badge, Button, Card, Segmented, EmptyState } from '@/shared/components'

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
/** API 是否调用失败（仅失败时才用 mock 兜底，空数据不兜底） */
const apiFailed = ref(false)

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
    apiFailed.value = false
  } catch (err) {
    if (!append) events.value = []
    apiFailed.value = true
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

function onCycleChange() {
  loadEvents(false)
}

function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  loadEvents(true)
}

function impactTagType(impact?: string): 'up' | 'down' | 'neutral' {
  if (!impact) return 'neutral'
  if (impact.includes('重大利好') || impact.includes('利好')) return 'up'
  if (impact.includes('重大利空') || impact.includes('利空')) return 'down'
  return 'neutral'
}

function cycleBadgeType(cycle?: string): 'danger' | 'warning' | 'success' | 'info' {
  switch (cycle) {
    case 'short': return 'danger'
    case 'mid': return 'warning'
    case 'long': return 'success'
    default: return 'info'
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
const mockEventsRaw: TrendEvent[] = [
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

/** mock 数据按当前 cycle 筛选（DEV 兜底下也能响应 tab 切换） */
const mockEvents = computed(() =>
  activeCycle.value === 'all' ? mockEventsRaw : mockEventsRaw.filter(e => e.cycle === activeCycle.value)
)

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
  margin-bottom: 24rpx;
}

/* 加载状态 */
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 0;
  gap: 16rpx;
}

/* 事件列表 */
.event-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
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
  color: $ink;
}

.stock-code {
  font-size: 22rpx;
  color: $ink-soft;
  padding: 2rpx 12rpx;
  background: #f0f2f5;
  border-radius: 8rpx;
}

.stock-industry {
  font-size: 22rpx;
  color: $primary;
  padding: 2rpx 12rpx;
  background: rgba(77, 124, 254, 0.08);
  border-radius: 8rpx;
}

.event-title {
  font-size: 28rpx;
  font-weight: 500;
  color: $ink;
  line-height: 1.5;
  display: block;
  margin-bottom: 12rpx;
}

.event-summary {
  font-size: 26rpx;
  color: $ink-soft;
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
</style>
