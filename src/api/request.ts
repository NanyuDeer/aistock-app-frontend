/**
 * Axios 请求实例 - 跨端适配
 * 使用 @uni-helper/axios-uni 适配器，支持 App/H5/小程序
 */
import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'
// #ifdef MP-WEIXIN || APP-PLUS
import { axiosUniAdapter } from '@uni-helper/axios-uni'
// #endif

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const request: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  // #ifdef MP-WEIXIN || APP-PLUS
  adapter: axiosUniAdapter as any,
  // #endif
})

// 请求拦截器：注入 token
request.interceptors.request.use(
  (config) => {
    const token = uni.getStorageSync('token')
    if (token) {
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器：统一错误处理
request.interceptors.response.use(
  (response) => {
    const { code, message, data } = response.data || {}
    if (code === 200 || code === undefined) {
      return data ?? response.data
    }
    uni.showToast({ title: message || '请求失败', icon: 'none' })
    return Promise.reject(new Error(message || '请求失败'))
  },
  (error) => {
    if (error.response?.status === 401) {
      uni.removeStorageSync('token')
      uni.reLaunch({ url: '/pages/user/login' })
    }
    const msg = error.response?.data?.message || error.message || '网络错误'
    uni.showToast({ title: msg, icon: 'none' })
    return Promise.reject(error)
  }
)

export default request
export type { AxiosRequestConfig }
