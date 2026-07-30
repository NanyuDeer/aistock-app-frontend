<template>
  <view :class="['as-chat-bubble', `as-chat-bubble--${role}`]">
    <!-- 用户消息：右对齐，蓝色背景 -->
    <view v-if="role === 'user'" class="as-chat-bubble__user">
      <text class="as-chat-bubble__user-text">{{ content }}</text>
    </view>

    <!-- AI 消息：左对齐，白色背景 + AI 头像 -->
    <template v-else>
      <view v-if="showAvatar" class="as-chat-bubble__avatar">
        <view class="as-chat-bubble__avatar-icon" :style="{ backgroundImage: `url('${aiAvatar}')` }" />
      </view>
      <view class="as-chat-bubble__body">
        <text v-if="content" class="as-chat-bubble__content">{{ content }}</text>
        <slot name="card" />
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/**
 * ChatBubble 聊天气泡
 * 用于 AI 对话场景，支持 user / assistant 两种角色。
 * - user：右对齐，主色背景 + 白色文字，右下角小圆角形成气泡尖角
 * - assistant：左对齐，白色背景 + 深色文字 + AI 头像，左下角小圆角，带阴影
 * assistant 气泡通过 name="card" 插槽支持插入富内容卡片。
 * 不依赖 SvgIcon 组件，AI 头像用内联 SVG data URI 实现，保证组件库跨环境可用。
 */
withDefaults(defineProps<{
  /** 消息角色 */
  role?: 'user' | 'assistant'
  /** 文本内容 */
  content?: string
  /** assistant 是否显示 AI 头像 */
  showAvatar?: boolean
}>(), {
  role: 'assistant',
  content: '',
  showAvatar: true
})

/** AI 头像：蓝色渐变圆形背景 + 白色机器人图标（内联 SVG data URI） */
const aiAvatar = computed(() => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><rect x="4.5" y="8" width="15" height="11" rx="3"/><path d="M12 8V4.5"/><circle cx="12" cy="3.4" r="1.1" fill="#ffffff" stroke="none"/><circle cx="9" cy="13" r="1.1" fill="#ffffff" stroke="none"/><circle cx="15" cy="13" r="1.1" fill="#ffffff" stroke="none"/><path d="M9.5 16.5h5"/><path d="M4.5 12v3M19.5 12v3"/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
})
</script>

<style lang="scss" scoped>
.as-chat-bubble {
  display: flex;
  width: 100%;
  margin-bottom: $s-3;
}

/* 用户消息：右对齐 */
.as-chat-bubble--user {
  justify-content: flex-end;
}

/* AI 消息：左对齐，头像 + 气泡 */
.as-chat-bubble--assistant {
  justify-content: flex-start;
  align-items: flex-start;
  gap: $s-2;
}

.as-chat-bubble__user {
  max-width: 80%;
  background: $primary;
  border-radius: $r-md $r-md 4rpx $r-md;
  padding: $s-2 $s-3;
}

.as-chat-bubble__user-text {
  font-size: $font-size-md;
  line-height: $lh-base;
  color: $white;
}

/* AI 头像：蓝色渐变圆 + 白色机器人 */
.as-chat-bubble__avatar {
  flex-shrink: 0;
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $r-full;
  background: $brand-gradient;
  box-shadow: $shadow-xs;
}

.as-chat-bubble__avatar-icon {
  width: 40rpx;
  height: 40rpx;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
}

/* AI 气泡：白色背景 + 阴影 */
.as-chat-bubble__body {
  max-width: 80%;
  background: $bg-card;
  border-radius: $r-md $r-md $r-md 4rpx;
  padding: $s-2 $s-3;
  box-shadow: $shadow-xs;
}

.as-chat-bubble__content {
  display: block;
  font-size: $font-size-md;
  line-height: $lh-base;
  color: $ink;
}
</style>
