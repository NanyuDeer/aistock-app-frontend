<template>
  <view class="stock-content">
    <view class="content-wrap">
      <view class="tab-bar">
        <scroll-view class="stock-tabs" scroll-x :show-scrollbar="false">
          <view class="stock-tabs__row">
            <view v-for="tab in tabs" :key="tab.key" :class="['stock-tabs__item', { 'is-active': activeTab === tab.key }]" @tap="onTabTap(tab.key)">
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
type TabKey = 'ai' | 'trend' | 'hot' | 'forecast'
// Tab 处于「选股」页内，标题已表明场景，故三个子 Tab 不再重复「洞见」后缀
const tabs: Array<{ key: TabKey; label: string }> = [{ key: 'ai', label: 'AI帮我选' }, { key: 'trend', label: '趋势股' }, { key: 'hot', label: '机构热门股' }, { key: 'forecast', label: '业绩预测' }]
const activeTab = ref<TabKey>('ai')

/** 子 Tab 组件暴露的刷新入口（defineExpose）；用于切换时刷新，避免读到挂载时的旧快照 */
interface RefreshableTab { refresh?: () => void }
const trendRef = ref<RefreshableTab | null>(null)
const hotRef = ref<RefreshableTab | null>(null)
const forecastRef = ref<RefreshableTab | null>(null)

/**
 * 切换子 Tab：v-show 保活不销毁实例，因此切换时手动调一次子组件的 refresh()，
 * 拉取最新数据（否则上午进过选股页、下午切回来仍是上午的快照）。
 * AI帮我选为静态演示数据，无 refresh 入口，不参与。
 */
function onTabTap(key: TabKey) {
  activeTab.value = key
  if (key === 'trend') trendRef.value?.refresh?.()
  else if (key === 'hot') hotRef.value?.refresh?.()
  else if (key === 'forecast') forecastRef.value?.refresh?.()
}
</script>

<style lang="scss" scoped>
.stock-content { min-height: 100%; background: $bg-card; }.content-wrap { padding: $s-3; }.tab-bar { display: flex; align-items: center; margin-bottom: $s-3; }.stock-tabs { width: 100%; white-space: nowrap; }.stock-tabs__row { display: inline-flex; min-width: 100%; gap: $s-2; }.stock-tabs__item { flex: 0 0 auto; padding: 14rpx 22rpx; border-radius: $r-md; background: $bg-soft; color: $ink-soft; }.stock-tabs__item.is-active { background: $primary; color: $white; box-shadow: $shadow-xs; }.stock-tabs__label { font-size: $font-size-sm; font-weight: 600; line-height: 1.2; }
</style>
