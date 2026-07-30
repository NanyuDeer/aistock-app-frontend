/**
 * MarketOverview 大盘概览
 * 视觉层：基于组件库 IndexCard + EmptyState（同步时间：2026-07-28）
 * 保留业务逻辑：indices 数据透传 + 空状态兜底
 *
 * 字段映射：indices 直接透传给 IndexCard（name/code/price/changePercent 完全一致）
 */
<template>
  <view class="as-market-overview">
    <IndexCard
      v-if="indices.length"
      :indices="indices"
      title="大盘概览"
      :status="status"
    />
    <EmptyState v-else title="暂无行情" description="开盘后查看大盘数据" />
  </view>
</template>

<script setup lang="ts">
import IndexCard from '@/shared/components/IndexCard.vue'
import EmptyState from '@/shared/components/EmptyState.vue'

defineProps<{
  indices: Array<{ name: string; code: string; price: number; changePercent: number }>
  status?: string
}>()
</script>

<style lang="scss" scoped>
.as-market-overview {
  width: 100%;
}
</style>
