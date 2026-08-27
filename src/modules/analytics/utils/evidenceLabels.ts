/**
 * 证据 ID → 中文关键词映射。
 *
 * 项目存在两套证据 ID 命名风格：
 * - 大写下划线（如 NEWS_001、SEARCH_007、SECTORS_ALL、MAIN_FORCE_ALL）
 * - 小写点路径（如 a_share.main_force.xxx、global_markets）
 *
 * 映射策略：精确匹配 → 前缀匹配 → 兜底（截断最后一段，避免泄漏完整代码路径）。
 */

const PREFIX_RULES: Array<{ pattern: string; label: string }> = [
  // 大写下划线风格
  { pattern: 'NEWS_', label: '新闻' },
  { pattern: 'SEARCH_', label: '搜索证据' },
  { pattern: 'INDEX_', label: '指数行情' },
  { pattern: 'SECTORS_', label: '板块数据' },
  { pattern: 'MAIN_FORCE_', label: '主力资金' },
  // 小写点路径风格
  { pattern: 'a_share.main_force.', label: '主力资金' },
  { pattern: 'a_share.sectors.', label: '板块数据' },
  { pattern: 'a_share.indexes.', label: '指数表现' },
]

const EXACT_RULES: Record<string, string> = {
  global_markets: '全球市场',
}

/**
 * 将单个证据 ID 转换为中文关键词。
 * 未知 ID 兜底截断最后一段 `.` 后部分，避免显示完整代码路径。
 */
export function labelEvidenceId(id: string): string {
  const trimmed = (id || '').trim()
  if (!trimmed) return ''

  // 1. 精确匹配
  if (EXACT_RULES[trimmed]) return EXACT_RULES[trimmed]

  // 2. 前缀匹配（按规则顺序，首个命中返回）
  for (const rule of PREFIX_RULES) {
    if (trimmed.startsWith(rule.pattern)) return rule.label
  }

  // 3. 兜底：截断最后一段
  const lastSegment = trimmed.split('.').pop() || trimmed
  return lastSegment
}

/**
 * 将证据 ID 列表转换为关键词列表（去重，保持首次出现顺序，过滤空）。
 */
export function labelEvidenceList(ids: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const id of ids) {
    const label = labelEvidenceId(id)
    if (label && !seen.has(label)) {
      seen.add(label)
      result.push(label)
    }
  }
  return result
}
