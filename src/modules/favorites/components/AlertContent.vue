<template>
  <view class="alert-content">
    <view class="content-wrap">
      <!-- 自选股洞察模块：预览自选股价格异动的归因结果，点击进入异动监控/洞察详情 -->
      <view class="alert-module">
        <view class="module-card">
          <view class="module-decor"></view>
          <view class="module-header" @tap="goAlertCatcher">
            <view class="module-icon">
              <SvgIcon name="radar-line" size="32rpx" color="#0b5fff" />
            </view>
            <view class="module-header-text">
              <text class="module-title">自选股洞察</text>
            </view>
            <text class="module-arrow">›</text>
          </view>
          <view class="capture-list">
            <template v-if="captureList.length">
              <ListCell
                v-for="(item, idx) in captureRows"
                :key="idx"
                :title="item?.stock_name || '\u3000'"
                :description="item ? `${item.detailText} · ${item.dateText}` : '\u3000'"
                :clickable="!!item"
                @click="item && goTrace(item.event_id)"
              >
                <template #prefix>
                  <Tag v-if="item" :type="captureTagType(item.direction)" size="sm">{{ badgeLabel(item.direction) }}</Tag>
                </template>
              </ListCell>
            </template>
            <EmptyState v-if="!captureList.length" title="暂无异动数据" />
          </view>
        </view>
      </view>

      <!-- 个股情报模块（原StockMonitor，原异动捕手改名） -->
      <view class="alert-module">
        <view class="module-card">
          <view class="module-decor module-decor--intel"></view>
          <view class="module-header" @tap="goStockIntel">
            <view class="module-icon">
              <SvgIcon name="search-eye-line" size="32rpx" color="#f0a020" />
            </view>
            <view class="module-header-text">
              <text class="module-title">个股情报</text>
            </view>
            <!-- 全部/利好/利空 切换标签 -->
            <view class="intel-tabs" @tap.stop>
              <Segmented :model-value="intelSubTab" :items="intelTabItems" @change="onIntelTabChange" />
            </view>
          </view>
          <view class="intel-list">
            <template v-if="filteredIntelList.length">
              <ListCell
                v-for="(item, idx) in intelRows"
                :key="idx"
                :title="item?.title || '\u3000'"
                :description="item ? item.meta : '\u3000'"
                :clickable="!!item"
                @click="item && goAlertAnalysis(item.symbol, item.cycle)"
              >
                <template #prefix>
                  <Tag v-if="item" :type="impactTagType(item.sentiment)" size="sm">{{ impactLabel(item.sentiment) }}</Tag>
                </template>
              </ListCell>
            </template>
            <EmptyState v-if="!filteredIntelList.length" title="暂无情报数据" />
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import Segmented from '@/shared/components/Segmented.vue'
import ListCell from '@/shared/components/ListCell.vue'
import Tag from '@/shared/components/Tag.vue'
import EmptyState from '@/shared/components/EmptyState.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import { stockApi } from '@/shared/api/modules/stock'
import { stockTraceApi, type StockTraceEvent } from '@/shared/api/modules/stockTrace'
import { useUserStore } from '@/shared/store/modules/user'
import { isUnattributableMovement } from './insightCards'

// 情报来源类型
type SourceType = 'announce' | 'research' | 'news'

interface IntelItem {
  sourceType: SourceType
  title: string
  meta: string
  sentiment: 'positive' | 'negative' | 'neutral'
  /** 关联股票代码（点击跳 AI 解读用） */
  symbol: string
  /** 分析周期（点击跳 AI 解读用） */
  cycle: string
}

const intelSubTab = ref<'all' | 'positive' | 'negative'>('all')

const intelTabItems = [
  { label: '全部', value: 'all' as const },
  { label: '利好', value: 'positive' as const },
  { label: '利空', value: 'negative' as const },
]

// 自选股洞察：统一展示模型（仅来自 stocktrace 价格异动链路）
interface CaptureItem {
  event_id: string
  event_type: 'price'
  stock_name: string
  direction: 'up' | 'down'
  /** 描述文案：主因：xxx / 主因待验证 / 归因中 / 待归因 */
  detailText: string
  /** MM-DD 日期 */
  dateText: string
  /** 事件时间戳（融合列表按此倒序排列） */
  sortTime: number
}

const captureList = ref<CaptureItem[]>([])

/** 格式化时间为 MM-DD（本地时区） */
function fmtDateMMDD(t?: string): string {
  if (!t) return '--'
  const date = new Date(t)
  if (Number.isNaN(date.getTime())) return '--'
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** 价格异动（stocktrace 链路）→ 统一模型 */
function fromMovement(m: StockTraceEvent): CaptureItem {
  let detailText = '待归因'
  if (m.primary_cause) detailText = `主因：${m.primary_cause}`
  else if (m.movement_view?.primaryCandidate?.verdict) detailText = `主因：${m.movement_view.primaryCandidate.verdict}`
  else if (m.analysis_status === 'completed') detailText = '归因完成'
  else if (m.analysis_status === 'processing') detailText = '归因中'
  return {
    event_id: m.event_id,
    event_type: 'price',
    stock_name: m.stock_name,
    direction: m.direction,
    detailText,
    dateText: fmtDateMMDD(m.triggered_at),
    sortTime: m.triggered_at ? new Date(m.triggered_at).getTime() : 0,
  }
}

async function loadCaptureList() {
  // 2026-08-30 链路合并：涨停雷达事件已并入 stock-trace（movements），列表只消费 movements
  try {
    const page = await stockTraceApi.list(20).catch(() => ({ items: [] as StockTraceEvent[] }))
    const attributable = (page.items ?? []).filter((m) => !isUnattributableMovement(m))
    captureList.value = attributable.map(fromMovement).sort((a, b) => b.sortTime - a.sortTime)
  } catch {
    captureList.value = []
  }
}

// 个股情报：接真实 API（无数据/失败均不 mock，展示空状态）
const intelList = ref<IntelItem[]>([])

/** 把后端 TrendEvent 映射成 IntelItem（推断来源类型和情感倾向） */
function mapTrendEventToIntelItem(evt: Record<string, unknown>): IntelItem {
  const impact = String(evt.ai_impact ?? '中性')
  const sentiment: IntelItem['sentiment'] = impact.includes('利空') ? 'negative' : impact.includes('利') ? 'positive' : 'neutral'
  const infoType = String(evt.info_type ?? evt.change_type_name ?? '')
  const sourceType: SourceType = infoType.includes('公告') ? 'announce' : infoType.includes('研') ? 'research' : 'news'
  return {
    sourceType,
    title: String(evt.title ?? ''),
    meta: `${impact} · ${formatRelativeTime(String(evt.event_time ?? evt.published_at ?? ''))}`,
    sentiment,
    symbol: String(evt.stock_code ?? evt.symbol ?? ''),
    cycle: String(evt.cycle ?? 'mid'),
  }
}

async function loadIntelList() {
  try {
    // limit 需 ≥20：接口按发布时间倒序，前 10 条多为中性事件（实测仅 3 条非中性），
    // 取 20 条过滤中性后仍有 13 条，足以填满 4 行预览
    // 登录后仅展示自选股资讯（/favorites/news 按 user_stocks 过滤），未登录展示全市场
    const userStore = useUserStore()
    const res = userStore.isLoggedIn()
      ? await stockApi.getFavoritesNews({ limit: 20 }) as Record<string, unknown>
      : await stockApi.getTrendEvents({ limit: 20 }) as Record<string, unknown>
    const list = (res?.events || (res?.data as Record<string, unknown>)?.events || []) as Record<string, unknown>[]
    intelList.value = list.map(mapTrendEventToIntelItem)
  } catch {
    intelList.value = []
  }
}

/** 相对时间格式化：刚刚 / X小时前 / X天前 */
function formatRelativeTime(value: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const diff = Date.now() - date.getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return '刚刚'
  if (hours < 24) return `${hours}小时前`
  return `${Math.floor(hours / 24)}天前`
}

const filteredIntelList = computed(() => {
  // 默认不展示中性情报（与个股情报页 event-catcher 一致）
  const nonNeutral = intelList.value.filter(item => item.sentiment !== 'neutral')
  if (intelSubTab.value === 'all') return nonNeutral
  return nonNeutral.filter(item => item.sentiment === intelSubTab.value)
})

/** 首页预览最多显示4条，其余进入详情页查看 */
const MAX_PREVIEW = 4

/**
 * 个股情报列表固定渲染 4 行：数据不足时空行占位，
 * 卡片纵向长度不随数据量变化（与异动捕手列表一致）
 */
const intelRows = computed<Array<IntelItem | null>>(() => {
  const rows: Array<IntelItem | null> = filteredIntelList.value.slice(0, MAX_PREVIEW)
  while (rows.length < MAX_PREVIEW) rows.push(null)
  return rows
})

/**
 * 异动捕手列表固定渲染 6 行：数据不足时空行占位，
 * 卡片纵向长度不随数据量变化（避免只有 1 条资讯时卡片变矮）
 */
const CAPTURE_ROW_COUNT = 6
const captureRows = computed<Array<CaptureItem | null>>(() => {
  const rows: Array<CaptureItem | null> = captureList.value.slice(0, CAPTURE_ROW_COUNT)
  while (rows.length < CAPTURE_ROW_COUNT) rows.push(null)
  return rows
})

/** 情感 → 标签文案：利好→好，利空→空，中性→中（与 event-catcher 风格一致） */
function impactLabel(sentiment: IntelItem['sentiment']): string {
  return sentiment === 'positive' ? '好' : sentiment === 'negative' ? '空' : '中'
}

/** 情感 → Tag type：利好→up(红)，利空→down(绿)，中性→neutral(蓝) */
function impactTagType(sentiment: IntelItem['sentiment']): 'up' | 'down' | 'neutral' {
  return sentiment === 'positive' ? 'up' : sentiment === 'negative' ? 'down' : 'neutral'
}

/** 异动方向 → 涨跌徽标：涨→涨，跌→跌 */
function badgeLabel(direction: 'up' | 'down'): string {
  return direction === 'up' ? '涨' : '跌'
}

/** 异动方向 → Tag type：涨→up(红)，跌→down(绿) */
function captureTagType(direction: 'up' | 'down'): 'up' | 'down' {
  return direction
}

/** Segmented 的 change 回调（emit string|number），收敛回窄联合类型 */
function onIntelTabChange(val: string | number) {
  intelSubTab.value = val as 'all' | 'positive' | 'negative'
}

/** 自选股洞察（新模块：自选股异动监控） */
function goAlertCatcher() {
  uni.navigateTo({ url: '/modules/favorites/pages/monitor' })
}

/** 洞察详情：统一跳转到 insight-detail-move（所有异动均为 stocktrace 价格事件） */
function goTrace(eventId: string) {
  uni.navigateTo({ url: `/modules/favorites/pages/insight-detail-move?event_id=${encodeURIComponent(eventId)}` })
}

/** 个股情报（原异动捕手/event-catcher，已改名） */
function goStockIntel() {
  uni.navigateTo({ url: '/modules/market/pages/event-catcher' })
}

/** 情报 AI 解读：跳转到 alert-analysis 页面 */
function goAlertAnalysis(symbol: string, cycle: string) {
  if (!symbol) return
  uni.navigateTo({ url: `/modules/market/pages/alert-analysis?symbol=${symbol}&cycle=${cycle}` })
}

/** 暴露给父组件（保留接口兼容性） */
defineExpose({
  currentStockIdx: computed(() => 0),
  totalCount: computed(() => captureList.value.length),
})

onMounted(() => {
  void loadCaptureList()
  void loadIntelList()
})

// 登录/登出后，个股情报数据源会在全市场与自选股之间切换，需重新加载
watch(
  () => useUserStore().token,
  () => {
    void loadIntelList()
  },
)
</script>

<style lang="scss" scoped>
.alert-content {
  background: $bg-card;
}

.content-wrap {
  /* 上下各缩小 2rpx，整张模块卡高度减少约 2px。 */
  padding: 20rpx $s-3;
}

/* ===== 模块通用 ===== */
.alert-module {
  margin-bottom: $s-3;

  &:last-child {
    margin-bottom: 0;
  }
}

/* 灰色卡片容器：参考 InsightListCard 设计；与首页今日专属卡片一致的按压动效 */
.module-card {
  background: $bg-soft;
  border: 2rpx solid $line;
  border-radius: $r-lg;
  padding: $s-3;
  position: relative;
  overflow: hidden;
  box-shadow: $shadow-card;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:active {
    transform: scale(0.98);
    box-shadow: $shadow-sm;
  }
}

/* 顶部装饰条 */
.module-decor {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4rpx;
  background: $brand-gradient;
}

.module-decor--intel {
  background: linear-gradient(90deg, $warning, $warning-light);
}

/* 头部：标题/描述 + 箭头 */
.module-header {
  display: flex;
  align-items: center;
  gap: $s-2;
  margin-bottom: $s-2;
}

.module-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.module-header-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  min-width: 0;
}

.module-title {
  font-size: $font-size-md;
  font-weight: 600;
  color: $ink;
}

.module-arrow {
  font-size: $font-size-lg;
  color: $ink-mute;
  font-weight: 300;
  flex-shrink: 0;
}

/* ===== 自选股洞察 / 个股情报 列表区域（ListCell，样式一致） ===== */
.capture-list,
.intel-list {
  background: $bg-card;
  border-radius: $r-sm;
  padding: 0;
  overflow: hidden;
}

/* 覆写 ListCell 内边距和字体：使列表更紧凑（行距比默认 $s-4 更紧凑，两列表保持一致） */
.capture-list :deep(.as-list-cell),
.intel-list :deep(.as-list-cell) {
  padding: $s-2 $s-2;
  /* 空行占位（\u3000）与真实行等高，保证两个模块纵向长度一致 */
  min-height: 104rpx;
}

.capture-list :deep(.as-list-cell__title),
.intel-list :deep(.as-list-cell__title) {
  font-size: $font-size-sm;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.capture-list :deep(.as-list-cell__desc),
.intel-list :deep(.as-list-cell__desc) {
  font-size: $font-size-xs;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.capture-list :deep(.as-list-cell__prefix),
.intel-list :deep(.as-list-cell__prefix) {
  margin-right: $s-2;
}

.capture-list :deep(.as-list-cell__right),
.intel-list :deep(.as-list-cell__right) {
  margin-left: $s-2;
}

.intel-tabs {
  display: flex;
  transform: scale(0.85);
  transform-origin: right center;
}
</style>