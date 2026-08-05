import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const pageSource = readFileSync(new URL('./index.vue', import.meta.url), 'utf8')

test('页面已收敛为单对话 tab（市场复盘链路移除）', () => {
  assert.doesNotMatch(pageSource, /market_review/)
  assert.doesNotMatch(pageSource, /useMarketTraceQa/)
  assert.doesNotMatch(pageSource, /MarketTraceEvidence/)
  assert.doesNotMatch(pageSource, /AdvisorTraceStatus/)
  assert.doesNotMatch(pageSource, /skillResult/)
})

test('页面保留对话流核心（流式 + 快捷技能 + 输入）', () => {
  assert.match(pageSource, /useChatStream/)
  assert.match(pageSource, /quickAsk\('今日大盘怎么样'\)/)
  assert.match(pageSource, /class="input-bar"/)
})

test('深度分析摘要卡片与执行面板组件已接入', () => {
  assert.match(pageSource, /DeepSummaryCard/)
  assert.match(pageSource, /ExecStepsPanel/)
  assert.match(pageSource, /lastDeepReport/)
  assert.match(pageSource, /execSteps/)
})

test('force_deep 深度分析按钮已接入（仅非 deep 回复显示）', () => {
  assert.match(pageSource, /rerunDeep/)
  assert.match(pageSource, /forceDeep: true/)
})

test('流式过程块渲染 ReasoningCard（streamingReasoning 绑定，dot 动画）', () => {
  assert.match(pageSource, /streamingReasoning/)
  assert.match(pageSource, /<ReasoningCard\s+v-if="streamingReasoning\.length > 0"/)
})

test('P9 会话管理：标题旁会话入口 + onLoad 自动建会话 + 首次消息 upsert', () => {
  assert.match(pageSource, /chat-history-line/)
  assert.match(pageSource, /navigateTo\(\{ url: '\/pages-sub-app\/chat\/sessions' \}\)/)
  assert.match(pageSource, /createSession\(\)/)
  assert.match(pageSource, /upsertChatSession\(chatStore\.sessionId, content\)/)
})
