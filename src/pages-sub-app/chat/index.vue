<template>
  <SubPageCard2 :title="'AI 投顾'" :no-chat-bar="true">
    <template #header-right>
      <view class="sessions-entry" @tap="goSessions">
        <SvgIcon name="chat-history-line" size="36rpx" color="#0b5fff" />
      </view>
    </template>
    <view class="chat-content">
      <!-- 消息列表 -->
      <scroll-view scroll-y class="message-list" :scroll-top="scrollTop">
        <view v-for="(msg, idx) in displayMessages" :key="idx" class="message-item" :class="msg.role">
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

              <!-- Markdown 渲染的回复内容 -->
              <mp-html v-if="msg.content" :content="markdownToHtml(msg.content)" class="bubble-html" />

              <!-- D20：深度分析 summary 卡片（仅 deep 结果；保留兼容旧消息/HTTP 降级无 cards 字段） -->
              <!-- 最终审查修复：DONE 同时返回 last_deep_report 与 deep 卡时，仅由 CardRenderer 渲染（spec §4.2/§6 主路径），DeepSummaryCard 仅在无 deep 卡时作为兼容回退 -->
              <DeepSummaryCard
                v-if="msg.lastDeepReport && !(msg.cards?.some(c => c.card_type === 'deep'))"
                :report="msg.lastDeepReport"
              />

              <!-- D4：force_deep「深度分析」按钮（仅非 deep / 非错误回复） -->
              <view
                v-if="msg.role === 'assistant' && !msg.lastDeepReport && !msg.content.startsWith('抱歉，出错了')"
                class="deep-btn"
                @tap="rerunDeep(idx)"
              >
                <SvgIcon name="line-chart-line" size="24rpx" color="#0b5fff" />
                <text class="deep-btn-text">深度分析</text>
              </view>
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

      <!-- 快捷 Skills -->
      <view class="quick-skills">
        <view class="skill-btn" @tap="quickAsk('今日大盘怎么样')">
          <SvgIcon name="line-chart-line" size="28rpx" color="#0b5fff" />
          <text class="skill-btn-text">大盘</text>
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

      <!-- P11 T6：计费条（用户累计 + 本次会话本地累加；P10 只展示用量，不做支付） -->
      <UsageBar />

      <!-- 输入框 -->
      <view class="input-bar">
        <input v-model="inputText" placeholder="输入消息..." class="input" @confirm="handleSend" />
        <button @tap="handleSend" :disabled="isStreaming" class="send-btn">发送</button>
      </view>
    </view>
  </SubPageCard2>
</template>

<script setup lang="ts">
import { ref, nextTick, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useChatStream } from '@/shared/utils/useChatStream'
import { markdownToHtml } from '@/shared/utils/markdown'
import SubPageCard2 from '@/shared/components/SubPageCard2.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import mpHtml from 'mp-html/dist/uni-app/components/mp-html/mp-html'
import DeepSummaryCard from './DeepSummaryCard.vue'
import ReasoningPanel from './ReasoningPanel.vue'
import CardRenderer from './cards/CardRenderer.vue'
import UsageBar from './UsageBar.vue'
import { useChatStore } from '@/shared/store/modules/chat'
import { useUserStore } from '@/shared/store/modules/user'
import { agentApi } from '@/shared/api/modules/agent'

const chatStream = useChatStream()
const chatStore = useChatStore()
const userStore = useUserStore()

// P9：无当前会话时自动新建（保证 messagesBySession 有当前会话载体；切换会话返回本页不重复触发，onLoad 仅一次）
onLoad((options: Record<string, string> | undefined) => {
  if (!chatStore.sessionId) chatStore.createSession()
  const q = options?.q
  if (!q) return
  nextTick(() => {
    void chatStream.send(q)
    scrollToBottom()
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
const isStreaming = chatStream.streaming
const progressSteps = chatStream.progressSteps
const streamingText = chatStream.streamingText
// P3-fix-2 T2：流式过程中的实时思考链（ref 自动解包，模板直接读数组）
const streamingReasoning = chatStream.streamingReasoning

const inputText = ref('')
const scrollTop = ref(0)

function handleSend() {
  const content = inputText.value.trim()
  if (!content || isStreaming.value) return
  inputText.value = ''
  upsertSessionMeta(content)
  chatStream.send(content)
  scrollToBottom()
}

function quickAsk(text: string) {
  if (isStreaming.value) return
  upsertSessionMeta(text)
  chatStream.send(text)
  scrollToBottom()
}

function scrollToBottom() {
  nextTick(() => {
    scrollTop.value = 99999
  })
}

/**
 * D4：light 误判一键升级——以 force_deep=true 重发该条回复前最近一条 user 消息。
 * 闸门短路回复也显示按钮（重复点击返回同话术，无副作用）。
 */
function rerunDeep(idx: number) {
  if (isStreaming.value) return
  for (let i = idx - 1; i >= 0; i--) {
    const prev = displayMessages[i]
    if (prev && prev.role === 'user') {
      chatStream.send(prev.content, { forceDeep: true })
      scrollToBottom()
      return
    }
  }
}

onUnmounted(() => {
  chatStream.disconnect()
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
}

.message-list { flex: 1; min-height: 0; padding: 20rpx; overflow: hidden; }
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

.quick-skills { display: flex; gap: 12rpx; padding: 12rpx 20rpx; background: #ffffff; flex-shrink: 0; }
.skill-btn {
  display: inline-flex; align-items: center; gap: 6rpx;
  background: rgba(77, 124, 254, 0.08); color: $primary; border-radius: 20rpx;
  padding: 8rpx 20rpx; font-size: 24rpx;
}
.skill-btn-text { font-size: 24rpx; color: $primary; }

.input-bar { display: flex; gap: 12rpx; padding: 16rpx 20rpx; background: #ffffff; box-shadow: 0 -2rpx 8rpx rgba(0, 0, 0, 0.04); align-items: stretch; flex-shrink: 0; }
.input { flex: 1; background: $bg-soft; border-radius: 12rpx; padding: 16rpx; color: $ink; font-size: 28rpx; min-height: 72rpx; box-sizing: border-box; }
.send-btn { background: $primary; color: #fff; border-radius: 12rpx; padding: 0 30rpx; font-size: 28rpx; display: flex; align-items: center; justify-content: center; }

/* force_deep 深度分析按钮 */
.deep-btn {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  margin-top: 12rpx;
  padding: 6rpx 20rpx;
  background: rgba(77, 124, 254, 0.08);
  border-radius: 20rpx;
}
.deep-btn-text {
  font-size: 22rpx;
  color: #0b5fff;
}
</style>
