/**
 * GlobalChatBar 全局 AI 对话栏
 * 视觉层同步自 aistock-component-lib/src/components/GlobalChatBar.vue（同步时间：2026-07-28）
 * 保留 app 前端业务逻辑：交易/自选按钮 + activePanel 面板状态 + uni 导航
 */
<template>
  <view class="as-gcb">
    <view class="as-gcb__row">
      <!-- 报告按钮：今日分析概览/报告归档入口（交易功能未接入前的占位去向） -->
      <view
        class="as-gcb__side-btn"
        :class="{ 'as-gcb__side-btn--active': activePanel === 'trade' }"
        @tap="handleTrade"
      >
        <view v-if="activePanel === 'trade'" class="as-gcb__side-arrow"></view>
        <text v-else class="as-gcb__side-text">报告</text>
      </view>

      <!-- AI 对话入口胶囊 -->
      <view class="as-gcb__capsule" @tap="handleChatTap">
        <!-- AI 头像 -->
        <view class="as-gcb__avatar">
          <text class="as-gcb__avatar-text">AI</text>
        </view>

        <!-- 输入提示 -->
        <text class="as-gcb__placeholder">{{ placeholder }}</text>

        <!-- 未读数 -->
        <view v-if="unreadCount > 0" class="as-gcb__unread">
          <text class="as-gcb__unread-text">{{ unreadCount }}</text>
        </view>

        <!-- 麦克风图标 -->
        <view class="as-gcb__mic">
          <SvgIcon name="mic-line" size="32rpx" color="#9ca3af" />
        </view>
      </view>

      <!-- 自选按钮：在自选面板页时变为下拉箭头，点击返回 -->
      <view
        class="as-gcb__side-btn"
        :class="{ 'as-gcb__side-btn--active': activePanel === 'favorites' }"
        @tap="handleFavorites"
      >
        <view v-if="activePanel === 'favorites'" class="as-gcb__side-arrow"></view>
        <text v-else class="as-gcb__side-text">自选</text>
      </view>
    </view>

    <!-- 底部免责声明 -->
    <view class="as-gcb__disclaimer">
      <text class="as-gcb__disclaimer-text">内容由AI生成，不构成投资建议</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import SvgIcon from '@/shared/components/SvgIcon.vue'

const props = withDefaults(defineProps<{
  /** 输入提示文案 */
  placeholder?: string
  /** 未读消息数，>0 时显示徽章 */
  unreadCount?: number
  /** 当前激活的面板页：'favorites' | 'trade' | '' */
  activePanel?: string
}>(), {
  placeholder: '搜问或按住说',
  unreadCount: 0,
  activePanel: ''
})

const handleChatTap = () => {
  uni.navigateTo({ url: '/pages-sub-app/chat/index' })
}

const handleTrade = () => {
  if (props.activePanel === 'trade') {
    uni.navigateBack()
    return
  }
  // 报告归档入口（今日分析概览；交易功能未接入，后续交易接入时再调整去向，spec §8）
  uni.navigateTo({ url: '/modules/chat/pages/agent-report' })
}

const handleFavorites = () => {
  if (props.activePanel === 'favorites') {
    uni.navigateBack()
    return
  }
  uni.navigateTo({ url: '/modules/favorites/pages/favorites' })
}
</script>

<style lang="scss" scoped>
/* 全局对话栏：固定底部，最高层级 */
.as-gcb {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: $z-fixed + 1;
  padding-top: $s-1;
  padding-bottom: calc(env(safe-area-inset-bottom) + 8rpx);
  background: $bg-page;
}

/* AI 对话行：交易 | 胶囊 | 自选 */
.as-gcb__row {
  display: flex;
  align-items: center;
  padding: 0 $s-3;
  gap: $s-2;
}

/* 左右圆形按钮 */
.as-gcb__side-btn {
  flex-shrink: 0;
  width: 88rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $bg-card;
  border-radius: $r-full;
  border: 2rpx solid rgba($primary, 0.15);
  box-shadow: $shadow-sm;
}

.as-gcb__side-btn--active {
  background: rgba($primary, 0.1);
  border-color: rgba($primary, 0.3);
}

.as-gcb__side-btn:active {
  opacity: $op-active;
}

.as-gcb__side-text {
  font-size: $font-size-sm;
  font-weight: 600;
  color: $ink-soft;
  letter-spacing: 1rpx;
}

/* 下拉箭头（面板激活时显示，CSS 绘制） */
.as-gcb__side-arrow {
  position: relative;
  width: 20rpx;
  height: 20rpx;
  transform: rotate(-90deg);
}

.as-gcb__side-arrow::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 20rpx;
  height: 20rpx;
  border-left: 4rpx solid $primary;
  border-bottom: 4rpx solid $primary;
  transform: rotate(45deg);
}

/* AI 对话胶囊 */
.as-gcb__capsule {
  flex: 1;
  height: 80rpx;
  display: flex;
  align-items: center;
  padding: 0 $s-2 0 $s-1;
  gap: $s-2;
  background: $bg-card;
  border: 2rpx solid rgba($primary, 0.15);
  border-radius: $r-full;
  box-shadow: $shadow-hover;
}

.as-gcb__capsule:active {
  opacity: $op-active;
}

/* AI 头像：渐变圆 */
.as-gcb__avatar {
  flex-shrink: 0;
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $r-full;
  background: linear-gradient(135deg, $primary, $accent);
}

.as-gcb__avatar-text {
  font-size: $font-size-xs;
  font-weight: 600;
  color: $white;
  line-height: 1;
}

/* 输入提示 */
.as-gcb__placeholder {
  flex: 1;
  font-size: $font-size-sm;
  color: $ink-mute;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 未读徽章 */
.as-gcb__unread {
  flex-shrink: 0;
  min-width: 32rpx;
  height: 32rpx;
  padding: 0 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $primary-50;
  border-radius: $r-full;
}

.as-gcb__unread-text {
  font-size: $font-size-xs;
  color: $primary;
  font-weight: 600;
  line-height: 1;
}

/* 麦克风图标容器 */
.as-gcb__mic {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 免责声明 */
.as-gcb__disclaimer {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 44rpx;
}

.as-gcb__disclaimer-text {
  font-size: $font-size-xs;
  color: $ink-faint;
}
</style>
