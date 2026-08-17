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

test('Phase 4-2 交互式确认：ConfirmSheet 渲染 + pendingConfirm watch + sendConfirmResponse 调用', () => {
  assert.match(pageSource, /import ConfirmSheet from '@\/shared\/components\/ConfirmSheet\.vue'/)
  assert.match(pageSource, /<ConfirmSheet/)
  assert.match(pageSource, /const pendingConfirm = chatStream\.pendingConfirm/)
  assert.match(pageSource, /chatStream\.sendConfirmResponse\(/)
  assert.match(pageSource, /@select="handleConfirmSelect"/)
  assert.match(pageSource, /@close="handleConfirmClose"/)
})

test('Phase 4-2 交互式确认：点选后本地 waiting 态（已确认 XX 由 ConfirmSheet 呈现）；关框=「都不是」→ abandonConfirm 发送 none 让后端立即回退澄清', () => {
  assert.match(pageSource, /confirmWaiting/)
  assert.match(pageSource, /handleConfirmClose/)
  assert.match(pageSource, /:waiting="confirmWaiting"/)
  // 点选后 sendConfirmResponse 同步清 pendingConfirm → 弹框内容改为本地快照 ref 呈现
  // （否则 waiting 态弹框只剩「已确认…」行，问题/选项瞬时清空）
  assert.match(pageSource, /:question="confirmQuestion"/)
  assert.match(pageSource, /:options="confirmOptions"/)
  // final review I-1：关框/超时放弃 → abandonConfirm（发送 choice="none"，后端立即 confirm_timeout
  // 重跑回退既有澄清；WS 不可用则软 re-arm 由后端 60s 超时自动回退）——修复前 doneReceived 未复位，
  // 后端回退澄清的事件流被前端静默丢弃 → 澄清永不渲染（对话悬空）
  assert.match(pageSource, /chatStream\.abandonConfirm\(\)/)
  assert.match(pageSource, /CONFIRM_TIMEOUT_MS/)
  assert.match(pageSource, /clearConfirmTimer\(\)/)
})

test('Phase 4-2 交互式确认：pendingConfirm 到达时快照 question/options 到本地 ref（防清空）', () => {
  assert.match(pageSource, /const confirmQuestion = ref\(''\)/)
  assert.match(pageSource, /const confirmOptions = ref<ConfirmOption\[]>\(\[\]\)/)
  // watch 内快照赋值（晚于 sendConfirmResponse 清 pendingConfirm，弹框内容在 waiting 态仍完整）
  assert.match(pageSource, /confirmQuestion\.value = v\.question/)
  assert.match(pageSource, /confirmOptions\.value = v\.options/)
})

// ─── 改进 18（批次 1，2026-08-13）：新会话空态引导 ───

test('改进18：空态欢迎页渲染 + 示例问题点击即发（复用 quickAsk）', () => {
  assert.match(pageSource, /empty-guide/)
  assert.match(pageSource, /emptyGuideQuestions/)
  assert.match(pageSource, /v-for="q in emptyGuideQuestions"/)
  assert.match(pageSource, /@tap="quickAsk\(q\.text\)"/)
})

test('改进18：显示条件 = 当前会话消息为空 且 未被用户关闭（storage 持久化）；可关闭', () => {
  assert.match(pageSource, /showEmptyGuide/)
  assert.match(pageSource, /displayMessages\.value\.length === 0/)
  assert.match(pageSource, /CHAT_EMPTY_GUIDE_CLOSED/)
  assert.match(pageSource, /closeEmptyGuide/)
})

test('改进18：示例问题覆盖六大类（大盘/个股/资金/对比/新闻/科普）', () => {
  assert.match(pageSource, /今日大盘怎么样/)
  assert.match(pageSource, /贵州茅台现在怎么样/)
  assert.match(pageSource, /今日板块资金流向如何/)
  assert.match(pageSource, /贵州茅台和五粮液哪个更好/)
  assert.match(pageSource, /宁德时代最近有什么新闻/)
  assert.match(pageSource, /市盈率是什么/)
})

// ─── 改进 20（批次 1，2026-08-13）：引导追问按钮化 ───

test('改进20：引导追问按钮化（parseFollowupQuestions 接入 + 按钮点击即发）', () => {
  assert.match(pageSource, /parseFollowupQuestions/)
  assert.match(pageSource, /followup-questions/)
  assert.match(pageSource, /@tap="quickAsk\(q\)"/)
})

test('改进20：解析失败回退纯文本（followupOf 返回 null 时走既有 msg.content 渲染）', () => {
  assert.match(pageSource, /function followupOf\(msg: ChatMessage\)/)
  assert.match(pageSource, /v-else-if="msg\.content"/)
})

// ─── 改进 16（批次 1，2026-08-13）：对话滚动交互（豆包式） ───

test('改进16：scroll-view 上滑检测接入（@scroll + measureProximity 三态判定）', () => {
  assert.match(pageSource, /@scroll="onScroll"/)
  assert.match(pageSource, /measureProximity/)
  assert.match(pageSource, /followPaused/)
})

test('5B：resetFollow 纯复位（无滚底/无定时器——硬约束 #3）', () => {
  assert.match(pageSource, /function resetFollow\(\)/)
  // 函数体内不得出现滚底或定时器（纯复位：仅 followPaused=false + lastFollowSig=''）
  assert.doesNotMatch(pageSource, /function resetFollow\(\)[\s\S]{0,200}scrollToBottom/)
  assert.doesNotMatch(pageSource, /function resetFollow\(\)[\s\S]{0,200}followTimer/)
})

test('5B：useChatStream 接线 onBeforeStream → resetFollow', () => {
  assert.match(pageSource, /useChatStream\(\{ onBeforeStream: \(\) => resetFollow\(\) \}\)/)
})

test('5B：四处显式滚底已删除，watch(isStreaming) v=true 唯一收口（spy===1）', () => {
  // handleSend / quickAsk / rerunDeep 函数体内不再有显式 scrollToBottom()
  assert.doesNotMatch(pageSource, /function handleSend\(\)[\s\S]{0,300}scrollToBottom\(\)/)
  assert.doesNotMatch(pageSource, /function quickAsk\([\s\S]{0,300}scrollToBottom\(\)/)
  assert.doesNotMatch(pageSource, /function rerunDeep\([\s\S]{0,300}scrollToBottom\(\)/)
  // onLoad nextTick 回调（send(q) 路径）不再有显式滚底——由 watch(isStreaming) v=true 收口
  assert.doesNotMatch(pageSource, /void chatStream\.send\(q\)[\s\S]{0,120}scrollToBottom\(\)/)
  // watch(isStreaming) v=true 分支 = 唯一滚底+定时器收口点
  assert.match(pageSource, /watch\(isStreaming[\s\S]{0,600}scrollToBottom\(\)[\s\S]{0,120}followTimer = setInterval/)
})

test('5B：watch(pendingConfirm) v=true 复位跟随 + 滚底（confirm_request=第 4 个新交互入口）', () => {
  assert.match(pageSource, /watch\(pendingConfirm[\s\S]{0,600}resetFollow\(\)[\s\S]{0,80}scrollToBottom\(\)/)
})

test('5B：onScroll 三态接入（restoreInProgress 守卫 + 位置/高度缓存 + measureProximity）', () => {
  assert.match(pageSource, /restoreInProgress\.value\) return/)
  assert.match(pageSource, /let currentScrollTop = 0/)
  assert.match(pageSource, /let currentScrollHeight = 0/)
  assert.match(pageSource, /currentScrollTop = scrollTop/)
  assert.match(pageSource, /if \(scrollHeight > 0\) currentScrollHeight = scrollHeight/)
  assert.match(pageSource, /const proximity = measureProximity\(scrollTop, scrollHeight, viewport\)/)
  // 三态：near 恢复 / far 暂停 / unknown 保持（scrollHeight<=0 不谎称贴底）
  assert.match(pageSource, /proximity === 'near'/)
  assert.match(pageSource, /proximity === 'far'/)
})

test('改进16：「回到最新」悬浮按钮（上滑暂停后显示，点击回底 + 恢复跟随）', () => {
  assert.match(pageSource, /back-to-latest/)
  assert.match(pageSource, /v-if="followPaused"/)
  assert.match(pageSource, /backToLatest/)
})

test('改进16：暂停跟随期间不钉底（定时器/打字机滚动均走 scrollToBottomIfFollowing 守卫）', () => {
  assert.match(pageSource, /scrollToBottomIfFollowing/)
  assert.match(pageSource, /if \(followPaused\.value\) return/)
  assert.match(pageSource, /followPaused\.value = false/)
})
