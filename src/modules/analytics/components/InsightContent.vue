<template>
  <view class="insight-content">
    <view class="content-wrap">
      <!-- 机构调研热门股卡片 -->
      <InsightListCard
        theme="burst"
        title="机构调研热门股"
        desc="机构调研共振检测，发现潜在机会"
        icon-name="search-eye-line"
        :items="hotBurstItems"
        action-text="查看详情"
        @click="goHotBurst"
      />

      <!-- 趋势股评分卡片 -->
      <InsightListCard
        theme="trend"
        title="趋势股评分"
        desc="基于多维度模型对A股趋势打分"
        icon-name="bar-chart-line"
        :items="trendScoreItems"
        action-text="查看详情"
        @click="goTrendScore"
      />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { InsightListCard, type InsightListItem } from '@/shared/components'

const hotBurstPreview = ref([
  { name: '舒泰神', count: 3 },
  { name: '广生堂', count: 2 },
  { name: '药明康德', count: 5 },
])

const trendScorePreview = ref([
  { name: '山西焦化', score: 85, trend: 'up' as const },
  { name: '宁德时代', score: 78, trend: 'down' as const },
  { name: '比亚迪', score: 72, trend: 'up' as const },
])

const hotBurstItems = ref<InsightListItem[]>(
  hotBurstPreview.value.map(item => ({
    name: item.name,
    tag: `${item.count}家机构调研`,
  }))
)

const trendScoreItems = ref<InsightListItem[]>(
  trendScorePreview.value.map(item => ({
    name: item.name,
    score: `${item.score}分`,
    trend: item.trend === 'up' ? '↑' : '↓',
    trendType: item.trend,
  }))
)

function goHotBurst() {
  uni.navigateTo({ url: '/modules/market/pages/hot-burst' })
}

function goTrendScore() {
  uni.navigateTo({ url: '/modules/analytics/pages/trend-score' })
}
</script>

<style lang="scss" scoped>
.insight-content {
  background: $bg-card;
}

.content-wrap {
  padding: $s-3;
}
</style>
