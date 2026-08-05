<template>
  <view v-if="showBar" class="usage-bar">
    <text class="usage-text">
      累计 {{ fmtTokens(cumulativeTotal) }} token ｜ 本次 {{ fmtTokens(sessionTotal) }} token
    </text>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { agentApi } from '@/shared/api/modules/agent'
import { useChatStore } from '@/shared/store/modules/chat'
import { useUserStore } from '@/shared/store/modules/user'

const chatStore = useChatStore()
const userStore = useUserStore()
const cumulativeTotal = ref(0)

onMounted(() => {
  // 登录才拉用户累计（JWT 拦截器自动带 token）；未登录/失败时累计保持 0，只显示本次
  if (!userStore.isLoggedIn()) return
  agentApi.getTokenUsageSummary()
    .then((s) => { cumulativeTotal.value = s?.total_tokens ?? 0 })
    .catch(() => { cumulativeTotal.value = 0 })
})

/** 本次会话 = chatStore 本地按 sessionId 累加的 DONE token_usage（不做后端会话维度） */
const sessionTotal = computed(() => chatStore.getCurrentSessionUsage()?.total_tokens ?? 0)

const showBar = computed(() => userStore.isLoggedIn() || sessionTotal.value > 0)

function fmtTokens(n: number): string {
  return n >= 10000 ? `${(n / 10000).toFixed(1)}万` : String(n)
}
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;

.usage-bar {
  display: flex;
  justify-content: flex-end;
  padding: 8rpx 20rpx 0;
  flex-shrink: 0;
}
.usage-text {
  font-size: 20rpx;
  color: $ink-mute;
}
</style>
