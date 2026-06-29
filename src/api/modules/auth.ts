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
  id: number
  openid: string
  nickname: string
  avatar: string
}

export const authApi = {
  /** 微信登录（小程序） */
  wxLogin(code: string) {
    return request.post('/auth/wx-login', { code })
  },

  /** 账号密码登录（App/H5） */
  login(params: LoginParams) {
    return request.post('/auth/login', params)
  },

  /** 退出登录 */
  logout() {
    return request.post('/auth/logout')
  },

  /** 获取当前用户信息 */
  getUserInfo() {
    return request.get<UserInfo>('/users/me')
  },

  /** 更新用户设置 */
  updateSettings(settingType: string, data: any) {
    return request.put(`/users/me/settings/${settingType}`, data)
  }
}
