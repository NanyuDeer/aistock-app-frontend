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
      agentApi.registerPushToken(res.cid, 'unipush').catch((e) => {
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
