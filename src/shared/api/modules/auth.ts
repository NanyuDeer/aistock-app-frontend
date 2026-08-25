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
  /** 微信 openid（手机号账户未绑微信时为空串） */
  openid?: string
  /** 已绑定手机号（未绑定时为空） */
  phone?: string
  nickname: string
  avatar?: string
  avatar_url?: string
  isVip?: boolean   // 2026-08-24 报告导出会员解锁
  is_vip?: boolean // 后端 /users/me 原始 snake_case 字段，fetchUserInfo 归一化为 isVip
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
  watchlist_insight_push?: boolean
}

export const authApi = {
  /** 微信登录（App 端 uni.login → code → 后端换取 token） */
  wxLogin(code: string) {
    return request.post('/auth/wx-login', { code })
  },

  /** 发送短信验证码（限流 60s，dev 环境回显 123456） */
  sendSmsCode(phone: string) {
    return request.post<{ expireSeconds: number }>('/auth/sms/send', { phone })
  },

  /** 手机号 + 短信验证码登录（无账户自动创建） */
  smsLogin(phone: string, code: string) {
    return request.post<{ token: string; userInfo: UserInfo }>('/auth/sms/login', { phone, code })
  },

  /** 给当前登录账户绑定手机号（Bearer） */
  bindPhone(phone: string, code: string) {
    return request.post<{ phoneBound: boolean }>('/auth/bind/phone', { phone, code })
  },

  /** 给当前登录的手机号账户绑定微信（Bearer，手机+验证码证明归属） */
  bindWechat(phone: string, code: string, wxCode: string) {
    return request.post<{ wechatBound: boolean }>('/auth/bind/wechat', { phone, code, wxCode })
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
