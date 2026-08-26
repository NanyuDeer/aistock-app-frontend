/**
 * 推送通知 Hook（App 端专属）
 */
import { agentApi } from '@/shared/api/modules/agent'

export function usePushNotification() {
  // #ifdef APP-PLUS
  // 获取推送客户端 ID
  uni.getPushClientId({
    success: (res) => {
      console.log('[Push] clientId:', res.cid)
      // 上传到后端
      agentApi.registerPushToken(res.cid, 'unipush').catch((e: unknown) => {
        // 后端 push/token 接口尚未实现（见 agent.ts 的 TODO），404 属预期，
        // 静默跳过避免调试时被"服务异常(404)"误导刷屏；仅其它异常才打印
        const statusCode = (e as { statusCode?: number })?.statusCode
        if (statusCode === 404) return
        console.error('[Push] register failed:', e)
      })
    },
    fail: (err) => {
      console.error('[Push] getClientId failed:', err)
    }
  })

  // 监听推送消息点击
  uni.onPushMessage((res: any) => {
    console.log('[Push] message:', res.type, res.data)
    if (res.type === 'click') {
      const payload = res.data?.payload as { page?: string } | undefined
      if (payload?.page) {
        uni.navigateTo({ url: payload.page })
      }
    }
  })
  // #endif
}
