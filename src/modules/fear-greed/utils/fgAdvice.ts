/**
 * 恐贪指数「投资建议」规则引擎（纯函数，无 IO）。
 * 输入：当前复合指数 + 9 指标 + 后端板块榜；输出：配置方向/操作要点/策略文案/AI 洞见主因。
 * 规则均为确定性模板，便于单测。
 */
import type { FearGreedIndicator, FgSectorBoard, FgSectorFact } from '@/shared/api/modules/fear-greed'

export interface FgContext {
  composite: number
  indicators: FearGreedIndicator[]
  /** 后端板块榜；缺省或 availability=false 时板块回退 fallback */
  board?: FgSectorBoard
}

export interface SectorTag {
  name: string
  desc: string
  kind: 'flow-in' | 'gain' | 'warning' | 'fallback'
}

export interface AdviceResult {
  sectorTags: SectorTag[]
  actions: string[]
  advice: string
}

export function zoneLabel(composite: number): string {
  if (composite < 20) return '冰点'
  if (composite < 45) return '寒冷'
  if (composite < 55) return '常温'
  if (composite < 80) return '温热'
  return '沸点'
}

function fmtPct(v: number): string {
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
}

/** 金额（元）→ "X亿"/"-X亿" */
function fmtYuan(v: number): string {
  const yi = v / 1e8
  const abs = Math.abs(yi) < 0.01 ? '0' : `${Math.round(Math.abs(yi) * 10) / 10}`
  return `${yi < 0 ? '-' : ''}${abs}亿`
}

/** 指定榜内可用事实（过滤非正净流入按需）；返回按 pct 温和优先排序的候选 */
function pickFrom(list: FgSectorFact[], opts: { maxPct?: number; netPositive?: boolean; count: number }): FgSectorFact[] {
  const arr = list.filter((f) => (opts.maxPct == null || f.pctChange <= opts.maxPct) && (opts.netPositive !== true || f.netAmount > 0))
  return arr.slice(0, opts.count)
}

function tagOf(f: FgSectorFact, kind: SectorTag['kind'], reason: string): SectorTag {
  const lead = f.leadStock ? `，领涨 ${f.leadStock}` : ''
  // 净流入/净流出按净额符号区分，负净额展示绝对值，杜绝"净流入 -X亿"与流出原因同现的矛盾
  const direction = f.netAmount >= 0 ? '净流入' : '净流出'
  return { name: f.name, kind, desc: `${f.name} 今日 ${fmtPct(f.pctChange)}，主力${direction} ${fmtYuan(Math.abs(f.netAmount))}${lead}，${reason}` }
}

export function buildSectorTags(ctx: FgContext, fallback: { name: string; desc: string }[]): SectorTag[] {
  const board = ctx.board
  const available = board && board.availability
    && (board.sectors.topInflows.length > 0 || board.sectors.topGainers.length > 0)
  if (!available) {
    return fallback.slice(0, 3).map((f) => ({ name: f.name, desc: f.desc, kind: 'fallback' as const }))
  }
  const { topInflows, topGainers, topOutflows } = board!.sectors
  const c = ctx.composite
  const tags: SectorTag[] = []
  const addInflow = (n: number) => {
    const arr = pickFrom(topInflows, { maxPct: 5, netPositive: true, count: n })
    arr.forEach((f) => tags.push(tagOf(f, 'flow-in', '资金逆势流入、偏防御，情绪修复期相对抗跌')))
    return arr.length
  }

  if (c < 45) {
    let got = addInflow(3)
    if (got < 3) {
      for (const f of pickFrom(topGainers, { maxPct: 3, count: 3 - got })) {
        tags.push(tagOf(f, 'gain', '涨幅温和且有资金承接，具备修复弹性'))
      }
    }
  } else if (c < 55) {
    addInflow(2)
    for (const f of pickFrom(topGainers, { maxPct: 4, count: 1 })) {
      tags.push(tagOf(f, 'gain', '强势但有度，可小仓位均衡参与'))
    }
  } else if (c < 80) {
    addInflow(2)
    const outflow = topOutflows.find((f) => f.pctChange >= 3)
    const gainer = topGainers.find((f) => f.pctChange >= 5)
    if (outflow) tags.push(tagOf(outflow, 'warning', '高位放量资金流出，追高风险大，建议兑现不宜加仓'))
    // 净流出榜无高位股时回退涨幅榜：用与净流入不冲突的"涨幅已高"表述，避免"净流入+资金流出"矛盾句
    else if (gainer) tags.push(tagOf(gainer, 'warning', '当日涨幅已高、偏离成本区，追高风险大'))
    else addInflow(3)
  } else {
    addInflow(2)
    const warn = topOutflows.find((f) => f.pctChange >= 3)
    if (warn) tags.push(tagOf(warn, 'warning', '情绪过热、资金流出，勿追高'))
    else tags.push({ name: '低风险资产', kind: 'fallback', desc: '情绪过热，建议增配债券/货基等低风险品种，等待情绪回落' })
  }

  // 数量补齐到 3：用温和大涨里未超 5% 的补
  if (tags.length < 3) {
    for (const f of pickFrom(topInflows, { maxPct: 8, count: 3 - tags.length })) {
      if (!tags.some((t) => t.name === f.name)) tags.push(tagOf(f, 'flow-in', '资金面相对占优，可作配置补充'))
    }
  }
  if (tags.length < 3) {
    for (const f of pickFrom(topGainers, { maxPct: 8, count: 3 - tags.length })) {
      if (!tags.some((t) => t.name === f.name)) tags.push(tagOf(f, 'gain', '当日相对强势方向'))
    }
  }
  return tags.slice(0, 3)
}

/** 指标 key → 操作要点命中函数（返回匹配要点或 null） */
function actionFor(key: string, score: number, raw: number): string | null {
  switch (key) {
    case 'north_flow': return score <= 20 ? '回避外资重仓，关注内资定价方向' : null
    case 'break_rate': return score <= 25 ? '涨停炸板率高，接力情绪差，短线少打板' : null
    case 'seal_rate': return score <= 25 ? '封板力度弱，追涨易被套，等待放量封板信号' : null
    case 'breadth': return score < 40 ? '上涨家数占比低，普跌未止，勿急于接飞刀' : null
    case 'futures': return score <= 25 ? '股指期货深贴水，对冲盘增多，警惕继续下探' : null
    case 'equity_bond': return score <= 25 ? '股弱债稳、风险偏好收缩，均衡配置防守为先' : null
    case 'streak': return raw >= 7 ? '连板高度过高，短线情绪过热，谨防高位退潮' : null
    default: return null
  }
}

export function buildActions(ctx: FgContext): string[] {
  const zone = zoneLabel(ctx.composite)
  const hits: string[] = []
  if (zone === '沸点') hits.push('不追高，分批兑现浮盈')
  if (zone === '冰点' || zone === '寒冷') hits.push('控制仓位，分批布局，等待企稳信号')
  for (const ind of ctx.indicators) {
    const hit = actionFor(ind.key, ind.score, ind.raw)
    if (hit) hits.push(hit)
  }
  // 通用要点池：命中（含档位前缀）去重后不足 3 条时按序补足，保证任何输入恒 3 条且全文互不重复
  const pool = ['严格执行止损纪律', '关注量能与换手变化', '等待方向明朗再出手']
  return [...new Set([...hits, ...pool])].slice(0, 3)
}

/** 情绪两端驱动指标（score 最低的恐惧驱动、最高的贪婪驱动各取一个） */
function drivers(ctx: FgContext): { fear?: FearGreedIndicator; greed?: FearGreedIndicator } {
  const pool = ctx.indicators.filter((i) => !i.excluded)
  const fear = [...pool].sort((a, b) => a.score - b.score)[0]
  const greed = [...pool].sort((a, b) => b.score - a.score)[0]
  const pickFear = fear && fear.score <= 30 ? fear : undefined
  const pickGreed = greed && greed.score >= 70 ? greed : undefined
  return { fear: pickFear, greed: pickGreed }
}

export function buildDriversSentence(ctx: FgContext): string {
  const { fear, greed } = drivers(ctx)
  const parts: string[] = []
  if (fear) parts.push(`${fear.name}走弱（${fear.score.toFixed(0)} 分）拖累情绪`)
  if (greed) parts.push(`${greed.name}偏强（${greed.score.toFixed(0)} 分）提供局部支撑`)
  return parts.length ? `今日情绪主要由${parts.join('，')}驱动` : '今日各项指标均衡，无单一主导因素'
}

export function buildAdvice(ctx: FgContext): string {
  const zone = zoneLabel(ctx.composite)
  const d = buildDriversSentence(ctx)
  if (zone === '冰点' || zone === '寒冷') {
    return `${d}。市场情绪${zone}，建议控制仓位、分批布局超跌优质资产，优先资金逆势流入的防御方向，等待放量企稳。`
  }
  if (zone === '常温') {
    return `${d}。市场情绪中性、方向未明，维持现有仓位，均衡配置流入居前方向，不追高不杀跌。`
  }
  if (zone === '温热') {
    return `${d}。情绪偏热但已现分歧，建议逢高分批止盈，仓位向低位补涨与防御方向倾斜，警惕高位资金流出板块。`
  }
  return `${d}。市场情绪${zone}过热，风险收益比下降，建议大幅降仓、落袋为安，只保留低风险品种。`
}
