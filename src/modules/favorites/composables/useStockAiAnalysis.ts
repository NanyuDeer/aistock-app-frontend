import { computed, type Ref } from 'vue'

interface CuratedProfile {
  code: string
  name: string
  theme: string
  category?: string[]
  aiScore: number
  expectedMultiple: string
  investmentLogic: string
  shortTermFocus: string[]
  midTermFocus: string[]
  longTermFocus: string[]
  risks: string[]
}

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

const tenbaggerProfiles: CuratedProfile[] = [
  {
    code: '688205',
    name: '德科立',
    theme: '光通讯',
    category: ['十倍潜力股'],
    aiScore: 94,
    expectedMultiple: '10倍',
    investmentLogic: '相干光模块、数通光模块和海外算力链需求同时打开空间，小市值叠加高景气赛道带来长线弹性。',
    shortTermFocus: ['光模块板块轮动', '订单传闻催化', '科创成长风格回暖'],
    midTermFocus: ['高速产品放量', '海外客户认证', '毛利率改善'],
    longTermFocus: ['AI数据中心带宽升级', '相干光通信国产替代', '规模化后利润弹性'],
    risks: ['客户认证进度不及预期', '高速光模块价格波动', '小市值流动性波动']
  },
  {
    code: '688008',
    name: '澜起科技',
    theme: '半导体',
    category: ['十倍潜力股'],
    aiScore: 93,
    expectedMultiple: '10倍',
    investmentLogic: '内存接口芯片具备全球竞争力，AI服务器带动DDR5、MRDIMM及配套芯片升级，平台化价值有望重估。',
    shortTermFocus: ['半导体设备材料情绪', 'AI服务器链条扩散', '科创板芯片资金回流'],
    midTermFocus: ['DDR5渗透率', '新产品放量节奏', '客户结构优化'],
    longTermFocus: ['服务器内存升级周期', '芯片平台化扩张', '国产高端芯片突破'],
    risks: ['存储周期恢复慢于预期', '新品量产爬坡不确定', '海外竞争加剧']
  },
  {
    code: '300058',
    name: '蓝色光标',
    theme: 'AI应用',
    category: ['趋势龙头股', '十倍潜力股'],
    aiScore: 90,
    expectedMultiple: '10倍',
    investmentLogic: 'AI营销从降本工具转向业务增量入口，一旦利润率随AIGC工具链提升，公司有望被按AI应用平台重新定价。',
    shortTermFocus: ['AI应用热度', '成交额排名', '短剧与营销催化'],
    midTermFocus: ['AI业务收入占比', '毛利率修复', '大客户预算恢复'],
    longTermFocus: ['AIGC商业化效率', '营销自动化平台', '海外业务复用'],
    risks: ['AI业务收入质量不稳定', '营销行业预算波动', '高换手带来剧烈回撤']
  },
  {
    code: '300136',
    name: '信维通讯',
    theme: '商业航天',
    category: ['十倍潜力股'],
    aiScore: 89,
    expectedMultiple: '10倍',
    investmentLogic: '射频、天线和连接能力可延展到卫星通信终端，若商业航天终端放量，公司有望从消费电子估值切换到卫星通信估值。',
    shortTermFocus: ['商业航天政策催化', '消费电子复苏', '卫星通信主题活跃'],
    midTermFocus: ['卫星终端订单', '射频产品升级', '客户导入节奏'],
    longTermFocus: ['低轨卫星终端普及', '高频通信材料升级', '多业务协同'],
    risks: ['卫星终端商业化慢', '消费电子需求波动', '新业务利润贡献延后']
  },
  {
    code: '002050',
    name: '三花智控',
    theme: '机器人',
    category: ['十倍潜力股'],
    aiScore: 92,
    expectedMultiple: '10倍',
    investmentLogic: '热管理龙头具备全球制造体系，若机器人执行器业务形成第二曲线，传统白马估值可能切换为机器人核心供应商估值。',
    shortTermFocus: ['机器人产业链热度', '海外客户催化', '白马成长资金回流'],
    midTermFocus: ['机器人部件定点', '汽零热管理订单', '海外产能利用率'],
    longTermFocus: ['执行器规模化', '全球客户体系', '精密制造壁垒'],
    risks: ['机器人业务验证周期长', '汽车需求周期波动', '白马股估值弹性受限']
  },
  {
    code: '002015',
    name: '协鑫能科',
    theme: '算电协同',
    category: ['十倍潜力股'],
    aiScore: 88,
    expectedMultiple: '10倍',
    investmentLogic: '电力资源、储能调度和算力需求结合后，资产有机会从传统能源运营重估为算电协同基础设施。',
    shortTermFocus: ['电力改革预期', '算力租赁主题扩散', '储能板块回暖'],
    midTermFocus: ['绿电资源利用率', '算力项目落地', '储能调度收益'],
    longTermFocus: ['电力资产重估', '算力能源一体化', '虚拟电厂商业模式'],
    risks: ['算力项目推进慢', '电价机制变化', '资产负债率压力']
  },
  {
    code: '300438',
    name: '鹏辉能源',
    theme: '新型储能',
    category: ['十倍潜力股'],
    aiScore: 87,
    expectedMultiple: '10倍',
    investmentLogic: '储能周期底部修复时，小市值电池厂商弹性更大，海外户储、工商业储能和新型储能需求可能带来利润反转。',
    shortTermFocus: ['储能板块反弹', '电池价格企稳', '海外订单预期'],
    midTermFocus: ['户储去库结束', '工商业储能放量', '毛利率底部修复'],
    longTermFocus: ['新型储能渗透率', '海外渠道恢复', '电芯技术迭代'],
    risks: ['行业价格战延续', '海外需求恢复慢', '现金流压力']
  }
]

const curatedStockProfiles = tenbaggerProfiles.reduce<Record<string, CuratedProfile>>((profiles, profile) => {
  const current = profiles[profile.code]
  if (!current) {
    profiles[profile.code] = profile
    return profiles
  }
  profiles[profile.code] = {
    ...current,
    ...profile,
    category: Array.from(new Set([...(current.category || []), ...(profile.category || [])]))
  }
  return profiles
}, {})

function getCuratedStockProfile(code: string): CuratedProfile | null {
  if (!code) return null
  return curatedStockProfiles[String(code)] || null
}

const fifteenthPlanThemeMap: Record<string, string> = {
  '光通讯': '算力基础设施、数据中心网络升级和高速信息通信底座',
  '半导体': '集成电路、高端芯片和关键产业链自主可控',
  'AI应用': '人工智能+、数字经济和智能化应用落地',
  '商业航天': '商业航天、卫星互联网和空天信息产业',
  '机器人': '具身智能、智能制造和机器人产业',
  '锂电储能': '新型能源体系、新型储能和绿色低碳转型',
  '算电协同': '算力网络、能源数字化和算电协同基础设施',
  '新型储能': '新型能源体系、新型储能和绿色低碳转型'
}

function getFifteenthPlanStatement(themeName: string): string {
  const rawName = String(themeName || '').trim()
  const matchedKey = Object.keys(fifteenthPlanThemeMap).find(
    key => rawName === key || rawName.includes(key) || key.includes(rawName)
  )
  if (matchedKey) {
    return `${matchedKey}对应${fifteenthPlanThemeMap[matchedKey]}，属于十五五期间培育新质生产力、战略性新兴产业和未来产业时容易被重点关注的方向。`
  }
  return `${rawName || '该方向'}与十五五期间培育新质生产力、发展战略性新兴产业的政策主线存在一定关联。`
}

function getIndustryHealthClass(score: number): string {
  const value = Number(score) || 0
  if (value >= 85) return 'is-hot'
  if (value >= 75) return 'is-warm'
  if (value >= 55) return 'is-normal'
  return 'is-cold'
}

const industryHealthPresets: Record<string, { values: number[]; details: { icon: string; title: string; desc: string }[] }> = {
  '光通讯': { values: [70, 76, 74, 82, 87, 91, 93], details: [{ icon: '政', title: '相关政策', desc: '14项' }, { icon: '告', title: '重大公告', desc: '11条' }, { icon: '排', title: '行业股票排行', desc: '查看' }] },
  '半导体': { values: [56, 61, 65, 71, 78, 83, 86], details: [{ icon: '政', title: '相关政策', desc: '16项' }, { icon: '告', title: '重大公告', desc: '9条' }, { icon: '排', title: '行业股票排行', desc: '查看' }] },
  'AI应用': { values: [62, 69, 68, 76, 83, 88, 90], details: [{ icon: '政', title: '相关政策', desc: '12项' }, { icon: '告', title: '重大公告', desc: '8条' }, { icon: '排', title: '行业股票排行', desc: '查看' }] },
  '商业航天': { values: [48, 55, 60, 66, 72, 79, 83], details: [{ icon: '政', title: '相关政策', desc: '15项' }, { icon: '告', title: '重大公告', desc: '7条' }, { icon: '排', title: '行业股票排行', desc: '查看' }] },
  '机器人': { values: [52, 59, 64, 72, 80, 85, 88], details: [{ icon: '政', title: '相关政策', desc: '13项' }, { icon: '告', title: '重大公告', desc: '10条' }, { icon: '排', title: '行业股票排行', desc: '查看' }] },
  '锂电储能': { values: [45, 49, 52, 58, 64, 69, 72], details: [{ icon: '政', title: '相关政策', desc: '9项' }, { icon: '告', title: '重大公告', desc: '5条' }, { icon: '排', title: '行业股票排行', desc: '查看' }] },
  '算电协同': { values: [50, 57, 63, 70, 77, 82, 85], details: [{ icon: '政', title: '相关政策', desc: '11项' }, { icon: '告', title: '重大公告', desc: '6条' }, { icon: '排', title: '行业股票排行', desc: '查看' }] },
  '新型储能': { values: [40, 46, 52, 59, 67, 72, 76], details: [{ icon: '政', title: '相关政策', desc: '10项' }, { icon: '告', title: '重大公告', desc: '6条' }, { icon: '排', title: '行业股票排行', desc: '查看' }] }
}

function getIndustryHealthPreset(industryName: string): { values: number[]; details: { icon: string; title: string; desc: string }[] } {
  const rawName = String(industryName || '').trim()
  const matchedKey = Object.keys(industryHealthPresets).find(key => rawName === key || rawName.includes(key) || key.includes(rawName))
  if (matchedKey) return industryHealthPresets[matchedKey]

  const monthsCount = 7
  const seed = rawName.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
  const base = 48 + (seed % 18)
  const values = Array.from({ length: monthsCount }, (_, index) => {
    const wave = ((seed + index * 5) % 7) - 3
    return Math.max(38, Math.min(82, Math.round(base + index * 3.2 + wave)))
  })
  return {
    values,
    details: [
      { icon: '政', title: '相关政策', desc: `${Math.max(4, Math.round(values[values.length - 1] / 10))}项` },
      { icon: '告', title: '重大公告', desc: `${Math.max(2, Math.round(values[values.length - 1] / 14))}条` },
      { icon: '排', title: '行业股票排行', desc: '查看' }
    ]
  }
}

function buildFinancialMock(score: number, multiple: number): { label: string; value: string; change: string; type: string }[] {
  const revenueGrowth = Math.round(12 + score * 0.55 + multiple * 2)
  const profitGrowth = Math.round(revenueGrowth + 8 + multiple * 1.5)
  const pe = Math.max(18, Math.round(62 - score * 0.22 + multiple * 1.8))
  const pb = (2.1 + score / 55 + multiple / 8).toFixed(1)
  const margin = (22 + score * 0.18 + multiple * 0.6).toFixed(1)
  const roe = (10 + score * 0.13 + multiple * 0.35).toFixed(1)
  return [
    { label: '营收增速', value: `${revenueGrowth}%`, change: `较上季+${Math.max(2, Math.round(multiple))}%`, type: 'is-up' },
    { label: '净利增速', value: `${profitGrowth}%`, change: '利润弹性释放', type: 'is-up' },
    { label: 'PE(TTM)', value: `${pe}倍`, change: multiple >= 10 ? '成长估值' : '行业中枢', type: multiple >= 10 ? '' : 'is-down' },
    { label: 'PB', value: `${pb}倍`, change: '资产质量稳定', type: '' },
    { label: '毛利率', value: `${margin}%`, change: `+${(multiple / 2).toFixed(1)}%`, type: 'is-up' },
    { label: 'ROE', value: `${roe}%`, change: score >= 88 ? '高于行业' : '接近行业', type: 'is-up' }
  ]
}

export function extractTagFromText(text: string): TagItem {
  if (!text) return { tag: '', full: '' }
  const full = String(text).trim()
  const tagMatch = full.match(/^([^:]{1,30})::([\s\S]+)$/)
  if (tagMatch) {
    let tag = tagMatch[1].trim()
    if (tag.length > 30) tag = tag.substring(0, 30) + '…'
    return { tag, full: tagMatch[2].trim() || full }
  }
  const firstClause = full.split(/[，。；！？\n]/)[0]?.trim() || full
  const tag = firstClause.length > 30 ? firstClause.substring(0, 30) + '…' : firstClause
  return { tag, full }
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
  trendScoreDataRef?: Ref<any | null>
) {
  const curatedProfile = computed(() => getCuratedStockProfile(symbolRef.value))
  const profileScore = computed(() => Number(curatedProfile.value?.aiScore || 78))
  const profileTheme = computed(() => curatedProfile.value?.theme || quoteRef.value?.industry || '成长赛道')
  const profileName = computed(() => curatedProfile.value?.name || quoteRef.value?.name || '该股')
  const expectedMultipleText = computed(() => curatedProfile.value?.expectedMultiple || '1.5倍')
  const expectedMultipleNumber = computed(() => Number(String(expectedMultipleText.value).replace('倍', '').trim()) || 1.5)

  // 趋势股评分后端数据（四维：技术面/行业赛道景气/消息面催化/基本面）
  const trendApiData = computed(() => trendScoreDataRef?.value || null)
  const trendVetoed = computed(() => Boolean(trendApiData.value?.vetoed))
  const trendVetoReasons = computed<string[]>(() => trendApiData.value?.reasons || [])
  const realTrendScore = computed(() => (trendApiData.value && !trendVetoed.value) ? Number(trendApiData.value.score) || 0 : 0)
  const realTrendLabel = computed(() => (trendApiData.value && !trendVetoed.value) ? String(trendApiData.value.label || '') : '')
  const realTrendMultiple = computed(() => (trendApiData.value && !trendVetoed.value) ? String(trendApiData.value.expectedMultiple || '') : '')

  const midMockData = computed(() => {
    const score = profileScore.value
    const multiple = expectedMultipleNumber.value
    const industryPreset = getIndustryHealthPreset(profileTheme.value)
    const trendValues = industryPreset.values.map((value, index) => ({
      month: ['10月', '11月', '12月', '1月', '2月', '3月', '4月'][index],
      value
    }))
    const healthScore = trendValues[trendValues.length - 1].value
    return {
      finance: buildFinancialMock(score, multiple),
      industryHealth: {
        score: healthScore,
        levelClass: getIndustryHealthClass(healthScore),
        tags: [
          { text: profileTheme.value, type: 'success' },
          { text: '东方财富数据', type: 'success' }
        ],
        trend: trendValues,
        values: trendValues.map(item => item.value),
        details: industryPreset.details
      }
    }
  })

  const midAiAnalysis = computed<AiAnalysisView>(() => {
    const profile: Partial<CuratedProfile> = curatedProfile.value || {}
    const focus = profile.midTermFocus || ['趋势结构保持健康', '行业景气度仍在修复', '业绩拐点需要继续验证']
    const risks = profile.risks || ['业绩兑现节奏低于预期', '板块交易拥挤导致波动加大']
    const score = profileScore.value
    const conclusion = score >= 90 ? '持有可顺势跟踪' : score >= 85 ? '关注等回踩确认' : '持有者稳健观察'
    const finance = midMockData.value.finance
    const health = midMockData.value.industryHealth
    const revenue = finance.find(item => item.label === '营收增速')
    const profit = finance.find(item => item.label === '净利增速')
    const margin = finance.find(item => item.label === '毛利率')
    const roe = finance.find(item => item.label === 'ROE')
    const planStatement = getFifteenthPlanStatement(profileTheme.value)
    const summary = `${profileName.value}中线核心在于${focus.slice(0, 2).join('和')}，财报增速、毛利率与行业景气度同步改善，说明这轮行情更像业绩与赛道共同验证。`
    return {
      conclusion,
      badgeClass: score >= 90 ? 'is-bull' : 'is-hold',
      logic: summary,
      basis: [
        { tag: '业绩拐点验证', full: `财报分析显示营收增速为${revenue?.value || '--'}、净利增速为${profit?.value || '--'}，利润弹性高于收入弹性，说明中线业绩拐点正在被数据支撑。` },
        { tag: '经营质量改善', full: `毛利率为${margin?.value || '--'}、ROE为${roe?.value || '--'}，若后续继续改善，说明公司不是单纯题材上涨，而是经营质量同步抬升。` },
        { tag: '赛道景气同步', full: `行业景气指数为${health.score}分，标签集中在"${health.tags.map(tag => tag.text).join('、')}"，说明中线逻辑和所属赛道景气度保持一致。` },
        { tag: '政策方向支撑', full: `${planStatement} 这会强化中线资金对赛道景气和订单兑现的跟踪，但仍需要用财报增速与资金承接继续验证。` },
        { tag: '画像方向一致', full: `第二步股票画像中的中线关注点为"${focus.join('、')}"，与当前财报和景气卡片方向一致，因此AI给出${conclusion}。` }
      ],
      advice: score >= 90
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
    const profile: Partial<CuratedProfile> = curatedProfile.value || {}
    const theme = profileTheme.value
    const focus = profile.longTermFocus || ['产业空间仍在扩张', '核心壁垒需要持续验证', '估值弹性取决于盈利兑现']
    const multiple = expectedMultipleNumber.value
    const planStatement = getFifteenthPlanStatement(theme)
    return {
      policies: [
        { tag: '利好', type: 'is-good', text: `${planStatement}长期需求预期因此更容易获得政策资源、产业资本和应用场景共振。` },
        { tag: '利好', type: 'is-good', text: `${focus[0]}，公司若能维持份额或切入核心客户，估值体系有望继续抬升。` },
        { tag: '中性', type: 'is-neutral', text: '需要关注产业节奏和订单兑现的时间差，长线逻辑不等于短期单边上涨。' }
      ],
      moats: [
        { icon: 'A', title: '技术壁垒', desc: focus[1] || '核心技术与产品验证周期形成进入门槛。' },
        { icon: 'C', title: '客户资源', desc: multiple >= 10 ? '若进入核心客户供应链，成长曲线将明显陡峭。' : '客户结构稳定，适合观察份额提升。' },
        { icon: 'S', title: '规模效应', desc: profile.investmentLogic || `${profileName.value}具备一定规模和产业链协同基础。` },
        { icon: 'G', title: '成长曲线', desc: focus[2] || '第二增长曲线是长期估值扩张的关键。' }
      ],
      annual: [
        { label: '研发投入', value: `同比+${Math.round(18 + multiple * 3)}%`, note: '持续加码', type: 'is-up' },
        { label: '股东结构', value: multiple >= 10 ? '成长资金增配' : '机构底仓稳定', note: '积极信号', type: 'is-up' },
        { label: '资本回报率', value: `${(12 + profileScore.value / 8).toFixed(1)}%`, note: '高于行业', type: 'is-up' },
        { label: '自由现金流', value: multiple >= 10 ? '拐点修复' : '持续为正', note: '质量改善', type: 'is-up' },
        { label: '分红率', value: multiple >= 10 ? '低分红高投入' : '稳定分红', note: multiple >= 10 ? '成长优先' : '稳健', type: '' },
        { label: '商誉', value: '低风险', note: '风险可控', type: '' }
      ]
    }
  })

  const longAiAnalysis = computed<AiAnalysisView>(() => {
    const profile: Partial<CuratedProfile> = curatedProfile.value || {}
    const focus = profile.longTermFocus || ['产业空间', '核心壁垒', '成长弹性']
    const risks = profile.risks || ['产业兑现节奏低于预期']
    const multiple = expectedMultipleText.value
    const multipleNumber = expectedMultipleNumber.value
    const conclusion = multiple === '10倍'
      ? '长线可分批跟踪'
      : multipleNumber >= 3
        ? '长线弹性观察'
        : multipleNumber >= 2
          ? '长线稳健跟踪'
          : '长线耐心观察'
    const policies = longMockData.value.policies
    const moats = longMockData.value.moats
    const annual = longMockData.value.annual
    const hasMultipleModel = Boolean(curatedProfile.value) && expectedMultipleNumber.value >= 1.5
    const planStatement = getFifteenthPlanStatement(profileTheme.value)
    const hasRealTrend = Boolean(trendApiData.value) && !trendVetoed.value
    const tenxBasis = hasRealTrend
      ? { tag: '趋势股模型高分', full: `趋势股模型给出${realTrendScore.value}分和"${realTrendLabel.value}"，当前倍数预期为${realTrendMultiple.value || multiple}，因此AI给出${conclusion}。` }
      : hasMultipleModel
        ? { tag: '趋势股模型高分', full: `趋势股模型给出${profileScore.value}分和"${conclusion}"，当前倍数预期为${multiple}，因此AI给出${conclusion}。` }
        : { tag: '未入倍数池', full: '当前股票未进入精选趋势股模型池，长线判断暂以行业政策、护城河和年报质量为主，不单独给出倍数预期。' }
    const summary = `${profileName.value}长线核心在于${focus.slice(0, 2).join('和')}，行业政策、护城河和年报投入共同支撑长期估值弹性。`
    return {
      conclusion,
      badgeClass: multiple === '10倍' ? 'is-bull' : 'is-hold',
      logic: summary,
      basis: [
        { tag: '政策产业共振', full: `行业政策卡片中有${policies.filter(item => item.type === 'is-good').length}条利好线索，核心方向是"${profileTheme.value}"；${planStatement} 说明长期产业空间仍有政策、资本和场景落地推动。` },
        { tag: '护城河四维支撑', full: `公司护城河卡片显示"${moats.map(item => item.title).join('、')}"四个维度，分别对应技术、客户、规模和成长曲线，是长线估值能否扩张的基础。` },
        { tag: '研发回报双验证', full: `年报对比中研发投入为${annual.find(item => item.label === '研发投入')?.value || '--'}，资本回报率为${annual.find(item => item.label === '资本回报率')?.value || '--'}，说明长期逻辑既看投入，也看回报质量。` },
        tenxBasis,
        hasMultipleModel
          ? { tag: '反向跟踪风险', full: `需要反向跟踪的风险是：${risks[0]}，如果这个风险兑现，长线趋势股模型会先于股价表现下修。` }
          : { tag: '反向跟踪风险', full: `需要反向跟踪的风险是：${risks[0]}，如果这个风险兑现，长线判断会先从护城河和年报质量两项下修。` }
      ],
      advice: multiple === '10倍'
        ? [
          { tag: '分批跟踪高弹性', full: '已持有者可按长线高弹性样本跟踪，避免一次性重仓，适合用分批方式等待产业验证。' },
          { tag: '等估值回落确认', full: '关注者优先等估值回落、业绩公告或订单数据确认，不把短期题材上涨直接等同于十倍股兑现。' },
          { tag: '产业验证是基础', full: `若${focus[0] || '产业空间'}和${focus[1] || '核心壁垒'}持续验证，趋势股模型的高分才有继续上修基础。` },
          { tag: '四维长期跟踪', full: '长期跟踪重点放在研发投入、客户突破、现金流改善和政策落地四个维度。' }
        ]
        : [
          { tag: '趋势龙头长期观察', full: `已持有者可按趋势龙头做长期观察，核心是验证${focus[0] || '产业空间'}能否持续兑现。` },
          { tag: '估值业绩匹配再介入', full: '关注者不必按十倍股预期定价，更适合在估值和业绩匹配时分批跟踪。' },
          { tag: '护城河改善提可信度', full: `若护城河、研发投入和资本回报率继续改善，${multiple}空间的可信度会提高。` },
          { tag: '无验证降预期', full: '若长期逻辑没有新订单或新利润验证，应降低倍数预期，把它视作稳健成长而非高弹性标的。' }
        ],
      riskTips: [
        { tag: '核心风险下修', full: `核心风险是${risks[0]}，一旦兑现，趋势股模型会先从成长动能和赛道景气两项下修。` },
        { tag: '主题化停滞风险', full: '若政策催化强但订单、利润和现金流没有同步改善，长线逻辑容易停留在主题阶段。' },
        { tag: '估值透支消化风险', full: '若估值提前大幅透支，后续即使行业方向正确，也可能出现较长时间的震荡消化。' }
      ]
    }
  })

  // 趋势股模型（四维：技术面/行业赛道景气/消息面催化/基本面）：优先使用后端真实数据，无数据时使用本地 mock
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
    // 无后端数据：使用本地 mock（仅对7只精选股生效），采用四维结构
    const score = profileScore.value
    const multiple = expectedMultipleNumber.value
    const hasModel = Boolean(curatedProfile.value)
    const dimDefs = [
      { key: 'technical', label: '技术面', weight: 35, question: '低点以来涨幅、60日线位置、创新高状态、最大回撤如何？' },
      { key: 'track', label: '行业赛道景气', weight: 25, question: '市场认可度、行业渗透率、政策趋势强度如何？' },
      { key: 'news', label: '消息面催化', weight: 20, question: '机构调研、股东户数变化、硬催化情况？' },
      { key: 'fundamental', label: '基本面', weight: 20, question: '业绩爆发力、估值弹性、盈利质量、竞争壁垒？' },
    ]
    const seed = score
    const dimensions = dimDefs.map((dim, i) => {
      const wave = ((seed + i * 7) % 11) - 5
      const raw = Math.max(55, Math.min(98, Math.round(score + wave + (multiple >= 10 ? 4 : 0))))
      return { ...dim, score: raw, indicators: buildDimIndicators(dim.key, raw), subDimensions: [] }
    })
    const totalScore = Math.round(dimensions.reduce((sum, d) => sum + d.score * d.weight, 0) / dimensions.reduce((sum, d) => sum + d.weight, 0))
    return {
      hasModel,
      isReal: false,
      score: totalScore,
      expectedMultiple: expectedMultipleText.value,
      label: '',
      description: '',
      aiConclusion: '',
      updatedAt: '',
      scoreDate: '',
      dimensions,
      dimScores: dimensions.map(d => d.score),
      verdict: totalScore >= 80 ? '趋势确认' : totalScore >= 65 ? '观察验证' : '趋势走弱',
    }
  })

  function buildDimIndicators(_key: string, score: number) {
    return [
      { label: '评分', value: `${score}`, percent: score },
    ]
  }

  return {
    curatedProfile,
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
