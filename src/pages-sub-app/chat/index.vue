<template>
  <view class="page-chat">
    <!-- 顶栏 -->
    <view class="chat-header">
      <text class="back" @tap="goBack">←</text>
      <text class="title">AI 投顾</text>
    </view>

    <!-- 消息列表 -->
    <scroll-view scroll-y class="message-list" :scroll-top="scrollTop">
      <view v-for="(msg, idx) in messages" :key="idx" class="message-item" :class="msg.role">
        <text v-if="msg.role === 'user'" class="msg-content user">{{ msg.content }}</text>
        <view v-else class="msg-content assistant">
          <text class="avatar">🤖</text>
          <view class="bubble">
            <text>{{ msg.content }}</text>
            <!-- Skill 结果卡片 -->
            <view v-if="msg.skillResult" class="skill-card">
              <text class="skill-type">{{ msg.skillResult.type }}</text>
              <text class="skill-data">{{ JSON.stringify(msg.skillResult.data).slice(0, 100) }}...</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 快捷 Skills -->
    <view class="quick-skills">
      <text class="skill-btn" @tap="quickAsk('帮我分析茅台的估值')">📊 估值</text>
      <text class="skill-btn" @tap="quickAsk('今天有什么重磅事件')">📡 传导</text>
      <text class="skill-btn" @tap="quickAsk('最新的研报有哪些')">📰 研报</text>
    </view>

    <!-- 输入框 -->
    <view class="input-bar">
      <input v-model="inputText" placeholder="输入消息..." class="input" @confirm="handleSend" />
      <button @tap="handleSend" :disabled="streaming" class="send-btn">发送</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useChatStore } from '@/store/modules/chat'

const chatStore = useChatStore()
const messages = chatStore.messages
const streaming = chatStore.streaming

const inputText = ref('')
const scrollTop = ref(0)

function handleSend() {
  const content = inputText.value.trim()
  if (!content || streaming) return
  inputText.value = ''
  chatStore.sendMessage(content)
  scrollToBottom()
}

function quickAsk(text: string) {
  if (streaming) return
  chatStore.sendMessage(text)
  scrollToBottom()
}

function goBack() {
  uni.navigateBack()
}

function scrollToBottom() {
  nextTick(() => {
    scrollTop.value = 99999
  })
}
</script>

<style lang="scss" scoped>
.page-chat { display: flex; flex-direction: column; height: 100vh; }
.chat-header {
  display: flex; align-items: center; gap: 20rpx;
  padding: 20rpx; background: #1a1a2e;
}
.back { font-size: 40rpx; }
.title { font-size: 32rpx; font-weight: bold; }

.message-list { flex: 1; padding: 20rpx; }
.message-item { margin-bottom: 24rpx; }
.message-item.user { display: flex; justify-content: flex-end; }
.msg-content.user {
  background: #007AFF; color: #fff; border-radius: 12rpx; padding: 16rpx 24rpx;
  max-width: 70%;
}
.msg-content.assistant { display: flex; gap: 12rpx; }
.avatar { font-size: 40rpx; }
.bubble {
  background: #1a1a2e; border-radius: 12rpx; padding: 16rpx 24rpx;
  max-width: 80%;
}
.skill-card {
  margin-top: 12rpx; padding: 12rpx; background: #252540; border-radius: 8rpx;
}
.skill-type { font-size: 24rpx; color: #007AFF; }
.skill-data { font-size: 22rpx; color: #666; display: block; margin-top: 4rpx; }

.quick-skills { display: flex; gap: 12rpx; padding: 12rpx 20rpx; }
.skill-btn {
  background: #1a1a2e; border-radius: 20rpx; padding: 8rpx 20rpx; font-size: 24rpx;
}

.input-bar { display: flex; gap: 12rpx; padding: 16rpx 20rpx; background: #1a1a2e; }
.input { flex: 1; background: #252540; border-radius: 12rpx; padding: 16rpx; color: #fff; }
.send-btn { background: #007AFF; color: #fff; border-radius: 12rpx; padding: 0 30rpx; }
</style>
