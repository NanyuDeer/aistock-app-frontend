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

test('单轮用量 footer 进气泡（turn-usage 与深度分析按钮同行；底部 UsageBar 已移除）', () => {
  assert.match(pageSource, /class="msg-footer"/)
  assert.match(pageSource, /class="turn-usage"/)
  assert.match(pageSource, /msg\.tokenUsage\.total_tokens/)
  assert.doesNotMatch(pageSource, /import UsageBar/)
  assert.doesNotMatch(pageSource, /<UsageBar/)
})

test('deep 卡片经 CardRenderer 渲染时不再重复渲染 DeepSummaryCard（兼容回退守卫）', () => {
  assert.match(pageSource, /msg\.cards\?\.some\(c => c\.card_type === 'deep'\)/)
})

test('改进14：引入 parseMarkdownSections + SectionCard（分节卡片化）', () => {
  assert.match(pageSource, /parseMarkdownSections/)
  assert.match(pageSource, /SectionCard/)
})

test('改进14：AI 气泡内容区支持分节渲染（getSections 函数）', () => {
  assert.match(pageSource, /getSections/)
})

test('Phase 4-2 语音输入：麦克风按钮仅支持平台显示（speechInput 接入）', () => {
  assert.match(pageSource, /import \{\s*isSpeechInputSupported,\s*startSpeechRecognition,\s*stopSpeechRecognition,\s*\} from '@\/shared\/utils\/speechInput'/)
  assert.match(pageSource, /const speechSupported = isSpeechInputSupported\(\)/)
  assert.match(pageSource, /v-if="speechSupported"/)
  assert.match(pageSource, /name="mic-line"/)
})

test('Phase 4-2 语音输入：识别文本回填 inputText（可编辑），不自动发送', () => {
  // tap 切换：isListening 时结束识别，否则开始识别并回填
  assert.match(pageSource, /@tap="handleMicTap"/)
  assert.match(pageSource, /stopSpeechRecognition\(\)/)
  assert.match(pageSource, /inputText\.value = result\.text/)
  // 回填后必须走用户手动发送（handleSend 只被发送按钮/确认键触发），识别回调内禁止直接 chatStream.send
  assert.doesNotMatch(pageSource, /handleMicTap[\s\S]{0,600}chatStream\.send/)
})

test('Phase 4-2 语音输入：识别失败轻提示（toast），不阻塞文本输入；无 TTS', () => {
  assert.match(pageSource, /正在聆听…/)
  assert.match(pageSource, /uni\.showToast\(\{ title: result\.error/)
  assert.match(pageSource, /uni\.hideToast\(\)/)
  assert.doesNotMatch(pageSource, /speechSynthesis|SpeechSynthesis|playVoice|tts/i)
})

test('Phase 4-2 语音输入：await pending 防御 try/catch（意外 reject 复位聆听状态 + 回退 toast）', () => {
  // 核心函数保证 Promise 永不 reject，但页面仍须防御：await 包在 try 内，
  // catch 中复位 isListening 并回退轻提示，避免麦克风按钮卡在 active / toast 悬挂
  assert.match(pageSource, /try \{[\s\S]*?const result = await pending/)
  assert.match(pageSource, /catch \{[\s\S]*?isListening\.value = false/)
  assert.match(pageSource, /语音识别失败，请重试/)
})
