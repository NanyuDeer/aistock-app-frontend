<template>
  <view v-if="hasData" class="ss-card" :hover-class="code ? 'ss-card-hover' : 'none'" @tap="goDetail">
    <!-- 改进 23（2026-08-17）：头部拆两行信息分层——第一行名称+代码，第二行价格+涨跌幅；
         原一行两端布局在窄屏下"名称+代码+价格+涨跌幅"拥挤易折行 -->
    <view class="ss-line-1">
      <text class="ss-name">{{ name }}</text>
      <text v-if="code" class="ss-code">{{ code }}</text>
    </view>
    <view class="ss-line-2">
      <text class="ss-price" :class="trendClass">{{ fmtNum(price) }}</text>
      <text class="ss-pct" :class="trendClass">{{ fmtSigned(changePct) }}%</text>
    </view>

    <view v-if="hasMetrics" class="ss-metrics">
      <view v-if="pe != null" class="ss-metric">
        <text class="ss-metric-value">{{ fmtNum(pe) }}</text>
        <text class="ss-metric-label">市盈率</text>
      </view>
      <view v-if="pb != null" class="ss-metric">
        <text class="ss-metric-value">{{ fmtNum(pb) }}</text>
        <text class="ss-metric-label">市净率</text>
      </view>
      <view v-if="marketCap != null" class="ss-metric">
        <text class="ss-metric-value">{{ fmtCap(marketCap) }}</text>
        <text class="ss-metric-label">总市值</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ChatCard } from '@/shared/api/modules/agent'

const props = defineProps<{ card: ChatCard }>()

const name = computed(() => (typeof props.card.data.name === 'string' ? props.card.data.name : ''))
const code = computed(() => (typeof props.card.data.code === 'string' ? props.card.data.code : ''))
const price = computed(() => (typeof props.card.data.price === 'number' ? props.card.data.price : null))
const changePct = computed(() => (typeof props.card.data.change_pct === 'number' ? props.card.data.change_pct : null))
const pe = computed(() => (typeof props.card.data.pe === 'number' ? props.card.data.pe : null))
const pb = computed(() => (typeof props.card.data.pb === 'number' ? props.card.data.pb : null))
const marketCap = computed(() => (typeof props.card.data.market_cap === 'number' ? props.card.data.market_cap : null))

const hasData = computed(() => !!name.value || !!code.value || price.value != null)
const hasMetrics = computed(() => pe.value != null || pb.value != null || marketCap.value != null)

/** A 股红涨绿跌（与 MarketSnapshotCard 同语义） */
const trendClass = computed(() => {
  const pct = changePct.value ?? 0
  return pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat'
})
function fmtNum(v: number | null): string {
  return v == null ? '--' : v.toFixed(2)
}
function fmtSigned(v: number | null): string {
  if (v == null) return '--'
  return v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2)
}
function fmtCap(v: number): string {
  if (v >= 1e12) return `${(v / 1e12).toFixed(2)}万亿`
  if (v >= 1e8) return `${(v / 1e8).toFixed(1)}亿`
  return String(v)
}

/** 改进 23（2026-08-17）：卡片可点击跳个股详情（D 出口）。
 * navigateTo success 回调发射 'chat:leave-context'——index.vue G6 恢复机制
 * 据此记录阅读位置（返回时恢复原位，仅本出口接线，硬约束 #6）。 */
const goDetail = () => {
  if (!code.value) return
  uni.navigateTo({
    url: '/modules/favorites/pages/detail?symbol=' + code.value,
    success: () => uni.$emit('chat:leave-context'),
  })
}
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variables.scss' as *;

.ss-card {
  margin-bottom: 12rpx;
  padding: 16rpx 20rpx;
  background: $bg-card;
  border-radius: $r-md;
  box-shadow: $shadow-card;
}
.ss-card-hover { opacity: 0.85; }
.ss-line-1 { display: flex; align-items: baseline; gap: 8rpx; }
.ss-line-2 { display: flex; align-items: baseline; gap: 10rpx; margin-top: 6rpx; }
.ss-name { font-size: 30rpx; font-weight: 700; color: $ink; }
.ss-code { font-size: 20rpx; color: $ink-mute; }
.ss-price { font-size: 36rpx; font-weight: 700; }
.ss-pct { font-size: 26rpx; font-weight: 600; }
.ss-metrics {
  display: flex;
  margin-top: 14rpx;
  border-top: 1rpx solid $line-soft;
  padding-top: 12rpx;
  gap: 8rpx;
}
.ss-metric {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  background: $bg-soft;
  border-radius: $r-xs;
  padding: 8rpx 0;
}
.ss-metric-value { font-size: 26rpx; font-weight: 600; color: $ink; }
.ss-metric-label { font-size: 20rpx; color: $ink-mute; }
.up { color: $up; }
.down { color: $down; }
.flat { color: $flat; }
</style>
