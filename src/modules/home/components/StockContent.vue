<template>
  <view class="stock-content">
    <view class="content-wrap">
      <view class="tab-bar">
        <scroll-view class="stock-tabs" scroll-x :show-scrollbar="false">
          <view class="stock-tabs__row">
            <view v-for="tab in tabs" :key="tab.key" :class="['stock-tabs__item', { 'is-active': activeTab === tab.key }]" @tap="onTabTap(tab.key)">
              <image class="stock-tabs__icon" :src="tab.icon" mode="aspectFit" />
              <text class="stock-tabs__label">{{ tab.label }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 使用 v-show 保留已挂载的 Tab 实例；切换时主动触发该子 Tab 刷新一次，
           否则 v-show 保活会让数据整天停留在首次挂载的快照（见 onTabTap）。 -->
      <AiPickContent v-show="activeTab === 'ai'" />
      <TrendStockInsightContent v-show="activeTab === 'trend'" ref="trendRef" />
      <HotBurstInsightContent v-show="activeTab === 'hot'" ref="hotRef" />
      <ForecastInsightContent v-show="activeTab === 'forecast'" ref="forecastRef" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import TrendStockInsightContent from './TrendStockInsightContent.vue'
import HotBurstInsightContent from './HotBurstInsightContent.vue'
import ForecastInsightContent from './ForecastInsightContent.vue'
import AiPickContent from './AiPickContent.vue'
import aiPickIcon from '../assets/selection-ai.png'
import trendPickIcon from '../assets/selection-trend.png'
import institutionPickIcon from '../assets/selection-institution.png'
import earningsPickIcon from '../assets/selection-earnings.png'
type TabKey = 'ai' | 'trend' | 'hot' | 'forecast'
const tabs: Array<{ key: TabKey; label: string; icon: string }> = [
  { key: 'ai', label: 'AI帮我选', icon: aiPickIcon },
  { key: 'trend', label: '趋势选股', icon: trendPickIcon },
  { key: 'hot', label: '机构热门选股', icon: institutionPickIcon },
  { key: 'forecast', label: '业绩预测选股', icon: earningsPickIcon },
]
const activeTab = ref<TabKey>('ai')

/** 子 Tab 组件暴露的刷新入口（defineExpose）；用于切换时刷新，避免读到挂载时的旧快照 */
interface RefreshableTab { refresh?: () => void }
const trendRef = ref<RefreshableTab | null>(null)
const hotRef = ref<RefreshableTab | null>(null)
const forecastRef = ref<RefreshableTab | null>(null)

/**
 * 切换子 Tab：v-show 保活不销毁实例，因此切换时手动调一次子组件的 refresh()，
 * 拉取最新数据（否则上午进过选股页、下午切回来仍是上午的快照）。
 * AI帮我选在组件挂载时读取结果，目前无 refresh 入口，不参与。
 */
function onTabTap(key: TabKey) {
  activeTab.value = key
  if (key === 'trend') trendRef.value?.refresh?.()
  else if (key === 'hot') hotRef.value?.refresh?.()
  else if (key === 'forecast') forecastRef.value?.refresh?.()
}
</script>

<style lang="scss" scoped>
.stock-content { min-height: 100%; background: $bg-card; }
.content-wrap { padding: $s-3; }
.tab-bar { margin-bottom: $s-3; }
.stock-tabs { width: 100%; }
.stock-tabs__row { display: flex; width: 100%; gap: $s-1; }
.stock-tabs__item {
  box-sizing: border-box;
  display: flex;
  flex: 1 1 0;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: $s-1;
  padding: $s-2 0;
  border: 1rpx solid $line;
  border-radius: $r-md;
  background: $bg-soft;
  color: $ink-soft;
}
.stock-tabs__item.is-active { border-color: $primary; background: $primary-50; color: $primary; }
.stock-tabs__icon { display: block; width: $s-10; height: $s-10; flex-shrink: 0; }
.stock-tabs__label { font-size: calc($font-size-xs - 2rpx); font-weight: 600; line-height: 1.4; white-space: nowrap; }
</style>
