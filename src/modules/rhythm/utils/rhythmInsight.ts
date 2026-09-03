import type { RhythmBranch, RhythmCard } from '@/shared/api/modules/agent'

/** 洞见卡结构化预判子集（结构性对齐 ConditionalForecastBlock/InsightCard 入参，仅节奏用到的字段） */
export interface RhythmInsightCondition {
  horizon: 'short'
  condition: string
  scenario: string
  anchor?: { threshold?: string; metric?: string }
}
export interface RhythmInsightStructured {
  conditions: RhythmInsightCondition[]
}
export interface RhythmInsightCard {
  title: string
  trace?: string
  structured?: RhythmInsightStructured | null
  time: string
}

const LEVEL_LABEL: Record<string, string> = { ice: '冰点', low: '低迷', normal: '常温', active: '活跃', euphoria: '亢奋' }
const SLOT_LABEL: Record<string, string> = { after_close: '收盘基准', morning: '盘前', midday: '午间' }

/** 剥离全角/半角括号段（与 ConditionalForecastBlock.condMain 展示口径一致），返回 [主干, 括号段|空] */
function splitParen(text: string): [string, string] {
  const m = text.match(/（[^）]*）|\([^)]*\)/)
  if (!m) return [text, '']
  return [text.replace(m[0], ''), m[0].replace(/^[（(]|[）)]$/g, '')]
}

function toCondition(b: RhythmBranch): RhythmInsightCondition | null {
  if (b.condition.kind !== 'interval') return null // enum（事件待公布）分支不进 structured
  const label = b.condition.label || b.condition.value || b.condition.indicator || ''
  const [main, paren] = splitParen(label)
  const note = b.conclusion.note || ''
  const range = b.conclusion.range || ''
  const condition: RhythmInsightCondition = {
    horizon: 'short',
    condition: main,
    scenario: [note, range].filter(Boolean).join(' '),
  }
  if (paren) condition.anchor = { threshold: paren }
  return condition
}

/** 节奏状态卡 → 统一洞见卡入参；不可拼装/为空返回 null（整卡不渲染，杜绝空壳与臆造） */
export function toRhythmInsight(card: RhythmCard | null | undefined, slot: string, targetDate: string): RhythmInsightCard | null {
  if (!card) return null
  const level = LEVEL_LABEL[card.level ?? ''] ?? ''
  const band = (card.position_band?.text ?? '').trim().replace(/^建议仓位\s*/, '')
  const title = card.conflict
    ? '信号背离 · 仅区间与提示'
    : [level, band].filter(Boolean).join(' · ')
  if (!title) return null

  const structured = (card.branches ?? []).map(toCondition).filter((c): c is RhythmInsightCondition => c !== null)
  const trace = buildTrace(card)
  const time = `${targetDate.slice(5)} · ${SLOT_LABEL[slot] ?? slot}`

  return {
    title,
    trace,
    structured: structured.length ? { conditions: structured } : undefined,
    time,
  }
}

function buildTrace(card: RhythmCard): string | undefined {
  const ev = card.phase_evidence
  if (ev && typeof ev === 'object') {
    const reason = String(ev.reason ?? '')
    const slope = ev.slope != null ? `斜率 ${ev.slope}` : ''
    const text = [reason, slope].filter(Boolean).join(' · ')
    if (text) return text
  }
  return undefined
}
