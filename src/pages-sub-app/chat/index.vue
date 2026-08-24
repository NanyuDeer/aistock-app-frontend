<template>
  <SubPageCard2 :title="'AI 投顾'" :no-chat-bar="true">
    <template #header-right>
      <view class="sessions-entry" @tap="goSessions">
        <SvgIcon name="chat-history-line" size="36rpx" color="#0b5fff" />
      </view>
    </template>
    <view class="chat-content">
      <!-- 消息列表（改进 16：@scroll 上滑检测 → 距底超过阈值暂停跟随，豆包式） -->
      <scroll-view scroll-y class="message-list" :scroll-top="scrollTop" @scroll="onScroll">
        <!-- 改进 18（批次 1）：新会话空态引导——当前会话消息为空且用户未关闭（storage 持久化）时显示；
             示例问题点击即发（复用 quickAsk）；「不再显示」写入全局标记，新建会话也不再现 -->
        <view v-if="showEmptyGuide" class="empty-guide">
          <view class="empty-guide-header">
            <SvgIcon name="robot-line" size="72rpx" color="#0b5fff" />
            <text class="empty-guide-title">你好，我是 AI 投顾</text>
            <text class="empty-guide-sub">大盘 · 个股 · 资金 · 对比 · 新闻 · 科普，都可以问我</text>
          </view>
          <view class="empty-guide-items">
            <view
              v-for="q in emptyGuideQuestions"
              :key="q.text"
              class="empty-guide-item"
              @tap="quickAsk(q.text)"
            >
              <text class="empty-guide-item-label">{{ q.label }}</text>
              <text class="empty-guide-item-text">{{ q.text }}</text>
            </view>
          </view>
          <view class="empty-guide-close" @tap="closeEmptyGuide">
            <SvgIcon name="close-line" size="24rpx" color="#9aa3b2" />
            <text class="empty-guide-close-text">不再显示</text>
          </view>
        </view>
        <view v-for="(msg, idx) in displayMessages" :key="idx" class="message-item" :class="msg.role" @longpress="openMessageActions(msg)">
          <!-- 用户消息 -->
          <text v-if="msg.role === 'user'" class="msg-content user">{{ msg.content }}</text>

          <!-- AI 消息 -->
          <view v-else class="msg-content assistant">
            <SvgIcon class="avatar" name="robot-line" size="40rpx" color="#0b5fff" />
            <view class="bubble">
              <!-- P11 T5：思考链 + 执行细节融合面板（问题 9；空 steps/execSteps 时组件自不渲染） -->
              <ReasoningPanel :steps="msg.reasoningSteps || []" :execSteps="msg.execSteps || []" />

              <!-- P11 T4：结构化卡片（DONE.cards；HTTP 降级/旧协议缺失时不渲染，fallback markdown） -->
              <CardRenderer v-if="msg.cards && msg.cards.length > 0" :cards="msg.cards" />

              <!-- light 分支结论打字机：synth_answer 结构化输出仅 DONE 一次性下发，前端模拟逐字
                   （deep 分支真流式内容走上方 streaming-message 渲染，不经过此分支） -->
              <mp-html
                v-if="isTypingFor(msg)"
                :content="markdownToHtml(typedText + ' ▊')"
                class="bubble-html streaming-blink"
              />

              <!-- 改进 20（批次 1）：引导追问按钮化——「你可以问我：…」引导句渲染为可点击快捷追问
                   （点击即发，复用 quickAsk）；保守解析命中才渲染（正文剔除引导行），未命中回退
                   下方既有纯文本分支（绝不渲染错按钮） -->
              <template v-else-if="followupOf(msg)">
                <template v-for="(sec, si) in getSections(followupBody(msg)) ?? []" :key="si">
                  <mp-html v-if="!sec.title" :content="markdownToHtml(sec.body)" class="bubble-html" />
                  <SectionCard v-else :variant="sec.variant" :title="sec.title" :body="sec.body" />
                </template>
                <mp-html
                  v-if="!getSections(followupBody(msg))"
                  :content="markdownToHtml(followupBody(msg))"
                  class="bubble-html"
                />
                <view class="followup-questions">
                  <view
                    v-for="q in followupQuestions(msg)"
                    :key="q"
                    class="followup-question"
                    @tap="quickAsk(q)"
                  >
                    <text class="followup-question-text">{{ q }}</text>
                  </view>
                </view>
              </template>

              <!-- 改进 14：分节卡片化渲染（有分节时 SectionCard 列表，无分节时回退 mp-html） -->
              <template v-else-if="msg.content">
                <template v-for="(sec, si) in getSections(msg.content) ?? []" :key="si">
                  <mp-html v-if="!sec.title" :content="markdownToHtml(sec.body)" class="bubble-html" />
                  <SectionCard v-else :variant="sec.variant" :title="sec.title" :body="sec.body" />
                </template>
                <mp-html v-if="!getSections(msg.content)" :content="markdownToHtml(msg.content)" class="bubble-html" />
              </template>

              <!-- D20：深度分析 summary 卡片（仅 deep 结果；保留兼容旧消息/HTTP 降级无 cards 字段） -->
              <!-- 最终审查修复：DONE 同时返回 last_deep_report 与 deep 卡时，仅由 CardRenderer 渲染（spec §4.2/§6 主路径），DeepSummaryCard 仅在无 deep 卡时作为兼容回退 -->
              <DeepSummaryCard
                v-if="msg.lastDeepReport && !(msg.cards?.some(c => c.card_type === 'deep'))"
                :report="msg.lastDeepReport"
              />

              <!-- 单轮用量 + D4 force_deep「深度分析」按钮（footer 行；用量灰色弱化，仅 DONE 带 tokenUsage 时显示） -->
              <view class="msg-footer">
                <text v-if="msg.tokenUsage" class="turn-usage">{{ msg.tokenUsage.total_tokens }} tokens</text>
                <view
                  v-if="msg.role === 'assistant' && !msg.lastDeepReport && !msg.content.startsWith('抱歉，出错了') && !msg.content.endsWith('已停止生成')"
                  class="deep-btn"
                  @tap="rerunDeep(idx)"
                >
                  <SvgIcon name="line-chart-line" size="24rpx" color="#0b5fff" />
                  <text class="deep-btn-text">深度分析</text>
                </view>
                <!-- Phase 2 Part 2：error/cancelled 终态消息「重试」按钮（重发最近一轮 user 消息） -->
                <view
                  v-if="msg.role === 'assistant' && (msg.content.startsWith('抱歉，出错了') || msg.content.endsWith('已停止生成'))"
                  class="retry-btn"
                  @tap="chatStream.retry()"
                >
                  <SvgIcon name="refresh-line" size="24rpx" color="#0b5fff" />
                  <text class="retry-btn-text">重试</text>
                </view>
              </view>

              <!-- Phase 4-2 Task 3：回答反馈入口（赞/踩本地持久化；error/cancelled/空回复不显示；
                   位于 msg-footer 计费行下方、border-top 视觉分离，与 P10/P11 互不影响） -->
              <FeedbackBar
                v-if="showFeedbackBar(msg)"
                :value="msg.feedback"
                @select="(v) => chatStore.setFeedback(msg.timestamp, v)"
              />
            </view>
          </view>
        </view>

        <!-- 流式进度卡片（当前正在生成） -->
        <view v-if="isStreaming" class="message-item assistant streaming-message">
          <SvgIcon class="avatar" name="robot-line" size="40rpx" color="#0b5fff" />
          <view class="bubble">
            <!-- P11 T5：AI 思考链（流式 dot 动画，steps 含 streaming 时自动展开；执行细节流式中无数据） -->
            <ReasoningPanel
              v-if="streamingReasoning.length > 0"
              :steps="streamingReasoning"
              :execSteps="[]"
            />
            <!-- 实时进度步骤 -->
            <view v-if="progressSteps.length > 0" class="progress-card">
              <view
                v-for="(step, sIdx) in progressSteps"
                :key="sIdx"
                class="progress-step"
                :class="step.status"
              >
                <view class="step-icon">
                  <text v-if="step.status === 'done'" class="step-check">✓</text>
                  <view v-else class="step-spinner" />
                </view>
                <text class="step-label">{{ step.label }}</text>
              </view>
            </view>
            <!-- 逐 token 流式文本（光标内嵌在文本末尾） -->
            <mp-html
              v-if="streamingText"
              :content="markdownToHtml(streamingText + ' ▊')"
              class="bubble-html streaming-blink"
            />
          </view>
        </view>
      </scroll-view>

      <!-- 改进 16：上滑暂停跟随后出现的「回到最新」悬浮按钮（点击回底 + 恢复跟随） -->
      <view v-if="followPaused" class="back-to-latest" @tap="backToLatest">
        <SvgIcon name="arrow-down-line" size="28rpx" color="#0b5fff" />
        <text class="back-to-latest-text">回到最新</text>
      </view>

      <!-- 快捷 Skills -->
      <view class="quick-skills">
        <view class="skill-btn" @tap="quickAsk('今日大盘怎么样')">
          <SvgIcon name="line-chart-line" size="28rpx" color="#0b5fff" />
          <text class="skill-btn-text">大盘</text>
        </view>
        <!-- Phase 4-2：自选股入口 → 我的自选股批量问句 -->
        <view class="skill-btn" @tap="quickAskFavorites">
          <SvgIcon name="star-line" size="28rpx" color="#0b5fff" />
          <text class="skill-btn-text">自选股</text>
        </view>
        <view class="skill-btn" @tap="quickAsk('今日板块资金流向如何')">
          <SvgIcon name="money-cny-circle-line" size="28rpx" color="#0b5fff" />
          <text class="skill-btn-text">资金</text>
        </view>
        <view class="skill-btn" @tap="quickAsk('今天的龙头股有哪些')">
          <SvgIcon name="trophy-line" size="28rpx" color="#0b5fff" />
          <text class="skill-btn-text">龙头</text>
        </view>
      </view>

      <!-- 输入框 -->
      <view class="input-bar">
        <!-- 左：模式切换（键盘 / 按住说话）—— 仅语音受支持时显示 -->
        <view v-if="speechSupported" class="mode-btn" @tap="toggleInputMode">
          <SvgIcon
            :name="inputMode === 'voice' ? 'keyboard-line' : 'mic-line'"
            size="36rpx"
            color="#0b5fff"
          />
        </view>

        <!-- 中：text 模式 = 文本输入框（mic 图标内嵌输入框右侧，点击录音） -->
        <view v-if="inputMode === 'text'" class="input-wrap">
          <input
            v-model="inputText"
            placeholder="输入消息..."
            class="input"
            @confirm="handleSend"
          />
          <!-- 内嵌右侧麦克风：常态灰色与 GlobalChatBar 输入框内图标一致；录音激活时蓝色圆底白图标 -->
          <view
            v-if="speechSupported"
            class="input-mic-btn"
            :class="{ active: isListening }"
            @tap.stop="handleMicTap"
          >
            <SvgIcon name="mic-line" size="36rpx" :color="isListening ? '#ffffff' : '#9ca3af'" />
          </view>
        </view>

        <!-- 中：voice 模式 = 按住说话 -->
        <view
          v-else
          class="hold-talk"
          :class="{ holding }"
          @touchstart="onHoldStart"
          @touchend="onHoldEnd"
          @touchcancel="onHoldEnd"
        >
          <text class="hold-talk-text">{{ holding ? '松开结束' : '按住 说话' }}</text>
        </view>

        <!-- 发送 / 停止（保留原逻辑） -->
        <button v-if="isStreaming" @tap="chatStream.stop()" class="stop-btn">停止</button>
        <button v-else @tap="handleSend" :disabled="isStreaming" class="send-btn">发送</button>
      </view>
    </view>

    <!-- Phase 4-2 改进 13：交互式确认弹框（confirm_request 终态 → 点选 → confirm_response 续跑；
         点选后 waiting 态显示「已确认 XX，继续回答…」；关框不发送 → 后端 60s 超时回退澄清） -->
    <ConfirmSheet
      :visible="confirmVisible"
      :question="confirmQuestion"
      :options="confirmOptions"
      :waiting="confirmWaiting"
      @select="handleConfirmSelect"
      @close="handleConfirmClose"
    />

    <!-- 批次 4：消息长按操作菜单（复制/删除/重发到输入框；全体消息可用） -->
    <ActionSheet
      :visible="messageSheetVisible"
      :items="messageSheetItems"
      @select="handleMessageAction"
      @update:visible="(v: boolean) => (messageSheetVisible = v)"
    />
  </SubPageCard2>
</template>

<script setup lang="ts">
import { ref, nextTick, watch, computed, onUnmounted } from 'vue'
import { onLoad, onShow, onReady } from '@dcloudio/uni-app'
import { useChatStream, type ConfirmOption } from '@/shared/utils/useChatStream'
import { markdownToHtml } from '@/shared/utils/markdown'
import { measureProximity, clampScrollTop } from '@/shared/utils/scrollFollow'
import SubPageCard2 from '@/shared/components/SubPageCard2.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import mpHtml from 'mp-html/dist/uni-app/components/mp-html/mp-html'
import DeepSummaryCard from './DeepSummaryCard.vue'
import ReasoningPanel from './ReasoningPanel.vue'
import CardRenderer from './cards/CardRenderer.vue'
import SectionCard from './cards/SectionCard.vue'
import FeedbackBar from '@/shared/components/FeedbackBar.vue'
import ConfirmSheet from '@/shared/components/ConfirmSheet.vue'
import ActionSheet from '@/shared/components/ActionSheet.vue'
import { parseMarkdownSections, type MarkdownSection } from '@/shared/utils/parseMarkdownSections'
import { parseFollowupQuestions, type FollowupParse } from '@/shared/utils/parseFollowupQuestions'
import { useChatStore } from '@/shared/store/modules/chat'
import { useUserStore } from '@/shared/store/modules/user'
import { useFavoritesStore } from '@/shared/store/modules/favorites'
import { buildFavoritesQuestion } from '@/shared/utils/chatSuggestions'
import { storage, STORAGE_KEYS } from '@/shared/utils/storage'
import { agentApi, type ChatMessage } from '@/shared/api/modules/agent'
import {
  isSpeechInputSupported,
  startSpeechRecognition,
  stopSpeechRecognition,
} from '@/shared/utils/speechInput'
import type { SpeechRecognitionResult } from '@/shared/utils/speechInput'

const chatStream = useChatStream({ onBeforeStream: () => resetFollow() })
const chatStore = useChatStore()
const userStore = useUserStore()
const favoritesStore = useFavoritesStore()

// P9：无当前会话时自动新建（保证 messagesBySession 有当前会话载体；切换会话返回本页不重复触发，onLoad 仅一次）
onLoad((options: Record<string, string> | undefined) => {
  // G6（2026-08-17）：详情类跳转出口经全局事件通知本页记录阅读位置
  uni.$on('chat:leave-context', leaveChatContext)
  if (!chatStore.sessionId) chatStore.createSession()
  const q = options?.q
  if (!q) return
  nextTick(() => {
    // Phase 4-2：自选页「问 AI」跳转带 q 参数。仅新会话（尚无 user 消息）自动发送，
    // 已有会话历史时改为预填输入框，避免把 q 注入既有对话上下文
    if (!chatStore.hasUserMessage) {
      void chatStream.send(q)
    } else {
      inputText.value = q
    }
  })
})

/** P9：标题旁「会话」入口 → 会话列表页 */
function goSessions() {
  uni.navigateTo({ url: '/pages-sub-app/chat/sessions' })
}

/**
 * P9：首次用户消息后 fire-and-forget 通知后端建立会话元数据（仅登录）。
 * 必须在 chatStream.send 之前调用（send 内部 appendMessage 会立即写入 user 消息，之后 hasUserMessage 变 true）。
 */
function upsertSessionMeta(content: string) {
  if (userStore.isLoggedIn() && chatStore.sessionId && !chatStore.hasUserMessage) {
    void agentApi.upsertChatSession(chatStore.sessionId, content)
  }
}

const displayMessages = chatStream.messages

// 改进 18（批次 1）：新会话空态引导——当前会话消息为空 且 未被用户关闭（storage 持久化）时显示。
// 用户点「不再显示」写入全局标记，即使新建会话也不再现（消解老用户噪音，roadmap 改进 18）。
// 示例问题点击即发（复用 quickAsk），覆盖大盘/个股/资金/对比/新闻/科普六大类。
const emptyGuideClosed = ref(storage.get(STORAGE_KEYS.CHAT_EMPTY_GUIDE_CLOSED) === true)
const showEmptyGuide = computed(() => !emptyGuideClosed.value && displayMessages.value.length === 0)
const emptyGuideQuestions = [
  { label: '大盘', text: '今日大盘怎么样' },
  { label: '个股', text: '贵州茅台现在怎么样' },
  { label: '资金', text: '今日板块资金流向如何' },
  { label: '对比', text: '贵州茅台和五粮液哪个更好' },
  { label: '新闻', text: '宁德时代最近有什么新闻' },
  { label: '科普', text: '市盈率是什么' },
]

function closeEmptyGuide() {
  emptyGuideClosed.value = true
  storage.set(STORAGE_KEYS.CHAT_EMPTY_GUIDE_CLOSED, true)
}
const isStreaming = chatStream.streaming
const progressSteps = chatStream.progressSteps
const streamingText = chatStream.streamingText
// P3-fix-2 T2：流式过程中的实时思考链（ref 自动解包，模板直接读数组）
const streamingReasoning = chatStream.streamingReasoning
// Phase 4-2 改进 13：confirm_request 终态待确认负载（ref；watch 到非空即弹确认框）
const pendingConfirm = chatStream.pendingConfirm
const confirmVisible = ref(false)
const confirmWaiting = ref(false)
// 改进 13 review 修复：pendingConfirm 到达时把 question/options 快照到本地 ref——
// sendConfirmResponse 发送成功即同步清 pendingConfirm，若弹框内容仍从 pendingConfirm 派生，
// waiting 态弹框会只剩「已确认…」行（问题/选项瞬时清空）。快照晚于清除，内容保持完整
const confirmQuestion = ref('')
const confirmOptions = ref<ConfirmOption[]>([])

// Phase 4-2 改进 13（final review I-1）：确认框展示期间启动 60s 计时器（对齐后端
// `_wait_confirm_response` 的 `_CONFIRM_TIMEOUT_SEC`）。后端超时后 confirm_timeout 重跑
// 回退既有澄清，若前端不及时 re-arm，回退事件流会被 doneReceived=true 丢弃（对话悬空）。
// 到期若弹框仍开 → abandonConfirm()（发送「都不是」或软 re-arm）让回退事件正常渲染。
const CONFIRM_TIMEOUT_MS = 60_000
let confirmTimer: ReturnType<typeof setTimeout> | null = null

function clearConfirmTimer() {
  if (confirmTimer) {
    clearTimeout(confirmTimer)
    confirmTimer = null
  }
}

function startConfirmTimer() {
  clearConfirmTimer()
  confirmTimer = setTimeout(() => {
    confirmTimer = null
    if (confirmVisible.value) {
      chatStream.abandonConfirm()
      confirmVisible.value = false
      confirmWaiting.value = false
    }
  }, CONFIRM_TIMEOUT_MS)
}

watch(pendingConfirm, (v) => {
  if (v) {
    confirmQuestion.value = v.question
    confirmOptions.value = v.options
    confirmVisible.value = true
    confirmWaiting.value = false
    startConfirmTimer()
    // 5B（2026-08-17）：confirm_request 到达 = 第 4 个"新交互"入口——复位跟随
    // 并滚底展示确认框（防阶段 2 fresh run 回答在视口外生长）。
    resetFollow()
    scrollToBottom()
  } else {
    clearConfirmTimer()
  }
})

/**
 * Phase 4-2 改进 13：用户点选确认选项 → 回传 confirm_response（后端携带 confirm_choice
 * 对同一 session fresh run 续跑）→ 本地置 waiting 态（ConfirmSheet 显示「已确认 XX，继续回答…」）。
 * WS 不可用时返回 false：不再发送（后端 60s 超时同样回退澄清），直接关闭弹框。
 */
function handleConfirmSelect(key: string, label: string) {
  const pc = pendingConfirm.value
  if (confirmWaiting.value || !pc) return
  confirmWaiting.value = true
  clearConfirmTimer()
  if (!chatStream.sendConfirmResponse(pc.request_id, key)) {
    confirmVisible.value = false
    confirmWaiting.value = false
  }
}

/**
 * 用户主动关框（overlay 点击）→ 语义 =「都不是」：abandonConfirm 发送 confirm_response(choice='none')
 * 让后端立即 confirm_timeout 重跑回退既有澄清（等 60s 空窗口期间发新消息会被后端忽略）。
 * WS 不可用则软 re-arm，由后端 60s 超时自动回退（final review I-1 修复）。
 */
function handleConfirmClose() {
  clearConfirmTimer()
  chatStream.abandonConfirm()
  confirmVisible.value = false
  confirmWaiting.value = false
}

const inputText = ref('')
/** 输入模式：text=键盘输入 / voice=按住说话（微信式） */
const inputMode = ref<'text' | 'voice'>('text')
/** 是否正在按住说话录制中 */
const holding = ref(false)
/** 进行中的按住说话识别 Promise（touchend 结算） */
let pendingHoldRecognition: Promise<SpeechRecognitionResult> | null = null
const scrollTop = ref(0)

// Phase 4-2 Task 2：语音输入（平台支持才显示麦克风按钮；isListening 为 UI 镜像，模块状态见 speechInput）
const speechSupported = isSpeechInputSupported()
const isListening = ref(false)

// ===== G6 跳转-返回恢复阅读位置（2026-08-17 分歧 #5 收敛：仅 D 出口接线） =====
// 语义：详情类跳转（改进 23 个股详情）返回时恢复跳转前滚动位置；
// 会话列表入口与 onHide（前后台）不置位——「会话列表返回=贴底」先例不破；
// B/C（改进 19 报告详情）不接线，维持既有贴底行为（批次 2 已上线功能不改）。
const savedScrollTop = ref(0)
// G6：是否需在下次 onShow 恢复阅读位置（仅 D 出口置位）
const pendingRestore = ref(false)
let savedMessageCount = 0

/** 详情跳转前记录阅读位置（由 uni.$emit('chat:leave-context') 触发，navigateTo success 回调发射） */
function leaveChatContext() {
  savedScrollTop.value = currentScrollTop
  savedMessageCount = displayMessages.value.length
  pendingRestore.value = true
}

/** 两段式恢复：先 nextTick 设值，50ms 幂等第二次（抗 mp-html 异步渲染）；
 * 期间 restoreInProgress=true 抑制 onScroll（防小程序端编程式滚动触发 @scroll 回跳）；
 * 完成后进入暂停跟随态（followPaused=true）——L167「回到最新」按钮兜底，
 * 用户滚动至近底部时 onScroll isNearBottom 自动恢复跟随。 */
function restorePosition(target: number) {
  restoreInProgress.value = true
  const apply = () => {
    scrollTop.value = clampScrollTop(
      target,
      currentScrollHeight,
      viewportH.value || DEFAULT_VIEWPORT_PX,
    )
  }
  nextTick(apply)
  setTimeout(() => {
    nextTick(() => {
      apply()
      restoreInProgress.value = false
      followPaused.value = true
    })
  }, 50)
}

// 每次进入页面（含从会话列表返回、切会话）默认停留在对话最下方
onShow(() => {
  // G6（2026-08-17 分歧 #5 收敛）：详情类跳转返回 → 无新推进时恢复阅读位置；
  // 否则维持既有"回场景=贴底"语义（会话列表返回/首次进入/前后台切换）。
  if (pendingRestore.value) {
    pendingRestore.value = false
    const hasNewProgress =
      isStreaming.value ||
      chatStream.hasPendingRun() ||
      displayMessages.value.length !== savedMessageCount
    if (hasNewProgress) {
      // 对话已推进 → 放弃恢复走贴底（新消息优先，硬约束 #6）
      followPaused.value = false
      scrollToBottom()
    } else {
      restorePosition(savedScrollTop.value)
      // 恢复分支不执行下方 resume 续跑（已判定无 pending run）
      return
    }
  } else {
    // 改进 16：进入页面默认贴底跟随（重置上滑暂停态，防旧会话残留暂停状态）
    followPaused.value = false
    scrollToBottom()
  }
  // 问题 15：回页时若存在未完成轮（最后一条是 user）且连接已断开 → 自动 resume 续跑
  if (chatStream.hasPendingRun() && !chatStream.isConnected()) {
    void chatStream.resume()
  }
})

// 改进 16：测量 scroll-view 视口高度（App/H5 环境；vitest 无 uni 则跳过，判定走默认值）
onReady(() => {
  if (typeof uni === 'undefined') return
  try {
    uni.createSelectorQuery().select('.message-list').boundingClientRect((rect: unknown) => {
      const r = rect as { height?: number } | null
      if (r && r.height) viewportH.value = r.height
    }).exec()
  } catch {
    // 测量失败保持默认值，距底判定仍可用（稍保守）
  }
})

// 对话期间始终跟随最下方：流式开始时立即滚动，之后定时跟随。
// 根因：mp-html 渲染异步（先清空再解析），仅靠 streamingText watch + nextTick 设置 scroll-top
// 时内容尚未渲染完成 → 停在上方；只有 done 重建消息列表时才真正滚到底。
// 用 setInterval 兜底：无论内容何时渲染完成，150ms 内必被钉回底部，实现逐字跟随观感。
let followTimer: ReturnType<typeof setInterval> | null = null

// 改进 16（批次 1）：上滑检测 → 暂停跟随（豆包式）。followPaused=true 时不再钉底——
// 150ms 定时器已停、打字机滚动被 scrollToBottomIfFollowing 守卫（内容仍生长、位置不动）；
// 「回到最新」按钮点击后恢复跟随。
const followPaused = ref(false)
// 5B（2026-08-17 design-debate 定案）：resetFollow 纯复位——仅清暂停态与增量
// 去重签名，不滚底、不启定时器。所有新发送路径均经 streaming.value=true
// （useChatStream _stream / sendConfirmResponse），watch(isStreaming, v=true)
// 是唯一滚底+定时器收口点（硬约束 #3）；此处再滚即双发，spy===1 断言失败。
function resetFollow() {
  followPaused.value = false
  lastFollowSig = ''
}
// scroll-view 视口高度（onReady 测量；测量失败/测试环境用默认值兜底，判定仍可用）
const viewportH = ref(0)
const DEFAULT_VIEWPORT_PX = 600

// 5B/G6（2026-08-17）：onScroll 最近一次测量的滚动位置/内容高度缓存——
// G6 恢复原位的数据源（原 scrollTop ref 被 onScroll 局部 const 遮蔽，从不更新）。
let currentScrollTop = 0
let currentScrollHeight = 0
// G6（2026-08-17 分歧 #5 收敛）：恢复执行窗口标志——期间忽略 onScroll，
// 防小程序端 scroll-top 赋值触发 @scroll → resumeFollow 回跳闪烁。
const restoreInProgress = ref(false)

function onScroll(e: unknown) {
  if (restoreInProgress.value) return
  const detail = ((e as { detail?: unknown } | null)?.detail ?? {}) as {
    scrollTop?: unknown
    scrollHeight?: unknown
  }
  const scrollTop = Number(detail.scrollTop) || 0
  const scrollHeight = Number(detail.scrollHeight) || 0
  const viewport = viewportH.value || DEFAULT_VIEWPORT_PX
  currentScrollTop = scrollTop
  if (scrollHeight > 0) currentScrollHeight = scrollHeight
  // 5B：三态判定——near 恢复跟随；far 暂停跟随；unknown（测失败）保持当前状态不变
  const proximity = measureProximity(scrollTop, scrollHeight, viewport)
  if (proximity === 'near') {
    if (followPaused.value) resumeFollow()
  } else if (proximity === 'far' && !followPaused.value) {
    pauseFollow()
  }
}

function pauseFollow() {
  followPaused.value = true
  // 暂停跟随：停掉 150ms 钉底定时器（打字机滚动由 scrollToBottomIfFollowing 守卫）
  if (followTimer) {
    clearInterval(followTimer)
    followTimer = null
  }
}

function resumeFollow() {
  followPaused.value = false
  scrollToBottom()
}

/** 「回到最新」：回底 + 恢复跟随（生成中重启 150ms 钉底定时器） */
function backToLatest() {
  resumeFollow()
  if (isStreaming.value) {
    if (followTimer) clearInterval(followTimer)
    followTimer = setInterval(scrollToBottomIfFollowing, 150)
  }
}

// 生成节奏放缓（改进 16）：仅内容增长才滚（streamingText 长度或消息数任一变化才触发）
let lastFollowSig = ''
function scrollToBottomIfFollowing() {
  if (followPaused.value) return
  const sig = `${streamingText.value.length}:${displayMessages.value.length}`
  if (sig === lastFollowSig) return
  lastFollowSig = sig
  scrollToBottom()
}

// ===== 结论打字机（light 分支结论非流式，DONE 后前端模拟逐字输出） =====
// 后端 synth_answer 是结构化输出（SynthOutput JSON），最终回复仅 DONE 一次性下发；
// deep 分支（escalate→worker）有真流式 text 事件。用 hadStreamText 区分：
// 本轮流式期间出现过真流式文本 → 内容已逐字显示，不再启动打字机。
let hadStreamText = false
watch(streamingText, (t) => {
  if (t) hadStreamText = true
})

const typingMsgKey = ref<number | null>(null)
const typedText = ref('')
let typeTimer: ReturnType<typeof setInterval> | null = null

function stopTypewriter() {
  if (typeTimer) {
    clearInterval(typeTimer)
    typeTimer = null
  }
}

/** 当前消息是否正在打字机播放（用 timestamp 定位消息，v-for 的 idx 会随列表增删漂移） */
function isTypingFor(msg: ChatMessage) {
  return typingMsgKey.value !== null && typingMsgKey.value === msg.timestamp
}

/** DONE 后对本轮回复启动打字机：仅 light 分支（无真流式文本）触发 */
function startTypewriterIfNeeded() {
  if (hadStreamText) return
  const msgs = displayMessages.value
  const last = msgs[msgs.length - 1]
  if (!last || last.role !== 'assistant') return
  const content = last.content
  // 错误/空回复直接静态展示，不打字机
  if (!content || content.startsWith('抱歉，出错了')) return
  stopTypewriter()
  typingMsgKey.value = last.timestamp
  typedText.value = ''
  let i = 0
  typeTimer = setInterval(() => {
    i += 2
    typedText.value = content.slice(0, i)
    // 打字机期间内容逐字增长，保持钉在对话最下方；改进 16：上滑暂停跟随时不钉底
    scrollToBottomIfFollowing()
    if (i >= content.length) {
      stopTypewriter()
      typingMsgKey.value = null
    }
  }, 30)
}

watch(isStreaming, (v) => {
  if (v) {
    // Phase 4-2 改进 13：confirm_response 后后端 fresh run 开始流式 → 弹框完成使命（waiting 态结束），关闭
    confirmVisible.value = false
    // 新一轮开始：重置"本轮是否出现过真流式文本"，并停掉上一条未播完的打字机
    hadStreamText = false
    stopTypewriter()
    typingMsgKey.value = null
    // 5B（2026-08-17 定案）：任何发送/点选确认交互已在发送路径前置 resetFollow
    // （followPaused=false），此处守卫保留作双保险——仅当暂停态由 onScroll 上滑
    // 触发且尚未发新消息时（如 G6 恢复原位后的暂停跟随态）才生效，不钉底。
    if (followPaused.value) return
    scrollToBottom()
    if (followTimer) clearInterval(followTimer)
    followTimer = setInterval(scrollToBottomIfFollowing, 150)
  } else {
    if (followTimer) {
      clearInterval(followTimer)
      followTimer = null
    }
    // 本轮结束：无真流式文本时用打字机逐字呈现结论。
    // 改进 16：暂停跟随时打字机照常启动，但其滚动被 scrollToBottomIfFollowing 守卫（不钉底）
    startTypewriterIfNeeded()
  }
})

function handleSend() {
  const content = inputText.value.trim()
  if (!content || isStreaming.value) return
  inputText.value = ''
  upsertSessionMeta(content)
  chatStream.send(content)
}

// ── 批次 4（消息长按操作：复制/删除/重发到输入框；全体消息可用） ──
const messageSheetVisible = ref(false)
const messageSheetItems = ref<{ label: string; value: string; danger?: boolean }[]>([])
/** 当前长按选中的消息（timestamp 定位；删除/复制/重发都基于它） */
const messageActionTarget = ref<ChatMessage | null>(null)

/** 长按消息 → 组装操作菜单并弹出。复制/删除/重发对 user 与 assistant 消息同样适用：
 *  - 复制：剪贴板复制文本
 *  - 重发：回填输入框（可编辑后再发，走正常 send，后端按新消息追加——规避加性历史截断问题）
 *  - 删除：本地隐藏删除（后端 LangGraph 线程保持不变）
 */
function openMessageActions(msg: ChatMessage) {
  if (isStreaming.value) return // 流式中禁长按，避免打断正在生成的回答
  messageActionTarget.value = msg
  messageSheetItems.value = [
    { label: '复制', value: 'copy' },
    { label: '重发', value: 'resend' },
    { label: '删除', value: 'delete', danger: true },
  ]
  messageSheetVisible.value = true
}

function handleMessageAction(item: { label: string; value: string | number }) {
  const msg = messageActionTarget.value
  if (!msg) return
  switch (item.value) {
    case 'copy':
      uni.setClipboardData({ data: msg.content })
      break
    case 'resend':
      // 回填输入框并切到文本模式；由用户确认/编辑后点发送，上下文字段由新 send 重建
      inputMode.value = 'text'
      inputText.value = msg.content
      break
    case 'delete':
      chatStore.removeMessage(msg.timestamp)
      break
  }
  messageActionTarget.value = null
}

/**
 * Phase 4-2 Task 2：语音输入 tap 切换（点击开始聆听，再点结束）。
 * 识别文本仅回填输入框（v-model 可编辑、不自动发送），由用户点「发送」走 handleSend；
 * 识别失败 toast 轻提示，不阻塞文本输入。
 */
async function handleMicTap() {
  if (isListening.value) {
    stopSpeechRecognition()
    return
  }
  isListening.value = true
  // 先同步启动识别（H5 要求 start() 在用户手势回调内同步调用），再给聆听提示；
  // 不直接 await：startSpeechRecognition 内部已同步执行 recognition.start()（手势上下文内）
  const pending = startSpeechRecognition()
  showListeningToast()
  try {
    const result = await pending
    isListening.value = false
    uni.hideToast()
    if (result.ok) {
      inputText.value = result.text
    } else {
      uni.showToast({ title: result.error, icon: 'none' })
    }
  } catch {
    // 防御：speechInput 保证 Promise 永不 reject，但平台壳层/未来扩展若意外 reject，
    // 也必须复位聆听状态并回退轻提示，避免麦克风按钮卡在 active、toast 悬挂
    isListening.value = false
    uni.hideToast()
    uni.showToast({ title: '语音识别失败，请重试', icon: 'none' })
  }
}

/**
 * Phase 4-2 Task 2：开始聆听提示（H5 单次识别自动结束；小程序需再次点击结束，
 * toast 为 10s 长提示，麦克风按钮 active 高亮是持续指示，结算后 hideToast）。
 */
function showListeningToast() {
  uni.showToast({ title: '正在聆听…，再次点击结束', icon: 'none', duration: 10000 })
}

/**
 * Phase 4-2 Task 2（Task 4 扩展）：模式切换（键盘 ⇄ 按住说话，微信式）。
 * 语音不受支持时不显示切换钮（模板 v-if="speechSupported"），此处再兜底。
 */
function toggleInputMode() {
  if (!speechSupported) return
  inputMode.value = inputMode.value === 'text' ? 'voice' : 'text'
}

/** 按住说话：touchstart → 开始录制（同步手势内启动识别），touchend/touchcancel → 停止并回填 */
async function onHoldStart() {
  if (holding.value || isStreaming.value) return
  holding.value = true
  // 复用既有 isListening 作为 UI 高亮（右 mic 按钮与 hold-talk 同源）
  isListening.value = true
  // startSpeechRecognition 需在同步手势内调用；返回 Promise 供 touchend 结算
  pendingHoldRecognition = startSpeechRecognition()
}

async function onHoldEnd() {
  if (!holding.value) return
  holding.value = false
  isListening.value = false
  stopSpeechRecognition() // 提前结束并结算（小程序 stop 触发 onStop；H5 提前收结果）
  const pending = pendingHoldRecognition
  pendingHoldRecognition = null
  if (!pending) return
  const result = await pending
  if (result.ok) {
    inputText.value = result.text
  } else {
    uni.showToast({ title: result.error, icon: 'none' })
  }
}

function quickAsk(text: string) {
  if (isStreaming.value) return
  upsertSessionMeta(text)
  chatStream.send(text)
}

/**
 * Phase 4-2：自选股快捷入口 → 生成"我的自选股"批量问句后发送。
 * 自选数据与自选页一致：数据未就绪（含未登录 mock 5 股）时先静默同步一次再取数，
 * 保证与自选页同源（未登录 mock 5 股可问）。
 */
async function quickAskFavorites() {
  if (isStreaming.value) return
  if (!favoritesStore.hasCurrentData()) {
    await favoritesStore.fetchFavorites({ silent: true })
  }
  quickAsk(buildFavoritesQuestion(favoritesStore.stocks))
}

// 交替两个超大值：流式 token 逐字增长时内容底部持续下移，scroll-top 值不变 Vue 不会重新触发滚动
// （仅把 scrollTop 钉在 99999 只能滚一次）；99999/99998 均超出内容高度被钳制到底部，无视觉跳动
let scrollFlip = false
function scrollToBottom() {
  nextTick(() => {
    scrollFlip = !scrollFlip
    scrollTop.value = scrollFlip ? 99999 : 99998
  })
}

/**
 * 改进 14：将 AI 回复 markdown 按分节识别为 SectionCard 列表。
 * 无分节（寒暄/科普/无标题纯文本）时返回 null，回退 mp-html 整体渲染。
 */
function getSections(content: string): MarkdownSection[] | null {
  if (!content) return null
  const parsed = parseMarkdownSections(content)
  if (parsed.length === 0) return null
  if (parsed.length === 1 && !parsed[0].title) return null
  return parsed
}

// ── 改进 20（批次 1）：引导追问按钮化辅助函数 ──
// 模板无法缓存单条消息的解析结果，提供三个薄函数多次调用（与 getSections 同模式）；
// followupOf 是唯一解析入口（含角色/空内容守卫），body/questions 由其派生，保证一致性。

function followupOf(msg: ChatMessage): FollowupParse | null {
  if (msg.role !== 'assistant' || !msg.content) return null
  return parseFollowupQuestions(msg.content)
}

/** 剔除引导行后的正文（供分节渲染）；未命中返回空串（配合 v-else-if 不会到达） */
function followupBody(msg: ChatMessage): string {
  return followupOf(msg)?.body ?? ''
}

/** 解析出的快捷追问条目；未命中返回空数组 */
function followupQuestions(msg: ChatMessage): string[] {
  return followupOf(msg)?.questions ?? []
}

/**
 * Phase 4-2 Task 3：回答气泡尾部反馈入口显隐——仅 assistant 真实回复
 * （error/cancelled/空内容无反馈价值，且与「重试」按钮互斥不重叠展示）。
 */
function showFeedbackBar(msg: ChatMessage): boolean {
  if (msg.role !== 'assistant' || !msg.content) return false
  return !msg.content.startsWith('抱歉，出错了') && !msg.content.endsWith('已停止生成')
}

/**
 * D4：light 误判一键升级--以 force_deep=true 重发该条回复前最近一条 user 消息。
 * 闸门短路回复也显示按钮（重复点击返回同话术，无副作用）。
 */
function rerunDeep(idx: number) {
  if (isStreaming.value) return
  // displayMessages 经 useChatStream 修复后是响应式 ref（模板自动解包，脚本需 .value）
  for (let i = idx - 1; i >= 0; i--) {
    const prev = displayMessages.value[i]
    if (prev && prev.role === 'user') {
      chatStream.send(prev.content, { forceDeep: true })
      return
    }
  }
}

onUnmounted(() => {
  uni.$off('chat:leave-context', leaveChatContext)
  if (followTimer) {
    clearInterval(followTimer)
    followTimer = null
  }
  stopTypewriter()
  clearConfirmTimer()
  // 问题 15：不再 disconnect —— socket 为模块级单例，跨页面存活，
  // 后台任务继续生成，回页经 onShow resume 补全
})
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;

/* P9：会话入口按钮（导航栏右侧） */
.sessions-entry {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
  border-radius: $r-full;
}
.sessions-entry:active { background: $bg-soft; }

.chat-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative; /* 改进 16：容纳「回到最新」悬浮按钮的绝对定位 */
}

/* 改进 16：上滑暂停跟随后出现的「回到最新」悬浮按钮（点击回底 + 恢复跟随） */
.back-to-latest {
  position: absolute; right: 24rpx; bottom: 200rpx; z-index: 10;
  display: inline-flex; align-items: center; gap: 6rpx;
  background: #ffffff; border-radius: 32rpx; padding: 10rpx 24rpx;
  box-shadow: $shadow-card;
}
.back-to-latest-text { font-size: 24rpx; color: $primary; }

.message-list { flex: 1; min-height: 0; padding: 20rpx; overflow: hidden; }

/* 改进 18：新会话空态引导（欢迎页 + 示例问题 + 关闭） */
.empty-guide {
  display: flex; flex-direction: column; align-items: center;
  padding: 96rpx 40rpx 40rpx; text-align: center;
}
.empty-guide-header { display: flex; flex-direction: column; align-items: center; margin-bottom: 40rpx; }
.empty-guide-title { font-size: 34rpx; font-weight: 600; color: $ink; margin-top: 20rpx; }
.empty-guide-sub { font-size: 24rpx; color: $ink-mute; margin-top: 12rpx; }
.empty-guide-items { width: 100%; display: flex; flex-direction: column; gap: 16rpx; }
.empty-guide-item {
  display: flex; align-items: center; gap: 12rpx;
  background: #ffffff; border-radius: $r-lg; padding: 20rpx 24rpx;
  box-shadow: $shadow-card;
}
.empty-guide-item-label {
  flex-shrink: 0; font-size: 22rpx; color: $primary;
  background: $primary-50; border-radius: $r-sm; padding: 4rpx 12rpx;
}
.empty-guide-item-text { flex: 1; min-width: 0; font-size: 26rpx; color: $ink; text-align: left; }
.empty-guide-close {
  display: flex; align-items: center; gap: 6rpx; margin-top: 32rpx;
  padding: 8rpx 20rpx;
}
.empty-guide-close-text { font-size: 22rpx; color: $ink-mute; }
.message-item { margin-bottom: 24rpx; }
.message-item.user { display: flex; justify-content: flex-end; }
.msg-content.user {
  background: $brand-gradient; color: #fff; border-radius: 16rpx 16rpx 4rpx 16rpx; padding: 16rpx 24rpx;
  max-width: 70%; font-size: 28rpx; line-height: 1.5;
  box-shadow: $shadow-primary;
}
.msg-content.assistant { display: flex; gap: 12rpx; }
.avatar { font-size: 40rpx; flex-shrink: 0; }
.bubble {
  background: #ffffff; border-radius: $r-lg; padding: 16rpx 24rpx;
  max-width: 80%; box-shadow: $shadow-card;
}

/* 流式消息的头像和内容需要处于同一横向消息行，避免内容未生成时气泡换到头像下一行。 */
.streaming-message {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
}

.streaming-message .bubble {
  flex: 1;
  min-width: 0;
}

/* mp-html 样式覆盖：keep-all 必须覆盖到内部所有子元素（p/div/span 等） */
:deep(.bubble-html),
:deep(.bubble-html *) {
  word-break: keep-all;
  overflow-wrap: break-word;
}
:deep(.bubble-html) {
  font-size: 28rpx;
  color: $ink;
  line-height: 1.6;
}
/* 强制加粗标签为内联元素，避免 mp-html 将 <strong> 渲染为块级导致前后换行 */
:deep(.bubble-html strong),
:deep(.bubble-html b) {
  display: inline;
  font-weight: 700;
}
:deep(.md-h2) { font-size: 32rpx; font-weight: 600; margin: 16rpx 0 8rpx; }
:deep(.md-h3) { font-size: 30rpx; font-weight: 600; margin: 12rpx 0 6rpx; }
:deep(.md-hr) { border: none; border-top: 1rpx solid $line; margin: 12rpx 0; }
:deep(.md-ul) { padding-left: 20rpx; margin: 8rpx 0; }
:deep(.md-ol) { padding-left: 20rpx; margin: 8rpx 0; }
:deep(.md-ul-li) { font-size: 28rpx; color: $ink; line-height: 1.8; }
:deep(.md-ol-li) { font-size: 28rpx; color: $ink; line-height: 1.8; }
:deep(.md-table) { width: 100%; border-collapse: collapse; margin: 8rpx 0; }
:deep(.md-table th) { background: $bg-soft; font-size: 24rpx; padding: 8rpx; border: 1rpx solid $line; }
:deep(.md-table td) { font-size: 24rpx; padding: 8rpx; border: 1rpx solid $line; }

/* 批次 4（改进 20 升级）：引导追问胶囊按钮（点击即发，复用 quickAsk；对齐豆包浅色胶囊） */
.followup-questions {
  display: flex; flex-direction: column; gap: 12rpx;
  margin-top: 16rpx;
}
.followup-question {
  display: inline-flex; align-items: center; align-self: flex-start; max-width: 100%;
  background: $primary-50; color: $primary;
  border-radius: 999rpx; padding: 14rpx 24rpx;
}
.followup-question:active { opacity: 0.7; }
.followup-question-text { font-size: 24rpx; color: $primary; line-height: 1.4; }

/* 流式光标动画（mp-html 内嵌 ▊ 字符的闪烁效果） */
:deep(.streaming-blink) {
  animation: blink 1s step-end infinite;
}
@keyframes blink { 50% { opacity: 0.6; } }

/* 实时进度步骤 */
.progress-card { padding: 4rpx 0 12rpx; }
.progress-step {
  display: flex; align-items: center; gap: 12rpx; padding: 6rpx 0;
}
.step-icon {
  width: 32rpx; height: 32rpx; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.step-check { font-size: 24rpx; color: #22c55e; font-weight: 700; }
.step-spinner {
  width: 24rpx; height: 24rpx; border: 3rpx solid $line; border-top-color: $primary;
  border-radius: 50%; animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.step-label { font-size: 24rpx; color: $ink-soft; }
.progress-step.done .step-label { color: $ink-mute; }

.quick-skills { display: flex; flex-wrap: wrap; gap: 12rpx; padding: 12rpx 20rpx; background: #ffffff; flex-shrink: 0; }
.skill-btn {
  display: inline-flex; align-items: center; gap: 6rpx;
  background: rgba(77, 124, 254, 0.08); color: $primary; border-radius: 20rpx;
  padding: 8rpx 20rpx; font-size: 24rpx;
}
.skill-btn-text { font-size: 24rpx; color: $primary; }

.input-bar { display: flex; gap: 12rpx; padding: 16rpx 20rpx; background: #ffffff; box-shadow: 0 -2rpx 8rpx rgba(0, 0, 0, 0.04); align-items: stretch; flex-shrink: 0; }
.input-wrap { position: relative; flex: 1; min-width: 0; }
.input { width: 100%; background: $bg-soft; border-radius: 12rpx; padding: 16rpx; color: $ink; font-size: 28rpx; min-height: 72rpx; box-sizing: border-box; }
/* mic 图标内嵌输入框右侧：absolute 定位，input 需预留右侧空间避免文字被图标遮挡 */
.input-mic-btn {
  position: absolute; right: 10rpx; top: 50%; transform: translateY(-50%);
  width: 52rpx; height: 52rpx; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
}
.input-mic-btn.active { background: $primary; }

/* Phase 4-2 Task 2（Task 4 扩展）：左侧模式切换（键盘 / 按住说话），与 mic-btn 同规格 */
.mode-btn {
  display: flex; align-items: center; justify-content: center;
  width: 72rpx; min-height: 72rpx; border-radius: 12rpx;
  background: $bg-soft; flex-shrink: 0;
}

/* 按住说话按钮（微信式；touchstart/touchend 驱动，holding 高亮） */
.hold-talk {
  flex: 1; display: flex; align-items: center; justify-content: center;
  min-height: 72rpx; border-radius: 12rpx;
  background: $bg-soft; color: $ink-soft;
  border: 2rpx solid $line;
  &.holding { background: $primary-50; color: $primary; border-color: $primary; }
}
.hold-talk-text { font-size: 28rpx; }

.send-btn { background: $primary; color: #fff; border-radius: 12rpx; padding: 0 30rpx; font-size: 28rpx; display: flex; align-items: center; justify-content: center; }

/* 气泡 footer：左侧单轮用量（灰色弱化）+ 右侧深度分析按钮 */
.msg-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12rpx;
}
.turn-usage {
  font-size: 20rpx;
  color: $ink-mute;
}
.deep-btn {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  padding: 6rpx 20rpx;
  background: rgba(77, 124, 254, 0.08);
  border-radius: 20rpx;
}
.deep-btn-text {
  font-size: 22rpx;
  color: #0b5fff;
}

/* Phase 2 Part 2：生成中「停止」按钮（输入栏；$primary-50 底色 + $primary 文字） */
.stop-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 64rpx;
  padding: 0 32rpx;
  border-radius: 32rpx;
  background-color: $primary-50;
  color: $primary;
  font-size: 28rpx;
  margin-left: 16rpx;
}

/* Phase 2 Part 2：error/cancelled 终态消息「重试」按钮（气泡 footer；沿用 deep-btn 视觉） */
.retry-btn {
  display: flex;
  align-items: center;
  margin-left: 24rpx;
  padding: 8rpx 16rpx;
  border-radius: $r-md;
  background-color: $primary-50;
}

.retry-btn-text {
  margin-left: 8rpx;
  color: $primary;
  font-size: 24rpx;
}
</style>
