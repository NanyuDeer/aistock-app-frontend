/**
 * 首页自选股消息卡 —— 单实例 composable（仅 MainTabs 使用，非全局 store）
 *
 * 数据由两源合成（2026-10-14）：
 * - **股票集合与涨跌幅**：stock-trace 异动（沿用原口径，决定「哪些自选股上卡」）
 * - **卡内 5 类消息**：通知（异动/洞察/情报/预判/业绩，每类取最新一条标题）
 *
 * 为什么必须两源：5 类消息只存在于通知链路，而涨跌幅/主因只存在于 stock-trace；
 * 单靠任一源都无法同时满足「按股票聚合 5 类消息」与「展示涨跌幅」。
 *
 * stock-trace 侧口径完全复用既有消费者（monitor.vue / insight.vue / AlertContent.vue）：
 * filter(isUnattributableMovement) → dedupeDailyMovements → 倒序。
 * 未登录时两接口均 401 → 卡片为空，悬浮层自然不渲染（自选股需登录）。
 */
import { computed, ref } from 'vue'
import { stockTraceApi, type StockTraceEvent } from '@/shared/api/modules/stockTrace'
import {
  notificationApi,
  type NotificationCategory,
  type UserNotification,
} from '@/shared/api/modules/notifications'
import {
  dedupeDailyMovements,
  isUnattributableMovement,
} from '@/modules/favorites/components/insightCards'
import { formatTime } from '@/shared/utils/datetime'
import { isTradingTime } from '@/shared/utils/tradingTime'

/** 卡内 5 类消息的固定展示顺序（用户可见措辞） */
export const ALERT_CATEGORY_ORDER: NotificationCategory[] = [
  'price_movement',
  'insight',
  'stock_info',
  'forecast',
  'performance_report',
]

/** 分类 → 中文标签（本地措辞，与铃铛面板的标签各自独立） */
export const ALERT_CATEGORY_LABEL: Record<NotificationCategory, string> = {
  price_movement: '异动',
  insight: '洞察',
  stock_info: '情报',
  forecast: '预判',
  performance_report: '业绩',
}

/** stock-trace 单条异动（内部中间模型） */
export interface StockAlertItem {
  eventId: string
  symbol: string
  stockName: string
  direction: 'up' | 'down'
  changePct: number
  /** 主因三段式兜底后的文案 */
  causeText: string
  /** 展示用时间：同日 HH:mm，跨日 MM-DD HH:mm */
  timeText: string
  isLimitUp: boolean
  sortTime: number
}

/** 卡内单类消息行 */
export interface StockAlertCategoryRow {
  key: NotificationCategory
  label: string
  /** 该类最新一条消息的标题 */
  title: string
  /** 该类消息条数 */
  count: number
}

/** 展示层模型：一只股票一张卡 */
export interface StockAlertCard {
  symbol: string
  stockName: string
  direction: 'up' | 'down'
  changePct: number
  isLimitUp: boolean
  /** 展示用时间（取异动时刻） */
  timeText: string
  /** 5 类消息行（仅含有消息的类，按 ALERT_CATEGORY_ORDER 排序） */
  rows: StockAlertCategoryRow[]
  /** 该股票全部消息条数 */
  totalCount: number
  /** 该股票未读消息条数 */
  unreadCount: number
  sortTime: number
}

/** 主因三段式兜底（与 AlertContent.fromMovement 同口径） */
function resolveCauseText(m: StockTraceEvent): string {
  if (m.primary_cause) return m.primary_cause
  if (m.movement_view?.primaryCandidate?.verdict) return m.movement_view.primaryCandidate.verdict
  if (m.analysis_status === 'completed') return '归因完成'
  if (m.analysis_status === 'processing') return '归因中'
  if (m.analysis_status === 'failed') return '归因失败'
  return '待归因'
}

function toItem(m: StockTraceEvent): StockAlertItem {
  // 活动时刻口径与 dedupeDailyMovements 一致：window_end_at ?? triggered_at
  const at = m.window_end_at ?? m.triggered_at
  return {
    eventId: m.event_id,
    symbol: m.symbol,
    stockName: m.stock_name,
    direction: m.direction,
    changePct: m.change_pct,
    causeText: resolveCauseText(m),
    timeText: formatTime(at),
    isLimitUp: m.is_limit_up === true,
    sortTime: at ? new Date(at).getTime() : 0,
  }
}

function notificationTime(n: UserNotification): number {
  const at = n.occurredAt || n.createdAt
  return at ? new Date(at).getTime() : 0
}

/**
 * 纯函数：stock-trace 异动 + 通知 → 按股票聚合的卡片。
 * 通知按 symbol 分组，每类只保留最新一条标题；只输出有消息的类。
 */
export function buildAlertCards(
  items: StockAlertItem[],
  notifications: UserNotification[],
): StockAlertCard[] {
  const bySymbol = new Map<string, UserNotification[]>()
  for (const n of notifications) {
    if (!n.symbol) continue
    const bucket = bySymbol.get(n.symbol)
    if (bucket) bucket.push(n)
    else bySymbol.set(n.symbol, [n])
  }

  return items.map((item) => {
    const list = bySymbol.get(item.symbol) ?? []
    const rows: StockAlertCategoryRow[] = []
    for (const key of ALERT_CATEGORY_ORDER) {
      const bucket = list.filter((n) => n.category === key)
      if (!bucket.length) continue
      const latest = bucket.reduce((a, b) => (notificationTime(b) > notificationTime(a) ? b : a))
      rows.push({ key, label: ALERT_CATEGORY_LABEL[key], title: latest.title, count: bucket.length })
    }
    return {
      symbol: item.symbol,
      stockName: item.stockName,
      direction: item.direction,
      changePct: item.changePct,
      isLimitUp: item.isLimitUp,
      timeText: item.timeText,
      rows,
      totalCount: list.length,
      unreadCount: list.filter((n) => !n.readAt).length,
      sortTime: item.sortTime,
    }
  })
}

export function useStockAlerts(pollIntervalMs = 60_000) {
  const items = ref<StockAlertItem[]>([])
  const notifications = ref<UserNotification[]>([])
  const loading = ref(false)
  /** 本次会话内被 × 关闭过的股票代码（整张卡关闭，不持久化，重启复位） */
  const dismissedSymbols = ref<string[]>([])

  /** 拉取最近异动（首页口径：与 AlertContent.vue 一致，**不传** visible_only/since）
   *  + 最近通知（卡内 5 类消息来源）。两请求并发，通知失败时降级为空（不阻塞异动展示）。 */
  async function fetchRecent(): Promise<void> {
    loading.value = true
    try {
      const [tracePage, notifyPage] = await Promise.all([
        stockTraceApi.list(20),
        notificationApi.list({ limit: 50 }).catch(() => null),
      ])
      items.value = dedupeDailyMovements(
        (tracePage.items ?? []).filter((m) => !isUnattributableMovement(m)),
      )
        .map(toItem)
        .sort((a, b) => b.sortTime - a.sortTime)
      notifications.value = notifyPage?.items ?? []
    } catch {
      // 未登录 / 网络失败：静默给空列表，不阻塞首页
      items.value = []
      notifications.value = []
    } finally {
      loading.value = false
    }
  }

  /** 悬浮层用：按股票聚合的卡片（已剔除本次会话关闭过的股票） */
  const cards = computed<StockAlertCard[]>(() =>
    buildAlertCards(items.value, notifications.value).filter(
      (card) => !dismissedSymbols.value.includes(card.symbol),
    ),
  )

  function isDismissed(symbol: string): boolean {
    return dismissedSymbols.value.includes(symbol)
  }

  /** 关闭某只股票的整张卡：同一股票本次会话内不再弹；出现新股票时可再次弹出 */
  function dismiss(symbol: string): void {
    if (!dismissedSymbols.value.includes(symbol)) {
      dismissedSymbols.value = [...dismissedSymbols.value, symbol]
    }
  }

  let timer: ReturnType<typeof setInterval> | null = null

  /** 仅交易时段轮询（与 AlertContent 同口径，避免非盘中空转） */
  function startPolling(): void {
    stopPolling()
    if (!isTradingTime()) return
    timer = setInterval(() => {
      void fetchRecent()
    }, pollIntervalMs)
  }

  function stopPolling(): void {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  return {
    items,
    notifications,
    cards,
    loading,
    dismissedSymbols,
    fetchRecent,
    dismiss,
    isDismissed,
    startPolling,
    stopPolling,
  }
}
