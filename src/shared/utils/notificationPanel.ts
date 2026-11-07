/**
 * 通知面板（铃铛下拉）的全局开合状态。
 *
 * 为什么需要共享：首页悬浮卡「查看全部」需要唤起左上角铃铛面板，二者是兄弟组件
 * （MainTabs 的 nav 区与浮层区），无法通过 props/emit 直接通信，故抽一个模块级 ref。
 * 该 ref 只承载「开/合 + 目标股票」，不承载任何通知数据，避免与通知数据链耦合。
 */
import { ref } from 'vue'

const notificationPanelOpen = ref(false)
/** 打开面板时要自动筛选到的股票代码（null = 不改变当前筛选） */
const notificationPanelSymbol = ref<string | null>(null)

export function useNotificationPanel() {
  return {
    /** 面板是否展开（NotificationDropdown 的数据源） */
    open: notificationPanelOpen,
    /** 消费型目标股票：NotificationDropdown 读取后需置回 null（一次性意图） */
    targetSymbol: notificationPanelSymbol,
    /** 打开面板；传 symbol 则同时自动筛选到该股票（悬浮卡「查看全部」入口） */
    openPanel(symbol?: string): void {
      notificationPanelSymbol.value = symbol ?? null
      notificationPanelOpen.value = true
    },
    closePanel(): void {
      notificationPanelOpen.value = false
    },
  }
}
