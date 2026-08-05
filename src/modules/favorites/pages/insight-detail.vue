<template>
  <view class="page-insight-detail">
    <view v-if="loading" class="state"><text>加载中</text></view>
    <view v-else-if="!detail" class="state"><text>洞察不存在或已过期</text></view>
    <block v-else>
      <view class="sec-title">{{ detail.stock_name }}（{{ detail.symbol }}）· {{ detail.trade_date }}</view>
      <view v-if="detail.primary_driver" class="driver">
        <text class="label">主导因素</text>
        <text class="value">{{ detail.primary_driver.label }}</text>
        <text class="cat">{{ categoryText(detail.primary_driver.category) }}</text>
        <text v-if="detail.primary_driver.confidence" class="conf">{{ confidenceText(detail.primary_driver.confidence) }}</text>
      </view>
      <view v-if="detail.secondary_drivers?.length" class="subs">
        <view v-for="d in detail.secondary_drivers" :key="d.label" class="sub">
          {{ d.label }} · {{ categoryText(d.category) }}
        </view>
      </view>
      <view v-if="detail.attribution_status === 'unconfirmed'" class="unconfirmed">主因待验证</view>
      <view v-if="detail.display_report?.details" class="detail-text">{{ detail.display_report.details }}</view>
      <view class="sec-title">原始来源</view>
      <view class="src" @tap="openSource">{{ detail.title }}</view>
      <view v-if="detail.keywords?.length" class="keywords">原始关键词：{{ detail.keywords.join(' / ') }}</view>
      <view class="meta">发布时间：{{ detail.published_at }}</view>
    </block>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { watchlistInsightApi, type WatchlistInsight } from '@/shared/api/modules/insight'

const detail = ref<WatchlistInsight | null>(null)
const loading = ref(true)

function categoryText(c: string): string {
  return { industry_theme: '行业题材', company_event: '公司事件', earnings: '业绩', market: '市场', trading_sentiment: '交易情绪' }[c] || c
}

function confidenceText(c: string): string {
  return { high: '高置信', medium: '中置信', low: '低置信' }[c as 'high' | 'medium' | 'low'] || c
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
  min-height: 100%;
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

.driver {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: $s-2;
  padding: $s-3;
  background: $bg-card;
  border: 2rpx solid $line;
  border-radius: $r-md;
}

.label {
  padding: 2rpx 12rpx;
  border-radius: $r-xs;
  font-size: $font-size-xs;
  color: $primary;
  background: $primary-50;
}

.value {
  font-size: $font-size-base;
  font-weight: 600;
  color: $ink;
}

.cat,
.conf {
  font-size: $font-size-xs;
  color: $ink-soft;
}

.subs {
  display: flex;
  flex-direction: column;
  gap: $s-2;
  padding: $s-3;
  margin-top: $s-2;
  background: $bg-card;
  border: 2rpx solid $line;
  border-radius: $r-md;
}

.sub {
  font-size: $font-size-sm;
  color: $ink-soft;
}

.unconfirmed {
  margin-top: $s-2;
  padding: $s-2 $s-3;
  border-radius: $r-sm;
  font-size: $font-size-sm;
  color: $warning;
  background: $warning-bg;
}

.detail-text {
  margin-top: $s-2;
  padding: $s-3;
  background: $bg-card;
  border: 2rpx solid $line;
  border-radius: $r-md;
  font-size: $font-size-sm;
  color: $ink-soft;
  line-height: 1.6;
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
