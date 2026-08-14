<!--
  价格异动洞察详情页（午盘/尾盘 price_move 专用）：
  价格异动盒子 + 事件原因时间线（证据包带时间） + 归因结果公共区块。
  涨停雷达洞察见 insight-detail.vue（两页独立，列表按 event_type 分流）。
-->
<template>
  <view class="page-insight-detail">
    <view v-if="loading" class="state"><text>加载中</text></view>
    <view v-else-if="!detail" class="state"><text>洞察不存在或已过期</text></view>
    <block v-else>
      <view class="sec-title">{{ detail.stock_name }}（{{ detail.symbol }}）· {{ fmtDate(detail.trade_date) }}</view>
      <view class="move-box">
        <text :class="['move', detail.direction === 'up' ? 'move-up' : 'move-down']">{{ detail.direction === 'up' ? '上涨' : '下跌' }}</text>
        <text class="move-pct" v-if="detail.move_bps !== undefined" :class="detail.move_bps >= 0 ? 'pct-up' : 'pct-down'">{{ (detail.move_bps / 100).toFixed(2) }}%</text>
        <text class="move-meta">相对开盘 · {{ detail.price_source === 'kline_backfill' ? 'K线回溯' : '实时快照' }}</text>
      </view>
      <InsightResultBlock :insight="detail" />
      <!-- 事件原因：证据包事件列表（带时间，类似涨停雷达正文原因格式），参考大盘溯源页置于最底部 -->
      <view v-if="detail.evidence_package?.length" class="evi-box">
        <view class="evi-title">事件原因</view>
        <view v-for="(e, i) in detail.evidence_package" :key="e.source_id || `evi-${i}`" class="evi-item">
          <text class="evi-no">{{ i + 1 }}</text>
          <view class="evi-body">
            <text class="evi-text">{{ e.title || e.excerpt || e.source_id }}</text>
            <text class="evi-meta">据 {{ fmtTime(e.published_at) }} · {{ sourceTypeText(e.source_type) }}</text>
            <text v-if="e.excerpt && e.title" class="evi-excerpt">{{ e.excerpt }}</text>
          </view>
        </view>
      </view>
    </block>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { watchlistInsightApi, type WatchlistInsight } from '@/shared/api/modules/insight'
import InsightResultBlock from '@/shared/components/InsightResultBlock.vue'

const detail = ref<WatchlistInsight | null>(null)
const loading = ref(true)

const SOURCE_TYPE_TEXT: Record<string, string> = {
  announcement: '公告', news: '新闻', earnings: '业绩', rating: '研报',
  radar_article: '涨停雷达', quant: '量化联动',
}

function sourceTypeText(t?: string): string {
  return SOURCE_TYPE_TEXT[t || ''] || t || '来源'
}

/** 证据发布时间格式化：ISO/日期串 → "YYYY-MM-DD HH:mm" */
function fmtTime(v?: string): string {
  if (!v) return ''
  const m = String(v).match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/)
  return m ? `${m[1]} ${m[2]}` : String(v).slice(0, 16)
}

/** trade_date（DATE/ISO）→ "YYYY-MM-DD" */
function fmtDate(v?: string | Date): string {
  if (!v) return ''
  return String(v).slice(0, 10)
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

.move-box {
  display: flex;
  align-items: center;
  gap: $s-2;
  padding: $s-3;
  margin-bottom: $s-2;
  background: $bg-card;
  border: 2rpx solid $line;
  border-radius: $r-md;
}

.move {
  padding: 2rpx 12rpx;
  border-radius: $r-xs;
  font-size: $font-size-xs;
  font-weight: 600;
}

.move-up {
  color: $up;
  background: $up-bg;
}

.move-down {
  color: $down;
  background: $down-bg;
}

.move-pct {
  font-size: $font-size-lg;
  font-weight: 700;
}

.pct-up {
  color: $up;
}

.pct-down {
  color: $down;
}

.move-meta {
  font-size: $font-size-xs;
  color: $ink-soft;
}

.evi-box {
  padding: $s-3;
  margin-bottom: $s-2;
  background: $bg-card;
  border: 2rpx solid $line;
  border-radius: $r-md;
}

.evi-title {
  margin-bottom: $s-2;
  font-size: $font-size-sm;
  font-weight: 600;
  color: $ink;
}

.evi-item {
  display: flex;
  align-items: flex-start;
  gap: $s-2;
  padding: $s-2 0;
  border-bottom: 2rpx solid $line;

  &:last-child {
    border-bottom: none;
  }
}

.evi-no {
  flex-shrink: 0;
  width: 36rpx;
  line-height: 1.6;
  font-size: $font-size-sm;
  font-weight: 600;
  color: $primary;
  text-align: center;
}

.evi-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.evi-text {
  font-size: $font-size-sm;
  color: $ink;
  line-height: 1.5;
}

.evi-meta {
  font-size: $font-size-xs;
  color: $ink-soft;
  line-height: 1.5;
}

.evi-excerpt {
  font-size: $font-size-xs;
  color: $ink-soft;
  line-height: 1.5;
}
</style>
