/**
 * 执行细节面板数据源：WS 事件流 → 层级树（D21，纯前端，服务端零新增字段）
 *
 * 一级节点 = intermediate（node 切换）；二级 = tool_start/tool_end 配对；
 * 思考时长 = llm_start → 首个 text。数据源即既有 WS 事件协议。
 */
import type { ExecStepNode, ExecToolStep } from '@/shared/api/modules/agent'

/** 可入树的事件（done/error 由调用方作结束触发，不入流） */
export interface RawWsEvent {
  type: 'intermediate' | 'llm_start' | 'text' | 'tool_start' | 'tool_end'
  node?: string
  label?: string
  tool?: string
  content?: string
  ts: number
}

/** WS 事件对象 → RawWsEvent；done/error/未知类型返回 null */
export function toRawWsEvent(data: unknown, ts: number): RawWsEvent | null {
  if (typeof data !== 'object' || data === null) return null
  const d = data as Record<string, unknown>
  const sanitize = (label: unknown): string => {
    const s = String(label ?? '').trim()
    if (!s) return ''
    // 防御性过滤 JSON 字符串（双保险，万一后端 _sanitize_label 漏过）
    if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'))) {
      try { JSON.parse(s); return '处理中...' } catch { /* 非法 JSON，保留原样 */ }
    }
    return s
  }
  switch (d.type) {
    case 'intermediate':
      return { type: 'intermediate', node: String(d.node ?? ''), label: sanitize(d.label), ts }
    case 'tool_start':
      return { type: 'tool_start', tool: String(d.tool ?? ''), label: sanitize(d.label), ts }
    case 'tool_end':
      return { type: 'tool_end', tool: String(d.tool ?? ''), ts }
    case 'llm_start':
      return { type: 'llm_start', label: sanitize(d.label), ts }
    case 'text':
      return { type: 'text', content: String(d.content ?? ''), ts }
    default:
      return null
  }
}

/** 事件序列 → 执行细节层级树 */
export function buildExecTree(events: RawWsEvent[], endTs: number): ExecStepNode[] {
  const nodes: ExecStepNode[] = []
  let current: ExecStepNode | null = null
  const openTools: ExecToolStep[] = []
  const thinkStart = new Map<ExecStepNode, number>()

  for (const ev of events) {
    if (ev.type === 'intermediate') {
      if (current) current.endAt = ev.ts
      current = { node: ev.node || 'node', label: ev.label || '执行中', startAt: ev.ts, tools: [] }
      nodes.push(current)
    } else if (ev.type === 'tool_start') {
      // worker 工具事件可能直接冒泡而无 intermediate 兜底（防御）
      if (!current) {
        current = { node: 'exec', label: '执行过程', startAt: ev.ts, tools: [] }
        nodes.push(current)
      }
      const step: ExecToolStep = { tool: ev.tool || '', label: ev.label, startAt: ev.ts, status: 'done' }
      current.tools.push(step)
      openTools.push(step)
    } else if (ev.type === 'tool_end') {
      // 配对最近一个同名的未闭工具步骤
      for (let i = openTools.length - 1; i >= 0; i--) {
        if (openTools[i].tool === ev.tool) {
          openTools[i].endAt = ev.ts
          openTools.splice(i, 1)
          break
        }
      }
    } else if (ev.type === 'llm_start') {
      if (current && !thinkStart.has(current)) thinkStart.set(current, ev.ts)
    } else if (ev.type === 'text') {
      if (current && thinkStart.has(current) && current.thinkingMs == null) {
        current.thinkingMs = ev.ts - (thinkStart.get(current) ?? ev.ts)
      }
    }
  }

  // 收尾：未配对工具标 failed；关闭当前节点
  for (const step of openTools) {
    step.endAt = endTs
    step.status = 'failed'
  }
  if (current) current.endAt = endTs
  return nodes
}
