import { computed, type Ref } from 'vue'
import type { TrendScoreData, IndustryHealthData } from '@/shared/api/modules/stock'

interface TagItem {
  tag: string
  full: string
}

interface AiAnalysisView {
  conclusion: string
  badgeClass: string
  logic: string
  basis: TagItem[]
  advice: TagItem[]
  riskTips: TagItem[]
}

interface StockAiAnalysisContext {
  quote?: Record<string, any> | null
  stockInfo?: Record<string, any> | null
  semiAnnualReport?: Record<string, any> | null
  forecastData?: Record<string, any> | null
}

function getIndustryHealthClass(score: number): string {
  const value = Number(score) || 0
  if (value >= 85) return 'is-hot'
  if (value >= 75) return 'is-warm'
  if (value >= 55) return 'is-normal'
  return 'is-cold'
}

function toFiniteNumber(value: any): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const text = String(value).replace(/,/g, '').replace('%', '').trim()
  if (!text || text === '--') return null
  const parsed = Number(text.replace(/[^\d.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

function formatPercent(value: any): string {
  const num = toFiniteNumber(value)
  if (num === null) return '--'
  return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`
}

function formatMultiple(value: any): string {
  const num = toFiniteNumber(value)
  if (num === null || num <= 0) return '--'
  return `${num.toFixed(2)}倍`
}

function formatAmountYi(value: any): string {
  const num = toFiniteNumber(value)
  if (num === null) return '--'
  const yi = Math.abs(num) >= 100000000 ? num / 100000000 : num
  return `${yi.toFixed(2)}亿`
}

function growthType(value: any): string {
  const num = toFiniteNumber(value)
  if (num === null) return ''
  return num >= 0 ? 'is-up' : 'is-down'
}

function getLatestSemiReport(semiAnnualReport?: Record<string, any> | null): Record<string, any> {
  const reports = semiAnnualReport?.reports
  if (Array.isArray(reports) && reports.length) return reports[0] || {}
  return {}
}

function buildRealFinancialData(context: StockAiAnalysisContext) {
  const semi = context.semiAnnualReport || {}
  const latestReport = getLatestSemiReport(semi)
  const quote = context.quote || {}
  const forecast = context.forecastData || {}
  const revenueYoy = semi.total_revenue_yoy ?? latestReport.total_revenue_yoy
  const profitYoy = semi.n_income_yoy ?? semi.n_income_attr_p_yoy ?? latestReport.n_income_yoy ?? forecast.netProfitYoy
  const rows = [
    { label: '营收增速', value: formatPercent(revenueYoy), change: '半年报披露', type: growthType(revenueYoy) },
    { label: '净利增速', value: formatPercent(profitYoy), change: forecast.netProfitYoy != null ? '预测/财报验证' : '半年报披露', type: growthType(profitYoy) },
    { label: 'PE(TTM)', value: formatMultiple(quote.peRatio), change: '实时行情估值', type: '' },
    { label: 'PB', value: formatMultiple(quote.pbRatio), change: '实时行情估值', type: '' },
    { label: '研发费用', value: formatAmountYi(latestReport.rd_exp), change: '半年报披露', type: '' },
    { label: '归母净利', value: formatAmountYi(latestReport.n_income_attr_p), change: '半年报披露', type: growthType(semi.n_income_attr_p_yoy) },
  ]
  const available = rows.filter(item => item.value !== '--')
  return {
    rows: available.length ? rows : [],
    revenueYoy,
    profitYoy,
    peRatio: quote.peRatio,
    pbRatio: quote.pbRatio,
    rdExpense: latestReport.rd_exp,
    attributableProfit: latestReport.n_income_attr_p,
  }
}

function findTrendDimension(trendApiData: TrendScoreData | null, matcher: (name: string) => boolean): any | null {
  if (!trendApiData || trendApiData.vetoed) return null
  const dimensions = trendApiData.dimensions || []
  return dimensions.find((dim: any) => matcher(String(dim.name || dim.label || ''))) || null
}

function buildIndustryHealthFromTrend(trendApiData: TrendScoreData | null, context: StockAiAnalysisContext, fallbackTheme: string, industryHealthData?: IndustryHealthData | null) {
  const trackDim = findTrendDimension(trendApiData, name => name.includes('行业') || name.includes('赛道'))
  if (trackDim) {
    const score = Number(trackDim.score) || 0
    const detail = trackDim.detail || {}
    const indicators = Array.isArray(trackDim.indicators) ? trackDim.indicators : []
    const sectorName = detail.sectorName || context.stockInfo?.industry || fallbackTheme
    const policyItems = Array.isArray(detail.policyItems) ? detail.policyItems : []
    const detailItems = [
      ...policyItems.slice(0, 2).map((item: any) => ({
        icon: '政',
        title: String(item.name || '政策趋势'),
        desc: String(item.desc || item.value || '真实趋势数据')
      })),
      ...indicators.slice(0, Math.max(0, 3 - policyItems.length)).map((item: any) => ({
        icon: '因',
        title: String(item.name || item.label || '评分因子'),
        desc: String(item.value || item.score || '--')
      }))
    ].slice(0, 3)
    const trend = [{ month: '当前', value: Math.max(0, Math.min(100, score)) }]
    return {
      score,
      levelClass: getIndustryHealthClass(score),
      tags: [
        { text: String(sectorName || fallbackTheme), type: 'success' },
        { text: '趋势评分真实数据', type: 'success' }
      ],
      trend,
      values: trend.map(item => item.value),
      details: detailItems.length ? detailItems : [
        { icon: '因', title: '行业赛道评分', desc: `${score}分` },
        { icon: '源', title: '数据来源', desc: 'trend-score' },
        { icon: '排', title: '行业股票排行', desc: '查看' }
      ],
      isReal: true,
    }
  }
  
  // 趋势 API 无行业维度时，尝试用行业景气 API 兜底
  if (industryHealthData) {
    const score = industryHealthData.score || 0
    const trend = industryHealthData.months?.length
      ? industryHealthData.months.map((m: string, i: number) => ({ month: m, value: industryHealthData.values?.[i] || 0 }))
      : [{ month: '当前', value: score }]
    return {
      score,
      levelClass: getIndustryHealthClass(score),
      tags: [
        { text: String(industryHealthData.resolvedName || industryHealthData.industry || fallbackTheme), type: 'success' },
        { text: '行业景气真实数据', type: 'success' }
      ],
      trend,
      values: trend.map((item: any) => item.value),
      details: (industryHealthData.details || []).map((d: any) => ({
        icon: '因',
        title: String(d.label || ''),
        desc: String(d.desc || '')
      })),
      isReal: true,
    }
  }
  
  return null
}

function buildRealAnnualData(context: StockAiAnalysisContext, score: number) {
  const semi = context.semiAnnualReport || {}
  const latestReport = getLatestSemiReport(semi)
  const quote = context.quote || {}
  const rows = [
    { label: '研发费用', value: formatAmountYi(latestReport.rd_exp), note: '半年报披露', type: '' },
    { label: '营收增速', value: formatPercent(semi.total_revenue_yoy), note: '半年报披露', type: growthType(semi.total_revenue_yoy) },
    { label: '净利增速', value: formatPercent(semi.n_income_yoy), note: '半年报披露', type: growthType(semi.n_income_yoy) },
    { label: '归母净利', value: formatAmountYi(latestReport.n_income_attr_p), note: formatPercent(semi.n_income_attr_p_yoy), type: growthType(semi.n_income_attr_p_yoy) },
    { label: 'PE(TTM)', value: formatMultiple(quote.peRatio), note: '实时行情估值', type: '' },
    { label: 'PB', value: formatMultiple(quote.pbRatio), note: '实时行情估值', type: '' },
  ]
  const available = rows.filter(item => item.value !== '--')
  if (available.length >= 3) return rows
  return []
}

function buildMoatsFromTrend(trendApiData: TrendScoreData | null) {
  const fundamentalDim = findTrendDimension(trendApiData, name => name.includes('基本面'))
  const subDimensions = Array.isArray(fundamentalDim?.subDimensions) ? fundamentalDim.subDimensions : []
  if (subDimensions.length) {
    return subDimensions.slice(0, 4).map((item: any, index: number) => ({
      icon: ['A', 'C', 'S', 'G'][index] || 'F',
      title: String(item.name || '基本面因子'),
      desc: `${Number(item.score) || 0}分`
    }))
  }
  return []
}

function cleanExplanation(text: string): string {
  return text
    .replace(/\[`([^`]*)`\]\([^)]+\)/g, '$1')   // [`text`](url) → text
    .replace(/\[([^\]]*)\]\([^)]+\)/g, '$1')      // [text](url) → text
    .replace(/`{1,3}([^`]*)`{1,3}/g, '$1')        // `text` 或 ```text``` → text
    .replace(/\*\*([^*]*)\*\*/g, '$1')             // **text** → text
    .replace(/\*([^*]*)\*/g, '$1')                 // *text* → text
    .replace(/^#+\s*/gm, '')                        // 去掉行首 ### 
    .replace(/\s+/g, ' ')                           // 多余空白合并
    .trim()
}

export function extractTagFromText(text: string): TagItem {
  if (!text) return { tag: '', full: '' }
  const full = String(text).trim()
  const tagMatch = full.match(/^([^:]{1,30})::([\s\S]+)$/)
  if (tagMatch) {
    let tag = tagMatch[1].trim()
    if (tag.length > 30) tag = tag.substring(0, 30) + '…'
    return { tag, full: cleanExplanation(tagMatch[2].trim()) || full }
  }
  const firstClause = full.split(/[，。；！？\n]/)[0]?.trim() || full
  const tag = firstClause.length > 30 ? firstClause.substring(0, 30) + '…' : firstClause
  return { tag, full: cleanExplanation(full) }
}

export function extractTagsFromText(text: string): TagItem[] {
  if (!text) return []
  const str = String(text)
  const lines = str.split(/\n+/).map(s => s.trim()).filter(s => s)
  if (lines.length > 1) {
    return lines.map(line => extractTagFromText(line)).filter(t => t.tag)
  }
  const sentences = str.split(/[。\n]/).map(s => s.trim()).filter(s => s)
  return sentences.map(s => extractTagFromText(s)).filter(t => t.tag)
}

export function extractTagsFromArray(arr: (string | TagItem | { tag?: string; detail?: string })[]): TagItem[] {
  if (!Array.isArray(arr)) return []
  return arr.map(item => {
    if (item && typeof item === 'object') {
      const detail = (item as { tag?: string; detail?: string; full?: string }).detail
      const full = (item as { tag?: string; detail?: string; full?: string }).full
      if (item.tag || detail || full) {
        return { tag: String(item.tag || '').slice(0, 30), full: String(detail || full || item.tag || '') }
      }
    }
    return extractTagFromText(item as string)
  }).filter(t => t.tag)
}

export function useStockAiAnalysis(
  symbolRef: Ref<string>,
  quoteRef: Ref<{ name?: string; industry?: string } | null>,
  trendScoreDataRef?: Ref<TrendScoreData | null>,
  contextRef?: Ref<StockAiAnalysisContext | null>,
  industryHealthRef?: Ref<IndustryHealthData | null>
) {
  const profileScore = computed(() => 0)
  const profileTheme = computed(() => quoteRef.value?.industry || '成长赛道')
  const profileName = computed(() => quoteRef.value?.name || '该股')
  // 趋势股评分后端数据（四维：技术面/行业赛道景气/消息面催化/基本面）
  const trendApiData = computed(() => trendScoreDataRef?.value || null)
  const trendVetoed = computed(() => Boolean(trendApiData.value?.vetoed))
  const trendVetoReasons = computed<string[]>(() => trendApiData.value?.reasons || [])
  const realTrendScore = computed(() => (trendApiData.value && !trendVetoed.value) ? Number(trendApiData.value.score) || 0 : 0)
  const realTrendLabel = computed(() => (trendApiData.value && !trendVetoed.value) ? String(trendApiData.value.label || '') : '')
  const realTrendMultiple = computed(() => (trendApiData.value && !trendVetoed.value) ? String(trendApiData.value.expectedMultiple || '') : '')
  const expectedMultipleText = computed(() => trendApiData.value?.expectedMultiple || '')
  const expectedMultipleNumber = computed(() => {
    const text = expectedMultipleText.value
    if (!text) return 0
    const match = String(text).match(/([\d.]+)\s*倍/)
    return match ? Number(match[1]) : 0
  })
  const realDataContext = computed<StockAiAnalysisContext>(() => contextRef?.value || {})
  const realFinancialData = computed(() => buildRealFinancialData(realDataContext.value))

  const midMockData = computed(() => {
    const realIndustryHealth = buildIndustryHealthFromTrend(trendApiData.value, realDataContext.value, profileTheme.value, industryHealthRef?.value)
    return {
      finance: realFinancialData.value.rows,
      industryHealth: realIndustryHealth
    }
  })

  const midAiAnalysis = computed<AiAnalysisView>(() => {
    const dimensions = trendApiData.value && !trendVetoed.value ? (trendApiData.value.dimensions || []) : []
    const sortedDims = [...dimensions].sort((a, b) => (b.score || 0) - (a.score || 0))
    const focus = sortedDims.length
      ? sortedDims.slice(0, 3).map(d => String(d.name || '趋势维度'))
      : ['趋势跟踪', '业绩验证', '资金承接']
    const risks = sortedDims.length
      ? sortedDims.slice(-2).reverse().map(d => String(d.name || '风险维度'))
      : ['趋势破位风险', '板块轮动风险']
    const score = profileScore.value
    const realScore = realTrendScore.value || score
    const conclusion = realScore >= 80 ? '持有可顺势跟踪' : realScore >= 65 ? '关注等回踩确认' : '持有者稳健观察'
    const finance = midMockData.value.finance
    const health = (midMockData.value.industryHealth || { score: '--', tags: [], isReal: false }) as any
    const revenue = finance.find(item => item.label === '营收增速')
    const profit = finance.find(item => item.label === '净利增速')
    const pe = finance.find(item => item.label === 'PE(TTM)')
    const pb = finance.find(item => item.label === 'PB')
    const forecast = realDataContext.value.forecastData || {}
    const hasRealFinancial = realFinancialData.value.rows.length > 0
    const forecastSummary = String(forecast.summary || '').trim()
    const hasRealForecast = Boolean(forecastSummary || forecast.netProfitYoy != null || (Array.isArray(forecast.predictions) && forecast.predictions.length))
    const hasRealIndustry = Boolean(health?.isReal)
    if (!hasRealFinancial && !hasRealForecast && !hasRealIndustry) {
      return {
        conclusion: '暂无中线真实数据',
        badgeClass: 'is-hold',
        logic: '暂无真实财报、业绩预测或行业趋势评分数据，中线研判暂不生成本地模拟结论。',
        basis: [],
        advice: [],
        riskTips: []
      }
    }
    const policyText = health.isReal && health.details?.length
      ? `趋势评分中行业政策线索指向"${health.details.map((d: any) => d.title || d.desc).join('、')}"`
      : `${profileTheme.value}方向与十五五培育新质生产力、战略性新兴产业的政策主线存在关联`
    const summary = hasRealFinancial || forecastSummary || health.isReal
      ? `${profileName.value}中线判断优先参考真实财报、预测和趋势评分：营收/利润验证盈利弹性，行业赛道评分验证景气延续。`
      : `${profileName.value}中线核心在于${focus.slice(0, 2).join('和')}，当前后端财报/预测数据不足，先作为观察样本处理。`
    return {
      conclusion,
      badgeClass: realScore >= 80 ? 'is-bull' : 'is-hold',
      logic: summary,
      basis: [
        { tag: '业绩拐点验证', full: `真实财报/预测显示营收增速为${revenue?.value || '--'}、净利增速为${profit?.value || '--'}。若后续预测继续上修，中线业绩拐点的可信度会提高。` },
        { tag: '估值位置校验', full: `实时行情估值显示 PE(TTM) 为${pe?.value || '--'}、PB 为${pb?.value || '--'}，需要和利润增速、行业景气度一起看，避免只看题材热度。` },
        { tag: '赛道景气同步', full: health.isReal ? `行业景气指数为${health.score}分，标签集中在"${health.tags.map((tag: any) => tag.text).join('、')}"，来自趋势评分后端维度。` : '暂无真实行业趋势评分，本项不作为中线机会或风险依据。' },
        { tag: '预测数据验证', full: forecastSummary || `业绩预测净利润同比为${formatPercent(forecast.netProfitYoy)}，暂无更完整预测摘要时，先用预测列表和半年报数据交叉验证。` },
        { tag: '政策方向支撑', full: `${policyText}，这会强化中线资金对赛道景气和订单兑现的跟踪，但仍需要用财报增速与资金承接继续验证。` },
        { tag: '跟踪条件', full: `中线关注点为"${focus.join('、')}"。当前结论由真实财报、预测、估值和趋势评分共同校验后给出：${conclusion}。` }
      ],
      advice: realScore >= 80
        ? [
          { tag: '顺势跟踪', full: '已持有者可继续按趋势跟踪，重点观察回踩关键均线时是否仍有主力承接。' },
          { tag: '回踩再关注', full: '关注者不宜在连续放量急涨后追高，更适合等待缩量回踩或业绩预期再次确认。' },
          { tag: '景气可加仓', full: `若${focus[2] || '业绩兑现'}继续改善，同时行业景气指数维持高位，中线仓位可以保持偏积极。` },
          { tag: '资金转弱减仓', full: '若资金流向从连续净流入转为放量净流出，应先降低中线预期，等待下一次承接确认。' }
        ]
        : [
          { tag: '观察仓位', full: `已持有者可维持观察仓位，优先看${focus[0] || '趋势结构'}是否保持完整。` },
          { tag: '放量再确认', full: '关注者建议等待放量确认或财报预期更清晰后再提高关注级别。' },
          { tag: '景气上行转积极', full: '若行业景气指数继续上行，同时毛利率和ROE改善，中线判断可从观察转为偏积极。' },
          { tag: '脱离业绩需谨慎', full: '若股价脱离业绩兑现过快，应以分批观察为主，不把主题热度当成中线确定性。' }
        ],
      riskTips: [
        { tag: '逻辑转题材化', full: `若${risks[0]}，中线逻辑会从业绩验证转为题材交易，估值支撑会变弱。` },
        { tag: '景气指数回落', full: '若行业景气指数回落到70分以下，说明赛道热度和订单预期开始降温。' },
        { tag: '趋势破位风险', full: '若主力资金连续转净流出且成交放大，持有者需要防范趋势破位后的回撤。' }
      ]
    }
  })

  const longMockData = computed(() => {
    const theme = profileTheme.value
    const focus = ['产业空间仍在扩张', '核心壁垒需要持续验证', '估值弹性取决于盈利兑现']
    const trackDim = findTrendDimension(trendApiData.value, name => name.includes('行业') || name.includes('赛道'))
    const trackDetail = trackDim?.detail || {}
    const policyItems = Array.isArray(trackDetail.policyItems) ? trackDetail.policyItems : []
    const effectivePolicyItems = policyItems.filter((item: any) => {
      const text = `${item.name || ''}${item.desc || ''}${item.value || ''}`
      return !text.includes('暂无明显政策')
    })
    const policies = effectivePolicyItems.length
      ? effectivePolicyItems.slice(0, 3).map((item: any) => ({
        tag: '利好',
        type: 'is-good',
        text: `${String(item.name || '政策 / 产业趋势')}：${String(item.desc || item.value || '来自趋势评分后端')}`
      }))
      : []
    return {
      policies,
      moats: buildMoatsFromTrend(trendApiData.value),
      annual: buildRealAnnualData(realDataContext.value, realTrendScore.value || profileScore.value)
    }
  })

  const longAiAnalysis = computed<AiAnalysisView>(() => {
    const dimensions = trendApiData.value && !trendVetoed.value ? (trendApiData.value.dimensions || []) : []
    const sortedDims = [...dimensions].sort((a, b) => (b.score || 0) - (a.score || 0))
    const focus = sortedDims.length
      ? sortedDims.slice(0, 3).map(d => String(d.name || '趋势维度'))
      : ['产业空间', '核心壁垒', '成长弹性']
    const risks = sortedDims.length
      ? sortedDims.slice(-2).reverse().map(d => String(d.name || '风险维度'))
      : ['产业兑现节奏低于预期']
    const multipleNumber = expectedMultipleNumber.value
    const conclusion = multipleNumber >= 3
      ? '长线弹性观察'
      : multipleNumber >= 2
        ? '长线稳健跟踪'
        : '长线耐心观察'
    const policies = longMockData.value.policies
    const moats = longMockData.value.moats
    const annual = longMockData.value.annual
    const policyFallback = policies.length
      ? `趋势评分后端返回${policies.length}条政策/产业趋势线索`
      : `${profileTheme.value}方向与十五五培育新质生产力、战略性新兴产业的政策主线存在关联`
    const hasRealTrend = Boolean(trendApiData.value) && !trendVetoed.value
    const hasRealAnnual = buildRealFinancialData(realDataContext.value).rows.length > 0
    if (!hasRealTrend && !hasRealAnnual && !trendVetoed.value) {
      return {
        conclusion: '暂无长线真实数据',
        badgeClass: 'is-hold',
        logic: '暂无真实趋势模型、年报或半年度财务数据，长线研判暂不生成本地模拟结论。',
        basis: [],
        advice: [],
        riskTips: []
      }
    }
    const tenxBasis = hasRealTrend
      ? { tag: '趋势股模型评分', full: realTrendMultiple.value ? `趋势股模型给出${realTrendScore.value}分和"${realTrendLabel.value}"，后端倍数预期为${realTrendMultiple.value}，因此AI给出${conclusion}。` : `趋势股模型给出${realTrendScore.value}分和"${realTrendLabel.value}"，后端未返回倍数预期，因此不展示本地倍数。` }
      : { tag: '暂无趋势模型', full: '后端暂无真实趋势模型数据，长线判断不生成本地倍数或模拟结论。' }
    const summary = hasRealTrend || hasRealAnnual
      ? `${profileName.value}长线判断优先看真实趋势评分、半年报和估值数据，核心是成长动能能否被盈利质量持续验证。`
      : `${profileName.value}长线核心在于${focus.slice(0, 2).join('和')}，当前真实长线数据不足，先以观察和等待验证为主。`
    return {
      conclusion,
      badgeClass: multipleNumber >= 3 ? 'is-bull' : 'is-hold',
      logic: summary,
      basis: [
        { tag: '政策产业共振', full: `行业政策卡片中有${policies.length}条线索，核心方向是"${profileTheme.value}"；${hasRealTrend ? '优先来自趋势评分后端的行业赛道维度。' : `${policyFallback}，需要后续用真实政策/产业数据继续验证。`}` },
        { tag: '护城河四维支撑', full: `公司护城河卡片显示"${moats.map((item: any) => item.title).join('、')}"四个维度，${hasRealTrend ? '优先来自趋势评分基本面子维度' : '目前仍以画像和财报验证方向为主'}。` },
        { tag: '财报估值双验证', full: `年报/半年报对比中研发费用为${annual.find((item: any) => item.label === '研发费用' || item.label === '研发投入')?.value || '--'}，营收增速为${annual.find((item: any) => item.label === '营收增速')?.value || '--'}，PE(TTM) 为${annual.find((item: any) => item.label === 'PE(TTM)')?.value || '--'}。` },
        tenxBasis,
        { tag: '反向跟踪风险', full: `需要反向跟踪的风险是：${risks[0]}，如果这个风险兑现，长线判断会先从真实趋势模型、护城河和财报质量下修。` }
      ],
      advice: multipleNumber >= 3
        ? [
          { tag: '弹性跟踪', full: '已持有者可按长线高弹性样本跟踪，避免一次性重仓，适合用分批方式等待产业验证。' },
          { tag: '等估值回落确认', full: '关注者优先等估值回落、业绩公告或订单数据确认，不把短期题材上涨直接等同于高倍数兑现。' },
          { tag: '产业验证是基础', full: `若${focus[0] || '产业空间'}和${focus[1] || '核心壁垒'}持续验证，趋势股模型的高分才有继续上修基础。` },
          { tag: '四维长期跟踪', full: '长期跟踪重点放在研发投入、客户突破、现金流改善和政策落地四个维度。' }
        ]
        : [
          { tag: '长期观察', full: `已持有者可按趋势龙头做长期观察，核心是验证${focus[0] || '产业空间'}能否持续兑现。` },
          { tag: '估值业绩匹配再介入', full: '关注者不必预设倍数空间，更适合在估值和业绩匹配时分批跟踪。' },
          { tag: '护城河改善提可信度', full: '若护城河、研发投入和资本回报率继续改善，长线空间的可信度会提高。' },
          { tag: '无验证降预期', full: '若长期逻辑没有新订单或新利润验证，应降低长线预期，把它视作稳健成长而非高弹性标的。' }
        ],
      riskTips: [
        { tag: '核心风险下修', full: `核心风险是${risks[0]}，一旦兑现，趋势股模型会先从成长动能和赛道景气两项下修。` },
        { tag: '主题化停滞风险', full: '若政策催化强但订单、利润和现金流没有同步改善，长线逻辑容易停留在主题阶段。' },
        { tag: '估值透支消化风险', full: '若估值提前大幅透支，后续即使行业方向正确，也可能出现较长时间的震荡消化。' }
      ]
    }
  })

  // 趋势股模型（四维：技术面/行业赛道景气/消息面催化/基本面）：只使用后端真实数据，无数据时显示暂无数据。
  const trendModel = computed(() => {
    // 后端返回真实评分数据
    if (trendApiData.value && !trendVetoed.value) {
      const apiData = trendApiData.value
      const dimensions = apiData.dimensions || []
      const dimScores = apiData.dimScores && apiData.dimScores.length ? apiData.dimScores : dimensions.map((d: any) => d.score || 0)
      const totalScore = Number(apiData.score) || 0
      return {
        hasModel: true,
        isReal: true,
        score: totalScore,
        expectedMultiple: apiData.expectedMultiple || '',
        label: apiData.label || '',
        description: apiData.description || '',
        aiConclusion: apiData.aiConclusion || '',
        updatedAt: apiData.updatedAt || '',
        scoreDate: apiData.scoreDate || '',
        dimensions: dimensions.map((d: any) => ({
          name: d.name || '',
          label: d.name || '',
          weight: d.weight || 0,
          score: d.score || 0,
          indicators: (d.indicators || []).map((ind: any) => ({
            name: ind.name || '',
            value: ind.value || '--',
            score: ind.score || 0,
          })),
          subDimensions: (d.subDimensions || []).map((sub: any) => ({
            name: sub.name || '',
            weight: sub.weight || 0,
            score: sub.score || 0,
            indicators: (sub.indicators || []).map((ind: any) => ({
              name: ind.name || '',
              value: ind.value || '--',
              score: ind.score || 0,
            })),
          })),
        })),
        dimScores,
        verdict: apiData.label || (totalScore >= 80 ? '趋势确认' : totalScore >= 65 ? '观察验证' : '趋势走弱'),
      }
    }
    // 后端返回一票否决
    if (trendVetoed.value) {
      return {
        hasModel: false,
        isVetoed: true,
        vetoReasons: trendVetoReasons.value,
        score: 0,
        expectedMultiple: '--',
        label: '一票否决',
        description: '该股触发趋势股模型一票否决条件，不适合作为趋势股跟踪样本。',
        aiConclusion: trendVetoReasons.value.join('；') || '触发一票否决',
        dimensions: [],
        dimScores: [],
        verdict: '一票否决',
      }
    }
    return {
      hasModel: false,
      isReal: false,
      score: 0,
      expectedMultiple: '',
      label: '',
      description: '',
      aiConclusion: '',
      updatedAt: '',
      scoreDate: '',
      dimensions: [],
      dimScores: [],
      verdict: '暂无数据',
    }
  })

  function buildDimIndicators(_key: string, score: number) {
    return [
      { name: '评分', label: '评分', value: `${score}`, score, percent: score },
    ]
  }

  return {
    profileScore,
    profileTheme,
    profileName,
    expectedMultipleText,
    expectedMultipleNumber,
    midAiAnalysis,
    longAiAnalysis,
    midMockData,
    longMockData,
    trendModel,
    trendVetoed,
    trendVetoReasons,
    trendApiData,
  }
}
