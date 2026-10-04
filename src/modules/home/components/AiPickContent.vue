<template>
  <view class="ai-pick-list">
    <!-- 一期为模拟数据；后续由选股 Agent 返回同结构的推荐结果。 -->
    <view v-for="item in recommendations" :key="item.symbol" class="ai-pick-row" @tap="openDetail(item.symbol)">
      <view class="ai-pick-main">
        <view class="stock-line"><view class="stock-name">{{ item.name }}</view><view class="stock-price" :class="item.change.startsWith('-') ? 'is-down' : 'is-up'">{{ item.price }}</view><view class="stock-change" :class="item.change.startsWith('-') ? 'is-down' : 'is-up'">{{ item.change }}</view><view :class="['favorite-button', { added: favoritesStore.isFavorite(item.symbol), disabled: favoritesStore.isPending(item.symbol) }]" @tap.stop="addFavorite(item)"><text>{{ favoritesStore.isFavorite(item.symbol) ? '✓' : '＋' }}</text></view></view>
        <view class="reason-line"><view class="reason-label">推荐理由</view><view class="reason-text">{{ item.reason }}</view></view>
      </view>
      <svg class="mini-chart" viewBox="0 0 120 64" preserveAspectRatio="none"><polyline :points="item.chart" fill="none" :stroke="item.change.startsWith('-') ? '#22a65a' : '#ff4057'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /><line x1="0" y1="62" x2="120" y2="62" stroke="#edf0f5" stroke-width="1" /></svg>
    </view>
  </view>
</template>

<script setup lang="ts">
import { useFavoritesStore } from '@/shared/store'
interface Recommendation { symbol: string; name: string; price: string; change: string; reason: string; chart: string }
const favoritesStore = useFavoritesStore()
const recommendations: Recommendation[] = [
  { symbol: '600577', name: '精达股份', price: '9.58', change: '+5.04%', reason: '订单改善，短期资金关注度上升', chart: '2,58 2,6 30,6 34,22 48,18 58,27 70,24 82,30 96,27 118,34' },
  { symbol: '002831', name: '裕同科技', price: '30.71', change: '+3.15%', reason: '基本面预期向好，趋势信号共振', chart: '2,48 8,25 15,42 23,33 31,40 45,37 58,40 72,36 88,38 102,14 118,10' },
  { symbol: '600118', name: '中国卫星', price: '31.58', change: '+7.81%', reason: '主题热度提升，资金活跃度增加', chart: '2,54 18,52 36,55 52,52 66,54 82,50 91,51 101,8 110,12 118,22' },
  { symbol: '601766', name: '中国中车', price: '8.03', change: '+1.74%', reason: '估值处于相对低位，走势保持稳定', chart: '2,45 10,20 18,30 28,10 38,41 50,34 61,25 72,37 84,32 98,26 118,28' },
  { symbol: '002648', name: '卫星化学', price: '18.52', change: '-2.40%', reason: '盈利预期改善，机构关注度提升', chart: '2,25 14,28 26,38 40,45 56,44 70,42 82,17 96,24 108,21 118,23' },
]
function openDetail(symbol: string) { uni.navigateTo({ url: `/modules/favorites/pages/detail?symbol=${symbol}` }) }
async function addFavorite(item: Recommendation) { if (favoritesStore.isFavorite(item.symbol) || favoritesStore.isPending(item.symbol)) return; const added = await favoritesStore.add(item.symbol, item.name); if (added) uni.showToast({ title: '已加入自选', icon: 'success' }) }
</script>

<style lang="scss" scoped>
.ai-pick-list{background:$bg-card}.ai-pick-row{position:relative;box-sizing:border-box;min-height:140rpx;padding:20rpx 142rpx 20rpx 0;border-bottom:2rpx solid $line-soft}.ai-pick-main{width:100%;min-width:0}.stock-line{display:flex!important;align-items:center;gap:10rpx;width:100%;height:34rpx;white-space:nowrap}.stock-name,.stock-price,.stock-change,.favorite-button{display:block;flex:0 0 auto}.stock-name{max-width:142rpx;overflow:hidden;color:#111827;font-size:28rpx;font-weight:700;line-height:34rpx;text-overflow:ellipsis}.stock-price,.stock-change{font-size:28rpx;font-weight:600;line-height:34rpx}.stock-price.is-up,.stock-change.is-up{color:$up}.stock-price.is-down,.stock-change.is-down{color:$down}.favorite-button{width:30rpx;height:30rpx;border:2rpx solid #111827;border-radius:$r-full;background:$bg-card;text-align:center;line-height:27rpx}.favorite-button text{color:#111827;font-size:25rpx;font-weight:600}.favorite-button.added{border-color:$primary;background:$primary}.favorite-button.added text{color:#fff}.favorite-button.disabled{opacity:.5}.reason-line{display:flex!important;align-items:center;gap:6rpx;width:100%;margin-top:13rpx;white-space:nowrap}.reason-label{display:block;flex:0 0 auto;padding:3rpx 7rpx;color:$primary;background:$primary-50;font-size:20rpx;line-height:1.25}.reason-text{display:block;overflow:hidden;flex:1;color:$ink-soft;font-size:21rpx;line-height:1.3;text-overflow:ellipsis}.mini-chart{position:absolute;right:0;top:20rpx;width:126rpx;height:66rpx}.mini-chart polyline{vector-effect:non-scaling-stroke}
</style>
