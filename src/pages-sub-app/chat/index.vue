<template>
  <SubPageCard2 :title="'AI 投顾'" :no-chat-bar="true">
    <view class="chat-content">
      <!-- 消息列表 -->
      <scroll-view scroll-y class="message-list" :scroll-top="scrollTop">
        <view v-for="(msg, idx) in messages" :key="idx" class="message-item" :class="msg.role">
          <!-- 用户消息 -->
          <text v-if="msg.role === 'user'" class="msg-content user">{{ msg.content }}</text>

          <!-- AI 消息 -->
          <view v-else class="msg-content assistant">
            <SvgIcon class="avatar" name="robot-line" size="40rpx" color="#4d7cfe" />
            <view class="bubble">
              <!-- 折叠的进度步骤（完成后保留） -->
              <view
                v-if="msg.progressSteps && msg.progressSteps.length > 0"
                class="progress-collapse"
                @tap="toggleProgress(idx)"
              >
                <text class="progress-collapse-title">运行过程 ({{ msg.progressSteps.length }})</text>
                <SvgIcon
                  :name="expandedProgress[idx] ? 'arrow-up-s-line' : 'arrow-down-s-line'"
                  size="24rpx"
                  color="#9ca3af"
                />
              </view>
              <view v-if="msg.progressSteps && expandedProgress[idx]" class="progress-card static">
                <view
                  v-for="(step, sIdx) in msg.progressSteps"
                  :key="sIdx"
                  class="progress-step done"
                >
                  <view class="step-icon">
                    <text class="step-check">✓</text>
                  </view>
                  <text class="step-label">{{ step.label }}</text>
                </view>
              </view>

              <!-- Markdown 渲染的回复内容 -->
              <mp-html v-if="msg.content" :content="markdownToHtml(msg.content)" class="bubble-html" />

              <!-- 股票行情卡片 -->
              <view
                v-if="msg.skillResult?.data?.symbol && msg.skillResult?.data?.price !== undefined"
                class="quote-card"
                @tap="goStockDetail(msg.skillResult.data.symbol)"
              >
                <view class="quote-card-top">
                  <view class="quote-card-info">
                    <text class="quote-card-name">{{ msg.skillResult.data.name }}</text>
                    <text class="quote-card-code">{{ msg.skillResult.data.symbol }}</text>
                  </view>
                  <view class="quote-card-price-wrap">
                    <text :class="['quote-card-price', (msg.skillResult.data.changePercent ?? 0) >= 0 ? 'up' : 'down']">
                      {{ Number(msg.skillResult.data.price).toFixed(2) }}
                    </text>
                    <text :class="['quote-card-change', (msg.skillResult.data.changePercent ?? 0) >= 0 ? 'up' : 'down']">
                      {{ (msg.skillResult.data.changePercent ?? 0) >= 0 ? '+' : '' }}{{ Number(msg.skillResult.data.changePercent).toFixed(2) }}%
                    </text>
                  </view>
                </view>
                <view v-if="msg.skillResult.data.high !== undefined" class="quote-card-detail">
                  <text class="detail-item">高 {{ Number(msg.skillResult.data.high).toFixed(2) }}</text>
                  <text class="detail-item">低 {{ Number(msg.skillResult.data.low).toFixed(2) }}</text>
                  <text class="detail-item">开 {{ Number(msg.skillResult.data.open).toFixed(2) }}</text>
                </view>
              </view>

              <!-- 资金流向卡片 -->
              <view
                v-else-if="msg.skillResult?.data?.netAmount !== undefined || msg.skillResult?.data?.net_amount !== undefined"
                class="flow-card"
              >
                <text class="flow-card-title">资金流向</text>
                <view class="flow-card-row">
                  <text class="flow-label">主力净流入</text>
                  <text :class="['flow-value', getFlowClass(msg.skillResult.data)]">
                    {{ formatFlowAmount(msg.skillResult.data) }}
                  </text>
                </view>
              </view>

              <!-- 纯文本 Skill 结果 -->
              <view v-else-if="msg.skillResult?.narrative && msg.skillResult.type === 'text'" class="skill-text-card">
                <text class="skill-text">{{ msg.skillResult.narrative }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 流式进度卡片（当前正在生成） -->
        <view v-if="streaming" class="message-item assistant">
          <SvgIcon class="avatar" name="robot-line" size="40rpx" color="#4d7cfe" />
          <view class="bubble">
            <!-- 进度步骤 -->
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
            <!-- 逐 token 流式文本 + 内联光标 -->
            <view v-if="streamingText" class="streaming-text-wrap">
              <mp-html :content="markdownToHtml(streamingText)" class="bubble-html" />
              <text class="streaming-cursor">▊</text>
            </view>
          </view>
        </view>
      </scroll-view>

      <!-- 快捷 Skills -->
      <view class="quick-skills">
        <view class="skill-btn" @tap="quickAsk('查一下 600519 的行情')">
          <SvgIcon name="line-chart-line" size="28rpx" color="#4d7cfe" />
          <text class="skill-btn-text">行情</text>
        </view>
        <view class="skill-btn" @tap="quickAsk('查一下 600519 的资金流向')">
          <SvgIcon name="money-cny-circle-line" size="28rpx" color="#4d7cfe" />
          <text class="skill-btn-text">资金</text>
        </view>
        <view class="skill-btn" @tap="quickAsk('今天的龙头股有哪些')">
          <SvgIcon name="trophy-line" size="28rpx" color="#4d7cfe" />
          <text class="skill-btn-text">龙头</text>
        </view>
      </view>

      <!-- 输入框 -->
      <view class="input-bar">
        <input v-model="inputText" placeholder="输入消息..." class="input" @confirm="handleSend" />
        <button @tap="handleSend" :disabled="streaming" class="send-btn">发送</button>
      </view>
    </view>
  </SubPageCard2>
</template>

<script setup lang="ts">
import { ref, reactive, nextTick, onUnmounted } from 'vue'
import { useChatStream } from '@/shared/utils/useChatStream'
import { markdownToHtml } from '@/shared/utils/markdown'
import SubPageCard2 from '@/shared/components/SubPageCard2.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import mpHtml from 'mp-html/dist/uni-app/components/mp-html/mp-html'

const { messages, streaming, progressSteps, streamingText, send, disconnect } = useChatStream()

const inputText = ref('')
const scrollTop = ref(0)
const expandedProgress = reactive<Record<number, boolean>>({})

function toggleProgress(idx: number) {
  expandedProgress[idx] = !expandedProgress[idx]
}

function handleSend() {
  const content = inputText.value.trim()
  if (!content || streaming.value) return
  inputText.value = ''
  send(content)
  scrollToBottom()
}

function quickAsk(text: string) {
  if (streaming.value) return
  send(text)
  scrollToBottom()
}

function goStockDetail(symbol: string) {
  if (!symbol) return
  uni.navigateTo({ url: `/modules/favorites/pages/detail?symbol=${symbol}` })
}

function getFlowClass(data: any): string {
  const net = data?.netAmount ?? data?.net_amount ?? 0
  return net >= 0 ? 'up' : 'down'
}

function formatFlowAmount(data: any): string {
  const net = data?.netAmount ?? data?.net_amount ?? 0
  const abs = Math.abs(net)
  if (abs >= 100000000) return (net / 100000000).toFixed(2) + '亿'
  if (abs >= 10000) return (net / 10000).toFixed(2) + '万'
  return net.toFixed(2) + '元'
}

function scrollToBottom() {
  nextTick(() => {
    scrollTop.value = 99999
  })
}

onUnmounted(() => {
  disconnect()
})
</script>

<style lang="scss" scoped>
.chat-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.message-list { flex: 1; min-height: 0; padding: 20rpx; }
.message-item { margin-bottom: 24rpx; }
.message-item.user { display: flex; justify-content: flex-end; }
.msg-content.user {
  background: #4d7cfe; color: #fff; border-radius: 16rpx 16rpx 4rpx 16rpx; padding: 16rpx 24rpx;
  max-width: 70%; font-size: 28rpx; line-height: 1.5;
}
.msg-content.assistant { display: flex; gap: 12rpx; }
.avatar { font-size: 40rpx; flex-shrink: 0; }
.bubble {
  background: #ffffff; border-radius: 16rpx 16rpx 16rpx 4rpx; padding: 16rpx 24rpx;
  max-width: 80%; box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

/* mp-html 样式覆盖 */
:deep(.bubble-html) {
  font-size: 28rpx;
  color: #1a1d24;
  line-height: 1.6;
}
:deep(.md-h2) { font-size: 32rpx; font-weight: 600; margin: 16rpx 0 8rpx; }
:deep(.md-h3) { font-size: 30rpx; font-weight: 600; margin: 12rpx 0 6rpx; }
:deep(.md-hr) { border: none; border-top: 1rpx solid #e5e7eb; margin: 12rpx 0; }
:deep(.md-ul) { padding-left: 20rpx; margin: 8rpx 0; }
:deep(.md-ol) { padding-left: 20rpx; margin: 8rpx 0; }
:deep(.md-ul-li) { font-size: 28rpx; color: #1a1d24; line-height: 1.8; }
:deep(.md-ol-li) { font-size: 28rpx; color: #1a1d24; line-height: 1.8; }
:deep(.md-table) { width: 100%; border-collapse: collapse; margin: 8rpx 0; }
:deep(.md-table th) { background: #f5f7fa; font-size: 24rpx; padding: 8rpx; border: 1rpx solid #e5e7eb; }
:deep(.md-table td) { font-size: 24rpx; padding: 8rpx; border: 1rpx solid #e5e7eb; }

/* 流式文本区域 — block 布局，光标内联在末尾 */
.streaming-text-wrap {
  position: relative;
}
.streaming-cursor {
  color: #4d7cfe;
  animation: blink 1s step-end infinite;
  font-size: 28rpx;
  line-height: 1.6;
  display: inline;
}
@keyframes blink { 50% { opacity: 0; } }

/* 涨跌色 */
.up { color: #f43f5e; }
.down { color: #22c55e; }

/* 折叠的进度步骤 */
.progress-collapse {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8rpx 0;
  margin-bottom: 4rpx;
  border-bottom: 1rpx solid #f0f0f0;
}
.progress-collapse-title {
  font-size: 22rpx;
  color: #9ca3af;
}

/* 进度卡片 */
.progress-card { padding: 4rpx 0 12rpx; }
.progress-card.static { padding-top: 8rpx; }
.progress-step {
  display: flex; align-items: center; gap: 12rpx; padding: 6rpx 0;
}
.step-icon {
  width: 32rpx; height: 32rpx; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.step-check { font-size: 24rpx; color: #22c55e; font-weight: 700; }
.step-spinner {
  width: 24rpx; height: 24rpx; border: 3rpx solid #e5e7eb; border-top-color: #4d7cfe;
  border-radius: 50%; animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.step-label { font-size: 24rpx; color: #6b7280; }
.progress-step.done .step-label { color: #9ca3af; }

/* 行情卡片 */
.quote-card {
  margin-top: 16rpx; padding: 20rpx; background: #f5f7fa; border-radius: 12rpx;
}
.quote-card-top {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx;
}
.quote-card-info { display: flex; align-items: center; gap: 12rpx; }
.quote-card-name { font-size: 28rpx; font-weight: 600; color: #1a1d24; }
.quote-card-code { font-size: 22rpx; color: #6b7280; padding: 2rpx 10rpx; background: #e5e7eb; border-radius: 6rpx; }
.quote-card-price-wrap { display: flex; flex-direction: column; align-items: flex-end; }
.quote-card-price { font-size: 32rpx; font-weight: 700; }
.quote-card-change { font-size: 24rpx; margin-top: 2rpx; }
.quote-card-detail {
  display: flex; gap: 24rpx; padding-top: 12rpx; border-top: 1rpx solid #e5e7eb;
}
.detail-item { font-size: 22rpx; color: #6b7280; }

/* 资金流向卡片 */
.flow-card {
  margin-top: 16rpx; padding: 20rpx; background: #f5f7fa; border-radius: 12rpx;
}
.flow-card-title { font-size: 26rpx; font-weight: 500; color: #1a1d24; display: block; margin-bottom: 12rpx; }
.flow-card-row { display: flex; justify-content: space-between; align-items: center; }
.flow-label { font-size: 24rpx; color: #6b7280; }
.flow-value { font-size: 28rpx; font-weight: 600; }

/* 纯文本 Skill 结果 */
.skill-text-card {
  margin-top: 16rpx; padding: 20rpx; background: rgba(77, 124, 254, 0.06); border-radius: 12rpx;
}
.skill-text { font-size: 26rpx; color: #6b7280; line-height: 1.5; }

.quick-skills { display: flex; gap: 12rpx; padding: 12rpx 20rpx; background: #ffffff; }
.skill-btn {
  display: inline-flex; align-items: center; gap: 6rpx;
  background: rgba(77, 124, 254, 0.08); color: #4d7cfe; border-radius: 20rpx;
  padding: 8rpx 20rpx; font-size: 24rpx;
}
.skill-btn-text { font-size: 24rpx; color: #4d7cfe; }

.input-bar { display: flex; gap: 12rpx; padding: 16rpx 20rpx; background: #ffffff; box-shadow: 0 -2rpx 8rpx rgba(0, 0, 0, 0.04); align-items: stretch; }
.input { flex: 1; background: #f5f7fa; border-radius: 12rpx; padding: 16rpx; color: #1a1d24; font-size: 28rpx; min-height: 72rpx; box-sizing: border-box; }
.send-btn { background: #4d7cfe; color: #fff; border-radius: 12rpx; padding: 0 30rpx; font-size: 28rpx; display: flex; align-items: center; justify-content: center; }
</style>
