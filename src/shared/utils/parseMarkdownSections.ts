/**
 * 改进 14：Markdown 分节识别纯函数。
 * 按二级/三级标题将 markdown 切分为段，每段分类为语义变体。
 * 用于前端 SectionCard 区块卡片渲染（方案 B：纯前端，不依赖后端）。
 */

export type SectionVariant = 'conclusion' | 'points' | 'notes' | 'risk' | 'other'

export interface MarkdownSection {
  variant: SectionVariant
  title: string
  body: string
}

// 严格匹配（大小写不敏感）
const STRICT_MAP: Record<string, SectionVariant> = {
  '核心结论': 'conclusion',
  '结论': 'conclusion',
  '行情要点': 'points',
  '要点': 'points',
  '数据说明': 'notes',
  '风险提示': 'risk',
  '风险': 'risk',
  '免责声明': 'risk',
}

// 模糊兜底（标题含关键词）
const FUZZY_RULES: Array<{ keywords: string[]; variant: SectionVariant }> = [
  { keywords: ['结论', '总结', '观点', '回答'], variant: 'conclusion' },
  { keywords: ['要点', '亮点', '分析', '表现', '概况'], variant: 'points' },
  { keywords: ['说明', '备注', '注意', '数据', '来源'], variant: 'notes' },
  { keywords: ['风险', '免责', '提示'], variant: 'risk' },
]

function classifyVariant(title: string): SectionVariant {
  const normalized = title.trim().toLowerCase()
  for (const [key, variant] of Object.entries(STRICT_MAP)) {
    if (normalized === key.toLowerCase()) return variant
  }
  for (const rule of FUZZY_RULES) {
    if (rule.keywords.some(kw => title.includes(kw))) return rule.variant
  }
  return 'other'
}

export function parseMarkdownSections(content: string): MarkdownSection[] {
  if (!content || !content.trim()) return []

  const lines = content.split('\n')
  const sections: MarkdownSection[] = []
  let currentTitle = ''
  let currentBody: string[] = []
  let hasCurrentSection = false
  let preamble: string[] = []

  const headingRe = /^(#{2,3})\s+(.+)$/

  for (const line of lines) {
    const match = line.match(headingRe)
    if (match) {
      // 保存上一个 section
      if (hasCurrentSection) {
        const body = currentBody.join('\n').trim()
        if (body) {
          sections.push({ variant: classifyVariant(currentTitle), title: currentTitle, body })
        }
      } else if (preamble.join('\n').trim()) {
        // 保存前言
        sections.push({ variant: 'other', title: '', body: preamble.join('\n').trim() })
      }
      currentTitle = match[2].trim()
      currentBody = []
      hasCurrentSection = true
      preamble = []
    } else if (hasCurrentSection) {
      currentBody.push(line)
    } else {
      preamble.push(line)
    }
  }

  // 保存最后一个 section
  if (hasCurrentSection) {
    const body = currentBody.join('\n').trim()
    if (body) {
      sections.push({ variant: classifyVariant(currentTitle), title: currentTitle, body })
    }
  } else if (preamble.join('\n').trim()) {
    sections.push({ variant: 'other', title: '', body: preamble.join('\n').trim() })
  }

  return sections
}
