<template>
  <view class="investment-logic-header">
    <!-- 上方分隔 -->
    <view class="divider-line" />

    <!-- 标题 -->
    <text class="section-title">投资逻辑解析</text>

    <!-- 说明文字 -->
    <text class="section-desc">
      AI将从事件背景、影响因素、产业链传导及历史验证等角度，拆解该投资机会的形成原因。
    </text>
  </view>
</template>

<script setup lang="ts">
/**
 * InvestmentLogicHeader — 投资逻辑解析过渡模块
 *
 * 纯信息架构过渡组件，不承载业务数据。
 * 位于 AI投资机会 与 事件理解 之间，引导用户进入深度解读。
 */
</script>

<style scoped>
.investment-logic-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32rpx 24rpx;
}

.divider-line {
  width: 60rpx;
  height: 2rpx;
  border-radius: 1rpx;
  background: var(--ev-accent);
  opacity: 0.35;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 26rpx;
  font-weight: 700;
  color: var(--ev-text-primary);
  margin-bottom: 12rpx;
  text-align: center;
}

.section-desc {
  font-size: 22rpx;
  color: var(--ev-text-muted);
  line-height: 1.6;
  text-align: center;
  max-width: 80%;
}
</style>
