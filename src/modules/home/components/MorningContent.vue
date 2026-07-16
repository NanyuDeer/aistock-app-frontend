<template>
  <view class="morning-content">
    <view class="content-wrap">
      <!-- 今日专属晨报卡片 -->
      <view class="briefing-card" @tap="goBriefing">
        <view class="briefing-left">
          <view class="briefing-top">
            <text class="briefing-tag">今日专属</text>
            <text class="briefing-period">{{ briefingPeriod }}</text>
          </view>
          <view class="briefing-highlight">
            <text class="highlight-prefix">重点看</text>
            <text class="highlight-stock">{{ briefingHighlight.stock }}</text>
            <text class="highlight-reason">获{{ briefingHighlight.reason }}</text>
          </view>
          <view class="briefing-desc">
            <text>{{ briefingHighlight.sub }}</text>
            <text class="desc-arrow">›</text>
          </view>
          <view class="briefing-btn">
            <text class="btn-icon">◉</text>
            <text class="btn-text">专属播报</text>
          </view>
        </view>
        <view class="briefing-right">
          <view class="ai-avatar-wrap">
            <SvgIcon name="headphone-line" size="40rpx" color="#4d7cfe" />
          </view>
          <view class="ai-avatar-ring ring-1"></view>
          <view class="ai-avatar-ring ring-2"></view>
        </view>
      </view>

      <!-- 功能入口 2x2 网格 -->
      <view class="feature-grid">
        <view class="feature-card leader-card" @tap="goSectors">
          <view class="feature-header">
            <text class="feature-title">长线风口</text>
            <text class="feature-more">›</text>
          </view>
          <text class="feature-sub">主力最新动向</text>
          <view class="feature-list">
            <view v-for="(item, idx) in leaderStocks.slice(0, 3)" :key="idx" class="feature-item">
              <text class="item-name">{{ item.name }}</text>
              <text :class="['item-tag', item.tagType]">{{ item.tag }}</text>
            </view>
          </view>
        </view>

        <view class="feature-card event-card" @tap="goEvent">
          <view class="feature-header">
            <text class="feature-title">异动捕手</text>
            <text class="feature-more">›</text>
          </view>
          <text class="feature-sub">实时异动监控</text>
          <view class="feature-list">
            <view v-for="(item, idx) in eventStocks.slice(0, 3)" :key="idx" class="feature-item event-item">
              <text v-if="idx === 0" class="item-badge">最新</text>
              <text class="item-name">{{ item.name }}</text>
              <text class="item-change up">{{ item.change }}</text>
            </view>
          </view>
        </view>

        <view class="feature-card chain-card" @tap="goEventChain">
          <view class="feature-header">
            <text class="feature-title">事件传导</text>
            <text class="feature-more">›</text>
          </view>
          <text class="feature-sub">产业链追踪</text>
          <view class="feature-list">
            <view v-for="(item, idx) in chainEvents.slice(0, 3)" :key="idx" class="feature-item">
              <text class="item-name">{{ item.name }}</text>
              <text :class="['item-tag', item.tagType]">{{ item.tag }}</text>
            </view>
          </view>
        </view>

        <view class="feature-card ai-card" @tap="goAgentReport">
          <view class="feature-header">
            <text class="feature-title">今日AI分析</text>
            <text class="feature-more">›</text>
          </view>
          <text class="feature-sub">Agent报告</text>
          <view class="feature-list">
            <view v-for="(item, idx) in aiReports.slice(0, 3)" :key="idx" class="feature-item">
              <text class="item-name">{{ item.name }}</text>
              <text :class="['item-tag', item.tagType]">{{ item.tag }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 重磅事件跟踪 -->
      <view class="event-track-card" @tap="goTrackDetail">
        <view class="track-header">
          <text class="track-title">重磅事件跟踪</text>
          <text class="track-more">›</text>
        </view>
        <view class="track-item">
          <text class="track-label">事件</text>
          <text class="track-content">{{ trackEvent.title }}</text>
        </view>
        <view class="track-footer">
          <text class="track-arrow">∧</text>
          <text class="track-tip">点击查看资讯详情</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import SvgIcon from '@/shared/components/SvgIcon.vue'

const briefingPeriod = ref('晚报 ⌄')
const briefingHighlight = ref({
  stock: '山西焦化',
  reason: '主力抢筹',
  sub: '或存反弹机会'
})

const leaderStocks = ref([
  { name: '成都银行', tag: '洗盘', tagType: 'wash' },
  { name: '华润材料', tag: '洗盘', tagType: 'wash' },
  { name: '技源集团', tag: '出货', tagType: 'sell' },
  { name: '诺唯赞', tag: '出货', tagType: 'sell' },
  { name: '美锦能源', tag: '吸筹', tagType: 'buy' },
  { name: '比亚迪', tag: '吸筹', tagType: 'buy' }
])

const topEvent = ref({
  sector: '创新药',
  title: '美国标普生物科技指数上周大涨'
})

const eventStocks = ref([
  { name: '舒泰神', change: '+20.00%' },
  { name: '广生堂', change: '+20.00%' },
  { name: '药明康德', change: '+8.52%' },
  { name: '恒瑞医药', change: '+5.33%' }
])

const trackEvent = ref({
  title: '动力煤需求阶段性回落，旺季...'
})

const chainEvents = ref([
  { name: '创新药', tag: '利好', tagType: 'buy' },
  { name: '半导体', tag: '关注', tagType: 'wash' },
  { name: '新能源', tag: '利空', tagType: 'sell' },
])

const aiReports = ref([
  { name: '晨报', tag: '已更新', tagType: 'buy' },
  { name: '风口龙头', tag: '已更新', tagType: 'buy' },
  { name: '机构调研', tag: '待更新', tagType: 'wash' },
])

onShow(() => {
})

function goChat() {
  uni.navigateTo({ url: '/pages-sub-app/chat/index' })
}

function goBriefing() {
  uni.navigateTo({ url: '/pages-sub-app/briefing/index' })
}

function goEvent() {
  uni.navigateTo({ url: '/modules/market/pages/event-catcher' })
}

function goSectors() {
  uni.navigateTo({ url: '/modules/market/pages/leaders' })
}

function goEventChain() {
  uni.navigateTo({ url: '/modules/chat/pages/event/list' })
}

function goAgentReport() {
  uni.navigateTo({ url: '/modules/chat/pages/agent-report' })
}

function goTrackDetail() {
  uni.navigateTo({ url: '/modules/news/pages/detail' })
}

function goSearch() {
  uni.navigateTo({ url: '/modules/favorites/pages/search' })
}

function goStockDetail(symbol: string) {
  uni.navigateTo({ url: `/modules/favorites/pages/detail?symbol=${symbol}` })
}

function goLogin() {
  uni.navigateTo({ url: '/modules/user/pages/login' })
}
</script>

<style lang="scss" scoped>
.morning-content {
  background: #ffffff;
}

/* ===== 内容区 ===== */
.content-wrap {
  padding: 24rpx;
}

/* ===== 晨报卡片 ===== */
.briefing-card {
  display: flex;
  align-items: stretch;
  padding: 24rpx 24rpx 20rpx;
  background: #f5f7fb;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
  position: relative;
  overflow: hidden;
}

.briefing-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4rpx;
  background: linear-gradient(90deg, #4d7cfe, #6366f1);
}

.briefing-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.briefing-top {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.briefing-tag {
  font-size: 24rpx;
  font-weight: 600;
  color: #1a1d24;
}

.briefing-period {
  font-size: 20rpx;
  color: #6b7280;
  background: #f3f4f6;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
}

.briefing-highlight {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4rpx;
}

.highlight-prefix {
  font-size: 24rpx;
  color: #6b7280;
}

.highlight-stock {
  font-size: 26rpx;
  font-weight: 600;
  color: #1a1d24;
}

.highlight-reason {
  font-size: 24rpx;
  color: #f43f5e;
  font-weight: 500;
}

.briefing-desc {
  display: flex;
  align-items: center;
  font-size: 22rpx;
  color: #6b7280;
}

.desc-arrow {
  margin-left: 4rpx;
  color: #9ca3af;
  font-size: 24rpx;
}

.briefing-btn {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  padding: 8rpx 18rpx;
  background: linear-gradient(135deg, #4d7cfe, #6366f1);
  border-radius: 24rpx;
  align-self: flex-start;
  margin-top: 6rpx;
}

.btn-icon {
  font-size: 18rpx;
  color: #ffffff;
}

.btn-text {
  font-size: 22rpx;
  color: #ffffff;
  font-weight: 500;
}

/* AI 头像右侧 */
.briefing-right {
  width: 130rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.ai-avatar-wrap {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 2;
  box-shadow: 0 4rpx 12rpx rgba(251, 191, 36, 0.3);
}

.ai-avatar-emoji {
  font-size: 44rpx;
}

.ai-avatar-ring {
  position: absolute;
  border-radius: 50%;
  border: 2rpx solid rgba(77, 124, 254, 0.15);
  pointer-events: none;
}

.ai-avatar-ring.ring-1 {
  width: 120rpx;
  height: 120rpx;
}

.ai-avatar-ring.ring-2 {
  width: 140rpx;
  height: 140rpx;
  opacity: 0.5;
}

/* ===== 功能入口 2x2 网格 ===== */
.feature-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.feature-card {
  background: #f5f7fb;
  border-radius: 14rpx;
  padding: 20rpx;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.feature-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.feature-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1a1d24;
}

.feature-more {
  font-size: 28rpx;
  color: #9ca3af;
  font-weight: 300;
}

.feature-sub {
  font-size: 22rpx;
  color: #6b7280;
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-top: 6rpx;
}

.feature-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8rpx;
}

.item-name {
  font-size: 24rpx;
  color: #374151;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-tag {
  font-size: 18rpx;
  padding: 2rpx 8rpx;
  border-radius: 4rpx;
  flex-shrink: 0;

  &.wash {
    background: rgba(251, 146, 60, 0.1);
    color: #fb923c;
  }
  &.sell {
    background: rgba(34, 197, 94, 0.1);
    color: #22c55e;
  }
  &.buy {
    background: rgba(77, 124, 254, 0.1);
    color: #4d7cfe;
  }
}

/* 异动捕手卡片特有 */
.event-top-badge {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 2rpx;
}

.badge-hot {
  font-size: 18rpx;
  background: rgba(244, 63, 94, 0.1);
  color: #f43f5e;
  padding: 2rpx 8rpx;
  border-radius: 4rpx;
  font-weight: 600;
}

.badge-sector {
  font-size: 22rpx;
  color: #1a1d24;
  font-weight: 500;
}

.event-top-title {
  font-size: 22rpx;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.event-item {
  .item-badge {
    font-size: 18rpx;
    background: rgba(244, 63, 94, 0.1);
    color: #f43f5e;
    padding: 1rpx 6rpx;
    border-radius: 4rpx;
    flex-shrink: 0;
    margin-right: 4rpx;
  }
  .item-name {
    flex: 1;
  }
}

.item-change {
  font-size: 22rpx;
  flex-shrink: 0;
  font-weight: 500;

  &.up { color: #f43f5e; }
  &.down { color: #22c55e; }
}

/* ===== 重磅事件跟踪 ===== */
.event-track-card {
  background: #f5f7fb;
  border-radius: 14rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
}

.track-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.track-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #1a1d24;
}

.track-more {
  font-size: 28rpx;
  color: #9ca3af;
  font-weight: 300;
}

.track-item {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
}

.track-label {
  flex-shrink: 0;
  font-size: 20rpx;
  color: #f43f5e;
  background: rgba(244, 63, 94, 0.1);
  padding: 2rpx 8rpx;
  border-radius: 4rpx;
  font-weight: 500;
  margin-top: 2rpx;
}

.track-content {
  flex: 1;
  font-size: 24rpx;
  color: #374151;
  line-height: 1.5;
}

.track-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  margin-top: 14rpx;
  padding-top: 12rpx;
  border-top: 1rpx solid #f3f4f6;
}

.track-arrow {
  font-size: 20rpx;
  color: #9ca3af;
}

.track-tip {
  font-size: 20rpx;
  color: #6b7280;
}
</style>
