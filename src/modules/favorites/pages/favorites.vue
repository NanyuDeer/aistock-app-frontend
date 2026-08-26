<template>
  <SubPageCard title="自选" active-panel="favorites">
    <!-- 当前登录状态下数据未就绪时显示 loading，避免闪现残留的 mock/过期数据 -->
    <view v-if="!favoritesStore.hasCurrentData()" class="favorites-loading">
      <LoadingState text="加载自选股中..." />
    </view>
    <view v-else class="favorites-content">
      <view v-if="favoritesStore.syncError" class="sync-error" @tap="retrySync">
        <text>同步失败，点击重试</text>
      </view>
      <!-- 顶部统计（编辑态隐藏，聚焦勾选/排序） -->
      <view v-if="!editMode" class="stats-bar">
        <view class="stat-item">
          <text class="stat-label">平均涨幅</text>
          <view class="stat-value-wrap">
            <text :class="['stat-value', avgChange >= 0 ? 'up' : 'down']">
              {{ avgChange >= 0 ? '+' : '' }}{{ avgChange.toFixed(2) }}%
            </text>
            <text :class="['stat-arrow', avgChange >= 0 ? 'up' : 'down']">{{ avgChange >= 0 ? '↑' : '↓' }}</text>
          </view>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item">
          <text class="stat-label">加自选后</text>
          <view class="stat-value-wrap">
            <text :class="['stat-value', totalChange >= 0 ? 'up' : 'down']">
              {{ totalChange >= 0 ? '+' : '' }}{{ totalChange.toFixed(2) }}%
            </text>
            <text :class="['stat-arrow', totalChange >= 0 ? 'up' : 'down']">{{ totalChange >= 0 ? '↑' : '↓' }}</text>
          </view>
        </view>
        <view class="stat-add-btn" @tap="goSearch">
          <text class="add-btn-text">+ 自选</text>
        </view>
      </view>

      <!-- 表头：工具图标 + 排序列名（结构与 stock-row 完全一致确保对齐） -->
      <!-- 普通态：左侧工具图标（第一个编辑图标点击进入编辑态）+ 右侧排序列；编辑态：左"编辑自选" + 右"完成" -->
      <view class="table-header">
        <view class="header-left">
          <template v-if="!editMode">
            <view class="tool-icon-btn" @tap="enterEdit">
              <SvgIcon name="edit-line" size="28rpx" color="#9ca3af" />
            </view>
            <!-- 三横线按钮：点击切换"分时图"模式（开启后每行右侧替换为 mini 分时折线，再次点击恢复价格文本） -->
            <view class="tool-icon-btn" @tap="toggleFenshiMode">
              <SvgIcon name="menu-line" size="28rpx" :color="fenshiMode ? '#0b5fff' : '#9ca3af'" />
            </view>
            <view class="tool-icon-btn" @tap="goGrid">
              <SvgIcon name="grid-line" size="28rpx" color="#9ca3af" />
            </view>
            <SvgIcon name="file-copy-line" size="28rpx" color="#9ca3af" />
          </template>
          <text v-else class="edit-title">编辑自选</text>
        </view>
        <view class="header-right">
          <template v-if="!editMode">
            <view class="header-col header-col-price" :class="{ active: sortKey === 'price' }" @tap="toggleSort('price')">
              <text class="col-label">最新</text>
              <text v-if="sortKey === 'price'" class="col-arrow">{{ sortDir === 'asc' ? '↑' : '↓' }}</text>
            </view>
            <view class="header-col header-col-change" :class="{ active: sortKey === 'changePercent' }" @tap="toggleSort('changePercent')">
              <text class="col-label">涨幅</text>
              <text v-if="sortKey === 'changePercent'" class="col-arrow">{{ sortDir === 'asc' ? '↑' : '↓' }}</text>
            </view>
            <view class="header-col header-col-amount" :class="{ active: sortKey === 'changeAmount' }" @tap="toggleSort('changeAmount')">
              <text class="col-label">涨跌</text>
              <text v-if="sortKey === 'changeAmount'" class="col-arrow">{{ sortDir === 'asc' ? '↑' : '↓' }}</text>
            </view>
          </template>
          <view v-else class="edit-done-btn" @tap="exitEdit">
            <text class="edit-done-text">完成</text>
          </view>
        </view>
      </view>

      <!-- 股票列表（编辑态用原始顺序展示勾选框+拖拽手柄；普通态用 sortedStocks 展示行情） -->
      <view v-if="displayStocks.length" class="stock-list">
        <view
          v-for="(stock, index) in displayStocks"
          :key="stock.symbol"
          class="stock-row-wrap"
        >
          <!-- 删除按钮（左滑后露出，仅普通态） -->
          <view
            v-if="!editMode"
            class="remove-stock-btn"
            :class="{ disabled: favoritesStore.isPending(stock.symbol) }"
            @tap.stop="confirmRemove(stock)"
          >
            <text class="remove-text">删除</text>
          </view>
          <!-- 可滑动内容层：编辑态 = 勾选框 + 名称代码 + 拖拽手柄；普通态 = 原行情行 -->
          <view
            class="stock-row"
            :class="{ 'row-editing': editMode, 'row-dragging': draggingIndex === index }"
            :style="!editMode ? { transform: openSwipeSymbol === stock.symbol ? 'translateX(-140rpx)' : 'translateX(0)' } : {}"
            @touchstart="onSwipeStart($event, stock.symbol)"
            @touchmove="onSwipeMove"
            @touchend="onSwipeEnd"
            @tap="onRowTap(stock)"
          >
            <!-- 编辑态：左侧勾选框 + 名称/代码，右侧拖拽手柄；隐藏行情列 -->
            <template v-if="editMode">
              <view class="edit-left" @tap.stop="toggleSelect(stock.symbol)">
                <view class="check-circle" :class="{ checked: isSelected(stock.symbol) }">
                  <SvgIcon v-if="isSelected(stock.symbol)" name="check-line" size="24rpx" color="#ffffff" />
                </view>
                <view class="stock-left">
                  <text class="stock-name">{{ stock.name }}</text>
                  <view class="stock-tags">
                    <text class="stock-code">{{ stock.symbol }}</text>
                  </view>
                </view>
              </view>
              <view
                class="drag-handle"
                @tap.stop="noop"
                @touchstart.stop="onDragStart($event, index)"
                @touchmove.stop="onDragMove($event)"
                @touchend.stop="onDragEnd"
                @touchcancel.stop="onDragEnd"
              >
                <SvgIcon name="menu-line" size="36rpx" color="#9ca3af" />
              </view>
            </template>
            <!-- 普通态：原布局 -->
            <template v-else>
              <view class="stock-left">
                <text class="stock-name">{{ stock.name }}</text>
                <view class="stock-tags">
                  <text class="stock-code">{{ stock.symbol }}</text>
                  <text v-if="stock.margin" class="tag-margin">融</text>
                  <text v-if="stock.specialAlert" class="tag-alert">特别提醒</text>
                  <!-- Phase 4-2：问 AI → 跳转对话页并预填单股问句（.stop 避免触发行点击进详情） -->
                  <text class="ask-ai-btn" @tap.stop="askAi(stock)">问 AI</text>
                </view>
              </view>
              <!-- 普通态：fenshiMode 开启 → 该行右侧显示 mini 分时折线；否则原 最新/涨幅/涨跌 -->
              <template v-if="fenshiMode">
                <view class="stock-right">
                  <MiniKLine
                    :data="minuteCache.get(stock.symbol) || []"
                    period="minute"
                    :trend-up="(stock.changePercent ?? 0) >= 0"
                    :show-avg="false"
                    :max-line-points="60"
                    height="82rpx"
                    class="stock-mini-minute"
                  />
                </view>
              </template>
              <view v-else class="stock-right">
                <text class="stock-price">{{ stock.price ? stock.price.toFixed(2) : '--' }}</text>
                <text :class="['stock-change', stock.changePercent >= 0 ? 'up' : 'down']">
                  {{ stock.changePercent >= 0 ? '+' : '' }}{{ stock.changePercent.toFixed(2) }}%
                </text>
                <text :class="['stock-amount', stock.changeAmount >= 0 ? 'up' : 'down']">
                  {{ stock.changeAmount >= 0 ? '+' : '' }}{{ stock.changeAmount.toFixed(2) }}
                </text>
              </view>
            </template>
          </view>
        </view>
      </view>

      <!-- 空状态（仅普通态展示） -->
      <view v-else-if="!editMode" class="empty-state">
        <SvgIcon class="empty-icon" name="file-list-line" size="80rpx" color="#d1d5db" />
        <text class="empty-text">暂无自选股</text>
        <text class="empty-tip">去搜索添加感兴趣的股票</text>
        <view class="empty-btn" @tap="goSearch">
          <text class="empty-btn-text">添加股票</text>
        </view>
      </view>
      <!-- 编辑态删空后占位提示 -->
      <view v-else class="empty-state">
        <SvgIcon class="empty-icon" name="file-list-line" size="80rpx" color="#d1d5db" />
        <text class="empty-text">已无自选股</text>
        <text class="empty-tip">点右上角"完成"退出编辑</text>
      </view>

      <!-- 底部：普通态 = 添加按钮；编辑态 = 全选 + 批量删除 -->
      <view v-if="!editMode && displayStocks.length" class="add-stock-btn" @tap="goSearch">
        <text class="add-stock-text">+ 添加股票</text>
      </view>
      <view v-else-if="editMode && displayStocks.length" class="edit-footer">
        <view class="edit-select-all" @tap="toggleSelectAll">
          <view class="check-circle" :class="{ checked: allSelected }">
            <SvgIcon v-if="allSelected" name="check-line" size="24rpx" color="#ffffff" />
          </view>
          <text class="edit-select-all-text">全选</text>
        </view>
        <view class="edit-delete-btn" :class="{ disabled: !selectedCount }" @tap="confirmRemoveMany">
          <SvgIcon name="delete-bin-line" size="30rpx" color="#ffffff" />
          <text class="edit-delete-text">删除{{ selectedCount ? `(${selectedCount})` : '' }}</text>
        </view>
      </view>

      <!-- 底部留白，避免被 GlobalChatBar 遮挡 -->
      <view class="bottom-spacer"></view>
    </view>
  </SubPageCard>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, watch, onUnmounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useFavoritesStore } from '@/shared/store/modules/favorites'
import { buildStockQuestion } from '@/shared/utils/chatSuggestions'
import { isTradingTime } from '@/shared/utils/tradingTime'
import { stockApi, type KLineItem } from '@/shared/api/modules/stock'
import SubPageCard from '@/shared/components/SubPageCard.vue'
import SvgIcon from '@/shared/components/SvgIcon.vue'
import LoadingState from '@/shared/components/LoadingState.vue'
import MiniKLine from '@/modules/favorites/components/MiniKLine.vue'

/* ===== 类型定义 ===== */
interface StockItem {
  symbol: string
  name: string
  price: number
  changePercent: number
  changeAmount: number
  margin: boolean
  specialAlert: boolean
}

/* ===== 排序状态 ===== */
type SortKey = 'price' | 'changePercent' | 'changeAmount'
// sortKey 为 null 表示"未手动排序列"，展示顺序退回用户保存的自选顺序（服务端 sort_order）。
// 仅在用户点某一列表头时才按该列排序，避免一进入页面就按价格排序。
const sortKey = ref<SortKey | null>(null)
const sortDir = ref<'asc' | 'desc'>('asc')

const sortColumns = [
  { key: 'price' as SortKey, label: '最新' },
  { key: 'changePercent' as SortKey, label: '涨幅' },
  { key: 'changeAmount' as SortKey, label: '涨跌' },
]

function toggleSort(key: SortKey) {
  // sortKey 为 null（当前按用户顺序）→ 点击某列切换为按该列排序；重复点击同列翻转方向
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'desc'
  }
}

/* ===== 数据 ===== */
const favoritesStore = useFavoritesStore()

/* ===== 分时图模式（表头"三横线"按钮）：开启后每行价格区替换为 mini 分时折线，再点恢复价格文本 ===== */
const fenshiMode = ref(false)
/** 分时数据缓存（首次开启后懒加载，按 symbol：key 已有缓存则切回不再请求，去重逻辑见 ensureMinuteData） */
const minuteCache = shallowRef(new Map<string, KLineItem[]>())

function toggleFenshiMode() {
  fenshiMode.value = !fenshiMode.value
  // 开启时按需补齐当前自选的全部分时数据（仅缓存缺失的 symbol）
  if (fenshiMode.value) void ensureMinuteData()
}

/** 按需拉取全部自选股分时数据并缓存；自选列表增删后下次开启会补齐缺失 symbol */
async function ensureMinuteData() {
  const list = stocks.value
  if (!list.length) return
  const toFetch = list.filter((s) => !minuteCache.value.has(s.symbol))
  if (!toFetch.length) return
  try {
    const results = await Promise.allSettled(
      toFetch.map((s) => stockApi.getKLine(s.symbol, { period: 'minute', count: 300 })),
    )
    const next = new Map(minuteCache.value)
    results.forEach((r, i) => {
      const symbol = toFetch[i].symbol
      next.set(symbol, r.status === 'fulfilled' && Array.isArray(r.value) ? r.value : [])
    })
    minuteCache.value = next
  } catch {
    // 个别股票获取失败不影响整体；已成功项也保留在缓存中
  }
}

/* ===== 盘中实时刷新：fenshiMode 开启且处于交易日时段内，每分钟轮询更新全部分时缓存 ===== */
let minuteRefreshTimer: ReturnType<typeof setInterval> | null = null

/** 强制拉取全部自选最新分时并覆盖缓存（盘中刷新用；不复用 ensureMinuteData 的去重缓存） */
async function refreshMinuteData() {
  const list = stocks.value
  if (!list.length) return
  try {
    const results = await Promise.allSettled(
      list.map((s) => stockApi.getKLine(s.symbol, { period: 'minute', count: 300 })),
    )
    const next = new Map(minuteCache.value)
    results.forEach((r, i) => {
      const symbol = list[i].symbol
      if (r.status === 'fulfilled' && Array.isArray(r.value)) next.set(symbol, r.value)
    })
    minuteCache.value = next
  } catch {
    // 盘中某次刷新失败忽略，保留上一次缓存
  }
}

/** 依据 fenshiMode + 交易时段开关轮询定时器：开启并处于盘中则立即刷新一次并每 60s 轮询，否则停止 */
function syncMinuteRefresh() {
  if (minuteRefreshTimer) {
    clearInterval(minuteRefreshTimer)
    minuteRefreshTimer = null
  }
  if (!fenshiMode.value || !isTradingTime()) return
  void refreshMinuteData()
  minuteRefreshTimer = setInterval(async () => {
    if (isTradingTime()) await refreshMinuteData()
  }, 60 * 1000)
}

// 开启/关闭 fenshiMode 时同步实时刷新逻辑；页面重新 onShow（返回自选页）也需恢复定时器
watch(fenshiMode, () => syncMinuteRefresh())

const stocks = computed<StockItem[]>(() => {
  const list = favoritesStore.stocks
  return list.map((stock) => ({
    symbol: stock.symbol,
    name: stock.name,
    price: stock.price || 0,
    changePercent: stock.changePercent || 0,
    changeAmount: calculateChangeAmount(stock.price || 0, stock.changePercent || 0),
    margin: false,
    specialAlert: false,
  }))
})

function calculateChangeAmount(price: number, changePercent: number): number {
  if (!Number.isFinite(price) || !Number.isFinite(changePercent) || price <= 0 || changePercent <= -100) return 0
  const prevClose = price / (1 + changePercent / 100)
  return price - prevClose
}

const sortedStocks = computed(() => {
  const list = [...stocks.value]
  // sortKey 为 null（未手动排序）→ 保持用户保存的自选顺序，不按任何行情列排序
  if (sortKey.value === null) return list
  const key: SortKey = sortKey.value // 缓存到局部变量：TS 不把 .value 收窄带进 sort 回调
  const dir = sortDir.value === 'asc' ? 1 : -1
  return list.sort((a, b) => (a[key] - b[key]) * dir)
})

/* ===== 编辑态（点击表头编辑图标进入） ===== */
const editMode = ref(false)
/** 编辑态中已勾选（待删除）的自选股代码 */
const selectedSymbols = ref<string[]>([])
/** 编辑态展示顺序的工作副本：进入时快照自选股原始顺序（后端 sort_order），拖拽时在此数组上实时交换 */
const editingOrder = ref<StockItem[]>([])
/** 当前正在拖拽的行下标（-1 = 未拖拽），用于高亮 */
const draggingIndex = ref(-1)

/** 编辑态展示列表：编辑态用工作副本（原始顺序），普通态用 sortedStocks（行情排序） */
const displayStocks = computed(() => (editMode.value ? editingOrder.value : sortedStocks.value))

const allSelected = computed(
  () => displayStocks.value.length > 0 && selectedSymbols.value.length === displayStocks.value.length,
)
const selectedCount = computed(() => selectedSymbols.value.length)

function enterEdit() {
  if (editMode.value || !stocks.value.length) return
  editMode.value = true
  // 以自选股原始顺序为编辑基准，避免被行情排序打乱；退出编辑时该顺序即待保存的新顺序
  editingOrder.value = stocks.value.map(s => ({ ...s }))
  selectedSymbols.value = []
  draggingIndex.value = -1
  openSwipeSymbol.value = '' // 关闭已左滑打开的行，避免编辑态残留删除按钮
}

/** 退出编辑态：先按用户确认统一保存排序（仅当顺序变化时），再恢复普通态 */
async function exitEdit() {
  if (!editMode.value) return
  editMode.value = false
  draggingIndex.value = -1
  const editedSymbols = editingOrder.value.map(s => s.symbol)
  const originalSymbols = favoritesStore.stocks.map(s => s.symbol)
  // 顺序发生变化才调用排序接口（删除只影响成员、不影响顺序时无需提交）
  if (editedSymbols.join(',') !== originalSymbols.join(',')) {
    await favoritesStore.saveOrder(editedSymbols)
  }
  editingOrder.value = []
  selectedSymbols.value = []
}

function isSelected(symbol: string) {
  return selectedSymbols.value.includes(symbol)
}

/** 拖拽手柄的点击无操作：仅用于 @tap.stop 阻止事件冒泡到行点击（避免误触发勾选） */
function noop() {}

function toggleSelect(symbol: string) {
  const idx = selectedSymbols.value.indexOf(symbol)
  if (idx >= 0) selectedSymbols.value.splice(idx, 1)
  else selectedSymbols.value.push(symbol)
}

function toggleSelectAll() {
  selectedSymbols.value = allSelected.value ? [] : displayStocks.value.map(s => s.symbol)
}

function confirmRemoveMany() {
  if (!selectedCount.value) return
  const count = selectedCount.value
  uni.showModal({
    title: '删除自选股',
    content: `确认删除选中的 ${count} 只自选股吗？`,
    confirmText: '删除',
    success: async ({ confirm }) => {
      if (!confirm) return
      const removed = await favoritesStore.removeMany([...selectedSymbols.value])
      if (removed) {
        // 从编辑列表同步移除已删除项，保持展示与后端一致；排序随后在点"完成"时校验
        editingOrder.value = editingOrder.value.filter(s => !selectedSymbols.value.includes(s.symbol))
        selectedSymbols.value = []
        uni.showToast({ title: `已删除 ${count} 只自选`, icon: 'none' })
      }
    },
  })
}

/* ===== 拖拽排序（编辑态右侧手柄，触摸事件实现相邻交换） ===== */
let dragStartY = 0
const DRAG_ROW_HEIGHT_RPX = 112 // 编辑态单行约 112rpx，作为相邻交换的位移阈值

function onDragStart(e: unknown, index: number) {
  const touch = (e as TouchEvent).touches[0] || (e as TouchEvent).changedTouches[0]
  dragStartY = touch.clientY
  draggingIndex.value = index
}

function onDragMove(e: unknown) {
  if (draggingIndex.value < 0) return
  const touch = (e as TouchEvent).touches[0] || (e as TouchEvent).changedTouches[0]
  const diff = touch.clientY - dragStartY
  const rowHeightPx = uni.upx2px(DRAG_ROW_HEIGHT_RPX)
  // 向下拖动越过一行 → 与下一项交换；向上同理。每交换一次重置参考点，实现连续排序
  if (diff > rowHeightPx && draggingIndex.value < editingOrder.value.length - 1) {
    swapEditing(draggingIndex.value, draggingIndex.value + 1)
    draggingIndex.value += 1
    dragStartY = touch.clientY
  } else if (diff < -rowHeightPx && draggingIndex.value > 0) {
    swapEditing(draggingIndex.value, draggingIndex.value - 1)
    draggingIndex.value -= 1
    dragStartY = touch.clientY
  }
}

function onDragEnd() {
  draggingIndex.value = -1
}

function swapEditing(i: number, j: number) {
  const list = [...editingOrder.value]
  ;[list[i], list[j]] = [list[j], list[i]]
  editingOrder.value = list
}

const avgChange = computed(() => {
  const list = stocks.value
  if (!list.length) return 0
  return list.reduce((sum, s) => sum + (s.changePercent || 0), 0) / list.length
})

const totalChange = computed(() => {
  const list = stocks.value
  if (!list.length) return 0
  return list.reduce((sum, s) => sum + (s.changePercent || 0), 0)
})

onShow(() => {
  // 返回自选页时若已持有当前登录态数据，不再整表重新拉取——
  // 否则在 App.onShow 的 restoreSession 竞态/瞬间 401 把内存 token 置空时，
  // fetchFavorites 会走进"未登录→塞演示股"分支，导致页面闪一下 5 只演示股再恢复真实自选。
  // 已就绪时仅原地刷新行情（不复写列表），避免闪屏。
  if (favoritesStore.hasCurrentData()) {
    void favoritesStore.refreshQuotes()
  } else {
    void favoritesStore.fetchFavorites({ silent: false })
  }

  // 一进入页面即恢复为用户保存的自选顺序（不保留上次的排序列选择）
  sortKey.value = null
  sortDir.value = 'asc'

  // 返回自选页时若处于分时模式，恢复盘中实时刷新定时器
  syncMinuteRefresh()
})

// 组件卸载时清理盘中轮询定时器，避免内存泄漏
onUnmounted(() => {
  if (minuteRefreshTimer) {
    clearInterval(minuteRefreshTimer)
    minuteRefreshTimer = null
  }
})

/* ===== 左滑删除（仅普通态生效；编辑态由勾选/拖拽接管） ===== */
const openSwipeSymbol = ref('')
const swipingSymbol = ref('')
const swipeStartX = ref(0)
const swipeStartY = ref(0)
const swipeDeltaX = ref(0)
const swipeDeltaY = ref(0)
const isSwiping = ref(false)

function onSwipeStart(e: unknown, symbol: string) {
  // 编辑态不启用左滑删除，避免与勾选/拖拽手势冲突
  if (editMode.value) return
  const touch = (e as TouchEvent).touches[0] || (e as TouchEvent).changedTouches[0]
  swipeStartX.value = touch.clientX
  swipeStartY.value = touch.clientY
  swipeDeltaX.value = 0
  swipeDeltaY.value = 0
  isSwiping.value = false
  swipingSymbol.value = symbol
  // 如果触摸的是其他行，先关闭当前打开的行
  if (openSwipeSymbol.value && openSwipeSymbol.value !== symbol) {
    openSwipeSymbol.value = ''
  }
}

function onSwipeMove(e: unknown) {
  if (editMode.value) return
  const touch = (e as TouchEvent).touches[0] || (e as TouchEvent).changedTouches[0]
  swipeDeltaX.value = touch.clientX - swipeStartX.value
  swipeDeltaY.value = touch.clientY - swipeStartY.value
  // 水平滑动大于垂直滑动时标记为正在滑动
  if (Math.abs(swipeDeltaX.value) > 10 && Math.abs(swipeDeltaX.value) > Math.abs(swipeDeltaY.value)) {
    isSwiping.value = true
  }
}

function onSwipeEnd() {
  if (editMode.value) {
    isSwiping.value = false
    swipingSymbol.value = ''
    return
  }
  if (!isSwiping.value) {
    swipingSymbol.value = ''
    return
  }
  // 左滑超过阈值 → 打开删除按钮
  if (swipeDeltaX.value < -50) {
    openSwipeSymbol.value = swipingSymbol.value
  } else if (swipeDeltaX.value > 30) {
    // 右滑 → 关闭
    openSwipeSymbol.value = ''
  }
  isSwiping.value = false
  swipingSymbol.value = ''
}

function closeSwipe() {
  openSwipeSymbol.value = ''
}

/** 行点击：编辑态 = 勾选切换；普通态 = 已左滑则收起，否则进详情 */
function onRowTap(stock: StockItem) {
  if (editMode.value) {
    toggleSelect(stock.symbol)
    return
  }
  if (openSwipeSymbol.value === stock.symbol) {
    closeSwipe()
    return
  }
  goDetail(stock.symbol)
}

function retrySync() {
  void favoritesStore.fetchFavorites({ silent: false })
}

function confirmRemove(stock: StockItem) {
  if (favoritesStore.isPending(stock.symbol)) return
  uni.showModal({
    title: '删除自选股',
    content: `确认将 ${stock.name} 从自选股中删除吗？`,
    confirmText: '删除',
    success: async ({ confirm }) => {
      if (!confirm) return
      const removed = await favoritesStore.remove(stock.symbol)
      if (removed) uni.showToast({ title: '已移除自选', icon: 'none' })
    },
  })
}

function goDetail(symbol: string) {
  uni.navigateTo({ url: `/modules/favorites/pages/detail?symbol=${symbol}` })
}

/** 多股同列：跳转 2 列宫格页（每格含迷你 K 线 + 行情字段） */
function goGrid() {
  uni.navigateTo({ url: '/modules/favorites/pages/favorites-grid' })
}

/** Phase 4-2：问 AI → 跳转对话页，q 参数预填单股问句（对话页 onLoad 自动发送/预填） */
function askAi(stock: StockItem) {
  uni.navigateTo({
    url: `/pages-sub-app/chat/index?q=${encodeURIComponent(buildStockQuestion(stock.name))}`,
  })
}

function goSearch() {
  uni.navigateTo({ url: '/modules/favorites/pages/search' })
}
</script>

<style lang="scss" scoped>
@import '@/shared/styles/variables.scss';

.favorites-loading {
  padding: 160rpx 0;
}

.favorites-content {
  padding: 0 24rpx 24rpx;
}

.sync-error {
  margin-bottom: $spacing-sm;
  padding: $spacing-sm $spacing-base;
  color: $error-color;
  font-size: $font-size-base;
  text-align: center;
  background: rgba(244, 63, 94, 0.08);
  border-radius: $radius-base;
}

/* ===== 统计栏 ===== */
.stats-bar {
  display: flex;
  align-items: center;
  gap: 24rpx;
  background: #ffffff;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.stat-label {
  font-size: 22rpx;
  color: #9ca3af;
}

.stat-value-wrap {
  display: flex;
  align-items: center;
  gap: 4rpx;
}

.stat-value {
  font-size: 30rpx;
  font-weight: 600;
}

.stat-arrow {
  font-size: 24rpx;
  font-weight: 600;
}

.stat-divider {
  width: 1rpx;
  height: 48rpx;
  background: $line;
}

.stat-add-btn {
  margin-left: auto;
  padding: 10rpx 24rpx;
  background: linear-gradient(135deg, $primary, $primary-600);
  border-radius: 24rpx;
}

.add-btn-text {
  font-size: 24rpx;
  color: #ffffff;
  font-weight: 500;
}

/* ===== 表头：工具图标 + 排序列名 ===== */
/* 表头结构必须与 stock-row 完全一致：左侧 flex:1，右侧 flex-shrink:0 + 相同 gap + 相同列宽 */
.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 24rpx; /* 与 stock-row 的 padding 一致 */
  margin-bottom: 4rpx;
}

.header-left {
  display: flex;
  gap: 16rpx;
  flex: 1; /* 与 stock-left 的 flex:1 对应 */
}

.tool-icon {
  font-size: 28rpx;
  color: #9ca3af;
}

/* 表头工具图标：第一个编辑图标可点击进入编辑态 */
.tool-icon-btn {
  display: flex;
  align-items: center;
}

/* 编辑态表头标题 */
.edit-title {
  font-size: 26rpx;
  color: $ink;
  font-weight: 500;
}

/* 编辑态右上角"完成"按钮 */
.edit-done-btn {
  padding: 8rpx 28rpx;
  background: linear-gradient(135deg, $primary, $primary-600);
  border-radius: 24rpx;
}

.edit-done-text {
  font-size: 24rpx;
  color: #ffffff;
  font-weight: 500;
}

/* header-right 与 stock-right 结构完全一致 */
.header-right {
  display: flex;
  align-items: center;
  gap: 24rpx; /* 与 stock-right 的 gap 一致 */
  flex-shrink: 0; /* 与 stock-right 的 flex-shrink:0 对应 */
}

/* 每列的宽度与 stock-right 中的对应列完全一致，用 text-align:right 右对齐（与数据列一致） */
.header-col {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 2rpx;

  .col-label {
    font-size: 24rpx;
    color: #9ca3af;
  }

  .col-arrow {
    font-size: 20rpx;
    color: #9ca3af;
  }

  &.active {
    .col-label {
      color: $primary;
      font-weight: 600;
    }
    .col-arrow {
      color: $primary;
    }
  }
}

/* 三列宽度与 stock-price / stock-change / stock-amount 的 min-width 完全一致 */
/* 同时强制 header-col 内部用 text-align:right 与数据列的 text-align:right 保持一致 */
.header-col-price  { min-width: 100rpx; text-align: right; }
.header-col-change { min-width: 90rpx;  text-align: right; }
.header-col-amount { min-width: 80rpx;  text-align: right; }

/* ===== 股票列表 ===== */
.stock-list {
  background: #ffffff;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.stock-row-wrap {
  position: relative;
  overflow: hidden;
}

.remove-stock-btn {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 140rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $error-color;
  gap: 6rpx;

  &.disabled {
    opacity: 0.5;
  }
}

.remove-text {
  color: #ffffff;
  font-size: $font-size-sm;
  font-weight: 500;
}

.stock-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  border-bottom: 1rpx solid #f3f4f6;
  background: #ffffff;
  position: relative;
  z-index: 1;
  transition: transform 0.25s ease;

  &:last-child {
    border-bottom: none;
  }
}

.stock-left {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  flex: 1;
}

.stock-name {
  font-size: 30rpx;
  color: $ink;
  font-weight: 500;
}

.stock-tags {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.stock-code {
  font-size: 22rpx;
  color: #9ca3af;
}

.tag-margin {
  font-size: 18rpx;
  color: #f59f0b;
  background: rgba(245, 159, 11, 0.1);
  padding: 1rpx 6rpx;
  border-radius: 4rpx;
}

.tag-alert {
  font-size: 18rpx;
  color: #f43f5e;
  background: rgba(244, 63, 94, 0.1);
  padding: 1rpx 6rpx;
  border-radius: 4rpx;
}

/* Phase 4-2：问 AI 入口（与 tag 同尺寸 pill，主色区分，可点按） */
.ask-ai-btn {
  font-size: 18rpx;
  color: $primary;
  background: rgba(77, 124, 254, 0.1);
  padding: 1rpx 10rpx;
  border-radius: 8rpx;
}

/* 分时图模式：行右侧 mini 分时折线宽度固定，加宽横向空间以显示更完整的折线（高度由 inline height 控制，与 uni-view 行高一致） */
.stock-mini-minute {
  width: 320rpx;
  height: 82rpx;
  flex-shrink: 0;
}

.stock-right {
  display: flex;
  align-items: center;
  gap: 24rpx;
  flex-shrink: 0;
}

.stock-price {
  font-size: 30rpx;
  color: $ink;
  font-weight: 600;
  min-width: 100rpx;
  text-align: right;
}

.stock-change {
  font-size: 24rpx;
  font-weight: 500;
  min-width: 90rpx;
  text-align: right;
}

.stock-amount {
  font-size: 24rpx;
  font-weight: 500;
  min-width: 80rpx;
  text-align: right;
}

.up { color: #f43f5e; }
.down { color: #22c55e; }

/* ===== 编辑态：勾选框 + 拖拽手柄 ===== */
.stock-row.row-editing {
  /* 编辑态行不可横滑；隐藏右侧行情列，仅保留勾选/名称/手柄 */
  cursor: pointer;
}

.stock-row.row-dragging {
  opacity: 0.65;
  transform: scale(0.98);
  background: #f8fafc;
}

.edit-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex: 1;
  min-width: 0;
}

.check-circle {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 2rpx solid #d1d5db;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &.checked {
    background: $primary;
    border-color: $primary;
  }
}

.drag-handle {
  width: 64rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 16rpx;
  flex-shrink: 0;
  /* 拖拽时由样式层禁用默认滚动，替代 @touchmove.prevent 以避免 passive 告警 */
  touch-action: none;
}

/* 编辑态底部操作栏 */
.edit-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16rpx;
  padding: 20rpx 24rpx;
  background: #ffffff;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.edit-select-all {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.edit-select-all-text {
  font-size: 26rpx;
  color: $ink;
}

.edit-delete-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 14rpx 36rpx;
  background: $error-color;
  border-radius: 32rpx;

  &.disabled {
    opacity: 0.45;
  }
}

.edit-delete-text {
  font-size: 26rpx;
  color: #ffffff;
  font-weight: 500;
}

/* ===== 空状态 ===== */
.empty-state {
  text-align: center;
  padding: 120rpx 0;

  .empty-icon {
    display: block;
    font-size: 80rpx;
    margin-bottom: 20rpx;
  }
  .empty-text {
    display: block;
    font-size: 28rpx;
    color: $ink;
    margin-bottom: 10rpx;
  }
  .empty-tip {
    display: block;
    font-size: 24rpx;
    color: #9ca3af;
    margin-bottom: 30rpx;
  }
  .empty-btn {
    display: inline-block;
    padding: 16rpx 48rpx;
    background: linear-gradient(135deg, $primary, $primary-600);
    border-radius: 40rpx;
  }
  .empty-btn-text {
    font-size: 26rpx;
    color: #ffffff;
  }
}

/* ===== 底部添加按钮 ===== */
.add-stock-btn {
  text-align: center;
  padding: 24rpx;
  margin-top: 16rpx;
  background: #ffffff;
  border-radius: 16rpx;
  border: 2rpx dashed #d1d5db;
}

.add-stock-text {
  font-size: 26rpx;
  color: $primary;
  font-weight: 500;
}

/* 底部留白，SubPageCard padding-bottom 已处理，此处仅少量额外间距 */
.bottom-spacer {
  height: 20rpx;
}
</style>
