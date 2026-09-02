/**
 * 条件化预判·条件卡内文本拆分（2026-09-02）
 *
 * 模型常在一个 condition 里写主结果 + 对冲/后续情形，例如 scenario：
 *   "板块再涨 +5%；若量能萎缩至 80% 以下，则短线热度快速降温"
 * 导致一张条件卡内挤入多段“若…则…”。这里把内嵌的“；若 X 则 Y”拆成
 * 独立条件条目（各自成为一张分支卡），保持其余字段（horizon/direction 等）
 * 不变；对冲分支不带方向 pill 与锚点。
 *
 * 供板块（sectorInsight.ts）与大盘（MarketTracePrediction）映射统一接入，
 * 避免两端漂移。
 */

export interface BranchLike {
  condition: string
  scenario: string
  direction?: string | null
  met?: boolean | null
  anchor?: unknown
  /** 简洁展示关键词（新数据携带）；对冲拆分分支无 → 置空 */
  keywords?: string[]
}

/** 以“；若”/“;若”切分 scenario 为多段（保留各段文本，前导分隔符去除） */
function splitScenarioSegments(scenario: string): string[] {
  const text = scenario.trim()
  if (!text) return []
  const parts: string[] = []
  let last = 0
  const re = /[；;](?=\s*若)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    parts.push(text.slice(last, m.index).trim())
    last = m.index + 1
  }
  parts.push(text.slice(last).trim())
  return parts.filter(Boolean)
}

/** 解析单段对冲文本 "若X则Y/将Y/会Y" → { condition: X, scenario: Y }；无法解析返回 null */
function parseElseSegment(segment: string): { condition: string; scenario: string } | null {
  const parsed = /^若\s*(.+?)\s*(?:则|将|会)\s*(.+)$/.exec(segment.trim())
  if (!parsed) return null
  return { condition: parsed[1].trim(), scenario: parsed[2].trim() }
}

/** 主条件方向 → 对冲分支方向（主 bullish → bearish，反之亦然；neutral 保持中性） */
function oppositeDirection(direction: BranchLike['direction']): BranchLike['direction'] {
  if (direction === 'bullish') return 'bearish'
  if (direction === 'bearish') return 'bullish'
  if (direction === 'neutral') return 'neutral'
  return undefined
}

/**
 * 把一个条件展开为多个条件：主条目（原 condition + 首段 scenario）+
 * 每条内嵌“若X则Y”对冲拆出的独立条目（方向取主条件的反向，anchor 置空）。
 */
export function expandConditionalBranches<T extends BranchLike>(cond: T): T[] {
  const segments = splitScenarioSegments(cond.scenario)
  if (segments.length <= 1) return [cond]

  const main = segments[0]
  const extras: T[] = segments.slice(1).map((seg) => {
    const parsed = parseElseSegment(seg)
    const extra = {
      ...cond,
      condition: parsed ? parsed.condition : seg.replace(/^若\s*/, '').trim() || cond.condition,
      scenario: parsed ? parsed.scenario : '',
      direction: oppositeDirection(cond.direction),
      met: undefined,
      anchor: undefined,
      keywords: undefined,
    }
    return extra as T
  })
  return [{ ...cond, scenario: main }, ...extras]
}
