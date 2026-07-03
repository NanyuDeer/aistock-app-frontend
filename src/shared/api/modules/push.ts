/**
 * 推送通知 API
 */
import request from '../request'

export const pushApi = {
  /** 注册推送 Token（App 端调用） */
  registerToken(token: string, provider: string) {
    return request.post('/agent/push/token', { token, provider })
  },

  /** 注销推送 Token */
  unregisterToken(token: string) {
    return request.delete('/agent/push/token', { data: { token } })
  }
}
