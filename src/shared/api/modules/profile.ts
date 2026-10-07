/**
 * 用户画像相关 API（B8：PIPL 删除权 + 昵称读写）
 */
import request from '../request'

export interface UserProfile {
  nickname?: string | null
  investment_preferences?: string[] | null
  risk_tolerance?: string | null
  updatedAt?: string | null
}

/** 读取当前用户画像（后端无记录返回空对象，不 404） */
export function getUserProfile(): Promise<UserProfile | null> {
  return request.get<UserProfile | null>('/user/profile')
}

/**
 * 部分更新用户画像：仅传 nickname 时，后端对其余字段 COALESCE 保留旧值
 * （契约见 aistock-app-api 的 `PUT /api/user/profile`）
 */
export function updateUserProfile(data: { nickname: string }): Promise<UserProfile | null> {
  return request.put<UserProfile | null>('/user/profile', data)
}

/** 删除用户画像（B8：PIPL 删除权）。响应拦截器在 code 成功时返回 data（{ deleted }）。 */
export function deleteUserProfile(): Promise<{ deleted: boolean }> {
  return request.delete<{ deleted: boolean }>('/user/profile')
}
