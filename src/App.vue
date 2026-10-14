<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { usePushNotification } from '@/shared/utils/usePushNotification'
import { checkAppUpdate } from '@/shared/utils/useAppUpdate'
import { useUserStore } from '@/shared/store/modules/user'
import { useFavoritesStore } from '@/shared/store/modules/favorites'
import { initH5Scale } from '@/shared/utils/h5-scale'
import { agentApi } from '@/shared/api/modules/agent'
import { shanghaiDateString } from '@/shared/utils/tradingTime'
import { setTradingCalendar, hasTradingCalendar, tradingCalendarWindowEnd } from '@/shared/utils/tradingCalendar'

/**
 * 交易日历窗口（最近 N 个交易日）：前端不设节假日表，交易日判定一律以后端
 * trading_calendar 为准。App 启动/回前台时拉取一次并缓存；同一天内不重复拉取。
 */
const TRADING_CALENDAR_WINDOW_DAYS = 90
let calendarLoadedDate = ''
let calendarLoading = false

async function loadTradingCalendar(): Promise<void> {
  const today = shanghaiDateString()
  // 当天已拉过则跳过；跨天后窗口上界失效需重新拉取
  if (calendarLoadedDate === today && hasTradingCalendar() && tradingCalendarWindowEnd() === today) return
  if (calendarLoading) return // onLaunch 与 onShow 可能同时触发，避免重复请求
  calendarLoading = true
  try {
    const days = await agentApi.getRecentTradingDays(today, TRADING_CALENDAR_WINDOW_DAYS)
    if (Array.isArray(days) && days.length) {
      setTradingCalendar(days, today)
      calendarLoadedDate = today
    } else {
      console.warn('[tradingCalendar] 后端返回空窗口，交易日判定降级为周一~周五')
    }
  } catch (e) {
    // 拉取失败不阻塞启动：isTradingDay 会降级到周一~周五（与后端降级策略一致）
    console.warn('[tradingCalendar] 交易日历拉取失败，降级为周一~周五:', e)
  } finally {
    calendarLoading = false
  }
}

onLaunch(() => {
  console.log('App Launch - 洞见')
  // 交易日历：越早加载越好（首页/自选/异动的盘中刷新都依赖它）
  void loadTradingCalendar()
  // #ifdef APP-PLUS
  // App 端初始化推送
  usePushNotification()
  // 启动时静默检查版本更新（非 Android App 环境自动跳过；24h 节流）
  setTimeout(() => {
    checkAppUpdate()
  }, 3000)
  // #endif
  // #ifdef H5
  // H5 端初始化等比缩放，保持 9:16 长宽比并适应浏览器视口
  initH5Scale()
  // #endif
})

onShow(async () => {
  console.log('App Show')
  // 回前台时补齐/刷新交易日历（跨天或首次失败后重试）
  void loadTradingCalendar()
  const userStore = useUserStore()
  const favoritesStore = useFavoritesStore()
  const authenticated = await userStore.restoreSession()
  if (authenticated) {
    await favoritesStore.fetchFavorites({ silent: true })
  }
})

onHide(() => {
  console.log('App Hide')
})
</script>

<style lang="scss">
@import '@/shared/styles/global.scss';
</style>
