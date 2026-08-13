import { onUnmounted } from 'vue'
import type { UserNotification } from '@/shared/api/modules/notifications'
import { WS_BASE_URL } from '@/shared/utils/constants'

type Listener = (notification: UserNotification) => void

/** 退避重连间隔，连续失败时逐级放大，最长 30 秒一次 */
const RECONNECT_DELAYS_MS = [1000, 2000, 5000, 10000, 30000]

async function parseSocketMessage(data: unknown): Promise<any> {
  if (typeof data === 'string') return JSON.parse(data)
  if (data instanceof ArrayBuffer) return JSON.parse(new TextDecoder().decode(data))
  if (typeof Blob !== 'undefined' && data instanceof Blob) return JSON.parse(await data.text())
  if (data && typeof data === 'object') return data
  throw new Error('Unsupported WebSocket payload')
}

/**
 * 铃铛专用的通知连接。断线（切后台、换网络、后端重启）后会自动退避重连，
 * 重连成功时回调 onReconnect，供调用方补拉离线期间产生的通知。
 */
export function useNotificationSocket(token: () => string, onNotification: Listener, onReconnect?: () => void) {
  let task: UniApp.SocketTask | null = null
  let activeToken = ''
  let retryIndex = 0
  let retryTimer: ReturnType<typeof setTimeout> | null = null
  let closedByCaller = false

  function clearRetryTimer() {
    if (!retryTimer) return
    clearTimeout(retryTimer)
    retryTimer = null
  }

  function scheduleReconnect() {
    if (closedByCaller || retryTimer || !token()) return
    const delay = RECONNECT_DELAYS_MS[Math.min(retryIndex, RECONNECT_DELAYS_MS.length - 1)]
    retryIndex += 1
    retryTimer = setTimeout(() => {
      retryTimer = null
      activeToken = ''
      connect()
    }, delay)
  }

  function handleDisconnect(socketTask: UniApp.SocketTask) {
    if (task !== socketTask) return
    task = null
    scheduleReconnect()
  }

  function connect() {
    const currentToken = token()
    if (!currentToken || (task && activeToken === currentToken)) return
    // 已经在建连，之前排队的退避重连就作废了，否则它会把这条新连接再踢掉
    clearRetryTimer()
    closedByCaller = false
    close(false)
    activeToken = currentToken
    const socketTask = uni.connectSocket({
      url: `${WS_BASE_URL}?token=${encodeURIComponent(currentToken)}`,
    }) as unknown as UniApp.SocketTask
    task = socketTask
    socketTask.onOpen(() => {
      if (task !== socketTask) return
      retryIndex = 0
      // 首连同样补拉一次。连接前后产生的通知无法依赖 WS 回放，列表接口才是完整状态。
      onReconnect?.()
    })
    socketTask.onMessage((res) => {
      void (async () => {
      try {
        const message = await parseSocketMessage(res.data)
        if (message.type !== 'notification' || message.data?.type !== 'notification.created') return
        const notification = message.data.notification as UserNotification | undefined
        if (notification?.id) onNotification(notification)
      } catch (error) {
        console.warn('[Notification WS] message parse failed:', error)
      }
      })()
    })
    socketTask.onClose(() => handleDisconnect(socketTask))
    socketTask.onError(() => handleDisconnect(socketTask))
  }

  function refresh() {
    if (activeToken !== token()) close()
    connect()
  }

  function unsubscribe() {
    close()
  }

  /** resetState=false 供 connect 内部复用：只断开旧连接，不清掉重连意图 */
  function close(resetState = true) {
    const closing = task
    task = null
    closing?.close({})
    activeToken = ''
    if (!resetState) return
    closedByCaller = true
    retryIndex = 0
    clearRetryTimer()
  }

  // App/小程序切回前台时立即补一次连接，不等退避计时器
  const canWatchAppShow = typeof uni.onAppShow === 'function' && typeof uni.offAppShow === 'function'
  function handleAppShow() {
    if (closedByCaller || !token() || task) return
    clearRetryTimer()
    retryIndex = 0
    activeToken = ''
    connect()
  }
  if (canWatchAppShow) uni.onAppShow(handleAppShow)

  onUnmounted(() => {
    if (canWatchAppShow) uni.offAppShow(handleAppShow)
    unsubscribe()
  })

  return { connect, refresh, close: () => close(), unsubscribe }
}
