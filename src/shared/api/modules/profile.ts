/**
 * 用户画像相关 API（B8：PIPL 删除权）
 */
import request from '../request'

/** 删除用户画像（B8：PIPL 删除权）。响应拦截器在 code 成功时返回 data（{ deleted }）。 */
export function deleteUserProfile(): Promise<{ deleted: boolean }> {
  return request.delete<{ deleted: boolean }>('/user/profile')
}
