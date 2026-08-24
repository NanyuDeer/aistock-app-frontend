/**
 * App 版本更新检查 Hook（仅 Android App 端生效，全量 APK 更新）
 *
 * 流程：拉取 Web 端 version.json → 对比本机 versionCode →
 *      有新版则弹窗 → 确认后 uni.downloadFile 下载 → plus.runtime.install 安装
 *
 * 使用场景：
 * - 启动自动检查：checkAppUpdate()，24h 节流，静默失败
 * - 个人中心手动检查：checkAppUpdate({ manual: true })，不受节流限制
 */
import { fetchLatestVersion, resolveDownloadUrl, type AppVersionInfo } from '@/shared/api/modules/appUpdate'

/** 启动自动检查节流 key（本地时间戳，24h 内不重复弹窗） */
export const UPDATE_LAST_CHECK_KEY = 'app_update_last_check'
const UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000

export type AppUpdateCheckResult =
  | 'not_supported' // 非 Android App 环境（iOS / H5 / 小程序）
  | 'latest' // 已是最新版本
  | 'prompted' // 已弹出更新提示
  | 'error' // 版本信息获取失败

/** 是否 Android App 环境（仅此环境支持 APK 下载安装） */
function isAndroidApp(): boolean {
  // #ifdef APP-PLUS
  try {
    return plus.os.name === 'Android'
  } catch (e) {
    return false
  }
  // #endif
  // #ifndef APP-PLUS
  return false
  // #endif
}

/**
 * Android 原生运行时桥接（plus.android 类型定义缺失，运行时调用）
 * 仅用 getPackageManager().getPackageInfo() 读取 versionCode 作版本对比
 */
interface AndroidRuntimeBridge {
  getPackageManager(): {
    getPackageInfo(pkg: string, flags: number): { versionCode?: number }
  }
  getPackageName(): string
}

/** 读取本机已安装版本号（Android 原生 versionCode） */
function getCurrentVersionCode(): number {
  // #ifdef APP-PLUS
  try {
    const main = plus.android.runtimeMainActivity() as unknown as AndroidRuntimeBridge
    const pkgInfo = main.getPackageManager().getPackageInfo(main.getPackageName(), 0)
    return Number(pkgInfo.versionCode) || 0
  } catch (e) {
    console.warn('[useAppUpdate] 读取本机版本号失败:', e)
    return 0
  }
  // #endif
  return 0
}

/**
 * 执行一次版本检查。
 * @param opts.manual 是否手动检查；手动检查不受 24h 节流限制
 */
export async function checkAppUpdate(opts: { manual?: boolean } = {}): Promise<AppUpdateCheckResult> {
  // 非 Android App 环境不支持 APK 更新
  if (!isAndroidApp()) return 'not_supported'

  // 启动自动检查节流：24h 内不重复弹窗（手动检查跳过）
  if (!opts.manual) {
    const last = Number(uni.getStorageSync(UPDATE_LAST_CHECK_KEY) || 0)
    if (last && Date.now() - last < UPDATE_CHECK_INTERVAL_MS) return 'latest'
  }

  // 拉取线上版本信息（静默失败）
  const info = await fetchLatestVersion()
  if (!info) return 'error'

  const current = getCurrentVersionCode()
  const latest = Number(info.versionCode) || 0
  if (!latest || latest <= current) return 'latest'

  // 有新版本 → 弹更新框（先记录节流时间戳，避免用户拒绝后 24h 内反复弹窗）
  if (!opts.manual) {
    uni.setStorageSync(UPDATE_LAST_CHECK_KEY, String(Date.now()))
  }
  showUpdateModal(info)
  return 'prompted'
}

/** 弹出更新确认框，确认后下载并安装 */
function showUpdateModal(info: AppVersionInfo): void {
  const sizeTxt = info.fileSize && info.fileSize !== '待发布' ? ` · ${info.fileSize}` : ''
  const content = `v${info.versionName}${sizeTxt}\n${info.description || '检测到新版本，请更新后体验'}`
  uni.showModal({
    title: `发现新版本`,
    content,
    confirmText: '立即更新',
    cancelText: '稍后再说',
    success: (res) => {
      if (res.confirm) {
        downloadAndInstall(info)
      }
    }
  })
}

/** 下载 APK 并调用系统安装器安装 */
function downloadAndInstall(info: AppVersionInfo): void {
  const url = resolveDownloadUrl(info)
  uni.showLoading({ title: '正在下载更新包...', mask: true })
  uni.downloadFile({
    url,
    timeout: 0,
    success: (res) => {
      uni.hideLoading()
      if (res.statusCode !== 200 || !res.tempFilePath) {
        uni.showToast({ title: '下载失败，请稍后重试', icon: 'none' })
        return
      }
      // #ifdef APP-PLUS
      // 兜底：当前运行时不可用 plus.runtime.install 时，降级为让系统文件管理器打开安装包
      if (typeof plus.runtime.install !== 'function') {
        plus.runtime.openFile(res.tempFilePath || '')
        return
      }
      plus.runtime.install(
        res.tempFilePath,
        { force: true },
        () => {
          uni.showToast({ title: '下载完成，请安装', icon: 'none' })
        },
        (err: Error) => {
          uni.showModal({
            title: '安装未完成',
            content:
              '下载已完成，安装被系统拦截。请在手机「设置 → 应用/安全 → 安装未知应用」中为当前应用开启允许安装后重试。',
            confirmText: '知道了',
            showCancel: false
          })
          console.warn('[appUpdate] 安装失败', (err && err.message) || err)
        }
      )
      // #endif
    },
    fail: () => {
      uni.hideLoading()
      uni.showToast({ title: '下载失败，请检查网络后重试', icon: 'none' })
    }
  })
}
