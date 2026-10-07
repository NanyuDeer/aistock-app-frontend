<template>
  <view class="stock-content">
    <view class="content-wrap">
      <view class="tab-bar">
        <scroll-view class="stock-tabs" scroll-x :show-scrollbar="false">
          <view class="stock-tabs__row">
            <view v-for="tab in tabs" :key="tab.key" :class="['stock-tabs__item', { 'is-active': activeTab === tab.key }]" @tap="activeTab = tab.key">
              <text class="stock-tabs__label">{{ tab.label }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 使用 v-show 保留已挂载的 Tab 实例，避免来回切换时重复请求接口。 -->
      <AiPickContent v-show="activeTab === 'ai'" />
      <TrendStockInsightContent v-show="activeTab === 'trend'" />
      <HotBurstInsightContent v-show="activeTab === 'hot'" />
      <ForecastInsightContent v-show="activeTab === 'forecast'" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import TrendStockInsightContent from './TrendStockInsightContent.vue'
import HotBurstInsightContent from './HotBurstInsightContent.vue'
import ForecastInsightContent from './ForecastInsightContent.vue'
import AiPickContent from './AiPickContent.vue'
type TabKey = 'ai' | 'trend' | 'hot' | 'forecast'
// Tab 处于「选股」页内，标题已表明场景，故三个子 Tab 不再重复「洞见」后缀
const tabs: Array<{ key: TabKey; label: string }> = [{ key: 'ai', label: 'AI帮我选' }, { key: 'trend', label: '趋势股' }, { key: 'hot', label: '机构热门股' }, { key: 'forecast', label: '业绩预测' }]
const activeTab = ref<TabKey>('ai')
</script>

<style lang="scss" scoped>
.stock-content { min-height: 100%; background: $bg-card; }.content-wrap { padding: $s-3; }.tab-bar { display: flex; align-items: center; margin-bottom: $s-3; }.stock-tabs { width: 100%; white-space: nowrap; }.stock-tabs__row { display: inline-flex; min-width: 100%; gap: $s-2; }.stock-tabs__item { flex: 0 0 auto; padding: 14rpx 22rpx; border-radius: $r-md; background: $bg-soft; color: $ink-soft; }.stock-tabs__item.is-active { background: $primary; color: $white; box-shadow: $shadow-xs; }.stock-tabs__label { font-size: $font-size-sm; font-weight: 600; line-height: 1.2; }
</style>
