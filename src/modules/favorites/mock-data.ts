/**
 * 异动捕手前端 Mock 数据（仅用于产品演示，非真实市场信息）
 *
 * 设计文档：docs/superpowers/specs/2026-08-07-event-catcher-mock-data-design.md
 *
 * 本文件只提供演示数据，不参与任何运行逻辑。前端在接口失败/空数据时
 * 降级回退到本数据（注入点见下方 3 处调用）：
 *
 * 1. AlertContent.vue  loadCaptureList  → 异动捕手模块预览（固定 4 行）
 * 2. monitor.vue       fetchAlerts      → 异动监控页（渲染全部）
 * 3. insight-detail.vue                 → 洞察详情页（按 event_id 匹配）
 *
 * 数据结构与 shared/api/modules/insight.ts 的 WatchlistInsight 对齐。
 */

import type { WatchlistInsight } from '@/shared/api/modules/insight'

/** 异动捕手列表 mock 数据（自选股异动监控，真实 A 股标的，覆盖 confirmed/unconfirmed/归因中三种归因状态） */
export const mockWatchlistInsights: WatchlistInsight[] = [
  {
    event_id: 'mock_insight_001',
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
    event_id: 'mock_insight_002',
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
    event_id: 'mock_insight_003',
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
    event_id: 'mock_insight_004',
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
    event_id: 'mock_insight_005',
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
    event_id: 'mock_insight_006',
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

/**
 * 异动捕手是否强制使用 mock（演示开关）。
 * env 中 VITE_USE_INSIGHTS_MOCK=true 时无条件展示 mock（思维链/归因逻辑未就绪前不展示真实数据）；
 * 后期接真实数据时，将该变量置为 false 即可整体切回真实接口，无需改动组件代码。
 */
export function isInsightsMockForced(): boolean {
  return import.meta.env.VITE_USE_INSIGHTS_MOCK === 'true'
}
