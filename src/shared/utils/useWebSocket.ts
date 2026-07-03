/**
 * WebSocket Hook - 实时行情/异动提醒
 */
import { ref, onUnmounted } from 'vue'
import { createWebSocket } from '@/shared/api/modules/agent'

export function useWebSocket(symbols: string[] = []) {
  const ws = ref<UniApp.SocketTask | null>(null)
  const connected = ref(false)
  const quotes = ref<Record<string, any>>({})

  function connect() {
    ws.value = createWebSocket()

    ws.value.onOpen(() => {
      connected.value = true
      // 订阅股票行情
      if (symbols.length > 0) {
        ws.value?.send({
          data: JSON.stringify({ type: 'subscribe', symbols })
        })
      }
    })

    ws.value.onMessage((res) => {
      try {
        const msg = JSON.parse(res.data as string)
        if (msg.type === 'quote_update') {
          quotes.value[msg.data.symbol] = msg.data
        }
      } catch (e) {
        console.error('[WS] parse error:', e)
      }
    })

    ws.value.onClose(() => { connected.value = false })
    ws.value.onError(() => { connected.value = false })
  }

  function subscribe(newSymbols: string[]) {
    ws.value?.send({
      data: JSON.stringify({ type: 'subscribe', symbols: newSymbols })
    })
  }

  function unsubscribe(symbolsToRemove: string[]) {
    ws.value?.send({
      data: JSON.stringify({ type: 'unsubscribe', symbols: symbolsToRemove })
    })
  }

  function disconnect() {
    ws.value?.close({})
    ws.value = null
    connected.value = false
  }

  onUnmounted(() => disconnect())

  return { connected, quotes, connect, subscribe, unsubscribe, disconnect }
}
