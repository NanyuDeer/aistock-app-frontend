/**
 * 事件传导模块 - Mock 数据
 *
 * 开发阶段使用，提供完整模拟数据集：
 * - 8 条不同类型事件
 * - 分页能力（每页 4 条，共 2 页）
 * - 2 个完整详情案例
 */

import type {
  EventItem,
  EventListResponse,
  EventListParams,
  EventDetailResponse,
  ImpactItem,
  GraphNode,
  GraphConnection,
  EventGraph,
  ImpactVariable,
  AiAnalysisResult,
  HistoryEvent,
  TransmissionAnalysis,
  EventUnderstanding,
  InvestmentSummary,
} from './types'

// ==================== 8 条事件数据 ====================

const ALL_EVENTS: EventItem[] = [
  {
    eventId: 'evt_001',
    title: '新能源汽车补贴政策延续至2027年，单辆车最高补贴1.5万元',
    publishTime: '2026-07-08 09:30',
    source: '新华社',
    newsId: 'news_001',
    eventType: '产业政策',
    importance: 5,
    affectedIndustries: [
      { name: '新能源汽车', impactLevel: 5, sentiment: 'bullish', impactPercentage: 15.0 },
      { name: '动力电池', impactLevel: 5, sentiment: 'bullish', impactPercentage: 12.0 },
      { name: '锂矿', impactLevel: 4, sentiment: 'bullish', impactPercentage: 8.5 },
      { name: '充电桩', impactLevel: 3, sentiment: 'bullish', impactPercentage: 6.0 },
    ],
    aiSummary: '补贴延续至2027年，新能源车产业链需求确定性增强',
    isFollowed: false,
  },
  {
    eventId: 'evt_002',
    title: '美国进一步收紧AI芯片对华出口管制，新增GPU型号受限',
    publishTime: '2026-07-08 08:15',
    source: '路透社',
    newsId: 'news_002',
    eventType: '地缘政治',
    importance: 5,
    affectedIndustries: [
      { name: 'AI芯片', impactLevel: 5, sentiment: 'bearish', impactPercentage: -10.0 },
      { name: '国产替代', impactLevel: 5, sentiment: 'bullish', impactPercentage: 8.0 },
      { name: '半导体设备', impactLevel: 4, sentiment: 'bearish', impactPercentage: -5.0 },
      { name: '算力租赁', impactLevel: 3, sentiment: 'bullish', impactPercentage: 5.5 },
    ],
    aiSummary: '国产AI芯片替代进程有望加速，算力自主可控成为主线',
    isFollowed: false,
  },
  {
    eventId: 'evt_003',
    title: '国家医保局将AI辅助诊断纳入医保支付试点范围',
    publishTime: '2026-07-07 15:00',
    source: '证券时报',
    newsId: 'news_003',
    eventType: '产业政策',
    importance: 4,
    affectedIndustries: [
      { name: '智慧医疗', impactLevel: 5, sentiment: 'bullish', impactPercentage: 10.0 },
      { name: '医疗信息化', impactLevel: 4, sentiment: 'bullish', impactPercentage: 7.0 },
      { name: 'AI制药', impactLevel: 3, sentiment: 'bullish', impactPercentage: 5.0 },
    ],
    aiSummary: '医疗AI商业化落地拐点到来，智慧医疗赛道加速成长',
    isFollowed: false,
  },
  {
    eventId: 'evt_004',
    title: '人形机器人产业专项支持政策正式发布，规划千亿产值目标',
    publishTime: '2026-07-07 10:30',
    source: '工信部官网',
    newsId: 'news_004',
    eventType: '产业政策',
    importance: 4,
    affectedIndustries: [
      { name: '机器人', impactLevel: 5, sentiment: 'bullish', impactPercentage: 12.0 },
      { name: '减速器', impactLevel: 4, sentiment: 'bullish', impactPercentage: 9.0 },
      { name: '工业自动化', impactLevel: 4, sentiment: 'bullish', impactPercentage: 7.5 },
      { name: '传感器', impactLevel: 3, sentiment: 'bullish', impactPercentage: 6.0 },
      { name: '伺服电机', impactLevel: 3, sentiment: 'bullish', impactPercentage: 5.0 },
    ],
    aiSummary: '人形机器人产业顶层设计落地，核心零部件需求爆发在即',
    isFollowed: false,
  },
  {
    eventId: 'evt_005',
    title: '国产大模型在推理能力和成本控制上取得重大突破',
    publishTime: '2026-07-06 14:20',
    source: '科技日报',
    newsId: 'news_005',
    eventType: '技术突破',
    importance: 5,
    affectedIndustries: [
      { name: '人工智能', impactLevel: 5, sentiment: 'bullish', impactPercentage: 15.0 },
      { name: '云计算', impactLevel: 4, sentiment: 'bullish', impactPercentage: 8.0 },
      { name: '数据中心', impactLevel: 3, sentiment: 'bullish', impactPercentage: 6.0 },
    ],
    aiSummary: '大模型能力跃升推动AI应用大规模落地，算力需求持续增长',
    isFollowed: false,
  },
  {
    eventId: 'evt_006',
    title: '新能源汽车动力电池价格持续下行，龙头企业毛利率承压',
    publishTime: '2026-07-06 11:00',
    source: '财联社',
    newsId: 'news_006',
    eventType: '市场动态',
    importance: 3,
    affectedIndustries: [
      { name: '动力电池', impactLevel: 4, sentiment: 'bearish', impactPercentage: -8.0 },
      { name: '锂材料', impactLevel: 4, sentiment: 'bearish', impactPercentage: -10.0 },
      { name: '新能源车', impactLevel: 3, sentiment: 'bullish', impactPercentage: 5.0 },
    ],
    aiSummary: '电池降价利好下游整车，但上游锂材料短期承压明显',
    isFollowed: false,
  },
  {
    eventId: 'evt_007',
    title: '某大型互联网企业发布AI商业化应用战略，宣布全面拥抱大模型',
    publishTime: '2026-07-05 16:45',
    source: '公司公告',
    newsId: 'news_007',
    eventType: '公司公告',
    importance: 3,
    affectedIndustries: [
      { name: 'AI应用', impactLevel: 4, sentiment: 'bullish', impactPercentage: 8.0 },
      { name: '软件服务', impactLevel: 3, sentiment: 'bullish', impactPercentage: 6.0 },
      { name: '云计算', impactLevel: 3, sentiment: 'bullish', impactPercentage: 5.0 },
    ],
    aiSummary: '互联网巨头入局加速AI应用生态构建，软件服务行业受益',
    isFollowed: true,
  },
  {
    eventId: 'evt_008',
    title: '金融监管部门出台资本市场AI应用规范，明确算法交易监管红线',
    publishTime: '2026-07-05 09:00',
    source: '证监会官网',
    newsId: 'news_008',
    eventType: '监管变化',
    importance: 4,
    affectedIndustries: [
      { name: '金融科技', impactLevel: 4, sentiment: 'neutral', impactPercentage: 2.0 },
      { name: '证券IT', impactLevel: 3, sentiment: 'neutral', impactPercentage: 1.5 },
      { name: '数据服务', impactLevel: 3, sentiment: 'bullish', impactPercentage: 5.0 },
    ],
    aiSummary: 'AI应用规范短期偏中性，但数据服务合规需求提升利好龙头',
    isFollowed: false,
  },
]

// ==================== 分页模拟函数 ====================

/**
 * 模拟事件列表接口
 *
 * @param params.page - 页码，从 1 开始
 * @param params.pageSize - 每页条数，默认 4
 * @param params.type - 分类筛选（当前版本全部返回）
 * @param params.followedOnly - 仅已关注
 */
export function mockEventList(params: EventListParams = {}): EventListResponse {
  const page = params.page ?? 1
  const pageSize = params.pageSize ?? 4

  // 筛选（分页前过滤）
  let filtered = [...ALL_EVENTS]
  if (params.eventType) {
    filtered = filtered.filter(e => e.eventType === params.eventType)
  }
  if (params.followedOnly) {
    filtered = filtered.filter(e => e.isFollowed)
  }

  const total = filtered.length
  const totalPages = Math.ceil(total / pageSize)
  const start = (page - 1) * pageSize
  const end = start + pageSize
  const events = filtered.slice(start, end)

  return {
    events,
    total,
    page,
    pageSize,
    hasMore: page < totalPages,
  }
}

// ==================== 详情 Mock 数据 ====================

/** AI 推演影响的辅助函数 */
function makeImpacts(eventType: string): ImpactItem[] {
  if (eventType === '产业政策') {
    return [
      { level: 1, levelLabel: '一级影响', industry: '新能源汽车', rating: 5, impactPercentage: 15.0, sentiment: 'bullish' },
      { level: 2, levelLabel: '二级影响', industry: '动力电池', rating: 5, impactPercentage: 12.0, sentiment: 'bullish' },
      { level: 3, levelLabel: '三级影响', industry: '锂矿', rating: 4, impactPercentage: 8.5, sentiment: 'bullish' },
      { level: 4, levelLabel: '四级影响', industry: '充电桩', rating: 3, impactPercentage: 6.0, sentiment: 'bullish' },
    ]
  }
  return [
    { level: 1, levelLabel: '一级影响', industry: 'AI芯片', rating: 5, impactPercentage: -10.0, sentiment: 'bearish' },
    { level: 2, levelLabel: '二级影响', industry: '国产替代', rating: 5, impactPercentage: 8.0, sentiment: 'bullish' },
    { level: 3, levelLabel: '三级影响', industry: '半导体设备', rating: 4, impactPercentage: -5.0, sentiment: 'bearish' },
    { level: 4, levelLabel: '四级影响', industry: '算力租赁', rating: 3, impactPercentage: 5.5, sentiment: 'bullish' },
  ]
}

/** 产业链图谱辅助函数 */
function makeGraph(eventType: string): EventGraph {
  const eventNode: GraphNode = { nodeId: 'node_event', name: '政策发布', type: 'event', position: { x: 200, y: 20 } }
  if (eventType === '产业政策') {
    const nodes: GraphNode[] = [
      eventNode,
      { nodeId: 'node_core1', name: '新能源汽车', type: 'core', position: { x: 200, y: 100 } },
      { nodeId: 'node_core2', name: '动力电池', type: 'core', position: { x: 200, y: 170 } },
      { nodeId: 'node_up1', name: '锂矿', type: 'upstream', position: { x: 50, y: 170 } },
      { nodeId: 'node_up2', name: '铜材料', type: 'upstream', position: { x: 50, y: 240 } },
      { nodeId: 'node_down1', name: '充电桩', type: 'downstream', position: { x: 350, y: 140 } },
      { nodeId: 'node_down2', name: '智能驾驶', type: 'downstream', position: { x: 350, y: 210 } },
    ]
    const connections: GraphConnection[] = [
      { fromNodeId: 'node_event', toNodeId: 'node_core1', strength: 1.0 },
      { fromNodeId: 'node_event', toNodeId: 'node_core2', strength: 0.9 },
      { fromNodeId: 'node_up1', toNodeId: 'node_core2', strength: 0.75 },
      { fromNodeId: 'node_up2', toNodeId: 'node_core1', strength: 0.52 },
      { fromNodeId: 'node_core1', toNodeId: 'node_down1', strength: 0.45 },
      { fromNodeId: 'node_core1', toNodeId: 'node_down2', strength: 0.38 },
    ]
    return { nodes, connections }
  }
  // 地缘政治默认链路
  const nodes: GraphNode[] = [
    eventNode,
    { nodeId: 'node_core1', name: 'AI芯片', type: 'core', position: { x: 200, y: 100 } },
    { nodeId: 'node_core2', name: '国产替代', type: 'core', position: { x: 200, y: 170 } },
    { nodeId: 'node_up1', name: '半导体设备', type: 'upstream', position: { x: 50, y: 140 } },
    { nodeId: 'node_down1', name: '算力租赁', type: 'downstream', position: { x: 350, y: 140 } },
    { nodeId: 'node_down2', name: 'AI应用', type: 'downstream', position: { x: 350, y: 210 } },
  ]
  const connections: GraphConnection[] = [
    { fromNodeId: 'node_event', toNodeId: 'node_core1', strength: 1.0 },
    { fromNodeId: 'node_event', toNodeId: 'node_core2', strength: 0.85 },
    { fromNodeId: 'node_up1', toNodeId: 'node_core1', strength: 0.70 },
    { fromNodeId: 'node_core2', toNodeId: 'node_down1', strength: 0.50 },
    { fromNodeId: 'node_core2', toNodeId: 'node_down2', strength: 0.40 },
  ]
  return { nodes, connections }
}

/** 影响变量辅助函数 */
function makeVariables(eventType: string): ImpactVariable[] {
  if (eventType === '产业政策') {
    return [
      { name: '补贴金额', strength: 0.9, sentiment: 'bullish' },
      { name: '政策延续性', strength: 0.85, sentiment: 'bullish' },
      { name: '行业竞争格局', strength: 0.6, sentiment: 'neutral' },
      { name: '原材料价格', strength: 0.4, sentiment: 'bearish' },
    ]
  }
  return [
    { name: '出口管制力度', strength: 0.9, sentiment: 'bearish' },
    { name: '国产替代速度', strength: 0.8, sentiment: 'bullish' },
    { name: '算力需求增长', strength: 0.7, sentiment: 'bullish' },
    { name: '国际关系变化', strength: 0.5, sentiment: 'neutral' },
  ]
}

/** AI 分析辅助函数 */
function makeAnalysis(eventType: string): AiAnalysisResult {
  if (eventType === '产业政策') {
    return {
      persistence: '长期(1月+)',
      persistenceReason:
        '新能源汽车补贴政策延续至2027年，时间跨度长、金额明确，将长期稳定产业预期。政策传导路径清晰：补贴→终端销量增长→电池装机量提升→上游锂矿需求增加→下游充电桩配套加速。各环节均有明确受益逻辑，预计持续性较强。',
      heatTransfer: true,
      transferDirection: '政策发布→整车制造→动力电池→锂矿材料→充电桩配套',
      transferReason:
        '补贴政策从整车端开始传导，先拉动终端消费，再向上游动力电池传导，进一步扩散至最上游锂矿原材料。下游充电桩作为配套设施也将受益于新能源车保有量提升。传导系数整车→电池0.9、电池→锂矿0.75',
      riskWarning: '需关注补贴执行细则发布时间和实际退坡节奏，以及地方政府配套政策力度差异',
    }
  }
  return {
    persistence: '中期(1-2周)',
    persistenceReason:
      '美国AI芯片出口管制政策影响深远，短期市场情绪波动较大。但国产替代进程已进入加速期，中长期看国内AI芯片企业和半导体设备厂商将受益于自主可控趋势。管制力度可能随国际关系变化有所调整，需持续跟踪政策动态。',
    heatTransfer: true,
    transferDirection: '出口管制→AI芯片供应受限→国产替代加速→半导体设备需求↑→算力租赁涨价→AI应用成本↑',
    transferReason:
      '出口管制直接限制高端AI芯片供给，短期利空AI芯片进口依赖型企业，但中长期利好国产芯片和半导体设备厂商。下游算力租赁价格可能因供给受限而上涨，最终传导至AI应用开发成本。',
    riskWarning: '若管制政策出现松动或中美关系缓和，国产替代短期逻辑可能受到冲击',
  }
}

/** 历史事件辅助函数 */
function makeHistory(eventType: string): HistoryEvent[] {
  if (eventType === '产业政策') {
    return [
      {
        historyId: 'hist_001',
        year: '2023',
        title: '新能源补贴退坡20%',
        eventType: '产业政策',
        sentiment: 'bearish',
        industryChange: '汽车整车下跌8.5%，动力电池下跌5.6%',
        changePercentage: -5.6,
      },
      {
        historyId: 'hist_002',
        year: '2021',
        title: '新能源车免征购置税政策延续',
        eventType: '产业政策',
        sentiment: 'bullish',
        industryChange: '汽车整车上涨12%，动力电池上涨15%',
        changePercentage: 12.0,
      },
      {
        historyId: 'hist_003',
        year: '2020',
        title: '新能源汽车产业发展规划发布',
        eventType: '产业政策',
        sentiment: 'bullish',
        industryChange: '汽车整车上涨18%，锂矿上涨25%',
        changePercentage: 18.0,
      },
    ]
  }
  return [
    {
      historyId: 'hist_004',
      year: '2022',
      title: '美国对华芯片出口管制升级',
      eventType: '地缘政治',
      sentiment: 'bearish',
      industryChange: '半导体设备下跌12%，国产替代概念上涨6%',
      changePercentage: -8.0,
    },
    {
      historyId: 'hist_005',
      year: '2020',
      title: '华为被列入实体清单，芯片供应受限',
      eventType: '地缘政治',
      sentiment: 'bearish',
      industryChange: '半导体行业整体下跌15%，但国产设备上涨10%',
      changePercentage: -10.0,
    },
    {
      historyId: 'hist_006',
      year: '2019',
      title: '日韩半导体材料贸易争端',
      eventType: '地缘政治',
      sentiment: 'neutral',
      industryChange: '国产替代概念短期炒作后回落，整体上涨3%',
      changePercentage: 3.0,
    },
  ]
}

/** 详情数据 Map */
const EVENT_DETAIL_MAP: Record<string, EventDetailResponse> = {
  evt_001: {
    eventId: 'evt_001',
    event: ALL_EVENTS[0],
    impacts: makeImpacts('产业政策'),
    graph: makeGraph('产业政策'),
    impactVariables: makeVariables('产业政策'),
    aiAnalysis: makeAnalysis('产业政策'),
    historyEvents: makeHistory('产业政策'),
    transmissionAnalysis: makeTransmission('evt_001'),
    eventUnderstanding: makeUnderstanding('evt_001'),
    investmentSummary: makeSummary('evt_001'),
  },
  evt_002: {
    eventId: 'evt_002',
    event: ALL_EVENTS[1],
    impacts: makeImpacts('地缘政治'),
    graph: makeGraph('地缘政治'),
    impactVariables: makeVariables('地缘政治'),
    aiAnalysis: makeAnalysis('地缘政治'),
    historyEvents: makeHistory('地缘政治'),
    transmissionAnalysis: makeTransmission('evt_002'),
    eventUnderstanding: makeUnderstanding('evt_002'),
    investmentSummary: makeSummary('evt_002'),
  },
}

/**
 * 模拟事件详情接口
 *
 * @param eventId - 事件ID
 */
export function mockEventDetail(eventId: string): EventDetailResponse | null {
  // 先查找已有详情
  if (EVENT_DETAIL_MAP[eventId]) {
    return EVENT_DETAIL_MAP[eventId]
  }

  // 兜底：用事件列表中找到的事件 + 产业政策模板生成
  const event = ALL_EVENTS.find(e => e.eventId === eventId)
  if (!event) return null

  return {
    eventId: event.eventId,
    event,
    impacts: makeImpacts(event.eventType),
    graph: makeGraph(event.eventType),
    impactVariables: makeVariables(event.eventType),
    aiAnalysis: makeAnalysis(event.eventType),
    historyEvents: makeHistory(event.eventType),
    transmissionAnalysis: makeTransmission(event.eventId),
    eventUnderstanding: makeUnderstanding(event.eventId),
    investmentSummary: makeSummary(event.eventId),
  }
}

/**
 * 模拟图谱数据接口
 */
export function mockEventGraph(eventId: string): EventGraph | null {
  const detail = mockEventDetail(eventId)
  return detail?.graph ?? null
}

// ==================== AI 影响传导分析 Mock ====================

/** 为每条事件生成独立的 AI 影响传导分析 */
function makeTransmission(eventId: string): TransmissionAnalysis {
  switch (eventId) {
    case 'evt_001': return transmissionEvt001()
    case 'evt_002': return transmissionEvt002()
    case 'evt_003': return transmissionEvt003()
    case 'evt_004': return transmissionEvt004()
    case 'evt_005': return transmissionEvt005()
    case 'evt_006': return transmissionEvt006()
    case 'evt_007': return transmissionEvt007()
    case 'evt_008': return transmissionEvt008()
    default: return transmissionDefault(eventId)
  }
}

// ===== evt_001: 新能源汽车补贴政策延续 =====
function transmissionEvt001(): TransmissionAnalysis {
  return {
    eventId: 'evt_001',
    mechanism: '财政补贴通过降低消费者购置成本直接刺激终端需求，需求增长向上游传导至动力电池和原材料环节。补贴延续至2027年消除了政策不确定性，企业可据此安排长期产能规划，形成"政策预期稳定→产能扩张→成本下降→需求进一步释放"的正反馈循环。',
    variables: [
      { name: '补贴金额', direction: 'bullish', strength: 0.9, explanation: '单辆最高1.5万元直接降低购车门槛，刺激终端消费意愿' },
      { name: '政策延续时间', direction: 'bullish', strength: 0.85, explanation: '延续至2027年消除了短期退坡担忧，稳定产业链长期投资预期' },
      { name: '锂矿供给', direction: 'neutral', strength: 0.55, explanation: '上游原材料扩产周期长，短期供给弹性有限，价格可能先涨后稳' },
      { name: '行业竞争格局', direction: 'bullish', strength: 0.6, explanation: '补贴延续有利于头部车企巩固市场份额，加速落后产能出清' },
    ],
    coreIndustry: {
      name: '新能源汽车',
      impact: '直接利好，终端销量预期上调15%',
      reason: '补贴延续直接降低了消费者购车成本，预计2026-2027年新能源车渗透率将从41%提升至50%以上',
    },
    chain: [
      { industry: '新能源汽车', relation: '核心行业', level: 1, direction: 'bullish', impactStrength: 1.0, reason: '补贴直接刺激终端消费，销量确定性增长' },
      { industry: '动力电池', relation: '上游传导', level: 2, direction: 'bullish', impactStrength: 0.9, reason: '整车销量增长直接拉动电池装机需求，头部电池厂产能利用率将提升' },
      { industry: '锂矿', relation: '上游传导', level: 3, direction: 'bullish', impactStrength: 0.75, reason: '电池扩产传导至锂资源需求，碳酸锂价格有望企稳回升' },
      { industry: '充电桩', relation: '下游配套', level: 2, direction: 'bullish', impactStrength: 0.45, reason: '新能源车保有量增加推升充电基础设施需求，但弹性弱于上游' },
    ],
  }
}

// ===== evt_002: 美国AI芯片对华出口管制 =====
function transmissionEvt002(): TransmissionAnalysis {
  return {
    eventId: 'evt_002',
    mechanism: '出口管制通过限制高端芯片供给产生双重效应：短期冲击依赖进口的AI芯片需求端，同时催化国产替代进程加速。管制政策打破原有的全球分工格局，迫使国内企业重新配置供应链资源，中长期看将推动国内半导体产业自主化，但短期面临技术迭代压力和成本上升。',
    variables: [
      { name: '管制范围', direction: 'bearish', strength: 0.9, explanation: '新增GPU型号受限进一步收紧供给，短期冲击程度取决于管制名单覆盖范围' },
      { name: '国产替代进度', direction: 'bullish', strength: 0.8, explanation: '倒逼国内芯片企业加速研发，政策支持和资金倾斜将推升国产芯片市占率' },
      { name: '算力成本', direction: 'bearish', strength: 0.7, explanation: '供给受限推高算力租赁价格，AI应用开发成本上升' },
      { name: '国际关系变化', direction: 'neutral', strength: 0.5, explanation: '中美关系走向将决定管制政策的持续性和力度，不确定性较大' },
    ],
    coreIndustry: {
      name: 'AI芯片',
      impact: '短期利空，中长期利好国产替代',
      reason: '进口受限导致高端芯片供应缺口扩大，但政策驱动下的国产替代需求将快速释放，形成"短期阵痛-中期替代-长期自主"的路径',
    },
    chain: [
      { industry: 'AI芯片', relation: '核心行业', level: 1, direction: 'bearish', impactStrength: 1.0, reason: '进口芯片供给受限，国内AI芯片企业面临短期调整' },
      { industry: '国产替代', relation: '替代传导', level: 1, direction: 'bullish', impactStrength: 0.85, reason: '政策驱动国内芯片企业填补供给缺口，国产替代进入加速期' },
      { industry: '半导体设备', relation: '上游传导', level: 2, direction: 'bearish', impactStrength: 0.7, reason: '管制间接影响设备进口和技术合作，短期承压' },
      { industry: '算力租赁', relation: '下游传导', level: 2, direction: 'bullish', impactStrength: 0.5, reason: '芯片短缺推高算力价格，租赁企业短期受益于涨价' },
    ],
  }
}

// ===== evt_003: AI辅助诊断纳入医保 =====
function transmissionEvt003(): TransmissionAnalysis {
  return {
    eventId: 'evt_003',
    mechanism: '医保支付政策的突破从根本上解决了医疗AI的商业变现难题。从"技术可行"到"医保买单"的跨越，将推动医院大规模采购AI诊断系统，形成"医保覆盖→需求释放→规模化部署→数据积累→算法优化"的飞轮效应。',
    variables: [
      { name: '医保覆盖范围', direction: 'bullish', strength: 0.9, explanation: '10省市试点覆盖约4亿人口，按此规模计算将直接拉动百亿级市场需求' },
      { name: '技术准入标准', direction: 'bullish', strength: 0.7, explanation: '三类器械认证门槛提高了行业集中度，利好已获证头部企业' },
      { name: '医院采购意愿', direction: 'bullish', strength: 0.8, explanation: '医保支付解决了医院采购的经费来源问题，推动从观望到行动的转变' },
    ],
    coreIndustry: {
      name: '智慧医疗',
      impact: '重大利好，商业化拐点到来',
      reason: '医保纳入是医疗AI从"概念验证"到"规模化营收"的关键一步，试点城市的三甲医院将率先启动采购流程',
    },
    chain: [
      { industry: '智慧医疗', relation: '核心行业', level: 1, direction: 'bullish', impactStrength: 1.0, reason: '医保支付解决商业化瓶颈，AI诊断企业进入高速增长期' },
      { industry: '医疗信息化', relation: '基础设施', level: 2, direction: 'bullish', impactStrength: 0.7, reason: 'AI诊断部署需要信息化系统升级改造，带动HIS/PACS等系统需求' },
      { industry: 'AI制药', relation: '延伸领域', level: 3, direction: 'bullish', impactStrength: 0.5, reason: '诊断AI的验证路径和商业模式为药物研发AI提供了参考范本' },
    ],
  }
}

// ===== evt_004: 人形机器人产业专项政策 =====
function transmissionEvt004(): TransmissionAnalysis {
  return {
    eventId: 'evt_004',
    mechanism: '专项政策通过设定千亿产值目标为产业提供明确的增长预期，吸引资本和人才涌入。政策支持从研发补贴、示范应用、标准制定三个维度同时发力，推动人形机器人从实验室走向产业化。机器人整机需求爆发将沿"整机→核心零部件→上游材料"路径层层传导。',
    variables: [
      { name: '产值目标', direction: 'bullish', strength: 0.9, explanation: '千亿级别目标为产业链各环节提供了确定的增长空间和投资逻辑' },
      { name: '核心零部件国产率', direction: 'bullish', strength: 0.8, explanation: '减速器、伺服电机等核心部件的国产替代需求迫切，国内企业面临重大机遇' },
      { name: '应用场景落地', direction: 'bullish', strength: 0.7, explanation: '制造业、医疗、家庭服务等场景的示范应用将验证商业可行性' },
      { name: '传感器技术', direction: 'bullish', strength: 0.65, explanation: '人形机器人对力矩传感器、视觉传感器的需求远超工业机器人' },
    ],
    coreIndustry: {
      name: '机器人',
      impact: '重大利好，产业进入加速成长期',
      reason: '专项政策明确了人形机器人作为"未来产业"的战略地位，千亿产值目标将带动上下游投资超万亿',
    },
    chain: [
      { industry: '机器人', relation: '核心行业', level: 1, direction: 'bullish', impactStrength: 1.0, reason: '政策顶层设计明确产业方向，整机企业受益于研发补贴和市场预期提升' },
      { industry: '减速器', relation: '上游传导', level: 2, direction: 'bullish', impactStrength: 0.9, reason: '减速器占机器人成本约30%，整机放量直接拉动需求' },
      { industry: '伺服电机', relation: '上游传导', level: 2, direction: 'bullish', impactStrength: 0.8, reason: '高精度伺服电机是人形机器人的核心驱动部件，技术壁垒高' },
      { industry: '传感器', relation: '上游传导', level: 2, direction: 'bullish', impactStrength: 0.7, reason: '人形机器人传感器用量是工业机器人的3-5倍' },
      { industry: '工业自动化', relation: '延伸领域', level: 3, direction: 'bullish', impactStrength: 0.55, reason: '人形机器人技术外溢将提升工业自动化整体水平' },
    ],
  }
}

// ===== evt_005: 国产大模型重大突破 =====
function transmissionEvt005(): TransmissionAnalysis {
  return {
    eventId: 'evt_005',
    mechanism: '大模型推理能力和成本控制的双重突破，本质上是将AI的使用门槛从"大企业专属"降低到"中小企业可用"。推理成本下降意味着AI应用的边际成本大幅降低，将催生大量基于大模型的行业应用创新，形成"技术突破→应用爆发→算力需求↑→基础设施投资↑"的正循环。',
    variables: [
      { name: '推理成本', direction: 'bullish', strength: 0.95, explanation: '推理成本下降是AI大规模商用的关键前提，降幅超出市场预期' },
      { name: '模型能力', direction: 'bullish', strength: 0.9, explanation: '推理能力突破意味着AI可以承担更复杂的商业任务，拓宽应用边界' },
      { name: '算力需求', direction: 'bullish', strength: 0.8, explanation: '应用规模扩大将推动算力需求指数级增长，利好数据中心和云计算' },
    ],
    coreIndustry: {
      name: '人工智能',
      impact: '重大利好，AI应用进入规模化落地阶段',
      reason: '技术突破解决了AI商业化的两个核心瓶颈——成本和效果，将推动AI应用渗透率从当前的不足10%大幅提升',
    },
    chain: [
      { industry: '人工智能', relation: '核心行业', level: 1, direction: 'bullish', impactStrength: 1.0, reason: '大模型能力跃升直接提升AI产业整体竞争力' },
      { industry: '云计算', relation: '基础设施', level: 2, direction: 'bullish', impactStrength: 0.8, reason: 'AI应用爆发需要大规模云计算资源支撑，云服务商受益' },
      { industry: '数据中心', relation: '基础设施', level: 2, direction: 'bullish', impactStrength: 0.7, reason: '算力需求增长驱动数据中心扩容和升级改造' },
    ],
  }
}

// ===== evt_006: 动力电池价格下行 =====
function transmissionEvt006(): TransmissionAnalysis {
  return {
    eventId: 'evt_006',
    mechanism: '动力电池价格持续下行反映了上游锂材料产能过剩与下游整车降价压力的双重传导。锂材料供给过剩是价格下行的根本原因，而整车企业降价压力进一步压缩了电池环节的利润空间。价格下行呈现"上游原材料→中游电池→下游整车"的非对称传导特征：上游受损最严重，下游受益最明显。',
    variables: [
      { name: '锂材料产能', direction: 'bearish', strength: 0.9, explanation: '全球锂矿扩产周期叠加需求增速放缓，供过于求格局短期难以改变' },
      { name: '电池毛利率', direction: 'bearish', strength: 0.8, explanation: '价格战压缩利润空间，二三线电池企业面临生存压力' },
      { name: '整车成本', direction: 'bullish', strength: 0.7, explanation: '电池降价降低整车制造成本，车企盈利能力改善' },
    ],
    coreIndustry: {
      name: '动力电池',
      impact: '利润承压，行业洗牌加速',
      reason: '电池价格下行叠加原材料价格波动，行业毛利率从25%下滑至15%以下，龙头企业通过规模优势维持盈利，中小企业面临出清风险',
    },
    chain: [
      { industry: '动力电池', relation: '核心行业', level: 1, direction: 'bearish', impactStrength: 1.0, reason: '价格持续下行，企业毛利率承压，行业进入洗牌期' },
      { industry: '锂材料', relation: '上游传导', level: 2, direction: 'bearish', impactStrength: 0.9, reason: '碳酸锂价格从高点回落超60%，锂矿企业利润大幅缩水' },
      { industry: '新能源车', relation: '下游传导', level: 2, direction: 'bullish', impactStrength: 0.55, reason: '电池降本有利于整车企业控制成本，但需警惕降价传导至终端价格战' },
    ],
  }
}

// ===== evt_007: 互联网企业发布AI商业化战略 =====
function transmissionEvt007(): TransmissionAnalysis {
  return {
    eventId: 'evt_007',
    mechanism: '大型互联网企业全面拥抱大模型的战略转型，本质上是将已有的用户生态和数据优势与AI能力相结合。互联网巨头的入局将加速AI应用的商业化进程：一方面通过自有场景验证AI产品价值，另一方面通过开放平台降低中小企业的AI接入成本，形成"平台赋能→生态繁荣→数据积累→模型优化"的增强循环。',
    variables: [
      { name: '平台生态规模', direction: 'bullish', strength: 0.85, explanation: '互联网企业拥有亿级用户和丰富的应用场景，AI产品触达效率极高' },
      { name: '开发者生态', direction: 'bullish', strength: 0.75, explanation: '开放AI能力将吸引大量开发者在平台上构建行业应用' },
      { name: '行业竞争', direction: 'neutral', strength: 0.6, explanation: '巨头入局加剧行业竞争，中小AI企业面临差异化挑战' },
    ],
    coreIndustry: {
      name: 'AI应用',
      impact: '重大利好，应用生态加速构建',
      reason: '互联网巨头拥有用户场景和分发渠道优势，AI商业化战略将大幅加速AI应用在各行业的渗透',
    },
    chain: [
      { industry: 'AI应用', relation: '核心行业', level: 1, direction: 'bullish', impactStrength: 1.0, reason: '互联网企业大模型战略直接推动AI应用层繁荣' },
      { industry: '软件服务', relation: '赋能传导', level: 2, direction: 'bullish', impactStrength: 0.7, reason: 'AI能力融入企业软件，提升软件产品价值和客单价' },
      { industry: '云计算', relation: '基础设施', level: 2, direction: 'bullish', impactStrength: 0.6, reason: 'AI应用部署需要云资源支撑，云服务用量将显著增长' },
    ],
  }
}

// ===== evt_008: 资本市场AI应用规范出台 =====
function transmissionEvt008(): TransmissionAnalysis {
  return {
    eventId: 'evt_008',
    mechanism: '监管规范的出台对金融AI行业产生"短期合规成本上升，中长期竞争格局优化"的双重效应。规范明确了算法交易的监管红线，短期可能导致部分AI策略暂停整改，但中长期看合规门槛将提升行业集中度，利好已具备完善合规体系的头部金融科技企业。数据服务的合规需求反而成为新的增长点。',
    variables: [
      { name: '合规要求', direction: 'neutral', strength: 0.75, explanation: '算法交易监管红线明确，短期增加企业合规成本，但消除了政策不确定性' },
      { name: '行业集中度', direction: 'bullish', strength: 0.65, explanation: '合规门槛提高有利于头部企业，中小机构可能因合规成本退出市场' },
      { name: '数据服务需求', direction: 'bullish', strength: 0.7, explanation: '合规要求推升对合规数据、风险监测系统的需求' },
    ],
    coreIndustry: {
      name: '金融科技',
      impact: '短期中性偏积极，中长期利好',
      reason: '短期面临策略调整和合规成本，但规范发布消除了政策不确定性，合规能力强的头部企业将获得竞争优势',
    },
    chain: [
      { industry: '金融科技', relation: '核心行业', level: 1, direction: 'neutral', impactStrength: 1.0, reason: '监管规范短期带来调整压力，但明确了行业发展方向' },
      { industry: '证券IT', relation: '赋能传导', level: 2, direction: 'neutral', impactStrength: 0.55, reason: '券商需要升级AI交易系统以满足合规要求，短期IT投入增加' },
      { industry: '数据服务', relation: '延伸领域', level: 2, direction: 'bullish', impactStrength: 0.65, reason: '合规需求创造新的数据服务市场，数据标注和风险监测需求增长' },
    ],
  }
}

/** 兜底模板 */
function transmissionDefault(eventId: string): TransmissionAnalysis {
  return {
    eventId,
    mechanism: '该事件通过市场预期调整机制传导至相关行业，影响程度取决于事件持续性和政策配套。具体传导路径需结合事件类型和行业关联度进一步分析。',
    variables: [
      { name: '事件持续性', direction: 'neutral', strength: 0.7, explanation: '事件持续时间是决定影响深度的关键因素' },
      { name: '行业关联度', direction: 'neutral', strength: 0.6, explanation: '行业与事件的关联程度决定了传导效率' },
    ],
    coreIndustry: {
      name: '相关行业',
      impact: '影响待评估',
      reason: '需获取更多事件信息后进行详细分析',
    },
    chain: [
      { industry: '核心行业', relation: '核心行业', level: 1, direction: 'neutral', impactStrength: 1.0, reason: '事件首先冲击与事件直接相关的核心行业' },
    ],
  }
}

// ==================== 事件理解 Mock ====================

function makeUnderstanding(eventId: string): EventUnderstanding {
  switch (eventId) {
    case 'evt_001': return understandingEvt001()
    case 'evt_002': return understandingEvt002()
    case 'evt_003': return understandingEvt003()
    case 'evt_004': return understandingEvt004()
    case 'evt_005': return understandingEvt005()
    case 'evt_006': return understandingEvt006()
    case 'evt_007': return understandingEvt007()
    case 'evt_008': return understandingEvt008()
    default: return understandingDefault()
  }
}

function understandingEvt001(): EventUnderstanding {
  return {
    summary: '新能源汽车补贴政策延续至2027年，通过财政激励降低消费者购车成本，直接拉动新能源车终端需求，并向上游动力电池、锂矿和下游充电桩产业链传导。',
    coreChanges: [
      { variable: '政策预期', before: '2026年补贴到期不确定性', after: '明确延续至2027年' },
      { variable: '消费者购车成本', before: '补贴退坡后购车门槛上升', after: '单车最高补贴1.5万元' },
      { variable: '行业产能规划', before: '政策到期前谨慎扩产', after: '长期产能规划可落地' },
    ],
  }
}

function understandingEvt002(): EventUnderstanding {
  return {
    summary: '美国进一步收紧AI芯片对华出口管制，新增多款GPU型号受限，短期冲击国内AI芯片供给，但中长期将倒逼国产替代进程加速，半导体自主可控成为产业主线。',
    coreChanges: [
      { variable: '芯片供给', before: '高端AI芯片可通过特定渠道进口', after: '新增GPU型号受限，供给缺口扩大' },
      { variable: '国产替代紧迫性', before: '渐进式替代', after: '加速替代，政策与资金双驱动' },
      { variable: '算力成本', before: '国产芯片性价比劣势', after: '供给受限推高进口算力价格' },
    ],
  }
}

function understandingEvt003(): EventUnderstanding {
  return {
    summary: '国家医保局将AI辅助诊断纳入医保支付试点，打破医疗AI的商业化瓶颈，从"技术可行"跨越到"医保买单"，推动医院大规模采购AI诊断系统。',
    coreChanges: [
      { variable: '医疗AI付费模式', before: '医院自费采购，预算有限', after: '医保覆盖，费用纳入支付体系' },
      { variable: '市场空间', before: '商业化前景不明朗', after: '10省市试点覆盖4亿人口，百亿级市场需求释放' },
      { variable: '行业准入门槛', before: '拿证即可销售', after: '需三类器械认证+试点准入' },
    ],
  }
}

function understandingEvt004(): EventUnderstanding {
  return {
    summary: '工信部发布人形机器人产业专项支持政策，规划千亿产值目标，从研发补贴、示范应用、标准制定三维度推动产业从实验室走向产业化，核心零部件需求将率先爆发。',
    coreChanges: [
      { variable: '产业定位', before: '概念验证阶段', after: '千亿产值目标明确为未来产业' },
      { variable: '核心零部件需求', before: '小批量试制', after: '规模化订单可期' },
      { variable: '投资预期', before: '风险投资为主', after: '产业资本和政策资金双重加持' },
    ],
  }
}

function understandingEvt005(): EventUnderstanding {
  return {
    summary: '国产大模型在推理能力和成本控制上取得双重突破，将AI使用门槛从"大企业专属"降至"中小企业可用"，推理成本大幅下降将催生大量行业应用创新。',
    coreChanges: [
      { variable: 'AI使用成本', before: '推理成本高昂，限制规模化应用', after: '成本大幅下降，边际成本显著降低' },
      { variable: 'AI应用边界', before: '主要在搜索和对话场景', after: '可承担更复杂的商业推理任务' },
      { variable: '行业竞争格局', before: '少数企业掌握模型能力', after: '开源生态+国产模型打破垄断' },
    ],
  }
}

function understandingEvt006(): EventUnderstanding {
  return {
    summary: '动力电池价格持续下行，反映上游锂材料产能过剩与下游整车降价压力的双重传导，行业毛利率从25%下滑至15%以下，二三线电池企业面临生存压力。',
    coreChanges: [
      { variable: '锂材料供需', before: '前期产能扩张期', after: '供过于求，碳酸锂价格回落超60%' },
      { variable: '电池行业利润', before: '毛利率25%以上', after: '毛利率降至15%以下' },
      { variable: '整车制造成本', before: '电池占整车成本40%', after: '电池降价降低整车成本' },
    ],
  }
}

function understandingEvt007(): EventUnderstanding {
  return {
    summary: '大型互联网企业发布AI商业化战略，将亿级用户生态和数据优势与AI能力结合，通过自有场景验证产品价值，并开放平台降低中小企业AI接入成本。',
    coreChanges: [
      { variable: 'AI应用触达效率', before: 'AI产品多面向B端企业', after: '互联网平台亿级用户即点即用' },
      { variable: '开发者生态', before: 'AI开发门槛较高', after: '开放API和模型降低开发成本' },
      { variable: '行业竞争', before: 'AI创业公司为主', after: '互联网巨头入局加剧竞争' },
    ],
  }
}

function understandingEvt008(): EventUnderstanding {
  return {
    summary: '证监会出台资本市场AI应用规范，明确算法交易监管红线，短期增加企业合规成本，但中长期消除政策不确定性，提升行业集中度，利好头部金融科技企业。',
    coreChanges: [
      { variable: '监管环境', before: 'AI交易处于监管灰色地带', after: '算法交易监管红线明确' },
      { variable: '合规成本', before: '无明确合规要求', after: '需升级系统满足合规要求' },
      { variable: '行业集中度', before: '大小机构均可参与', after: '合规门槛提高利好头部企业' },
    ],
  }
}

function understandingDefault(): EventUnderstanding {
  return {
    summary: '该事件涉及相关行业的基本面变化，需结合事件类型和产业链关系进行深入分析。',
    coreChanges: [{ variable: '待分析', before: '—', after: '—' }],
  }
}

// ==================== 投资总结 Mock ====================

function makeSummary(eventId: string): InvestmentSummary {
  switch (eventId) {
    case 'evt_001': return summaryEvt001()
    case 'evt_002': return summaryEvt002()
    case 'evt_003': return summaryEvt003()
    case 'evt_004': return summaryEvt004()
    case 'evt_005': return summaryEvt005()
    case 'evt_006': return summaryEvt006()
    case 'evt_007': return summaryEvt007()
    case 'evt_008': return summaryEvt008()
    default: return summaryDefault()
  }
}

function summaryEvt001(): InvestmentSummary {
  return {
    id: 'evt_001',
    conclusion: '新能源汽车补贴延续至2027年，为产业链提供确定性增长预期，整车及上游动力电池、锂矿环节有望持续受益。',
    keyPoints: ['补贴延续消除政策不确定性', '终端消费需求确定性增强', '上游产业链产能扩张有望落地'],
    focusIndustries: [
      { name: '新能源汽车', direction: 'positive', reason: '补贴降低购车门槛，终端销量预期上调' },
      { name: '动力电池', direction: 'positive', reason: '整车放量拉动电池装机需求增长' },
    ],
    opportunities: ['关注整车龙头企业的市场份额提升机会', '关注动力电池和锂矿环节的产能释放节奏'],
    risks: ['补贴实际执行细则可能低于预期', '地方政府配套政策力度存在差异'],
    rating: 'positive',
  }
}

function summaryEvt002(): InvestmentSummary {
  return {
    id: 'evt_002',
    conclusion: 'AI芯片出口管制短期冲击进口依赖型企业，但中长期将加速国产替代进程，半导体设备和国产芯片企业存在结构性机会。',
    keyPoints: ['短期AI芯片供给受限', '国产替代进入加速期', '算力成本上升带来下游压力'],
    focusIndustries: [
      { name: '国产芯片', direction: 'positive', reason: '政策与资金双驱动，国产替代需求迫切' },
      { name: 'AI芯片进口商', direction: 'negative', reason: '高端芯片供给受限，短期业务承压' },
    ],
    opportunities: ['关注国产芯片龙头和半导体设备企业的替代机会', '关注算力租赁企业的短期涨价红利'],
    risks: ['管制政策可能出现松动或调整', '国产芯片技术迭代进度不及预期'],
    rating: 'positive',
  }
}

function summaryEvt003(): InvestmentSummary {
  return {
    id: 'evt_003',
    conclusion: 'AI辅助诊断纳入医保是医疗AI商业化的重要里程碑，智慧医疗和医疗信息化企业有望迎来订单拐点。',
    keyPoints: ['医保支付解决商业化瓶颈', '10省市试点覆盖4亿人口', '已获证头部企业率先受益'],
    focusIndustries: [
      { name: '智慧医疗', direction: 'positive', reason: '医保覆盖打开百亿级增量市场' },
      { name: '医疗信息化', direction: 'positive', reason: 'AI部署带动医院信息化升级需求' },
    ],
    opportunities: ['关注已获三类器械认证的AI诊断企业', '关注医院信息化系统升级改造机会'],
    risks: ['试点效果不及预期可能导致推广延迟', 'AI诊断准确率可能引发医疗纠纷风险'],
    rating: 'positive',
  }
}

function summaryEvt004(): InvestmentSummary {
  return {
    id: 'evt_004',
    conclusion: '人形机器人专项政策明确千亿产值目标，核心零部件需求将率先爆发，减速器、伺服电机环节具备较高的确定性。',
    keyPoints: ['千亿产值目标提供增长确定性', '核心零部件国产替代需求迫切', '整机放量将带动全产业链'],
    focusIndustries: [
      { name: '减速器', direction: 'positive', reason: '占机器人成本约30%，整机放量直接拉动需求' },
      { name: '伺服电机', direction: 'positive', reason: '高精度伺服电机是人形机器人的核心驱动部件' },
    ],
    opportunities: ['关注减速器和伺服电机国产龙头企业', '关注传感器和工业自动化领域的延伸机会'],
    risks: ['技术路线尚未收敛，存在技术选型风险', '产业化进展可能慢于政策预期'],
    rating: 'positive',
  }
}

function summaryEvt005(): InvestmentSummary {
  return {
    id: 'evt_005',
    conclusion: '国产大模型推理成本大幅下降，将推动AI应用从"大企业专属"走向规模化落地，云计算和数据中心环节确定性受益。',
    keyPoints: ['推理成本下降是AI规模化商用的关键', '应用渗透率有望大幅提升', '算力需求将持续增长'],
    focusIndustries: [
      { name: '人工智能', direction: 'positive', reason: '技术突破提升AI产业整体竞争力' },
      { name: '云计算', direction: 'positive', reason: 'AI应用爆发需要大规模云资源支撑' },
    ],
    opportunities: ['关注AI应用层的商业化落地机会', '关注云计算和数据中心基础设施投资机会'],
    risks: ['行业竞争可能加剧，中小企业面临差异化挑战', '技术迭代速度可能超出企业适应能力'],
    rating: 'positive',
  }
}

function summaryEvt006(): InvestmentSummary {
  return {
    id: 'evt_006',
    conclusion: '动力电池价格持续下行，上游锂材料企业承压明显，但下游整车企业成本改善，行业利润分配向下游转移。',
    keyPoints: ['上游锂材料供过于求格局短期难改', '电池企业毛利率下滑，行业洗牌加速', '下游整车企业成本端改善'],
    focusIndustries: [
      { name: '新能源汽车', direction: 'positive', reason: '电池降价降低整车制造成本，盈利能力改善' },
      { name: '锂材料', direction: 'negative', reason: '碳酸锂价格回落超60%，矿企利润大幅缩水' },
    ],
    opportunities: ['关注受益于成本下降的整车龙头企业', '关注电池行业洗牌后的龙头集中度提升机会'],
    risks: ['电池价格战可能进一步恶化行业利润', '锂材料价格可能继续下探'],
    rating: 'neutral',
  }
}

function summaryEvt007(): InvestmentSummary {
  return {
    id: 'evt_007',
    conclusion: '互联网巨头全面拥抱大模型将加速AI应用生态构建，软件服务和云计算环节有望受益于AI能力赋能。',
    keyPoints: ['互联网平台亿级用户降低AI应用触达成本', '开放平台降低中小企业AI开发门槛', '行业竞争加剧倒逼差异化创新'],
    focusIndustries: [
      { name: 'AI应用', direction: 'positive', reason: '巨头入局加速应用生态繁荣和商业化进程' },
      { name: '软件服务', direction: 'positive', reason: 'AI能力融入企业软件提升产品价值' },
    ],
    opportunities: ['关注在巨头平台上构建AI应用的开发者生态', '关注为AI提供基础设施支持的软件服务企业'],
    risks: ['中小AI创业公司可能面临巨头挤压', 'AI应用市场竞争激烈可能导致估值泡沫'],
    rating: 'positive',
  }
}

function summaryEvt008(): InvestmentSummary {
  return {
    id: 'evt_008',
    conclusion: '资本市场AI应用规范出台消除了政策不确定性，合规能力强的头部金融科技企业将获得竞争优势，数据服务需求有望增长。',
    keyPoints: ['监管规范明确了AI交易合规红线', '行业集中度有望提升', '数据服务需求出现新的增长点'],
    focusIndustries: [
      { name: '金融科技', direction: 'positive', reason: '合规门槛提高利好头部企业' },
      { name: '数据服务', direction: 'positive', reason: '合规需求创造新的数据服务市场' },
    ],
    opportunities: ['关注具备完善合规体系的头部金融科技企业', '关注合规数据服务和风险监测系统供应商'],
    risks: ['短期合规成本可能超预期', '小型量化机构可能面临退出风险'],
    rating: 'positive',
  }
}

function summaryDefault(): InvestmentSummary {
  return {
    id: 'default',
    conclusion: '该事件的影响需结合更多信息进行深入分析，建议持续跟踪后续进展。',
    keyPoints: ['持续关注事件进展', '结合产业链关系分析影响'],
    focusIndustries: [],
    opportunities: [],
    risks: ['信息不充分，分析结论可能存在偏差'],
    rating: 'neutral',
  }
}

// ==================== 新闻原文 Mock ====================

import type { NewsArticle } from './types'

const ALL_NEWS: NewsArticle[] = [
  {
    id: 'news_001',
    title: '新能源汽车补贴政策延续至2027年，单辆车最高补贴1.5万元',
    source: '新华社',
    publishTime: '2026-07-08 09:30',
    relatedEventId: 'evt_001',
    content: `【事件背景】
财政部、工业和信息化部、科技部、国家发展改革委近日联合发布《关于延续新能源汽车推广应用财政补贴政策的通知》，明确将新能源汽车推广应用财政补贴政策实施期限延长至2027年12月31日。根据通知内容，2026年至2027年期间，符合条件的新能源乘用车购置者将继续享受每辆车最高1.5万元的财政补贴。

【政策要点】
通知指出，本次延续政策在保持补贴标准总体稳定的基础上，进一步优化了补贴门槛。纯电动乘用车续航里程不低于300公里的车型可享受全额补贴，插电式混合动力乘用车纯电续航里程不低于50公里的车型补贴标准为1万元。同时，政策要求享受补贴的车型必须搭载符合国家标准的车载终端，实现车辆运行数据实时上传。

【行业影响】
中国汽车工业协会数据显示，2025年全年新能源汽车产销量分别达到1280万辆和1256万辆，市场占有率达到41.3%。多位行业分析师认为，补贴政策的延续将为新能源汽车市场提供稳定的政策预期，有利于企业合理安排产能规划和研发投入。

【企业反应】
比亚迪相关负责人表示，公司将充分利用政策红利期，加大研发投入力度，计划在2027年前推出至少5款搭载新一代电池技术的新车型。蔚来汽车联合创始人回应称，补贴延续有助于高端新能源车型的市场培育，公司将加快换电网络建设步伐。`,
  },
  {
    id: 'news_002',
    title: '美国进一步收紧AI芯片对华出口管制，新增GPU型号受限',
    source: '路透社',
    publishTime: '2026-07-08 08:15',
    relatedEventId: 'evt_002',
    content: `【事件背景】
据路透社华盛顿报道，美国政府于当地时间7月7日宣布进一步收紧对华人工智能芯片出口管制措施。根据美国商务部工业与安全局发布的最新规定，新增多款高性能GPU产品被纳入对华出口管制清单，包括部分此前处于管制灰色地带的中高端芯片型号。

【管制详情】
此次管制范围扩展至多款面向数据中心和高性能计算场景的AI加速器产品。新规要求任何采用特定先进制程工艺、具备超过一定算力密度的芯片产品，在向中国企业出口前必须获得商务部特别许可。此外，规则还收紧了"外国直接产品规则"的适用范围，限制使用美国技术或软件在第三国生产的芯片产品对华出口。

【中方回应】
中国商务部新闻发言人在例行记者会上表示，美方滥用出口管制措施，严重破坏国际经贸秩序和全球产业链供应链稳定。中方将采取必要措施，坚决维护中国企业的合法权益。国内多家半导体行业协会也发表联合声明，呼吁加速推进芯片产业自主可控进程。

【市场反应】
受此消息影响，国内AI芯片概念股当日早盘出现分化走势。部分依赖进口芯片的企业股价承压下行，而国产替代相关标的逆势走强。券商研报指出，此举将进一步加速国内AI芯片的自主研发和产业化进程，利好国内半导体设备和材料企业。`,
  },
  {
    id: 'news_003',
    title: '国家医保局将AI辅助诊断纳入医保支付试点范围',
    source: '证券时报',
    publishTime: '2026-07-07 15:00',
    relatedEventId: 'evt_003',
    content: `【事件背景】
据证券时报记者从国家医保局获悉，国家医保局近日印发《关于将人工智能辅助诊断技术纳入基本医疗保险支付试点工作的通知》。根据通知，首批将选择北京、上海、广东、浙江、四川等10个省市开展试点工作，试点期限为两年。

【试点范围】
通知明确，纳入试点的AI辅助诊断技术主要包括：医学影像AI辅助诊断、病理AI辅助诊断、心电AI辅助诊断三大类。试点期间，患者在试点医疗机构使用上述AI辅助诊断服务时，相关费用将按规定纳入医保支付范围，个人自付比例与同类传统诊断服务保持一致。

【技术准入标准】
医保局同步发布了AI辅助诊断技术的准入标准，要求相关产品必须获得国家药品监督管理局颁发的三类医疗器械注册证，且在医院真实场景下的诊断准确率不低于95%。目前，全国已有超过30款AI医疗产品获得三类医疗器械认证。

【行业影响】
业内普遍认为，医保支付政策的突破是医疗AI商业化落地的关键一步。据弗若斯特沙利文研究报告预测，中国医疗AI市场规模将在2027年突破500亿元人民币。多家医疗AI企业表示，将加快产品的医院部署和市场推广节奏。`,
  },
]

/**
 * 模拟获取新闻原文
 */
export function mockNewsArticle(newsId: string): NewsArticle | null {
  return ALL_NEWS.find(n => n.id === newsId) ?? null
}
