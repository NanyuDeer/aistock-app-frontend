<template>
  <SubPageCard>
    <view class="timeline-content">
      <!-- 加载中（首屏） -->
      <view v-if="loading && items.length === 0" class="state-container">
        <SvgIcon name="time-line" size="64rpx" color="var(--ev-text-muted)" />
        <text class="state-text">加载中...</text>
      </view>

      <!-- 空状态 -->
      <view v-else-if="isEmpty" class="state-container">
        <SvgIcon name="inbox-line" size="64rpx" color="var(--ev-text-muted)" />
        <text class="state-text">暂无事件数据</text>
        <view class="retry-btn" @tap="refresh">
          <text class="retry-text">点击刷新</text>
        </view>
      </view>

      <!-- 错误状态 -->
      <view v-else-if="error" class="state-container">
        <SvgIcon name="error-warning-line" size="64rpx" color="var(--ev-negative)" />
        <text class="state-text error-text">{{ error }}</text>
        <view class="retry-btn" @tap="refresh">
          <text class="retry-text">重试</text>
        </view>
      </view>

      <!-- 事件时间线列表（仿韭研公社 /timeline：左侧竖线 + 圆点节点 + 日期分组头 + 无边框事件行） -->
      <template v-else>
        <view class="timeline-list">
          <!-- 竖向时间线 -->
          <view class="tl-line" />

          <view v-for="group in groupedItems" :key="group.date" class="time-item">
            <!-- 日期分组头：MM-DD 周X + 相对标签 -->
            <view class="time-header">
              <view class="tl-dot" />
              <text class="date">{{ formatDateDisplay(group.date) }}</text>
              <text class="weekday">{{ weekdayOf(group.date) }}</text>
              <text
                v-if="relativeTag(group.date)"
                class="date-tag"
                :class="'date-tag--' + relativeTag(group.date)"
              >{{ relativeText(group.date) }}</text>
            </view>

            <!-- 分组内事件行 -->
            <view
              v-for="event in group.events"
              :key="event.eventId"
              class="time-article-item"
              :class="{ 'time-article-item--expanded': expandedId === event.eventId }"
              @tap="handleEventClick(event)"
            >
              <!-- 第一行：标题（完整显示，核心影响板块紧跟标题文字末尾） -->
              <view class="item-top">
                <!-- 重大事件（五星 importance===5 或 GI 进当日双榜单）→ 红色渐变胶囊「重大」+ 白色实心火焰（2026-10-01 用户验收定稿：
                     红胶囊底与事件传导重大卡片 .panel-top 同款渐变，胶囊内白色火焰 + 白色文字） -->
                <view v-if="isMajorEvent(event)" class="major-badge" aria-label="重大事件">
                  <SvgIcon name="fire-fill" size="26rpx" color="#ffffff" class="major-badge__flame" />
                  <text class="major-badge__text">重大</text>
                </view>
                <!-- 自选股预计披露财报行：蓝色「财报」胶囊徽标（与「重大」胶囊同位，二者互斥） -->
                <view v-if="event.isDisclosure" class="report-badge" aria-label="财报披露">
                  <text class="report-badge__text">财报</text>
                </view>
                <text class="title" :class="{ 'title--major': isMajorEvent(event) }">{{ event.title }}</text>
                <!-- 影响板块：历史行取 chain_summary[0] 最核心 1 个，按方向着色（A 股红涨绿跌：bullish=红/bearish=绿/neutral=灰）、无底色；无行业则不渲染 -->
                <!-- 未来行使链方向数据（实体源只给板块名、无 bullish/bearish）→ sectorDirection=null → 回退中性灰；
                     即用户口径"红涨绿跌"只对历史段生效，未来行唯一只能是灰（无方向即是灰） -->
                <text v-if="event.sectorName" class="sector-tag" :class="event.sectorDirection === 'bullish' || event.sectorDirection === 'bearish' ? 'sector-tag--' + event.sectorDirection : 'sector-tag--neutral'">{{ event.sectorName }}</text>
              </view>

              <!-- 摘要（历史行 summary 恒空串 → 不渲染；仅未来行非空时渲染） -->
              <text v-if="event.summary" class="summary">{{ event.summary }}</text>

              <!-- 展开区域（未来行点击就地展开；历史行恒跳详情，不会走到此处） -->
              <view v-if="expandedId === event.eventId && event.isFuture" class="event-expand">
                <text class="expand-text">事件尚未发生，暂无传导分析</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 加载更多 -->
        <view class="load-more-area">
          <view v-if="loadingMore" class="load-more-btn">
            <text class="load-more-text">加载中...</text>
          </view>
          <view v-else-if="hasMore" class="load-more-btn" @tap="loadMore">
            <text class="load-more-text">加载更多</text>
          </view>
          <!-- 已加载全部：展示实际已加载条数（items.length，含历史段+未来段真实行）；
     total/hasMore 仍只服务实体源"加载更多"，与底部展示数无关（total 只含实体源且含被 date>today 过滤掉的 occurred 行，会误导） -->
          <view v-else-if="items.length > 0" class="load-more-btn">
            <text class="load-more-text done-text">— 已加载全部 {{ items.length }} 条事件 —</text>
          </view>
        </view>
      </template>
    </view>
  </SubPageCard>
</template>

<script setup lang="ts">
/**
 * 重大事件时间线页面
 *
 * 仿韭研公社 /timeline 排版：左侧竖向时间线（竖线 + 蓝色圆点节点）+ 日期分组头 + 无边框紧凑事件行。
 * 单一时间轴，不区分未来/历史 Tab。窗口覆盖 [今天-30, 今天+90]，日期升序。
 * 数据源双轨：
 *  - 历史段（date ≤ 今天）：事件传导列表（getTimelineHistoryRows，星级 ≥4 且非纯行情，date 按传导时间 publishTime 前 10 位分组）
 *  - 未来段（date > 今天）：GET /api/agent/event/timeline 实体源（scheduled/upcoming/ongoing 原样展示）
 * 重大事件（五星 importance===5 或 GI 进当日双榜单）标题前置「重大」胶囊徽标 + 加粗、
 * 行业方向胶囊红绿灰着色（无底色）只作用于传导历史段。
 * 历史行点击恒跳详情（这类事件必有传导报告），未来行就地展开。
 */
import { computed, onMounted, ref } from 'vue'
import type { EventTimelineQuery, TimelineRow } from '@/modules/chat/event/types'
import { getEventTimeline } from '@/modules/chat/event/api/eventApi'
import { getEntityRows, getTimelineHistoryRows } from '@/modules/chat/event/api/eventService'
import { stockApi } from '@/shared/api/modules/stock'
import SubPageCard from '@/shared/components/SubPageCard.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'

// ========== 获取上海今天日期 ==========
const now = new Date()
const todayStr = dateStrOf(now)

// 明天
const tomorrowDate = new Date(now)
tomorrowDate.setDate(tomorrowDate.getDate() + 1)
const tomorrowStr = dateStrOf(tomorrowDate)

// 未来 90 天后
const futureDate = new Date(now)
futureDate.setDate(futureDate.getDate() + 90)
const futureStr = dateStrOf(futureDate)

// 30 天前
const pastDate = new Date(now)
pastDate.setDate(pastDate.getDate() - 30)
const pastStr = dateStrOf(pastDate)

/** 本地 Date → YYYY-MM-DD */
function dateStrOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ========== 状态 ==========
// 统一行视图（TimelineRow）：历史段来自传导源、未来段来自实体源，合并后统一分组渲染
const items = ref<TimelineRow[]>([])
const loading = ref(false)
const loadingMore = ref(false)
const error = ref<string | null>(null)
const total = ref(0)
const hasMore = ref(false)
const page = ref(1)
const pageSize = 20
const expandedId = ref<string | null>(null)

/**
 * 重大事件判定（2026-10-01 用户验收）：五星（importance===5，最高星级）或
 * GI 事件（进了当日双榜单）→ 显示「重大」胶囊徽标 + 标题加粗。
 * 未来行恒无星级且 isGi=false → 不触发。
 */
function isMajorEvent(event: TimelineRow): boolean {
  return event.importance === 5 || event.isGi
}

// ========== 计算属性 ==========
const isEmpty = computed(() => !loading.value && !error.value && items.value.length === 0)

/**
 * 按 date 分组，组间升序（旧 → 新），组内按 eventStartTime 升序。
 * 统一行视图：未来行 eventStartTime=事件开始时间，历史行 eventStartTime=publishTime（同日顺序稳定）。
 */
const groupedItems = computed(() => {
  const groups = new Map<string, TimelineRow[]>()
  for (const item of items.value) {
    const list = groups.get(item.date) || []
    list.push(item)
    groups.set(item.date, list)
  }

  // 组内排序
  for (const [, events] of groups) {
    events.sort((a, b) => a.eventStartTime.localeCompare(b.eventStartTime))
  }

  // 组间排序：升序
  const sortedDates = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b))

  return sortedDates.map(date => ({
    date,
    events: groups.get(date)!,
  }))
})

// ========== 方法 ==========

/** 单窗口查询参数：过去 30 天 → 未来 90 天，升序 */
function timelineQuery(pageNum: number): EventTimelineQuery {
  return {
    dateFrom: pastStr,
    dateTo: futureStr,
    order: 'asc',
    page: pageNum,
    pageSize,
  }
}

/** 提取 6 位裸码（与后端 normalizeStockSymbol 同口径，用于自选股名映射对齐）。 */
function bareSymbol(raw: string): string {
  const m = String(raw || '').match(/\d{6}/)
  return m ? m[0] : ''
}

/**
 * 拉取「自选股预计披露财报」行（任务二）。
 *
 * 未登录 / 无自选股 / 接口异常时一律降级为空数组（不阻断时间线主体）：
 * 时间线是公开页，不该因自选股缺失而报错或空屏。
 * 披露日期来自 Tushare disclosure_date.pre_date（服务端按报告期缓存 12h）。
 */
async function loadWatchlistDisclosureRows(): Promise<TimelineRow[]> {
  try {
    // 公开页（时间线无 token 依赖）：未登录直接跳过，避免无谓的 401 请求
    if (!uni.getStorageSync('token')) return []

    const favorites = await stockApi.getFavorites()
    const symbols = favorites.map((f) => f.symbol).filter(Boolean)
    if (symbols.length === 0) return []

    const nameBySymbol = new Map<string, string>()
    for (const f of favorites) {
      const bare = bareSymbol(f.symbol)
      if (bare && f.name) nameBySymbol.set(bare, f.name)
    }

    const res = await stockApi.getDisclosureSchedule({ symbols: symbols.join(','), days: 90 })
    const list = Array.isArray(res?.items) ? res.items : []
    return list.map((item): TimelineRow => {
      const name = nameBySymbol.get(item.symbol) || item.symbol
      return {
        eventId: `DISC-${item.symbol}-${item.reportPeriod}`,
        date: item.preDate,
        eventStartTime: `${item.preDate}T00:00:00+08:00`,
        title: `${name} 预计披露${item.reportPeriodLabel}`,
        summary: '',
        sectorName: null,
        sectorDirection: null,
        isGi: false,
        importance: null,
        isFuture: true,
        isDisclosure: true,
        stockSymbol: item.symbol,
      }
    })
  } catch {
    // 未登录（401）/ 网络异常 → 静默降级，不影响事件时间线
    return []
  }
}

/** 刷新（首次加载 / 重试） */
async function refresh() {
  // 并发去重：uni-app H5 dev 下页面可能被挂载两次（KeepAlive 重建），
  // 无守卫会对同一查询发两次请求；加载中直接返回（对齐 list.vue 的不可重入约定）
  if (loading.value) return
  loading.value = true
  error.value = null
  page.value = 1
  items.value = []

  try {
    // 并行拉取三源：实体源（窗口分页）+ 事件传导历史源（星级 ≥4 且非纯行情，一次拉完）
    // + 自选股财报披露源（无自选股/未登录 → 空数组）
    const [timelineRes, historyRows, disclosureRows] = await Promise.all([
      getEventTimeline(timelineQuery(1)),
      getTimelineHistoryRows({ earliestDate: pastStr }),
      loadWatchlistDisclosureRows(),
    ])

    // 合并规则：实体行只保留 date > 今天，历史段完全交给传导源（传导源已过滤 date ≤ 今天）
    const entityRows = getEntityRows(timelineRes.items).filter((r) => r.date > todayStr)
    items.value = [...historyRows, ...entityRows, ...disclosureRows]

    // 底部「加载更多」只作用于实体源
    total.value = timelineRes.total
    hasMore.value = timelineRes.hasMore
    page.value = 1
  } catch (e: unknown) {
    error.value = (e as Error).message || '加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

/** 加载更多 */
async function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true

  try {
    const nextPage = page.value + 1
    const res = await getEventTimeline(timelineQuery(nextPage))
    // 加载更多只作用于实体源的未来段（历史段已由传导源一次拉完）
    const newEntityRows = getEntityRows(res.items).filter((r) => r.date > todayStr)
    // 去重：已加载的 eventId 不重复添加
    const existingIds = new Set(items.value.map(i => i.eventId))
    const newItems = newEntityRows.filter(i => !existingIds.has(i.eventId))
    items.value = [...items.value, ...newItems]
    total.value = res.total
    hasMore.value = res.hasMore
    page.value = nextPage
  } catch (e: unknown) {
    uni.showToast({ title: (e as Error).message || '加载失败', icon: 'none' })
  } finally {
    loadingMore.value = false
  }
}

/** 事件点击处理：财报行跳个股详情；历史行（isFuture=false）必跳详情；未来行就地展开 */
function handleEventClick(event: TimelineRow) {
  // 自选股财报披露行 → 跳个股详情页（无传导报告，不查事件详情）
  if (event.isDisclosure) {
    if (event.stockSymbol) {
      uni.navigateTo({
        url: `/modules/favorites/pages/detail?symbol=${event.stockSymbol}`,
      })
    }
    return
  }

  // 历史行（≥4 星且非纯行情的过去事件）必有传导报告 → 恒跳详情页
  if (!event.isFuture) {
    uni.navigateTo({
      url: `/modules/chat/pages/event/detail?id=${event.eventId}`,
    })
    return
  }

  // 未来行 → 就地展开/收起
  if (expandedId.value === event.eventId) {
    expandedId.value = null
  } else {
    expandedId.value = event.eventId
  }
}

/** 格式化日期分组显示：韭研风格 MM-DD */
function formatDateDisplay(dateStr: string): string {
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    return `${parts[1]}-${parts[2]}`
  }
  return dateStr
}

/** 日期 → 星期中文（date 为后端上海时区 YYYY-MM-DD，仅展示用，不做分组键） */
function weekdayOf(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`)
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()]
}

/** 相对日期标签 key：只保留今天/明天（用户验收：去掉"已过去/未来"冗余相对标签） */
function relativeTag(dateStr: string): 'today' | 'tomorrow' | null {
  if (dateStr === todayStr) return 'today'
  if (dateStr === tomorrowStr) return 'tomorrow'
  return null
}

/** 相对日期标签文案 */
function relativeText(dateStr: string): string {
  if (dateStr === todayStr) return '今天'
  if (dateStr === tomorrowStr) return '明天'
  return ''
}

// ========== 生命周期 ==========
onMounted(() => {
  refresh()
})
</script>

<style scoped>
.timeline-content {
  padding: 0 32rpx 40rpx;
}

/* ===== 时间线列表（左侧竖线 + 内容缩进） ===== */
.timeline-list {
  position: relative;
  padding-left: 132rpx;
}

/* 竖向时间线：贯穿整列 */
.tl-line {
  position: absolute;
  left: 100rpx;
  /* 竖线从首个圆点中心开始（首个 .time-header 高 48rpx，圆点 top:50% → 中心在 24rpx），
     避免圆点上方残留一段线看起来像被截断 */
  top: 24rpx;
  bottom: 0;
  width: 2rpx;
  background: var(--ev-accent);
}

/* ===== 日期分组头（韭研：MM-DD 周X，17px 深色） ===== */
.time-item {
  margin-bottom: 40rpx;
}

.time-header {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12rpx;
  height: 48rpx;
  margin-bottom: 16rpx;
}

/* 圆点节点：8px 圆形，居中于竖线（竖线 left:100rpx → 相对缩进 132rpx 的内容区为 -40rpx） */
.tl-dot {
  position: absolute;
  left: -40rpx;
  top: 50%;
  width: 16rpx;
  height: 16rpx;
  margin-top: -8rpx;
  border-radius: 50%;
  background: var(--ev-accent);
}

.date {
  font-size: 34rpx;
  color: var(--ev-text-primary);
  font-weight: 500;
}

.weekday {
  font-size: 26rpx;
  color: var(--ev-text-secondary);
}

.date-tag {
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  font-weight: 500;
}

.date-tag--today {
  background: var(--ev-accent);
  color: #ffffff;
}

.date-tag--tomorrow {
  background: var(--ev-accent-soft);
  color: var(--ev-accent);
}

/* ===== 事件行（韭研：无卡片背景/边框，紧凑行） ===== */
.time-article-item {
  margin-bottom: 30rpx;
  padding-left: 4rpx;
}

.time-article-item:active {
  opacity: 0.7;
}

.time-article-item--expanded .title {
  color: var(--ev-accent);
}

.item-top {
  /* 块级容器：标题与影响板块在同一 inline 流，板块紧跟标题最后一个字 */
  display: block;
}

.title {
  display: inline;
  font-size: 28rpx; /* 对齐事件传导页标题 $font-size-md（2026-10-01 用户要求字体大小一致） */
  font-weight: 600; /* 对齐事件传导页 .card-title 字重（2026-10-01） */
  color: var(--ev-text-primary); /* 普通事件标题用普通黑（2026-10-01 用户口径） */
  line-height: 40rpx;
  /* 标题完整显示（可换行）；行业标签紧跟文字末尾 */
  white-space: normal;
  word-break: break-all;
}

/* 重大事件（五星 importance===5 或 GI 进当日双榜单）：标题比普通事件更粗更黑（2026-10-01 用户口径） */
.title--major {
  font-weight: 700;
  color: #000000;
}

/* 重大事件红色渐变胶囊「重大」+ 白色实心火焰（2026-10-01 用户验收定稿）：
   胶囊底与事件传导重大卡片 .panel-top 同款红渐变 linear-gradient(180deg, #e22c2c, #d81f1f)，
   胶囊内白色火焰（SvgIcon fire-fill 单色白）+ 白色文字。 */
.major-badge {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  vertical-align: middle;
  margin-right: 8rpx;
  padding: 0 12rpx;
  border-radius: 8rpx;
  background: linear-gradient(180deg, #e22c2c, #d81f1f);
}

.major-badge__flame {
  flex-shrink: 0;
}

.major-badge__text {
  font-size: 20rpx;
  color: #ffffff;
  font-weight: 600;
  line-height: 34rpx;
  white-space: nowrap;
}

/* 自选股财报披露行蓝色胶囊「财报」（主题色实心，与红色「重大」胶囊同位互斥） */
.report-badge {
  display: inline-flex;
  align-items: center;
  vertical-align: middle;
  margin-right: 8rpx;
  padding: 0 12rpx;
  border-radius: 8rpx;
  background: var(--ev-accent);
}

.report-badge__text {
  font-size: 20rpx;
  color: #ffffff;
  font-weight: 600;
  line-height: 34rpx;
  white-space: nowrap;
}

/* 核心影响板块标签（紧跟标题文字末尾，inline 胶囊） */
.sector-tag {
  display: inline-block;
  vertical-align: middle;
  margin-left: 10rpx;
  font-size: 20rpx;
  line-height: 34rpx;
  padding: 0 12rpx;
  border-radius: 8rpx;
  white-space: nowrap;
}

/* 行业方向着色（A 股红涨绿跌，必须用 global.scss 的 --ev-* 变量，禁止硬编码色值）。
   注意：三种方向都【无底色】（inline 胶囊只靠字色区分），不设 background。 */
.sector-tag--bullish {
  color: var(--ev-negative);
}

.sector-tag--bearish {
  color: var(--ev-positive);
}

/* neutral 默认灰色字（--ev-text-muted） */
.sector-tag--neutral {
  color: var(--ev-text-muted);
}

.summary {
  font-size: 24rpx;
  color: var(--ev-text-muted); /* 对齐事件传导页洞见摘要灰阶 $ink-mute（2026-10-01） */
  line-height: 1.5;
  margin-top: 8rpx;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  word-break: break-all;
}

/* ===== 展开区域 ===== */
.event-expand {
  margin-top: 12rpx;
  padding: 14rpx 16rpx;
  background: var(--ev-accent-bg);
  border-radius: 8rpx;
}

.expand-text {
  font-size: 24rpx;
  color: var(--ev-text-tertiary);
  line-height: 1.5;
  display: block;
}

/* ===== 加载更多 / 状态区域 ===== */
.state-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 32rpx;
}

.state-text {
  font-size: 28rpx;
  color: var(--ev-text-muted);
  margin-bottom: 24rpx;
}

.error-text {
  color: var(--ev-negative);
}

.retry-btn {
  padding: 16rpx 48rpx;
  border-radius: 9999rpx;
  background: var(--ev-accent-soft);
  border: 1px solid var(--ev-accent);
}

.retry-text {
  font-size: 26rpx;
  color: var(--ev-accent);
  font-weight: 500;
}

.load-more-area {
  padding: 32rpx;
  display: flex;
  justify-content: center;
}

.load-more-btn {
  padding: 20rpx 56rpx;
  border-radius: 9999rpx;
  background: var(--ev-accent-soft);
  border: 1px solid var(--ev-border);
}

.load-more-btn:active {
  background: var(--ev-accent-bg);
}

.load-more-text {
  font-size: 26rpx;
  color: var(--ev-accent);
  font-weight: 500;
}

.done-text {
  color: var(--ev-text-muted);
}
</style>
