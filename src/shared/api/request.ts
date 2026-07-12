/**
 * HTTP 请求工具 - 基于 luch-request（uni-app 生态标准请求库）
 * 提供兼容 axios 的 API，方便 api/modules/*.ts 使用
 */
import Request from 'luch-request'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const http = new Request({
  baseURL: BASE_URL,
  timeout: 15000,
  header: { 'Content-Type': 'application/json' }
})

// 请求拦截器：注入 token
http.interceptors.request.use(
  (config) => {
    const token = uni.getStorageSync('token')
    if (token) {
      config.header = config.header || {}
      config.header.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器：统一错误处理
http.interceptors.response.use(
  (response) => {
    const { code, message, data } = response.data || {}
    if (code === 200 || code === undefined) {
      return data ?? response.data
    }
    // 业务错误不弹 toast（让调用方自行处理），仅 reject
    return Promise.reject(new Error(message || '请求失败'))
  },
  (error) => {
    // 401 只清除 token，不强制跳转登录页（登录是非必要的，仅自选股等功能需要）
    if (error.statusCode === 401) {
      uni.removeStorageSync('token')
    }
    // 兼容 App 端：请求成功但 statusCode 非 2xx 时，error.errMsg 可能是 'request:ok'
    // （uni.request 层面成功），但 luch-request 因状态码非 2xx 走错误回调
    // 此时 error 含 statusCode 和 data，提取有用的错误信息给调用方
    if (error.errMsg === 'request:ok' && error.statusCode) {
      const statusCode = error.statusCode
      const responseData = error.data
      const msg = typeof responseData === 'object' ? responseData?.message : responseData
      return Promise.reject(new Error(`服务异常(${statusCode}): ${msg || '请稍后重试'}`))
    }
    return Promise.reject(error)
  }
)

/**
 * 兼容 axios API 的请求实例
 * 支持泛型：request.get<T>(url, { params })
 */
const request = {
  get<T = any>(url: string, config: { params?: any; headers?: any } = {}): Promise<T> {
    return http.get(url, { params: config.params, header: config.headers }) as unknown as Promise<T>
  },
  post<T = any>(url: string, data?: any, config: { headers?: any } = {}): Promise<T> {
    return http.post(url, data, { header: config.headers }) as unknown as Promise<T>
  },
  put<T = any>(url: string, data?: any, config: { headers?: any } = {}): Promise<T> {
    return http.put(url, data, { header: config.headers }) as unknown as Promise<T>
  },
  delete<T = any>(url: string, config: { params?: any; data?: any; headers?: any } = {}): Promise<T> {
    return http.delete(url, { params: config.params, data: config.data, header: config.headers }) as unknown as Promise<T>
  }
}

export default request
