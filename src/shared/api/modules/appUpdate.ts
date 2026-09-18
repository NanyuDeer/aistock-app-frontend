/**
 * App 版本更新 API
 *
 * 版本信息文件 version.json 托管在 Web 前端 public/download/（与 APK 同目录），
 * 属于静态资源，走独立域名（DOWNLOAD_BASE_URL），不经后端 API 网关，无需鉴权。
 */
import { DOWNLOAD_BASE_URL } from '@/shared/utils/constants'

/** 线上版本信息（与 Web 端 public/download/version.json 字段一致） */
export interface AppVersionInfo {
  appName: string
  versionName: string
  versionCode: number
  /** 相对 version.json 目录的 APK 文件名，如 aistock-0.1.0.apk */
  downloadUrl: string
  fileSize?: string
  releaseDate?: string
  minSystem?: string
  description?: string
  features?: string[]
}

/** 拉取线上最新版本信息；网络异常 / 解析失败返回 null（不抛错，便于静默降级） */
export function fetchLatestVersion(): Promise<AppVersionInfo | null> {
  return new Promise((resolve) => {
    uni.request({
      // 追加毫秒时间戳做 cache-busting：version.json 带 Etag/Last-Modified，
      // 不绕过会命中 HTTP/App 层缓存旧版本号（本机 0.1.2 拉到旧 102 被误判"已最新"）。
      url: `${DOWNLOAD_BASE_URL}/version.json?t=${Date.now()}`,
      method: 'GET',
      timeout: 10000,
      success: (res) => {
        const data = res.data as AppVersionInfo | undefined
        if (res.statusCode === 200 && data && typeof data === 'object' && data.downloadUrl) {
          resolve(data)
        } else {
          resolve(null)
        }
      },
      fail: () => resolve(null)
    })
  })
}

/** 拼接 APK 完整下载地址 */
export function resolveDownloadUrl(info: AppVersionInfo): string {
  return `${DOWNLOAD_BASE_URL}/${info.downloadUrl}`
}
