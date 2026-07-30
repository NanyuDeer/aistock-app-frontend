<template>
  <view v-if="stockTraceDegraded" class="advisor-trace-status">
    <text>个股可追溯数据暂不可用</text>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AdvisorTrace } from '@/shared/api/modules/agent'

const props = defineProps<{ trace?: AdvisorTrace }>()

const stockTraceDegraded = computed(() => props.trace?.missing_sources.includes('stock_trace') === true)
</script>

<style scoped lang="scss">
.advisor-trace-status { margin-top: 12rpx; color: #b45309; font-size: 24rpx; }
</style>
