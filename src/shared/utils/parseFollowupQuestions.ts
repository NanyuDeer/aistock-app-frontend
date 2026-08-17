/**
 * 引导追问解析（改进 20，批次 1 2026-08-13）
 *
 * 把 synth_answer 末尾「你可以问我：…」引导文本解析为可点击的快捷追问条目。
 * 纯前端句式解析、保守匹配：只有「你可以问我」/「您可以问我」出现在独立行首、
 * 且条目可干净切分（顿号/斜杠/数字序号/换行分隔）、每条为问句形态且 2-40 字、
 * 总数 ≤6 时才命中；任一异常 → 返回 null，调用方回退纯文本渲染（绝不渲染错按钮）。
 * 后端契约不改（引导句由 LLM 自由生成，属展示层增强，后续后端可另行结构化）。
 */
export interface FollowupParse {
  /** 剔除「你可以问我」引导行后的正文（可为空串） */
  body: string
  /** 解析出的快捷追问条目（非空数组） */
  questions: string[]
}

const FOLLOWUP_MARKERS = ['你可以问我', '您可以问我'] as const

/** 条目分隔符：顿号/斜杠/中文分号/逗号 + 数字序号（1. 1、 1．）+ 换行 */
const SEPARATOR_RE = /[、／/；;，,]|\d+\s*[.．、]|\n+/

/** 条目首尾剥离：引号与空白（「『 " ' “ ”） */
const TRIM_EDGE_RE = /^[「『"'“\s]+|[」』"'”\s]+$/g

/** 条目尾部标点（。！？!?） */
const TRAILING_PUNCT_RE = /[。！？!?]+$/g

/** 问句形态判定：含问号，或尾部为常见疑问/咨询词（保守白名单） */
const QUESTION_TAIL_RE =
  /(怎么样|如何|什么|多少|哪些|哪个|哪只|谁|为什么|为何|吗|呢|会不会|能不能|要不要|走势|行情|表现|涨跌|分析|新闻|资金|板块|大盘|个股|前景|未来)$/

const MAX_ITEMS = 6
const MIN_ITEM_LEN = 2
const MAX_ITEM_LEN = 40

function isQuestionLike(text: string): boolean {
  if (/[?？]/.test(text)) return true
  return QUESTION_TAIL_RE.test(text)
}

export function parseFollowupQuestions(content: string): FollowupParse | null {
  if (!content) return null

  // 取最后一个 marker（引导句通常在文末；取后者更接近真实引导句）
  let markerIndex = -1
  let markerLen = 0
  for (const marker of FOLLOWUP_MARKERS) {
    const idx = content.lastIndexOf(marker)
    if (idx > markerIndex) {
      markerIndex = idx
      markerLen = marker.length
    }
  }
  if (markerIndex === -1) return null

  // 保守匹配 1：marker 必须位于行首（该行 marker 之前至多空白）——
  // 防止「你说你可以问我…」等句中叙述被误判成引导句
  const lineStart = content.lastIndexOf('\n', markerIndex) + 1
  if (content.slice(lineStart, markerIndex).trim() !== '') return null

  // 引导内容：marker 之后到文末（支持「你可以问我：」后换行枚举序号列表的常见格式）
  const tail = content.slice(markerIndex + markerLen)
  const rest = tail.replace(/^[：:、，,\s]+/, '').trim()
  if (!rest) return null

  const rawItems = rest.split(SEPARATOR_RE).map((s) => s.trim()).filter((s) => s !== '')
  if (rawItems.length === 0 || rawItems.length > MAX_ITEMS) return null

  const questions: string[] = []
  for (const raw of rawItems) {
    const cleaned = raw.replace(TRIM_EDGE_RE, '').replace(TRAILING_PUNCT_RE, '').trim()
    // 保守匹配 2：任一条目长度/形态非法 → 整体回退纯文本（不渲染半对半错的按钮）
    if (cleaned.length < MIN_ITEM_LEN || cleaned.length > MAX_ITEM_LEN) return null
    if (!isQuestionLike(cleaned)) return null
    questions.push(cleaned)
  }

  const body = content.slice(0, lineStart).trim()
  return { body, questions }
}
