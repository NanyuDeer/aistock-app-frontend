/**
 * 认证相关 API
 */
import request from '../request'

export interface LoginParams {
  username?: string
  password?: string
  code?: string
}

export interface UserInfo {
  id?: number | string
  openid: string
  nickname: string
  avatar?: string
  avatar_url?: string
  createdAt?: string
  created_at?: string
}

export interface ScanLoginResult {
  state: string
  qr_url: string
  expire_seconds: number
}

export interface ScanStatusResult {
  status: 'waiting' | 'scanned' | 'confirmed' | 'expired'
  /** confirmed 时后端返回的 JWT token */
  token?: string
  /** confirmed 时返回的 openid */
  openid?: string
}

export interface UserSettings {
  stock_push?: boolean
  outbreak_push?: boolean
  leader_push?: boolean
}

export const authApi = {
  /** 微信登录（App 端 uni.login → code → 后端换取 token） */
  wxLogin(code: string) {
    return request.post('/auth/wx-login', { code })
  },

  /** 账号密码登录（App/H5，保留兼容） */
  login(params: LoginParams) {
    return request.post('/auth/login', params)
  },

  /** 获取微信扫码登录二维码 */
  getScanLoginUrl() {
    return request.get<ScanLoginResult>('/auth/wechat/login/scan')
  },

  /** 轮询扫码登录状态 */
  checkScanLoginStatus(state: string) {
    return request.get<ScanStatusResult>('/auth/wechat/login/scan/poll', { params: { state } })
  },

  /** 退出登录 */
  logout() {
    return request.post('/auth/logout')
  },

  /** 获取当前用户信息 */
  getUserInfo() {
    return request.get<UserInfo>('/users/me')
  },

  /** 获取用户设置 */
  getSettings() {
    return request.get<UserSettings>('/users/me/settings')
  },

  /** 更新用户设置 */
  updateSettings(settingType: string, data: any) {
    return request.put(`/users/me/settings/${settingType}`, data)
  },

  /** 获取用户自选股列表 */
}
