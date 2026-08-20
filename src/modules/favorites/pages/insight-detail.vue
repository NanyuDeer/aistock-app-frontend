<!--
  涨停雷达洞察详情页（limit_up_radar 专用）：
  归因结果公共区块（InsightResultBlock） + 原始来源（来源文章/关键词/发布时间）。
  价格异动洞察见 insight-detail-move.vue（两页独立，列表按 event_type 分流）。
-->
<template>
  <SubPageCard2 title="洞察详情">
    <view class="page-insight-detail">
    <view v-if="loading" class="state"><text>加载中</text></view>
    <view v-else-if="!detail" class="state"><text>洞察不存在或已过期</text></view>
    <block v-else>
      <view class="sec-title">{{ detail.stock_name }}（{{ detail.symbol }}）· {{ fmtDate(detail.trade_date) }}</view>
      <InsightResultBlock :insight="detail" />
      <!-- 原始来源：仅一期事件（limit_up_radar 有来源文章）展示；价格异动事件由 insight-detail-move 的"事件原因"替代 -->
      <block v-if="detail.source_id">
        <view class="sec-title">原始来源</view>
        <view class="src" @tap="openSource">{{ detail.title }}</view>
        <view v-if="detail.keywords?.length" class="keywords">原始关键词：{{ detail.keywords.join(' / ') }}</view>
        <view class="meta">发布时间：{{ detail.published_at }}</view>
      </block>
    </block>
    </view>
  </SubPageCard2>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { watchlistInsightApi, type WatchlistInsight } from '@/shared/api/modules/insight'
import InsightResultBlock from '@/shared/components/InsightResultBlock.vue'
import SubPageCard2 from '@/shared/components/SubPageCard2.vue'

const detail = ref<WatchlistInsight | null>(null)
const loading = ref(true)

/** trade_date（DATE/ISO）→ "YYYY-MM-DD" */
function fmtDate(v?: string | Date): string {
  if (!v) return ''
  return String(v).slice(0, 10)
}

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
    detail.value = await watchlistInsightApi.getInsightDetail(eventId)
  } catch {
    detail.value = null
  } finally {
    loading.value = false
  }
})
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;

.page-insight-detail {
  padding: $s-3;
  background: $bg-page;
}

.state {
  padding: $s-10;
  text-align: center;
  font-size: $font-size-sm;
  color: $ink-soft;
}

.sec-title {
  margin: $s-4 0 $s-2;
  font-size: $font-size-base;
  font-weight: 600;
  color: $ink;
}

.src {
  margin-top: $s-2;
  padding: $s-3;
  background: $bg-card;
  border: 2rpx solid $line;
  border-radius: $r-md;
  font-size: $font-size-sm;
  color: $primary;
}

.keywords,
.meta {
  margin-top: $s-2;
  font-size: $font-size-xs;
  color: $ink-soft;
}
</style>
