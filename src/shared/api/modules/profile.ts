/**
 * 用户画像相关 API（B8：PIPL 删除权）
 */
import request from '../request'

/** 删除用户画像（B8：PIPL 删除权）。返回后端统一 { code, data, message }。 */
export function deleteUserProfile(): Promise<{ code: number; data: { deleted: boolean } }> {
  return request.delete('/user/profile')
}
