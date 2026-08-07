<template>
  <SubPageCard2 title="洞察详情">
    <LoadingState v-if="loading" />
    <EmptyState
      v-else-if="!detail"
      title="洞察不存在或已过期"
      description="可能已被清理，请返回列表重试"
    />
    <InsightDetailLayout
      v-else
      :detail="detail"
      @open-source="openSource"
    />
  </SubPageCard2>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { watchlistInsightApi, type WatchlistInsight } from '@/shared/api/modules/insight'
import SubPageCard2 from '@/shared/components/SubPageCard2.vue'
import LoadingState from '@/shared/components/LoadingState.vue'
import EmptyState from '@/shared/components/EmptyState.vue'
import InsightDetailLayout from '@/modules/favorites/components/InsightDetailLayout.vue'

const detail = ref<WatchlistInsight | null>(null)
const loading = ref(true)

/** 原始来源跳转：H5 新窗口打开，非 H5 复制链接到剪贴板（与 stock-trace 证据跳转一致） */
function openSource() {
  const url = detail.value?.source_url
  if (!url) return
  // #ifdef H5
  window.open(url, '_blank', 'noopener')
  // #endif
  // #ifndef H5
  void uni.setClipboardData({ data: url })
  // #endif
}

onLoad(async (query) => {
  // 列表页导航时对 event_id 做了 encodeURIComponent（见 insight.vue goDetail），需还原，否则会双重编码
  const raw = typeof query?.event_id === 'string' ? query.event_id : ''
  let eventId = raw
  try { eventId = decodeURIComponent(raw) } catch { /* 原值非法编码时按原值使用 */ }
  if (!eventId) {
    loading.value = false
    return
  }
  try {
    // 自选股洞察详情：接口返回空/失败时展示空状态（EmptyState 兜底）
    detail.value = await watchlistInsightApi.getInsightDetail(eventId)
  } catch {
    detail.value = null
  } finally {
    loading.value = false
  }
})
</script>

<style lang="scss" scoped>
/* 组件内无自定义样式，所有视觉由 SubPageCard2 + InsightDetailLayout 提供 */
</style>
