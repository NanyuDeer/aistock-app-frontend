// src/modules/favorites/pages/monitor.mock.ts
// 异动捕手 mock 数据（临时预览用，`?mock=1` 时注入，真实数据保留）
//
// 结构完全对齐后端 stock_trace 链路：
// - StockTraceEvent（价格异动）：覆盖 up/down、涨幅 3.4%/5.2%/7.8%、待归因/归因中/已完成/无可用、
//   有/无 primary_cause、已读/未读、medium/high/critical、有/无 movement_view
// - WatchlistInsight（涨停雷达）：覆盖 confirmed/unconfirmed/未归因、各置信度
//
// 预览完成后可整体删除本文件并去掉 monitor.vue 中的 mock 注入（演示用途，非功能代码）。

import type {
  StockTraceEvent,
  StockTraceAnalysisResponse,
  StockTraceArtifact,
  TraceChain,
  TraceChainNode,
  TraceEvidence,
} from '@/shared/api/modules/stockTrace'
import type { WatchlistInsight } from '@/shared/api/modules/insight'

export function findMockTrace(eventId: string): StockTraceEvent | undefined {
  return mockTraceEvents.find((e) => e.event_id === eventId)
}

export function findMockInsight(eventId: string): WatchlistInsight | undefined {
  return mockInsights.find((e) => e.event_id === eventId)
}

/** 六阶段主因链模板：从 movement_view 合成 artifactJson（仅演示 .pnl 渲染） */
const CHAIN_STAGES: Array<Pick<TraceChainNode, 'stage' | 'epistemicType' | 'status'>> = [
  { stage: 'structural_root', epistemicType: 'hypothesis', status: 'established' },
  { stage: 'trigger', epistemicType: 'fact', status: 'established' },
  { stage: 'transmission', epistemicType: 'inference', status: 'partial' },
  { stage: 'exposure', epistemicType: 'inference', status: 'partial' },
  { stage: 'repricing', epistemicType: 'fact', status: 'established' },
  { stage: 'observable_result', epistemicType: 'fact', status: 'established' },
]

/** 已完成归因：从 movement_view 构建 StockTraceAnalysisResponse（mock 详情页复用） */
export function buildMockAnalysis(ev: StockTraceEvent): StockTraceAnalysisResponse {
  const mv = ev.movement_view
  if (ev.analysis_status === 'unavailable' && ev.unavailable) {
    return {
      event_id: ev.event_id,
      trigger_revision: ev.trigger_revision,
      processing_status: 'unavailable',
      artifact: null,
      unavailable: ev.unavailable,
    }
  }
  // pending / processing / 无 movement_view → 归因中
  if (!mv) {
    return {
      event_id: ev.event_id,
      trigger_revision: ev.trigger_revision,
      processing_status: 'processing',
      artifact: null,
    }
  }
  // completed：合成 artifactJson
  const candidates: NonNullable<StockTraceArtifact['artifactJson']['candidates']> = []
  if (mv.primaryCandidate) candidates.push({ ...mv.primaryCandidate, candidateId: 'primary', rank: 0, counterEvidenceIds: [] })
  mv.alternatives.forEach((alt, i) => candidates.push({ ...alt, candidateId: alt.layer, rank: i + 1, counterEvidenceIds: [] }))

  const primary = candidates[0]
  const nodes: TraceChainNode[] = CHAIN_STAGES.map((s, i) => ({
    nodeId: `node-${i}`,
    stage: s.stage,
    stageOrder: i + 1,
    epistemicType: s.epistemicType,
    status: s.status,
    claim: i === 1 ? (primary?.verdict ?? s.stage) : s.stage,
    evidenceIds: i === 1 ? (primary?.supportingEvidenceIds ?? []) : [],
    counterEvidenceIds: [],
  }))
  const chains: TraceChain[] = [{ chainId: 'chain-primary', candidateId: primary?.candidateId ?? 'primary', role: 'primary', nodes }]

  const evidence_index: TraceEvidence[] = []
  const seen = new Set<string>()
  const primaryVerdict = primary?.verdict ?? '归因结果'
  const allEvidenceIds = [
    ...(primary?.supportingEvidenceIds ?? []),
    ...mv.alternatives.flatMap((a) => a.supportingEvidenceIds),
  ]
  allEvidenceIds.forEach((id) => {
    if (seen.has(id)) return
    seen.add(id)
    evidence_index.push({
      source_id: id,
      kind: 'news',
      provider: '同花顺',
      source_level: 'B',
      title: `mock 归因证据 ${evidence_index.length + 1}`,
      content_excerpt: primaryVerdict,
      canonical_url: '',
      occurred_at: mv.generatedAt,
      captured_at: mv.generatedAt,
      content_hash: id,
    })
  })

  const artifact: StockTraceArtifact = {
    artifactId: mv.artifactId,
    artifactVersion: mv.artifactVersion,
    artifactJson: {
      attribution_status: mv.status,
      confidence: { score: mv.confidenceScore, level: mv.confidenceLevel },
      primary_chain_id: 'chain-primary',
      candidates,
      chains,
      unresolved_questions: mv.unresolvedQuestions,
      suggested_actions: mv.suggestedActions,
      evidence_index,
    },
    movementView: mv,
    createdAt: mv.generatedAt,
  }

  return {
    event_id: ev.event_id,
    trigger_revision: ev.trigger_revision,
    processing_status: 'completed',
    artifact,
  }
}

/** 8 月 21 日 10:35（近端示例时间，仅用于排序/展示） */
const NOW = '2026-08-21T10:35:00+08:00'
/** 分钟偏移辅助：把基础时刻往前推 n 分钟 */
function mins(base: string, n: number): string {
  const d = new Date(base)
  d.setMinutes(d.getMinutes() - n)
  return d.toISOString().slice(0, 19) + '+08:00'
}

export const mockTraceEvents: StockTraceEvent[] = [
  // 1) 涨幅 7.8%，已完成归因，有 primary_cause + movement_view（confirmed），高 severity，未读
  {
    event_id: 'mock-trace-001',
    trigger_revision: 3,
    symbol: '688981',
    stock_name: '中芯国际',
    event_type: 'price',
    direction: 'up',
    triggered_at: mins(NOW, 5),
    latest_price: 68.42,
    previous_close: 63.47,
    change_pct: 7.8,
    threshold_pct: 3,
    severity: 'critical',
    rule_version: 'v2.4',
    analysis_status: 'completed',
    primary_cause: '半导体设备招标提速，机构上调 2026 全年出货预期',
    read_at: null,
    movement_view: {
      schemaVersion: 'movement-view-v2',
      eventId: 'mock-trace-001',
      artifactId: 'art-mock-001',
      artifactVersion: 1,
      status: 'confirmed',
      confidenceScore: 0.86,
      confidenceLevel: 'high',
      primaryCandidate: {
        layer: 'company',
        status: 'supported',
        verdict: '半导体设备招标提速，机构上调 2026 全年出货预期',
        supportingEvidenceIds: ['ev-company-1', 'ev-news-1'],
      },
      alternatives: [
        {
          layer: 'sector',
          status: 'weak',
          verdict: '板块联动，半导体指数同步走强',
          supportingEvidenceIds: ['ev-sector-1'],
        },
        {
          layer: 'market',
          status: 'weak',
          verdict: '大盘资金回流科技成长',
          supportingEvidenceIds: ['ev-market-1'],
        },
        {
          layer: 'capital',
          status: 'rejected',
          verdict: '无异常大单异动',
          supportingEvidenceIds: [],
        },
        {
          layer: 'technical',
          status: 'insufficient',
          verdict: '技术面数据不足',
          supportingEvidenceIds: [],
        },
      ],
      unresolvedQuestions: ['招标落地节奏待验证'],
      suggestedActions: ['跟踪 9 月招标开标公告'],
      evidenceCount: 6,
      generatedAt: mins(NOW, 20),
    },
  },
  // 2) 涨幅 5.2%，归因中（processing），无 primary_cause，high severity，未读
  {
    event_id: 'mock-trace-002',
    trigger_revision: 2,
    symbol: '300750',
    stock_name: '宁德时代',
    event_type: 'price',
    direction: 'up',
    triggered_at: mins(NOW, 32),
    latest_price: 268.9,
    previous_close: 255.61,
    change_pct: 5.2,
    threshold_pct: 5,
    severity: 'high',
    rule_version: 'v2.4',
    analysis_status: 'processing',
    primary_cause: null,
    read_at: null,
    movement_view: null,
  },
  // 3) 跌幅 3.4%，待归因（pending），medium severity，已读
  {
    event_id: 'mock-trace-003',
    trigger_revision: 1,
    symbol: '001267',
    stock_name: '汇绿生态',
    event_type: 'price',
    direction: 'down',
    triggered_at: mins(NOW, 55),
    latest_price: 9.46,
    previous_close: 9.79,
    change_pct: -3.4,
    threshold_pct: 3,
    severity: 'medium',
    rule_version: 'v2.4',
    analysis_status: 'pending',
    primary_cause: null,
    read_at: mins(NOW, 30),
    movement_view: null,
  },
  // 4) 涨幅 7.1%，已完成归因，有 primary_cause，高 severity，已读（历史事件）
  {
    event_id: 'mock-trace-004',
    trigger_revision: 1,
    symbol: '002230',
    stock_name: '科大讯飞',
    event_type: 'price',
    direction: 'up',
    triggered_at: mins(NOW, 95),
    latest_price: 58.2,
    previous_close: 54.34,
    change_pct: 7.1,
    threshold_pct: 5,
    severity: 'high',
    rule_version: 'v2.4',
    analysis_status: 'completed',
    primary_cause: '星火大模型 5.0 发布，多模态能力获市场认可',
    read_at: mins(NOW, 70),
    movement_view: {
      schemaVersion: 'movement-view-v2',
      eventId: 'mock-trace-004',
      artifactId: 'art-mock-004',
      artifactVersion: 1,
      status: 'confirmed',
      confidenceScore: 0.79,
      confidenceLevel: 'medium',
      primaryCandidate: {
        layer: 'company',
        status: 'supported',
        verdict: '星火大模型 5.0 发布，多模态能力获市场认可',
        supportingEvidenceIds: ['ev-company-4'],
      },
      alternatives: [
        { layer: 'sector', status: 'weak', verdict: 'AI 应用板块整体活跃', supportingEvidenceIds: [] },
        { layer: 'market', status: 'rejected', verdict: '大盘无系统性利好', supportingEvidenceIds: [] },
        { layer: 'capital', status: 'weak', verdict: '北向资金净流入', supportingEvidenceIds: ['ev-cap-4'] },
        { layer: 'technical', status: 'weak', verdict: '放量突破 60 日线', supportingEvidenceIds: ['ev-tech-4'] },
      ],
      unresolvedQuestions: [],
      suggestedActions: ['关注大模型商业落地订单'],
      evidenceCount: 5,
      generatedAt: mins(NOW, 60),
    },
  },
  // 5) 跌幅 5.8%，归因结果"原因暂不可用"（unavailable），high severity，未读
  {
    event_id: 'mock-trace-005',
    trigger_revision: 1,
    symbol: '002384',
    stock_name: '东山精密',
    event_type: 'price',
    direction: 'down',
    triggered_at: mins(NOW, 130),
    latest_price: 22.03,
    previous_close: 23.39,
    change_pct: -5.8,
    threshold_pct: 5,
    severity: 'high',
    rule_version: 'v2.4',
    analysis_status: 'unavailable',
    primary_cause: null,
    read_at: null,
    movement_view: null,
    unavailable: {
      code: 'reason_unavailable',
      message: '原因暂不可用',
      triggerFacts: { change_pct: -5.8, snapshotStage: 'enriched' },
    },
  },
  // 6) 跌幅 7.8%（反向大额），已完成归因，有 primary_cause，critical severity，未读
  {
    event_id: 'mock-trace-006',
    trigger_revision: 2,
    symbol: '300750',
    stock_name: '宁德时代',
    event_type: 'price',
    direction: 'down',
    triggered_at: mins(NOW, 180),
    latest_price: 247.5,
    previous_close: 268.42,
    change_pct: -7.8,
    threshold_pct: 5,
    severity: 'critical',
    rule_version: 'v2.4',
    analysis_status: 'completed',
    primary_cause: '储能电池海外订单不及预期，市场担忧竞争加剧',
    read_at: null,
    movement_view: {
      schemaVersion: 'movement-view-v2',
      eventId: 'mock-trace-006',
      artifactId: 'art-mock-006',
      artifactVersion: 1,
      status: 'confirmed',
      confidenceScore: 0.81,
      confidenceLevel: 'high',
      primaryCandidate: {
        layer: 'company',
        status: 'supported',
        verdict: '储能电池海外订单不及预期，市场担忧竞争加剧',
        supportingEvidenceIds: ['ev-news-6'],
      },
      alternatives: [
        { layer: 'sector', status: 'weak', verdict: '锂电板块集体回调', supportingEvidenceIds: [] },
        { layer: 'market', status: 'weak', verdict: '新能源赛道资金撤离', supportingEvidenceIds: [] },
        { layer: 'capital', status: 'weak', verdict: '主力资金净流出', supportingEvidenceIds: ['ev-cap-6'] },
        { layer: 'technical', status: 'insufficient', verdict: '技术面数据不足', supportingEvidenceIds: [] },
      ],
      unresolvedQuestions: ['竞争对手报价细节待确认'],
      suggestedActions: ['跟踪月度装机量数据'],
      evidenceCount: 7,
      generatedAt: mins(NOW, 150),
    },
  },
  // 7) 涨幅 3.1%（贴近 3% 阈值），待归因，medium severity，已读
  {
    event_id: 'mock-trace-007',
    trigger_revision: 1,
    symbol: '001267',
    stock_name: '汇绿生态',
    event_type: 'price',
    direction: 'up',
    triggered_at: mins(NOW, 240),
    latest_price: 10.09,
    previous_close: 9.79,
    change_pct: 3.1,
    threshold_pct: 3,
    severity: 'medium',
    rule_version: 'v2.4',
    analysis_status: 'pending',
    primary_cause: null,
    read_at: mins(NOW, 100),
    movement_view: null,
  },
  // 8) 跌幅 4.5%，已完成归因，无 primary_cause（hypothesis 视图），medium severity，未读
  {
    event_id: 'mock-trace-008',
    trigger_revision: 1,
    symbol: '002230',
    stock_name: '科大讯飞',
    event_type: 'price',
    direction: 'down',
    triggered_at: mins(NOW, 320),
    latest_price: 52.45,
    previous_close: 54.92,
    change_pct: -4.5,
    threshold_pct: 3,
    severity: 'medium',
    rule_version: 'v2.4',
    analysis_status: 'completed',
    primary_cause: null,
    read_at: null,
    movement_view: {
      schemaVersion: 'movement-view-v2',
      eventId: 'mock-trace-008',
      artifactId: 'art-mock-008',
      artifactVersion: 1,
      status: 'hypothesis',
      confidenceScore: 0.45,
      confidenceLevel: 'low',
      primaryCandidate: {
        layer: 'market',
        status: 'weak',
        verdict: 'AI 板块高位震荡，资金获利了结',
        supportingEvidenceIds: ['ev-market-8'],
      },
      alternatives: [
        { layer: 'sector', status: 'insufficient', verdict: '板块数据不足', supportingEvidenceIds: [] },
        { layer: 'company', status: 'insufficient', verdict: '公司公告缺失', supportingEvidenceIds: [] },
        { layer: 'capital', status: 'weak', verdict: '北向资金净流出', supportingEvidenceIds: [] },
        { layer: 'technical', status: 'rejected', verdict: '无技术破位信号', supportingEvidenceIds: [] },
      ],
      unresolvedQuestions: ['下跌主因尚待更多证据'],
      suggestedActions: ['等待晚间公告确认'],
      evidenceCount: 3,
      generatedAt: mins(NOW, 300),
    },
  },
  // 9) 涨幅 5.6%，归因中，high severity，未读（默认 7% 阈值下用户也可见的强异动）
  {
    event_id: 'mock-trace-009',
    trigger_revision: 1,
    symbol: '688981',
    stock_name: '中芯国际',
    event_type: 'price',
    direction: 'up',
    triggered_at: mins(NOW, 400),
    latest_price: 67.12,
    previous_close: 63.56,
    change_pct: 5.6,
    threshold_pct: 7,
    severity: 'high',
    rule_version: 'v2.4',
    analysis_status: 'processing',
    primary_cause: null,
    read_at: null,
    movement_view: null,
  },
]

export const mockInsights: WatchlistInsight[] = [
  // 1) 涨停雷达：已确认，高置信，有主因
  {
    event_id: 'mock-insight-001',
    symbol: '300750',
    stock_name: '宁德时代',
    trade_date: '2026-08-21',
    event_type: 'limit_up_radar',
    direction: 'up',
    change_pct: 10.0,
    attribution_status: 'confirmed',
    confidence: 'high',
    primary_driver: {
      label: '固态电池量产进度超预期',
      category: 'company_event',
      confidence: 'high',
      evidence_quote: '宁德时代宣布固态电池中试线投产',
    },
    secondary_drivers: [
      { label: '锂电产业链景气回升', category: 'industry_theme', confidence: 'medium' },
    ],
    display_report: {
      summary: '固态电池量产进度超预期，带动锂电产业链景气回升。',
    },
    created_at: '2026-08-21T09:58:00+08:00',
    title: '涨停雷达：固态电池量产进度超预期',
    keywords: ['固态电池', '量产'],
  },
  // 2) 涨停雷达：待验证（unconfirmed）
  {
    event_id: 'mock-insight-002',
    symbol: '002230',
    stock_name: '科大讯飞',
    trade_date: '2026-08-20',
    event_type: 'limit_up_radar',
    direction: 'up',
    change_pct: 10.01,
    attribution_status: 'unconfirmed',
    confidence: 'unconfirmed',
    primary_driver: null,
    created_at: '2026-08-20T14:31:00+08:00',
    title: '涨停雷达：主因待验证',
    keywords: ['AI 应用'],
  },
  // 3) 涨停雷达：归因中（attribution_status=null）
  {
    event_id: 'mock-insight-003',
    symbol: '002384',
    stock_name: '东山精密',
    trade_date: '2026-08-19',
    event_type: 'limit_up_radar',
    direction: 'up',
    change_pct: 9.98,
    attribution_status: null,
    confidence: undefined,
    primary_driver: null,
    created_at: '2026-08-19T13:20:00+08:00',
    title: '涨停雷达：归因中',
    keywords: ['消费电子'],
  },
  // 4) 价格异动洞察（midday_price_move，带主因）
  {
    event_id: 'mock-insight-004',
    symbol: '688981',
    stock_name: '中芯国际',
    trade_date: '2026-08-19',
    event_type: 'midday_price_move',
    direction: 'up',
    change_pct: 4.2,
    attribution_status: 'confirmed',
    confidence: 'medium',
    primary_driver: {
      label: '先进制程产能扩张获批',
      category: 'company_event',
      confidence: 'medium',
    },
    display_report: {
      summary: '先进制程产能扩张获批，午后放量上行。',
    },
    created_at: '2026-08-19T13:05:00+08:00',
    title: '午后价格异动：先进制程产能扩张获批',
    keywords: ['先进制程'],
  },
]
