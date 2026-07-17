<template>
  <SubPageCard title="长线风口">
    <template #header-right>
      <view class="history-btn" @tap="goPushHistory">
        <text class="history-btn-text">历史推送</text>
      </view>
    </template>
    <view class="leaders-content">
      <!-- 引导卡片：点击查看今日分析报告 -->
      <view class="report-guide-card" @tap="goAgentReport">
        <view class="guide-left">
          <SvgIcon name="file-line" color="#ffffff" size="40rpx" />
          <text class="guide-title">点击查看今日分析报告</text>
        </view>
        <SvgIcon name="arrow-right-line" color="#ffffff" size="32rpx" />
      </view>

      <view v-if="errorMessage" class="state-card">
        <text class="state-text">{{ errorMessage }}</text>
        <text class="state-hint">请检查网络连接后重新加载</text>
        <button
          class="retry-button"
          :class="{ disabled: loading }"
          :disabled="loading"
          @tap="loadData"
        >
          {{ loading ? '加载中...' : '重新加载' }}
        </button>
      </view>

      <view v-else-if="loading && !sectors.length" class="state-card">
        <text class="state-text">正在加载长线风口数据...</text>
      </view>

      <view v-else-if="!sectors.length" class="state-card">
        <text class="state-text">暂无长线风口数据</text>
        <text class="state-hint">数据更新后将在这里展示</text>
      </view>

      <!-- 风口概念泡泡图 -->
      <view v-if="sectors.length" class="bubble-card">
        <view class="bubble-title-row">
          <text class="bubble-title">风口概念</text>
          <text class="bubble-hint">泡泡越大持续性越强</text>
        </view>
        <view class="bubble-wrap" :style="{ height: bubbleHeight + 'px' }">
          <view
            v-for="(b, idx) in bubbleLayout"
            :key="idx"
            class="bubble-item"
            :style="bubbleItemStyle(b)"
            @tap="selectBubble(b)"
          >
            <text class="bubble-name" :style="{ fontSize: b.fontSize + 'px' }">{{ b.name }}</text>
            <text
              class="bubble-change"
              :style="{ fontSize: (b.fontSize - 3) + 'px' }"
              :class="b.change >= 0 ? 'up' : 'down'"
            >
              {{ b.change >= 0 ? '+' : '' }}{{ b.change.toFixed(2) }}%
            </text>
          </view>
        </view>
      </view>

      <!-- 板块列表（入口卡片，点击进入板块详情子页面） -->
      <view v-if="sectors.length" class="sector-list">
      <view
        v-for="(sector, idx) in sectors"
        :key="sector.code || idx"
        class="stats-card sector-entry"
        @tap="goSectorDetail(sector)"
      >
        <!-- 板块头部 -->
        <view class="stats-header">
          <view class="stats-title-row">
            <text class="sector-rank">No.{{ idx + 1 }}</text>
            <text class="stats-name">{{ sector.name }}</text>
            <text
              v-if="persistenceText(sector)"
              :class="['persistence-badge', persistenceClass(sector)]"
            >{{ persistenceText(sector) }}</text>
          </view>
          <text v-if="sector.frequency" class="freq-badge">上榜 {{ sector.frequency }} 次</text>
        </view>
        <!-- 统计行 -->
        <view class="stats-row">
          <view class="stat-item">
            <text class="stat-label">今日涨幅</text>
            <text :class="['stat-value', (sector.today_change ?? 0) >= 0 ? 'up' : 'down']">
              {{ (sector.today_change ?? 0) >= 0 ? '+' : '' }}{{ formatPct(sector.today_change) }}
            </text>
          </view>
          <view class="stat-item">
            <text class="stat-label">均涨幅</text>
            <text :class="['stat-value', (sector.avg_change ?? 0) >= 0 ? 'up' : 'down']">
              {{ (sector.avg_change ?? 0) >= 0 ? '+' : '' }}{{ formatPct(sector.avg_change) }}
            </text>
          </view>
          <view class="stat-item">
            <text class="stat-label">净流入</text>
            <text class="stat-value">{{ formatNetInflow(sector.net_inflow) }}</text>
          </view>
          <view class="stat-item">
            <text class="stat-label">领涨股</text>
            <text class="stat-value leader-stock-name">{{ sector.leading_stock || sector.leading_stock_info?.name || '--' }}</text>
          </view>
        </view>
        <!-- 单只龙头股详细行情（跨板块去重） -->
        <view v-if="getSectorLeader(sector)" class="leader-mini-row" @tap.stop="goStockDetail(getSectorLeader(sector)!.code)">
          <view class="leader-mini-left">
            <text class="leader-mini-name">{{ getSectorLeader(sector)!.name }}</text>
            <text class="leader-mini-code">{{ getSectorLeader(sector)!.code }}</text>
          </view>
          <view class="leader-mini-right">
            <text v-if="getSectorLeader(sector)!.price != null" class="leader-mini-price">
              {{ Number(getSectorLeader(sector)!.price).toFixed(2) }}
            </text>
            <text
              v-if="getSectorLeader(sector)!.change_pct != null"
              :class="['leader-mini-change', (getSectorLeader(sector)!.change_pct ?? 0) >= 0 ? 'up' : 'down']"
            >
              {{ (getSectorLeader(sector)!.change_pct ?? 0) >= 0 ? '+' : '' }}{{ formatPct(getSectorLeader(sector)!.change_pct) }}
            </text>
            <view
              class="leader-mini-fav"
              :class="{ active: favoriteSet.has(getSectorLeader(sector)!.code) }"
              @tap.stop="toggleFavorite(getSectorLeader(sector)!.code)"
            >
              <text class="fav-icon">{{ favoriteSet.has(getSectorLeader(sector)!.code) ? '★' : '☆' }}</text>
            </view>
          </view>
        </view>
        <!-- 箭头 -->
        <view class="card-arrow"><text class="sector-arrow">›</text></view>
      </view>

      <!-- 更新时间 -->
      <view v-if="updateTime" class="update-time">
        <text class="update-time-text">数据更新于 {{ formatTime(updateTime) }}</text>
      </view>
    </view>

    </view>
  </SubPageCard>
</template>

<script setup lang="ts">
import { ref, computed, getCurrentInstance } from 'vue'
import { onShow, onReady } from '@dcloudio/uni-app'
import { stockApi } from '@/shared/api/modules/stock'
import type { WindLeaderAiAnalysis, WindLeaderSector, WindLeaderStock } from '@/shared/api/modules/stock'
import SubPageCard from '@/shared/components/SubPageCard.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'

const loading = ref(false)
const errorMessage = ref('')
const sectors = ref<WindLeaderSector[]>([])
const updateTime = ref('')
const favoriteSet = ref<Set<string>>(new Set())

// ===== 泡泡图数据 =====
interface Bubble {
  name: string
  change: number
  score: number
  persistence: string
  radius: number  // px 半径
  fontSize: number
}

// 泡泡布局结果
interface BubbleLayout extends Bubble {
  x: number
  y: number
}

const bubbleHeight = 230 // 容器高度 px

// 动态计算容器宽度：windowWidth - 两侧padding（leaders-content 24rpx×2 + bubble-card 24rpx×2）
// 不能硬编码，否则不同设备屏幕宽度下泡泡会溢出画布
const containerWidth = ref(320)
try {
  const sysInfo = uni.getSystemInfoSync()
  const winW = sysInfo.windowWidth || 375
  const rpx2px = (rpx: number) => rpx * winW / 750
  containerWidth.value = Math.round(winW - rpx2px(24) * 4)
} catch {
  containerWidth.value = 320
}

// onReady 中测量 .bubble-wrap 的实际渲染宽度并修正 containerWidth。
// 上面 getSystemInfoSync() 只能拿到 windowWidth，无法感知 App 端 zoom:1.2 缩放等
// 导致的实际容器宽度差异，这里用 boundingClientRect 拿到真实渲染宽度兜底。
onReady(() => {
  const instance = getCurrentInstance()
  const query = uni.createSelectorQuery()
  if (instance?.proxy) {
    query.in(instance.proxy)
  }
  query
    .select('.bubble-wrap')
    .boundingClientRect((rect) => {
      // boundingClientRect 回调参数类型为 NodeInfo | NodeInfo[]，需收窄到单节点
      const r = Array.isArray(rect) ? rect[0] : rect
      const w = r?.width
      if (w && w > 0) {
        containerWidth.value = Math.round(w)
      }
    })
    .exec()
})

// 根据持续性决定半径，放大泡泡尺寸
function calcRadius(persistence: string, score: number): number {
  let base = 26 // 短期
  if (persistence.includes('长期')) base = 58
  else if (persistence.includes('中期')) base = 42
  // score 微调
  base += (score - 50) * 0.08
  return Math.max(22, Math.min(65, Math.round(base)))
}

const bubbleData = computed<Bubble[]>(() => {
  const source = sectors.value.slice(0, 10).map(s => ({
    name: s.name,
    change: s.today_change ?? 0,
    score: s.score ?? 50,
    persistence: typeof s.ai_analysis === 'object'
      ? s.ai_analysis?.persistence || '短期'
      : '短期',
  }))
  return source.map(s => {
    const r = calcRadius(s.persistence, s.score)
    return {
      ...s,
      radius: r,
      fontSize: r > 50 ? 14 : (r > 38 ? 12 : 10),
    }
  })
})

// force simulation：碰撞检测 + 居中 + 自适应缩放（确定性布局，同数据同结果）
const bubbleLayout = computed<BubbleLayout[]>(() => {
  const items = bubbleData.value
  if (!items.length) return []
  const W = containerWidth.value // 动态容器宽度，匹配实际画布大小
  const H = bubbleHeight
  const cx = W / 2
  const cy = H / 2

  // 自适应缩放：如果泡泡总面积占画布面积超过70%，等比缩小半径
  const totalArea = items.reduce((sum, b) => sum + Math.PI * b.radius * b.radius, 0)
  const canvasArea = W * H
  let scale = 1
  if (totalArea / canvasArea > 0.70) {
    scale = Math.sqrt(0.70 * canvasArea / totalArea)
  }

  // 确定性初始位置：按 index 在横向椭圆上均匀分布
  const ellipseA = W * 0.4  // 横向半轴（更宽）
  const ellipseB = H * 0.3  // 纵向半轴（更窄）
  const nodes = items.map((b, idx) => {
    const r = b.radius * scale
    const angle = (idx / items.length) * Math.PI * 2 - Math.PI / 2
    return {
      ...b,
      radius: r,
      x: cx + Math.cos(angle) * ellipseA,
      y: cy + Math.sin(angle) * ellipseB,
      vx: 0,
      vy: 0,
    }
  })

  // 迭代模拟
  const iterations = 300
  for (let i = 0; i < iterations; i++) {
    const alpha = 1 - i / iterations

    // 居中力（Y方向更强，X方向更弱，让泡泡横向展开）
    for (const n of nodes) {
      n.vx += (cx - n.x) * 0.08 * alpha  // X: 居中力增强，帮助泡泡回归中心
      n.vy += (cy - n.y) * 0.15 * alpha  // Y: 强居中
    }

    // 碰撞检测
    for (let a = 0; a < nodes.length; a++) {
      for (let b = a + 1; b < nodes.length; b++) {
        const na = nodes[a]
        const nb = nodes[b]
        const dx = nb.x - na.x
        const dy = nb.y - na.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const minDist = na.radius + nb.radius + 3
        if (dist < minDist) {
          const push = (minDist - dist) / 2 * 0.9
          const ux = dx / dist
          const uy = dy / dist
          na.x -= ux * push
          na.y -= uy * push
          nb.x += ux * push
          nb.y += uy * push
        }
      }
    }

    // 应用速度
    for (const n of nodes) {
      n.x += n.vx * 0.3
      n.y += n.vy * 0.3
      n.vx *= 0.6
      n.vy *= 0.6
    }

    // 边界约束（更强：确保泡泡完全在画布内，留2px安全边距）
    for (const n of nodes) {
      const safeR = n.radius + 2
      n.x = Math.max(safeR, Math.min(W - safeR, n.x))
      n.y = Math.max(safeR, Math.min(H - safeR, n.y))
    }
  }

  return nodes.map(n => ({ ...n, x: n.x, y: n.y }))
})

// 颜色：基于score，从浅蓝到深蓝（匹配网页版）
function bubbleItemStyle(b: BubbleLayout) {
  const ratio = Math.max(0, Math.min(1, (b.score - 40) / 60))
  // 浅蓝 #bfdbfe → 深蓝 #1d4ed8
  const r = Math.round(191 + (29 - 191) * ratio)
  const g = Math.round(219 + (78 - 219) * ratio)
  const bl = Math.round(254 + (216 - 254) * ratio)
  const fillColor = `rgb(${r}, ${g}, ${bl})`
  return {
    width: b.radius * 2 + 'px',
    height: b.radius * 2 + 'px',
    left: b.x - b.radius + 'px',
    top: b.y - b.radius + 'px',
    background: fillColor,
    borderColor: '#ffffff',
    opacity: '0.9',
  }
}

function selectBubble(b: Bubble) {
  // 点击泡泡时滚动到对应板块卡片
  uni.showToast({ title: b.name, icon: 'none', duration: 800 })
}

function goAgentReport() {
  const today = new Date().toISOString().split('T')[0]
  uni.navigateTo({
    url: `/modules/chat/pages/agent-report?intent=wind_leader&date=${today}`
  })
}

async function loadData() {
  if (loading.value) return
  loading.value = true
  try {
    const data = await stockApi.getWindLeaders(10)
    const hotSectors = Array.isArray(data?.hot_sectors) ? data.hot_sectors : []
    sectors.value = hotSectors.filter(
      (sector): sector is WindLeaderSector => Boolean(sector && typeof sector.name === 'string' && sector.name.trim())
    )
    updateTime.value = typeof data?.update_time === 'string' ? data.update_time : ''
    errorMessage.value = ''
    loadFavorites()
  } catch {
    sectors.value = []
    updateTime.value = ''
    errorMessage.value = '长线风口数据加载失败'
  } finally {
    loading.value = false
  }
}

// 加载用户自选股列表
async function loadFavorites() {
  try {
    const res: any = await stockApi.getFavorites()
    const favs = res?.favorites || res?.data?.favorites || []
    favoriteSet.value = new Set(Array.isArray(favs) ? favs : [])
  } catch {
    // 静默失败，不影响主流程
  }
}

// 切换关注状态
async function toggleFavorite(code: string) {
  if (!code) return
  const isFav = favoriteSet.value.has(code)
  try {
    if (isFav) {
      await stockApi.removeFavorites([code])
      favoriteSet.value.delete(code)
    } else {
      await stockApi.addFavorites([code])
      favoriteSet.value.add(code)
    }
    // 触发响应式更新
    favoriteSet.value = new Set(favoriteSet.value)
    uni.showToast({ title: isFav ? '已取消关注' : '已关注', icon: 'none' })
  } catch {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

function formatPct(val?: number | null): string {
  if (val === undefined || val === null) return '--'
  return Number(val).toFixed(2) + '%'
}

function formatNetInflow(val?: number | null): string {
  if (val === undefined || val === null) return '--'
  if (Math.abs(val) >= 10000) return (val / 10000).toFixed(2) + '亿'
  return Math.round(val) + '万'
}

// 持续性标签提取（只显示"短期"/"中期"/"长期"）
function persistenceText(sector: WindLeaderSector): string {
  const ai = sector.ai_analysis
  if (!ai || typeof ai === 'string') return ''
  const raw = (ai as WindLeaderAiAnalysis).persistence || ''
  if (raw.includes('长期')) return '长期'
  if (raw.includes('中期')) return '中期'
  if (raw.includes('短期')) return '短期'
  return raw
}

function persistenceClass(sector: WindLeaderSector): string {
  const tag = persistenceText(sector)
  if (tag.includes('长期')) return 'long-term'
  if (tag.includes('中期')) return 'mid-term'
  if (tag.includes('短期')) return 'short-term'
  return ''
}

// 从板块中提取龙头股列表：优先合并 leading_stock_info 和 main_stocks，去重后按 score 降序
function getTopStocks(sector: WindLeaderSector): WindLeaderStock[] {
  const seen = new Set<string>()
  const stocks: WindLeaderStock[] = []
  // 优先取 leading_stock_info
  if (sector.leading_stock_info?.code) {
    stocks.push(sector.leading_stock_info)
    seen.add(sector.leading_stock_info.code)
  }
  // 补充 main_stocks（去重）
  if (sector.main_stocks) {
    for (const s of sector.main_stocks) {
      if (s?.code && !seen.has(s.code)) {
        stocks.push(s)
        seen.add(s.code)
      }
    }
  }
  return stocks
}

// 跨板块去重：为每个板块选出一只未被占用的龙头股（对齐 Web 前端 collectTopStocks 逻辑）
const sectorLeaderMap = computed<Record<string, WindLeaderStock | null>>(() => {
  const usedCodes = new Set<string>()
  const map: Record<string, WindLeaderStock | null> = {}
  for (const sector of sectors.value) {
    const candidates = getTopStocks(sector)
    let picked: WindLeaderStock | null = null
    for (const c of candidates) {
      if (c.code && !usedCodes.has(c.code)) {
        usedCodes.add(c.code)
        picked = c
        break
      }
    }
    map[sector.name] = picked
  }
  return map
})

function getSectorLeader(sector: WindLeaderSector): WindLeaderStock | null {
  return sectorLeaderMap.value[sector.name] || null
}

function getAnalysisRows(a: WindLeaderAiAnalysis | string | null | undefined): Array<{ label: string; value: string; risk?: boolean }> {
  if (!a) return []
  const obj: WindLeaderAiAnalysis = typeof a === 'string' ? { persistence_reason: a } : a
  const rows: Array<{ label: string; value: string; risk?: boolean }> = []
  if (obj.persistence) rows.push({ label: '持续性', value: obj.persistence })
  if (obj.persistence_reason) rows.push({ label: '理由', value: obj.persistence_reason })
  if (obj.transfer_direction) rows.push({ label: '传导方向', value: obj.transfer_direction })
  if (obj.risk_warning) rows.push({ label: '风险提示', value: obj.risk_warning, risk: true })
  return rows
}

function formatTime(t?: string): string {
  if (!t) return ''
  const d = new Date(t)
  if (isNaN(d.getTime())) return t
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${mo}-${dd} ${hh}:${mm}`
}

function goStockDetail(symbol: string) {
  if (!symbol) return
  uni.navigateTo({ url: `/modules/favorites/pages/detail?symbol=${symbol}` })
}

function goPushHistory() {
  uni.navigateTo({ url: '/modules/market/pages/push-history' })
}

// 跳转到板块详情子页面，传递板块名称用于数据筛选
function goSectorDetail(sector: WindLeaderSector) {
  if (!sector?.name) return
  const name = encodeURIComponent(sector.name)
  const code = sector.code ? encodeURIComponent(sector.code) : ''
  uni.navigateTo({ url: `/modules/market/pages/sector-detail?name=${name}${code ? '&code=' + code : ''}` })
}

onShow(() => {
  loadData()
})
</script>

<style lang="scss" scoped>
.leaders-content {
  padding: 24rpx;
}

/* ===== 引导卡片 ===== */
.report-guide-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 32rpx;
  margin-bottom: 24rpx;
  background: linear-gradient(135deg, #4d7cfe 0%, #667eea 100%);
  border-radius: 16rpx;
  box-shadow: 0 4rpx 12rpx rgba(77, 124, 254, 0.3);
}

.guide-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.guide-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #ffffff;
}

.state-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 260rpx;
  padding: 40rpx 32rpx;
  margin-bottom: 24rpx;
  background: #ffffff;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  text-align: center;
}

.state-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #374151;
}

.state-hint {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #9ca3af;
}

.retry-button {
  min-width: 200rpx;
  margin-top: 28rpx;
  padding: 0 32rpx;
  color: #ffffff;
  font-size: 26rpx;
  line-height: 72rpx;
  background: #4d7cfe;
  border: 0;
  border-radius: 36rpx;

  &::after {
    border: 0;
  }

  &.disabled {
    opacity: 0.6;
  }
}

/* ===== 泡泡图 ===== */
.bubble-card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.bubble-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.bubble-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1d24;
}

.bubble-hint {
  font-size: 20rpx;
  color: #9ca3af;
}

.bubble-wrap {
  position: relative;
  width: 100%;
}

.bubble-item {
  position: absolute;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 3rpx solid #ffffff;
  transition: transform 0.2s ease;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);

  &:active {
    transform: scale(0.92);
  }
}

.bubble-name {
  font-weight: 600;
  color: #ffffff;
  line-height: 1.2;
  text-align: center;
  padding: 0 4px;
}

.bubble-change {
  font-weight: 500;
  margin-top: 2rpx;
  color: #ffffff;

  &.up { color: #ffffff; }
  &.down { color: #fef2f2; }
}

/* ===== 板块卡片 ===== */
.sector-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

/* stats-card 卡片（与板块详情页一致） */
.stats-card {
  position: relative;
  background: #ffffff;
  border-radius: 20rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.stats-title-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-wrap: wrap;
}

.stats-name {
  font-size: 36rpx;
  font-weight: 600;
  color: #1a1d24;
}

/* 持续性标签 */
.persistence-badge {
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  font-weight: 600;

  &.long-term { color: #16a34a; background: #f0fdf4; }
  &.mid-term { color: #2563eb; background: #eff6ff; }
  &.short-term { color: #d97706; background: #fffbeb; }
}

/* 频次 badge */
.freq-badge {
  font-size: 20rpx;
  color: #4d7cfe;
  background: rgba(77, 124, 254, 0.1);
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  font-weight: 600;
}

/* 统计行：一行四个字段 */
.stats-row {
  display: flex;
  gap: 12rpx;
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
}

.stat-label {
  font-size: 22rpx;
  color: #6b7280;
  margin-bottom: 8rpx;
}

.stat-value {
  font-size: 26rpx;
  font-weight: 600;
  color: #1a1d24;

  &.up { color: #f43f5e; }
  &.down { color: #22c55e; }

  &.leader-stock-name {
    font-size: 24rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }
}

/* 入口卡片：可点击 */
.sector-entry {
  transition: transform 0.15s ease;

  &:active {
    transform: scale(0.98);
  }
}

.sector-rank {
  font-size: 22rpx;
  color: #ffffff;
  background: #4d7cfe;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  font-weight: 500;
}

/* 箭头容器 */
.card-arrow {
  position: absolute;
  right: 16rpx;
  top: 50%;
  transform: translateY(-50%);
}

.sector-arrow {
  font-size: 36rpx;
  color: #9ca3af;
}

/* 龙头股行 */
.leader-mini-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 16rpx;
  background: #f5f7fa;
  border-radius: 12rpx;
  margin-top: 16rpx;
}

.leader-mini-left {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.leader-mini-name {
  font-size: 28rpx;
  color: #1a1d24;
  font-weight: 600;
}

.leader-mini-code {
  font-size: 20rpx;
  color: #6b7280;
  background: #e8ecf1;
  padding: 2rpx 8rpx;
  border-radius: 6rpx;
}

.leader-mini-change {
  font-size: 24rpx;

  &.up { color: #f43f5e; }
  &.down { color: #22c55e; }
}

/* 龙头股右侧区域 */
.leader-mini-right {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.leader-mini-price {
  font-size: 28rpx;
  font-weight: 600;
  color: #1a1d24;
}

/* 关注按钮 */
.leader-mini-fav {
  width: 44rpx;
  height: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #ffffff;

  &.active {
    background: rgba(245, 158, 11, 0.12);
  }

  &:active {
    transform: scale(0.9);
  }
}

.fav-icon {
  font-size: 28rpx;
  color: #d1d5db;
  line-height: 1;
}

.leader-mini-fav.active .fav-icon {
  color: #f59e0b;
}

/* 龙头行 */
.leader-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 20rpx;
  background: linear-gradient(135deg, rgba(77, 124, 254, 0.08), rgba(77, 124, 254, 0.03));
  border: 1rpx solid rgba(77, 124, 254, 0.15);
  border-radius: 12rpx;
  margin-bottom: 16rpx;
}

.leader-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.leader-label {
  font-size: 22rpx;
  color: #4d7cfe;
  font-weight: 500;
}

.leader-name {
  font-size: 28rpx;
  color: #1a1d24;
  font-weight: 500;
}

.leader-change {
  font-size: 26rpx;
  font-weight: 500;

  &.up { color: #f43f5e; }
  &.down { color: #22c55e; }
}

.leader-price {
  font-size: 28rpx;
  color: #1a1d24;
  font-weight: 600;
}

/* 驱动因素 */
.driver-row {
  display: flex;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.driver-label {
  font-size: 24rpx;
  color: #6b7280;
  flex-shrink: 0;
}

.driver-text {
  font-size: 24rpx;
  color: #1a1d24;
  line-height: 1.5;
  flex: 1;
}

/* AI 分析 */
.analysis-box {
  background: #f5f7fa;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 16rpx;
}

.analysis-row {
  display: flex;
  gap: 12rpx;
  margin-bottom: 12rpx;

  &:last-child {
    margin-bottom: 0;
  }
}

.analysis-label {
  font-size: 22rpx;
  color: #9ca3af;
  flex-shrink: 0;
  width: 100rpx;
}

.analysis-value {
  font-size: 22rpx;
  color: #6b7280;
  line-height: 1.5;
  flex: 1;

  &.risk {
    color: #f59e0b;
  }
}

/* 涨跌家数 */
.count-row {
  display: flex;
  gap: 24rpx;
  margin-bottom: 20rpx;
}

.count-up {
  font-size: 24rpx;
  color: #f43f5e;
  font-weight: 500;
}

.count-down {
  font-size: 24rpx;
  color: #22c55e;
  font-weight: 500;
}

/* 主线个股 */
.stocks-section {
  border-top: 1rpx solid #f0f2f5;
  padding-top: 20rpx;
}

.stocks-section-title {
  font-size: 26rpx;
  font-weight: 500;
  color: #1a1d24;
  margin-bottom: 16rpx;
  display: block;
}

.stocks-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.stock-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 20rpx;
  background: #f5f7fa;
  border-radius: 12rpx;
}

.stock-info {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.stock-name {
  font-size: 28rpx;
  color: #1a1d24;
  font-weight: 500;
}

.stock-code {
  font-size: 22rpx;
  color: #6b7280;
}

.stock-quote {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.stock-price {
  font-size: 28rpx;
  color: #1a1d24;
  font-weight: 600;
}

.stock-change {
  font-size: 24rpx;

  &.up { color: #f43f5e; }
  &.down { color: #22c55e; }
}

/* 更新时间 */
.update-time {
  text-align: center;
  padding: 24rpx 0;
}

.update-time-text {
  font-size: 22rpx;
  color: #9ca3af;
}

.history-btn {
  padding: 8rpx 16rpx;
  background: rgba(77, 124, 254, 0.1);
  border-radius: 8rpx;
}

.history-btn-text {
  font-size: 24rpx;
  color: #4d7cfe;
  font-weight: 500;
}
</style>
