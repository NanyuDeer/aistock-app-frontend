/**
 * 异动捕手 Mock 数据（仅用于产品演示，非真实市场信息）
 *
 * 复用 changER PR 曾有的 mock-data.ts 逻辑（commit 49c6546）：数据结构与
 * shared/api/modules/insight.ts 的 WatchlistInsight 对齐。
 *
 * 演示开关：`isInsightsMockForced()` 为 true 时，异动监控（monitor.vue）
 * 与首页异动捕手模块（AlertContent.vue）无条件展示 mock，不请求真实 API；
 * 真实数据就绪后置 false（或设 VITE_USE_INSIGHTS_MOCK=false）即可整体切回。
 *
 * 生成规则：
 * 1. 自选股命中模板池（原 6 条手写 mock，含精细归因文案）→ 直接复用
 * 2. 模板池没有的自选股 → 按模板结构动态生成（方向/归因状态轮换）
 * 3. 最终只保留当前自选股范围内的条目（"然后再过滤"）
 */

import type { WatchlistInsight } from '@/shared/api/modules/insight'
import type { FavoriteStock } from '@/shared/store/modules/favorites'

/** 演示阶段：异动监控暂时显示 mock（真实数据就绪后置 false） */
const MOCK_ENABLED = true

/**
 * 异动捕手是否强制使用 mock（演示开关）。
 * VITE_USE_INSIGHTS_MOCK=true 无条件 mock；未配置时取 MOCK_ENABLED。
 */
export function isInsightsMockForced(): boolean {
  const env = import.meta.env.VITE_USE_INSIGHTS_MOCK
  return env === 'true' || (env === undefined && MOCK_ENABLED)
}

/** 模板池：原 mock-data.ts 的 6 条手写数据（覆盖未登录默认自选股 + 中际旭创） */
const TEMPLATE_POOL: WatchlistInsight[] = [
  {
    event_id: 'mock_insight_600519',
    symbol: '600519',
    stock_name: '贵州茅台',
    trade_date: '2026-08-07',
    event_type: 'limit_up_radar',
    direction: 'up',
    attribution_status: 'confirmed',
    confidence: 'high',
    primary_driver: {
      label: '白酒批价企稳叠加旺季备货需求回升',
      category: 'industry_theme',
      confidence: 'high',
      evidence_quote: '渠道反馈飞天批价连续三日回升，中秋国庆备货窗口开启，动销环比改善。',
      source_ids: ['cls_news_0827001', 'gf_research_0827002'],
    },
    secondary_drivers: [
      {
        label: '直销占比提升支撑吨价与盈利能力',
        category: 'company_event',
        confidence: 'medium',
      },
    ],
    display_report: {
      summary: '批价企稳 + 旺季备货双击，白酒板块情绪修复，龙头确定性溢价抬升。',
      details: '飞天批价企稳回升确认渠道库存去化，叠加双节备货，短期板块情绪与动销预期共振；公司直销占比持续提升，盈利质量稳健，估值具备修复空间。',
    },
    created_at: '2026-08-07T10:45:00+08:00',
    title: '贵州茅台放量拉升，白酒板块集体走强',
    keywords: ['放量拉升', '白酒', '批价', '旺季备货'],
    published_at: '2026-08-07 10:30',
  },
  {
    event_id: 'mock_insight_300750',
    symbol: '300750',
    stock_name: '宁德时代',
    trade_date: '2026-08-07',
    event_type: 'limit_up_radar',
    direction: 'up',
    attribution_status: 'confirmed',
    confidence: 'high',
    primary_driver: {
      label: '欧洲电池工厂获政府补贴落地，海外扩产提速',
      category: 'company_event',
      confidence: 'high',
      evidence_quote: '公司公告欧洲工厂获得当地政府补贴支持，产能建设与客户导入进入快车道。',
      source_ids: ['comp_ann_0827001'],
    },
    secondary_drivers: [
      {
        label: '储能需求高景气，国内外订单双轮驱动',
        category: 'industry_theme',
        confidence: 'medium',
      },
    ],
    display_report: {
      summary: '海外补贴落地降低建厂成本，本地化供应打开欧洲车企订单空间，中期盈利中枢上移。',
      details: '欧洲本地化产能是获取海外车企订单的关键，补贴落地直接降低海外建厂成本；海外高毛利订单占比提升叠加储能放量，盈利质量与成长性同步改善。',
    },
    created_at: '2026-08-07T14:20:00+08:00',
    title: '宁德时代午后拉升，欧洲产能布局获补贴支持',
    keywords: ['欧洲扩产', '补贴', '动力电池', '储能'],
    published_at: '2026-08-07 14:05',
  },
  {
    event_id: 'mock_insight_000001',
    symbol: '000001',
    stock_name: '平安银行',
    trade_date: '2026-08-06',
    event_type: 'limit_up_radar',
    direction: 'up',
    attribution_status: 'confirmed',
    confidence: 'medium',
    primary_driver: {
      label: '业绩快报超预期，净息差企稳回升',
      category: 'earnings',
      confidence: 'medium',
      evidence_quote: '业绩快报显示营收增速回正，净息差环比企稳，资产质量保持稳健。',
      source_ids: ['comp_ann_0826001'],
    },
    secondary_drivers: [
      {
        label: '银行板块估值修复，资金回流权重蓝筹',
        category: 'market',
        confidence: 'low',
      },
    ],
    display_report: {
      summary: '业绩快报超预期验证基本面筑底，净息差企稳缓解市场对息差压力的担忧。',
      details: '净息差企稳是银行股估值修复的核心信号；营收增速回正叠加资产质量稳健，短期业绩确定性提升，带动板块资金关注度上升。',
    },
    created_at: '2026-08-06T11:10:00+08:00',
    title: '平安银行早盘走强，业绩快报净息差企稳',
    keywords: ['业绩快报', '净息差', '银行'],
    published_at: '2026-08-06 10:50',
  },
  {
    event_id: 'mock_insight_000858',
    symbol: '000858',
    stock_name: '五粮液',
    trade_date: '2026-08-06',
    event_type: 'limit_up_radar',
    direction: 'up',
    attribution_status: 'unconfirmed',
    confidence: 'unconfirmed',
    title: '五粮液尾盘异动，资金关注度提升',
    keywords: ['白酒', '资金关注'],
    created_at: '2026-08-06T15:05:00+08:00',
    published_at: '2026-08-06 14:55',
  },
  {
    event_id: 'mock_insight_601318',
    symbol: '601318',
    stock_name: '中国平安',
    trade_date: '2026-08-05',
    event_type: 'limit_up_radar',
    direction: 'up',
    attribution_status: null,
    confidence: 'unconfirmed',
    title: '中国平安盘中拉升，保险板块整体回暖',
    keywords: ['保险', '金融', '权重'],
    created_at: '2026-08-05T13:35:00+08:00',
    published_at: '2026-08-05 13:20',
  },
  {
    event_id: 'mock_insight_300308',
    symbol: '300308',
    stock_name: '中际旭创',
    trade_date: '2026-08-05',
    event_type: 'limit_up_radar',
    direction: 'up',
    attribution_status: 'confirmed',
    confidence: 'high',
    primary_driver: {
      label: '海外算力资本开支上修，光模块需求高景气',
      category: 'market',
      confidence: 'high',
      evidence_quote: '海外算力龙头业绩超预期并上调资本开支指引，800G 光模块订单持续上调。',
      source_ids: ['cls_news_0825001', 'us_earn_0825002'],
    },
    secondary_drivers: [
      {
        label: '1.6T 产品送样顺利，开启新一轮产品周期',
        category: 'company_event',
        confidence: 'medium',
      },
    ],
    display_report: {
      summary: 'AI 算力资本开支上修带动高速光模块需求，核心供应商订单能见度与业绩弹性提升。',
      details: '海外大客户资本开支超预期直接拉动 800G/1.6T 光模块需求；公司份额稳定，1.6T 产品送样顺利，有望开启新一轮量价齐升周期。',
    },
    created_at: '2026-08-05T10:15:00+08:00',
    title: '中际旭创创阶段新高，光模块景气延续',
    keywords: ['光模块', '算力', '800G'],
    published_at: '2026-08-05 10:00',
  },
]

/** 模板池 symbol → 条目 */
const templateMap = new Map(TEMPLATE_POOL.map(item => [item.symbol, item]))

/** 通用归因文案池（按 idx 轮换，覆盖三种归因状态） */
const GENERIC_DRIVERS: Array<Pick<WatchlistInsight, 'direction' | 'attribution_status' | 'confidence' | 'primary_driver'>> = [
  {
    direction: 'up',
    attribution_status: 'confirmed',
    confidence: 'high',
    primary_driver: {
      label: '板块热点驱动，主力资金净流入明显',
      category: 'industry_theme',
      confidence: 'high',
    },
  },
  {
    direction: 'up',
    attribution_status: 'unconfirmed',
    confidence: 'unconfirmed',
    primary_driver: null,
  },
  {
    direction: 'down',
    attribution_status: 'confirmed',
    confidence: 'medium',
    primary_driver: {
      label: '短线获利盘涌出，板块内资金分歧加大',
      category: 'trading_sentiment',
      confidence: 'medium',
    },
  },
  {
    direction: 'up',
    attribution_status: null,
    confidence: 'unconfirmed',
    primary_driver: null,
  },
]

/**
 * 为模板池未覆盖的自选股动态生成一条 mock 异动（结构对齐 WatchlistInsight）。
 * trade_date 用最近自然日，保证列表时间倒序观感；detail 页所需字段（display_report.details、
 * secondary_drivers）一并补齐，保证点击进入洞察详情页有完整内容。
 */
function createInsightForStock(stock: FavoriteStock, idx: number): WatchlistInsight {
  const tpl = GENERIC_DRIVERS[idx % GENERIC_DRIVERS.length]
  const today = new Date()
  const daysAgo = idx % 2 // 让部分条目落在前一天，制造时间差
  const date = new Date(today.getTime() - daysAgo * 86400000)
  const ymd = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  const hhmm = `${String(9 + (idx % 6)).padStart(2, '0')}:${String((idx * 17) % 60).padStart(2, '0')}`
  const directionText = tpl.direction === 'up' ? '拉升' : '回落'
  const driver = tpl.primary_driver
  return {
    event_id: `mock_insight_${stock.symbol}`,
    symbol: stock.symbol,
    stock_name: stock.name || stock.symbol,
    trade_date: ymd,
    event_type: 'limit_up_radar',
    direction: tpl.direction,
    attribution_status: tpl.attribution_status,
    confidence: tpl.confidence,
    primary_driver: driver,
    secondary_drivers: [
      { label: '板块资金关注度提升，短线交易情绪回暖', category: 'market', confidence: 'low' },
    ],
    display_report: driver
      ? {
          summary: `${stock.name || stock.symbol}异动，${driver.label}。`,
          details: `${stock.name || stock.symbol}盘中出现明显${directionText}，主因为${driver.label}；板块内资金活跃度上升，短线交易情绪改善，建议结合盘面量能与板块持续性综合判断。`,
        }
      : {
          summary: `${stock.name || stock.symbol}异动，主因待验证。`,
          details: `${stock.name || stock.symbol}盘中出现明显${directionText}，当前归因仍在验证中；建议关注后续资金流向与板块联动，等待主因确认后再作决策。`,
        },
    created_at: `${ymd}T${hhmm}:00+08:00`,
    title: `${stock.name || stock.symbol}盘中${directionText}，短线异动信号触发`,
    keywords: ['异动', '资金关注'],
    published_at: `${ymd} ${hhmm}`,
  }
}

/**
 * 构建自选股异动 mock 列表（"包含我自选股的 mock 数据"）。
 * 模板池命中的自选股复用精细文案，未命中的动态生成，最终只保留自选股范围内的条目。
 */
export function buildMockInsights(stocks: FavoriteStock[]): WatchlistInsight[] {
  if (!Array.isArray(stocks)) return []
  return stocks
    .map((stock, idx) => {
      const tpl = templateMap.get(stock.symbol)
      if (tpl) {
        // 复用模板数据，event_id 统一为 mock_insight_<symbol>，便于详情页跳转一致
        return { ...tpl, event_id: `mock_insight_${stock.symbol}` }
      }
      return createInsightForStock(stock, idx)
    })
    .filter(Boolean)
}

/**
 * 按 event_id 查找 mock 洞察（洞察详情页用）。
 * mock 事件来自列表点击，event_id 必在 buildMockInsights 结果内；查不到返回 null 交由真实 API。
 */
export function findMockInsightById(eventId: string, stocks: FavoriteStock[]): WatchlistInsight | null {
  if (!eventId) return null
  return buildMockInsights(stocks).find(item => item.event_id === eventId) || null
}
