<template>
  <view class="page-alerts">
    <PageCard title="特别提醒">
      <!-- 堆叠卡片容器 -->
      <view class="stack-container" @touchstart="onTouchStart" @touchmove="onTouchMove" @touchend="onTouchEnd">
        <!-- 后方堆叠卡片预览（最多显示2张） -->
        <view
          v-for="i in Math.min(2, alertStocks.length - currentStockIdx - 1)"
          :key="'behind-' + i"
          class="stack-card-behind"
          :style="getBehindStyle(i)"
        >
          <view class="behind-card-inner" :style="{ opacity: 1 - i * 0.4 }"></view>
        </view>

        <!-- 当前卡片 -->
        <view
          class="stack-card-current"
          :style="currentCardStyle"
        >
          <!-- 股票头部 -->
          <view class="stock-header">
            <view class="stock-info">
              <text class="stock-name">{{ currentStock.name }}</text>
              <text class="stock-code">{{ currentStock.symbol }}</text>
            </view>
            <view class="stock-quote">
              <text :class="['stock-price', currentStock.changePercent >= 0 ? 'up' : 'down']">
                {{ currentStock.price.toFixed(2) }}
              </text>
              <text :class="['stock-change', currentStock.changePercent >= 0 ? 'up' : 'down']">
                {{ currentStock.changePercent >= 0 ? '+' : '' }}{{ currentStock.changePercent.toFixed(2) }}%
              </text>
            </view>
          </view>

          <!-- 异动时间线 -->
          <view class="timeline">
            <view
              v-for="(item, itemIdx) in currentStock.alerts"
              :key="itemIdx"
              :class="['timeline-item', { 'has-date-badge': item.dateBadge }]"
            >
              <!-- 日期标记 -->
              <view v-if="item.dateBadge" class="date-badge">
                <text class="date-badge-text">{{ item.dateBadge }}</text>
              </view>

              <view class="timeline-dot-wrap">
                <view :class="['timeline-dot', item.type === 'main' ? 'main' : 'sub']"></view>
                <view v-if="itemIdx < currentStock.alerts.length - 1" class="timeline-line"></view>
              </view>

              <view class="timeline-content">
                <view class="alert-header">
                  <text v-if="item.type === 'main'" class="alert-time">{{ item.time }}</text>
                  <view class="alert-tag">{{ item.tag }}</view>
                </view>
                <text class="alert-desc">{{ item.desc }}</text>
                <text v-if="item.hasMore" class="alert-more">›</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 底部操作栏：1/N 买 帮我分析 -->
      <template #footer>
        <view class="card-footer-bar">
          <view class="footer-progress">
            <text class="progress-text">{{ currentStockIdx + 1 }}/{{ alertStocks.length }}</text>
          </view>
          <view class="footer-actions">
            <view class="action-tag buy">
              <text class="action-tag-text">买</text>
            </view>
            <view class="action-btn" @tap="goAnalyze">
              <text class="action-btn-text">帮我分析</text>
            </view>
          </view>
        </view>
      </template>
    </PageCard>

    <AppBottomBar current-tab="alert" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import PageCard from '@/shared/components/PageCard.vue'
import AppBottomBar from '@/shared/components/AppBottomBar.vue'

interface AlertItem {
  type: 'main' | 'sub'
  time: string
  tag: string
  desc: string
  dateBadge?: string
  hasMore?: boolean
}

interface AlertStock {
  name: string
  symbol: string
  price: number
  changePercent: number
  alerts: AlertItem[]
}

const currentStockIdx = ref(0)
const currentStock = computed(() => alertStocks.value[currentStockIdx.value])

// 触摸状态
const touchStartY = ref(0)
const touchCurrentY = ref(0)
const isLongPress = ref(false)
const longPressTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const cardOffset = ref(0)
const isDragging = ref(false)

function onTouchStart(e: any) {
  const touch = e.touches[0] || e.changedTouches[0]
  touchStartY.value = touch.clientY
  touchCurrentY.value = touch.clientY
  cardOffset.value = 0
  isLongPress.value = false
  isDragging.value = false
  // 长按检测
  longPressTimer.value = setTimeout(() => {
    isLongPress.value = true
  }, 400)
}

function onTouchMove(e: any) {
  const touch = e.touches[0] || e.changedTouches[0]
  touchCurrentY.value = touch.clientY
  const deltaY = touchCurrentY.value - touchStartY.value

  if (isLongPress.value) {
    // 长按后拖动，设置卡片偏移
    isDragging.value = true
    cardOffset.value = deltaY * 0.5
  }
}

function onTouchEnd() {
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }

  if (isDragging.value && isLongPress.value) {
    const threshold = 60
    if (cardOffset.value > threshold && currentStockIdx.value > 0) {
      // 向下滑 = 上一张
      currentStockIdx.value--
    } else if (cardOffset.value < -threshold && currentStockIdx.value < alertStocks.value.length - 1) {
      // 向上滑 = 下一张
      currentStockIdx.value++
    }
  }

  // 重置
  cardOffset.value = 0
  isLongPress.value = false
  isDragging.value = false
}

const currentCardStyle = computed(() => {
  if (!isDragging.value) return {}
  return {
    transform: `translateY(${cardOffset.value}px)`,
    transition: 'none',
  }
})

function getBehindStyle(level: number) {
  return {
    transform: `translateY(${-level * 8}px) scale(${1 - level * 0.04})`,
    zIndex: 10 - level,
  }
}

const alertStocks = ref<AlertStock[]>([
  {
    name: '山西焦化',
    symbol: '600740',
    price: 6.78,
    changePercent: 1.55,
    alerts: [
      { type: 'main', time: '14:22', tag: '主力资金流入', desc: '主力净流入2800万，较昨日同期增加340%，大单买入活跃度明显提升', dateBadge: '今', hasMore: true },
      { type: 'sub', time: '13:45', tag: '成交放量', desc: '量比为2.07，属于明显放量，后续价格波动性可能加大' },
      { type: 'sub', time: '11:20', tag: '技术突破', desc: '股价突破6.70元短期压力位，成交量配合放大' },
      { type: 'main', time: '10:33', tag: '行业需求变化', desc: '焦炭相关行业需求有升有降，钢铁行业开工率回升带动需求预期改善', dateBadge: '昨', hasMore: true },
      { type: 'sub', time: '10:30', tag: '成交放量', desc: '量比为2.07，属于明显放量，后续价格波动性可能加大，需要关注是否形成有效突破或跌破支撑位' },
      { type: 'main', time: '15:00', tag: '融券比率上榜', desc: '融券比率全市场前74，做空力量压制，市场较为悲观，需关注后续动向', dateBadge: '26日' },
      { type: 'sub', time: '10:00', tag: '龙虎榜异动', desc: '游资席位净买入1200万，机构席位净卖出800万' },
    ]
  },
  {
    name: '贵州茅台',
    symbol: '600519',
    price: 1698.00,
    changePercent: -0.82,
    alerts: [
      { type: 'main', time: '14:00', tag: '主力资金流出', desc: '主力净流出3.8亿，北向资金净卖出2.1亿，机构持仓比例下降', dateBadge: '今', hasMore: true },
      { type: 'sub', time: '11:30', tag: '技术破位', desc: '股价跌破20日均线支撑位1705元，短期技术形态走弱' },
      { type: 'sub', time: '10:45', tag: '成交放量', desc: '早盘成交额超45亿，较昨日同期放大60%' },
      { type: 'main', time: '09:30', tag: '基本面突变', desc: '主力资金净流出2.3亿，机构持仓比例下降0.15%', dateBadge: '今', hasMore: true },
      { type: 'main', time: '14:30', tag: '主力资金流出', desc: '北向资金净卖出5.6亿，连续3日净流出', dateBadge: '昨' },
      { type: 'sub', time: '09:00', tag: '公告解读', desc: '发布半年报业绩预告，净利润同比增长12.5%，略低于市场预期' },
    ]
  },
  {
    name: '宁德时代',
    symbol: '300750',
    price: 218.50,
    changePercent: 2.35,
    alerts: [
      { type: 'main', time: '14:15', tag: '主力资金流入', desc: '主力净流入5.2亿，大单买入占比提升至38%，资金面明显转强', dateBadge: '今', hasMore: true },
      { type: 'sub', time: '13:00', tag: '行业利好', desc: '新能源汽车销量超预期，产业链整体受益' },
      { type: 'sub', time: '11:15', tag: '技术突破', desc: '股价突破215元压力位，MACD金叉信号确认' },
      { type: 'main', time: '09:45', tag: '主力资金流入', desc: '主力净流入3.2亿，大单买入活跃度明显提升', dateBadge: '今', hasMore: true },
      { type: 'main', time: '20:00', tag: '公告利好', desc: '发布与某海外车企战略合作公告，预计年订单额超50亿元', dateBadge: '昨' },
      { type: 'sub', time: '10:30', tag: '龙虎榜异动', desc: '两机构席位合计净买入2.8亿' },
    ]
  },
  {
    name: '药明康德',
    symbol: '603259',
    price: 72.35,
    changePercent: -1.88,
    alerts: [
      { type: 'main', time: '14:00', tag: '政策利空', desc: '美国拟扩大对华生物制造限制，CRO板块承压下跌', dateBadge: '今', hasMore: true },
      { type: 'sub', time: '13:15', tag: '主力资金流出', desc: '主力净流出4.2亿，北向资金净卖出1.8亿' },
      { type: 'sub', time: '10:45', tag: '技术破位', desc: '股价跌破75元关键支撑位，下方空间打开' },
      { type: 'main', time: '09:30', tag: '大幅低开', desc: '开盘大跌3.5%，创近3个月新低', dateBadge: '今', hasMore: true },
      { type: 'main', time: '16:00', tag: '机构下调评级', desc: '某头部券商下调评级至"中性"，目标价下调至78元', dateBadge: '昨' },
      { type: 'sub', time: '11:30', tag: '成交放量', desc: '半日成交额超30亿，较昨日同期放大120%' },
    ]
  },
])

function goAnalyze() {
  uni.navigateTo({ url: '/pages-sub-app/chat/index' })
}
</script>

<style lang="scss" scoped>
.page-alerts {
  height: 100%;
  background: #f5f7fb;
}

/* ===== 堆叠卡片容器 ===== */
.stack-container {
  position: relative;
  padding: 0;
  overflow: hidden;
}

/* 后方堆叠卡片预览 */
.stack-card-behind {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 100%;
  pointer-events: none;
}

.behind-card-inner {
  height: 100%;
  background: #ffffff;
  border-radius: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

/* 当前卡片：自然流式布局，由 PageCard 的 scroll-view 提供滚动 */
.stack-card-current {
  position: relative;
  background: transparent;
  padding: 0 24rpx;
  z-index: 20;
  transition: transform 0.3s ease, opacity 0.3s ease;
}

/* ===== 股票头部 ===== */
.stock-header {
  padding: 24rpx 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
  border-bottom: 1rpx solid #f0f2f5;
}

.stock-info {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.stock-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1d24;
}

.stock-code {
  font-size: 20rpx;
  color: #9ca3af;
}

.stock-quote {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2rpx;

  .stock-price {
    font-size: 32rpx;
    font-weight: 600;
  }
  .stock-change {
    font-size: 22rpx;
    font-weight: 500;
  }
  .up { color: #f43f5e; }
  .down { color: #22c55e; }
}

/* ===== 时间线 ===== */
.timeline {
  padding: 8rpx 0 16rpx;
}

.timeline-item {
  display: flex;
  gap: 16rpx;
  position: relative;

  &.has-date-badge {
    padding-top: 8rpx;
  }
}

.date-badge {
  position: absolute;
  left: 0;
  top: -4rpx;
  z-index: 2;
}

.date-badge-text {
  font-size: 20rpx;
  color: #6b7280;
  background: #f3f4f6;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
}

.timeline-dot-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 16rpx;
  padding-top: 8rpx;
  flex-shrink: 0;
}

.timeline-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: #4d7cfe;
  flex-shrink: 0;
  z-index: 1;

  &.main {
    box-shadow: 0 0 0 4rpx rgba(77, 124, 254, 0.2);
  }
  &.sub {
    width: 8rpx;
    height: 8rpx;
    background: #d1d5db;
    margin-top: 8rpx;
  }
}

.timeline-line {
  width: 2rpx;
  flex: 1;
  background: #e5e7eb;
  margin-top: 4rpx;
  min-height: 32rpx;
}

.timeline-content {
  flex: 1;
  padding-bottom: 24rpx;
  padding-top: 4rpx;
}

.alert-header {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 8rpx;
}

.alert-time {
  font-size: 22rpx;
  color: #6b7280;
  flex-shrink: 0;
}

.alert-tag {
  font-size: 22rpx;
  color: #4d7cfe;
  background: rgba(77, 124, 254, 0.1);
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
  font-weight: 500;
}

.alert-desc {
  font-size: 24rpx;
  color: #374151;
  line-height: 1.6;
}

.alert-more {
  font-size: 24rpx;
  color: #9ca3af;
  margin-left: 4rpx;
}

/* ===== 底部操作栏 ===== */
.card-footer-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 24rpx;
  background: #ffffff;
  border-top: 1rpx solid #f0f2f5;
}

.footer-progress {
  flex-shrink: 0;
}

.progress-text {
  font-size: 26rpx;
  color: #6b7280;
  font-weight: 500;
}

.footer-actions {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.action-tag {
  padding: 8rpx 20rpx;
  border-radius: 8rpx;

  &.buy {
    background: rgba(244, 63, 94, 0.12);
  }

  .action-tag-text {
    font-size: 24rpx;
    font-weight: 600;
    color: #f43f5e;
  }
}

.action-btn {
  padding: 12rpx 32rpx;
  background: linear-gradient(135deg, #4d7cfe, #6366f1);
  border-radius: 32rpx;
}

.action-btn-text {
  font-size: 26rpx;
  color: #ffffff;
  font-weight: 500;
}
</style>
