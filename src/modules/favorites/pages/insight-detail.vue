<template>
  <SubPageCard2 title="洞察详情" :subtitle="subtitle">
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
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { watchlistInsightApi, type WatchlistInsight } from '@/shared/api/modules/insight'
import { mockWatchlistInsights, isInsightsMockForced } from '../mock-data'
import SubPageCard2 from '@/shared/components/SubPageCard2.vue'
import LoadingState from '@/shared/components/LoadingState.vue'
import EmptyState from '@/shared/components/EmptyState.vue'
import InsightDetailLayout from '@/modules/favorites/components/InsightDetailLayout.vue'

const detail = ref<WatchlistInsight | null>(null)
const loading = ref(true)

const subtitle = computed(() => {
  if (!detail.value) return ''
  return `${detail.value.symbol} · ${detail.value.trade_date}`
})

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
    // 演示开关：VITE_USE_INSIGHTS_MOCK=true 时优先取 mock（思维链逻辑未就绪前不展示真实数据）
    if (isInsightsMockForced()) {
      detail.value = mockWatchlistInsights.find((i) => i.event_id === eventId) || null
    } else {
      detail.value = await watchlistInsightApi.getInsightDetail(eventId)
      // 接口返回空时回退 mock 数据兜底（产品演示用）
      if (!detail.value) detail.value = mockWatchlistInsights.find((i) => i.event_id === eventId) || null
    }
  } catch {
    // 接口失败时回退 mock 数据兜底（产品演示用）
    detail.value = mockWatchlistInsights.find((i) => i.event_id === eventId) || null
  } finally {
    loading.value = false
  }
})
</script>

<style lang="scss" scoped>
/* 组件内无自定义样式，所有视觉由 SubPageCard2 + InsightDetailLayout 提供 */
</style>
