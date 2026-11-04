import type { RhythmBranch, RhythmCard } from '@/shared/api/modules/agent'
import { formatBandText } from '@/shared/utils/rhythmBand'
import { positionShort } from '@/shared/utils/rhythmColors'
import { shanghaiDateTimeParts } from '@/shared/utils/tradingTime'

/** 洞见卡结构化预判子集（结构性对齐 ConditionalForecastBlock/InsightCard 入参，仅节奏用到的字段） */
export interface RhythmInsightCondition {
  horizon: 'short'
  condition: string
  scenario: string
  /** 情景方向（自挂，可与同档基准方向相反） */
  direction?: 'bullish' | 'bearish' | 'neutral'
  /** 结构化仓位动作（add/reduce/hold + 成数，如 "+2 成"；后端 position_action 透传） */
  positionAction?: { direction: 'add' | 'reduce' | 'hold'; change: string; band?: { min?: number | null; max?: number | null; text?: string } | null }
  /** 验证锚点（阈值/指标；括号兜底或后端 anchor 透传） */
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
  /** 生成时刻灰字（次行；created_at 上海时区 HH:MM，恒真展示，不做补偿） */
  timeNote?: string
}

const SLOT_LABEL: Record<string, string> = { after_close: '收盘基准', morning: '盘前', midday: '午间' }

/**
 * 洞见卡标题两段式：`{仓位} · {压制原因}`（例「空仓观望 · 闸门压制」）。
 * 压制原因由后端确定性产出（溯源链路 T8/T10）；**当前后端尚未提供该字段** →
 * 恒缺 → 退化为纯仓位（只保留第一段，不补分隔符、不伪造第二段）。
 * 接线时只改本函数，视图层不得自行拼字符串。
 */
export function composeRhythmTitle(positionText: string, reason?: string): string {
  return [positionText, reason].filter(Boolean).join(' · ')
}

/** 标题第二段来源（后端未接线，恒 undefined） */
function suppressReason(_card: RhythmCard): string | undefined {
  return undefined
}

/** 剥离全角/半角括号段（与 ConditionalForecastBlock.condMain 展示口径一致），返回 [主干, 括号段|空] */
function splitParen(text: string): [string, string] {
  const m = text.match(/（[^）]*）|\([^)]*\)/)
  if (!m) return [text, '']
  return [text.replace(m[0], ''), m[0].replace(/^[（(]|[）)]$/g, '')]
}

function toCondition(b: RhythmBranch): RhythmInsightCondition | null {
  if (b.condition.kind !== 'interval' && b.condition.kind !== 'enum') return null
  let main = ''
  let paren = ''
  if (b.condition.kind === 'enum') {
    // 事件分支：条件 = 事件标题预期差 + 档（value 优先，防 label 错位）
    main = `${b.condition.indicator || ''}${b.condition.value || ''}`
  } else {
    const label = b.condition.label || b.condition.value || b.condition.indicator || ''
    ;[main, paren] = splitParen(label)
  }
  const note = b.conclusion.note || ''
  const range = b.conclusion.range || ''
  const condition: RhythmInsightCondition = {
    horizon: 'short',
    condition: main,
    scenario: [note, range].filter(Boolean).join(' '),
    direction: b.conclusion.direction,
    positionAction: b.position_action,
    anchor: b.anchor ? { threshold: b.anchor.threshold, metric: b.anchor.metric } : undefined,
  }
  if (paren && !condition.anchor) condition.anchor = { threshold: paren }
  return condition
}

/** 洞见卡时间行（v3 R-H）：主 = MM-DD · slot 标签（版本标注，恒有——无三时点 pill 后卡上唯一的版本说明）；
 * 次 = HH:MM 生成（created_at 上海时区，恒真展示生产漂移值，spec §8.1 反成诊断线索；缺失/非法不渲染次行）。 */
function formatCardTimeParts(targetDate: string, slot: string, createdAt?: string): { time: string; timeNote?: string } {
  const datePart = targetDate.slice(5)
  const time = `${datePart} · ${SLOT_LABEL[slot] ?? slot}`
  if (!createdAt) return { time }
  const ts = new Date(createdAt)
  if (Number.isNaN(ts.getTime())) return { time }
  const { hour, minute } = shanghaiDateTimeParts(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return { time, timeNote: `${p(hour)}:${p(minute)} 生成` }
}

/** 节奏状态卡 → 统一洞见卡入参；不可拼装/为空返回 null（整卡不渲染，杜绝空壳与臆造） */
export function toRhythmInsight(
  card: RhythmCard | null | undefined,
  slot: string,
  targetDate: string,
  createdAt?: string,
): RhythmInsightCard | null {
  if (!card) return null
  const band = formatBandText(card.position_band?.text)
  // 语义收口（2026-11-04）：节奏＝仓位建议。标题恒取仓位文案（缺失时回退档位短码），
  // 不再退回 level 档位词（冰点/低迷/…与情绪温度分档同名词，并列会造成「低迷 + 亢奋」的观感冲突）。
  const positionText = band || positionShort(card.position_index)
  const title = card.conflict
    ? '信号背离 · 仅区间与提示'
    : composeRhythmTitle(positionText, suppressReason(card))
  if (!title) return null

  const structured = (card.branches ?? []).map(toCondition).filter((c): c is RhythmInsightCondition => c !== null)
  const trace = buildTrace(card)
  const { time, timeNote } = formatCardTimeParts(targetDate, slot, createdAt)

  return {
    title,
    trace,
    structured: structured.length ? { conditions: structured } : undefined,
    time,
    timeNote,
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
