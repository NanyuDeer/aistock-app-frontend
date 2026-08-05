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

test('渲染组件已接入（ReasoningPanel/CardRenderer/DeepSummaryCard 兼容字段）', () => {
  assert.match(pageSource, /DeepSummaryCard/)
  assert.match(pageSource, /ReasoningPanel/)
  assert.match(pageSource, /CardRenderer/)
  assert.match(pageSource, /lastDeepReport/)
  assert.match(pageSource, /execSteps/)
})

test('force_deep 深度分析按钮已接入（仅非 deep 回复显示）', () => {
  assert.match(pageSource, /rerunDeep/)
  assert.match(pageSource, /forceDeep: true/)
})

test('流式过程块渲染 ReasoningPanel（streamingReasoning 绑定，dot 动画）', () => {
  assert.match(pageSource, /streamingReasoning/)
  assert.match(pageSource, /<ReasoningPanel\s+v-if="streamingReasoning\.length > 0"/)
})

test('AI 气泡渲染顺序：ReasoningPanel → CardRenderer → mp-html → DeepSummaryCard', () => {
  const order = (re: RegExp) => pageSource.search(re)
  const reasoning = order(/<ReasoningPanel/)
  const renderer = order(/<CardRenderer/)
  const html = order(/<mp-html/)
  const deep = order(/<DeepSummaryCard/)
  assert.ok(reasoning !== -1 && renderer !== -1 && html !== -1 && deep !== -1)
  assert.ok(reasoning < renderer && renderer < html && html < deep)
})

test('P9 会话管理：标题旁会话入口 + onLoad 自动建会话 + 首次消息 upsert', () => {
  assert.match(pageSource, /chat-history-line/)
  assert.match(pageSource, /navigateTo\(\{ url: '\/pages-sub-app\/chat\/sessions' \}\)/)
  assert.match(pageSource, /createSession\(\)/)
  assert.match(pageSource, /upsertChatSession\(chatStore\.sessionId, content\)/)
})

test('用户气泡升级为品牌渐变 + 阴影（Design Token）', () => {
  assert.match(pageSource, /\.msg-content\.user[\s\S]*?background: \$brand-gradient/)
  assert.match(pageSource, /\.msg-content\.user[\s\S]*?box-shadow: \$shadow-primary/)
})

test('AI 气泡升级圆角与阴影（Design Token）', () => {
  assert.match(pageSource, /\.bubble[\s\S]*?border-radius: \$r-lg/)
  assert.match(pageSource, /\.bubble[\s\S]*?box-shadow: \$shadow-card/)
})

test('计费条 UsageBar 接入（快捷按钮下、输入栏上）', () => {
  assert.match(pageSource, /import UsageBar from '\.\/UsageBar\.vue'/)
  const quickIdx = pageSource.indexOf('class="quick-skills"')
  const usageIdx = pageSource.indexOf('<UsageBar')
  const inputIdx = pageSource.indexOf('class="input-bar"')
  assert.ok(quickIdx !== -1 && usageIdx !== -1 && inputIdx !== -1)
  assert.ok(quickIdx < usageIdx && usageIdx < inputIdx)
})

test('deep 卡片经 CardRenderer 渲染时不再重复渲染 DeepSummaryCard（兼容回退守卫）', () => {
  assert.match(pageSource, /msg\.cards\?\.some\(c => c\.card_type === 'deep'\)/)
})
