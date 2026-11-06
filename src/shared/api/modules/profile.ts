/**
 * 用户画像相关 API（B8：PIPL 删除权 + 昵称读写）
 * 画像自动挖掘一期（2026-11-05）：三字段部分更新 + 推断元信息 / 清除
 */
import request from '../request'

export interface UserProfile {
  nickname?: string | null
  investment_preferences?: string[] | null
  risk_tolerance?: string | null
  updatedAt?: string | null
}

/**
 * 风险偏好三档（后端契约枚举，提交值必须落在此范围内）。
 * 单一真源：页面选择器与提交守卫均从这里取值，禁止在页面自定义值域。
 */
export const RISK_TOLERANCE_VALUES = ['conservative', 'balanced', 'aggressive'] as const
export type RiskTolerance = (typeof RISK_TOLERANCE_VALUES)[number]

/** 风险偏好枚举守卫（后端可能回传历史脏值，读取与提交前都要过一遍） */
export function isRiskTolerance(value: unknown): value is RiskTolerance {
  return typeof value === 'string' && (RISK_TOLERANCE_VALUES as readonly string[]).includes(value)
}

/** 画像部分更新载荷：只传需要修改的字段，未传字段由后端 COALESCE 保留旧值 */
export interface UserProfileUpdate {
  nickname?: string
  investment_preferences?: string[]
  risk_tolerance?: RiskTolerance
}

/** 推断画像元信息（只含计数与维度名，不含推断内容） */
export interface InferenceMeta {
  count: number
  dimensions: string[]
  updated_at: string | null
}

/** 读取当前用户画像（后端无记录返回空对象，不 404） */
export function getUserProfile(): Promise<UserProfile | null> {
  return request.get<UserProfile | null>('/user/profile')
}

/**
 * 部分更新用户画像：仅传 nickname 时，后端对其余字段 COALESCE 保留旧值
 * （契约见 aistock-app-api 的 `PUT /api/user/profile`）
 */
export function updateUserProfile(data: UserProfileUpdate): Promise<UserProfile | null> {
  return request.put<UserProfile | null>('/user/profile', data)
}

/** 删除用户画像（B8：PIPL 删除权）。响应拦截器在 code 成功时返回 data（{ deleted }）。 */
export function deleteUserProfile(): Promise<{ deleted: boolean }> {
  return request.delete<{ deleted: boolean }>('/user/profile')
}

/** 读取当前用户的 AI 推断元信息（未开启或无数据时 count=0、updated_at=null） */
export function getInferenceMeta(): Promise<InferenceMeta> {
  return request.get<InferenceMeta>('/user/profile/inferences/meta')
}

/** 清除当前用户的全部 AI 推断结果（不动显式画像），返回删除行数 */
export function clearInferences(): Promise<{ deleted: number }> {
  return request.delete<{ deleted: number }>('/user/profile/inferences')
}
