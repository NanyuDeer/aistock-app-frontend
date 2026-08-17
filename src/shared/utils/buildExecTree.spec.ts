import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildExecTree, toRawWsEvent, type RawWsEvent } from './buildExecTree'

const t = (ms: number) => 1_700_000_000_000 + ms * 1000

test('toRawWsEvent 只收可入树事件，done/error 返回 null', () => {
  assert.deepEqual(toRawWsEvent({ type: 'intermediate', label: '正在理解你的问题', node: 'qa_router' }, t(1)), {
    type: 'intermediate', node: 'qa_router', label: '正在理解你的问题', ts: t(1),
  })
  assert.deepEqual(toRawWsEvent({ type: 'tool_start', tool: 'get_quote', label: '正在查询个股行情' }, t(2)), {
    type: 'tool_start', tool: 'get_quote', label: '正在查询个股行情', ts: t(2),
  })
  assert.deepEqual(toRawWsEvent({ type: 'tool_end', tool: 'get_quote' }, t(3)), {
    type: 'tool_end', tool: 'get_quote', ts: t(3),
  })
  assert.deepEqual(toRawWsEvent({ type: 'llm_start', label: '正在生成回复...' }, t(4)), {
    type: 'llm_start', label: '正在生成回复...', ts: t(4),
  })
  assert.deepEqual(toRawWsEvent({ type: 'text', content: 'hi' }, t(5)), {
    type: 'text', content: 'hi', ts: t(5),
  })
  assert.equal(toRawWsEvent({ type: 'done', content: 'x' }, t(6)), null)
  assert.equal(toRawWsEvent({ type: 'error', content: 'x' }, t(7)), null)
  assert.equal(toRawWsEvent({ type: 'unknown' }, t(8)), null)
})

test('light 路径：仅一级节点，无工具', () => {
  const events: RawWsEvent[] = [
    { type: 'intermediate', node: 'qa_router', label: '正在理解你的问题', ts: t(1) },
    { type: 'intermediate', node: 'skill_executor', label: '正在收集证据', ts: t(2) },
    { type: 'llm_start', label: '正在生成回复...', ts: t(3) },
    { type: 'text', content: '结论', ts: t(5) },
    { type: 'intermediate', node: 'synth_answer', label: '正在综合回答', ts: t(6) },
  ]
  const tree = buildExecTree(events, t(10))
  assert.equal(tree.length, 3)
  assert.equal(tree[0].node, 'qa_router')
  assert.equal(tree[0].endAt, t(2))          // 下一节点时间关闭
  assert.deepEqual(tree[0].tools, [])
  assert.equal(tree[1].node, 'skill_executor')
  assert.equal(tree[1].thinkingMs, 2000)     // llm_start t(3) → 首个 text t(5)
  assert.equal(tree[2].node, 'synth_answer')
  assert.equal(tree[2].endAt, t(10))         // DONE 时间关闭
})

test('deep 路径：escalate 下工具二级缩进', () => {
  const events: RawWsEvent[] = [
    { type: 'intermediate', node: 'qa_router', label: '正在理解你的问题', ts: t(1) },
    { type: 'intermediate', node: 'escalate', label: '正在深度分析...', ts: t(2) },
    { type: 'tool_start', tool: 'get_quote', label: '正在查询个股行情', ts: t(3) },
    { type: 'tool_end', tool: 'get_quote', ts: t(4) },
    { type: 'tool_start', tool: 'search_cls_news', label: '正在搜索新闻', ts: t(5) },
    { type: 'tool_end', tool: 'search_cls_news', ts: t(6) },
    { type: 'intermediate', node: 'synth_answer', label: '正在综合回答', ts: t(7) },
  ]
  const tree = buildExecTree(events, t(10))
  assert.equal(tree.length, 3)
  const escalate = tree[1]
  assert.equal(escalate.node, 'escalate')
  assert.equal(escalate.tools.length, 2)
  assert.deepEqual(escalate.tools[0], { tool: 'get_quote', label: '正在查询个股行情', startAt: t(3), endAt: t(4), status: 'done' })
  assert.deepEqual(escalate.tools[1], { tool: 'search_cls_news', label: '正在搜索新闻', startAt: t(5), endAt: t(6), status: 'done' })
  assert.equal(escalate.endAt, t(7))
})

test('异常中断：未配对工具标 failed', () => {
  const events: RawWsEvent[] = [
    { type: 'intermediate', node: 'escalate', label: '正在深度分析...', ts: t(1) },
    { type: 'tool_start', tool: 'get_quote', label: '正在查询个股行情', ts: t(2) },
  ]
  const tree = buildExecTree(events, t(9))
  assert.equal(tree.length, 1)
  assert.equal(tree[0].tools[0].status, 'failed')
  assert.equal(tree[0].tools[0].endAt, t(9))
  assert.equal(tree[0].endAt, t(9))
})

test('无 intermediate 直接 tool 冒泡：fallback 节点', () => {
  const events: RawWsEvent[] = [
    { type: 'tool_start', tool: 'get_quote', label: '正在查询个股行情', ts: t(1) },
    { type: 'tool_end', tool: 'get_quote', ts: t(2) },
  ]
  const tree = buildExecTree(events, t(5))
  assert.equal(tree.length, 1)
  assert.equal(tree[0].node, 'exec')
  assert.equal(tree[0].label, '执行过程')
  assert.equal(tree[0].tools.length, 1)
})

test('思考时长只取首个 llm_start → 首个 text', () => {
  const events: RawWsEvent[] = [
    { type: 'intermediate', node: 'synth_answer', label: '正在综合回答', ts: t(1) },
    { type: 'llm_start', label: '正在生成回复...', ts: t(2) },
    { type: 'llm_start', label: '再次生成...', ts: t(4) },
    { type: 'text', content: 'a', ts: t(5) },
    { type: 'text', content: 'b', ts: t(6) },
  ]
  const tree = buildExecTree(events, t(8))
  assert.equal(tree[0].thinkingMs, 3000)  // t(5) - t(2)，不被第二个 llm_start 覆盖
})

test('闸门短路：无事件 → 空数组', () => {
  assert.deepEqual(buildExecTree([], t(1)), [])
})
