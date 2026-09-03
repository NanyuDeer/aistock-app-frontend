/**
 * App 版本更新检查 Hook（仅 Android App 端生效，全量 APK 更新）
 *
 * 流程：拉取 Web 端 version.json → 对比本机 versionCode →
 *      有新版则把待更新信息写入全局 updatePromptState（由 UpdateModal 渲染弹窗）→
 *      用户「立即更新」下载安装 /「永久关闭」该版本不再提示 / 仅叉掉则下次进应用再提示。
 *
 * 使用场景：
 * - 启动自动检查：checkAppUpdate()，静默失败；每次启动都检查（不节流），
 *   仅「叉掉」未永久关闭的版本下次进入仍会提示
 * - 个人中心手动检查：checkAppUpdate({ manual: true })
 */
import { reactive } from 'vue'
import { fetchLatestVersion, resolveDownloadUrl, type AppVersionInfo } from '@/shared/api/modules/appUpdate'

export type AppUpdateCheckResult =
  | 'not_supported' // 非 Android App 环境（iOS / H5 / 小程序）
  | 'latest' // 已是最新版本（含：无新版 / 已对该版本永久关闭）
  | 'prompted' // 已弹出更新提示
  | 'error' // 版本信息获取失败

/**
 * 全局更新弹窗状态：checkAppUpdate 检测到新版本时写入，
 * UpdateModal 组件据此渲染（挂在各宿主页面，仅前台页面可见）。
 * info 置空表示无待更新。
 */
export interface UpdatePromptState {
  visible: boolean
  info: AppVersionInfo | null
}

/** 更新弹窗全局单例状态（跨首页/个人中心页面共享） */
export const updatePromptState = reactive<UpdatePromptState>({
  visible: false,
  info: null,
})

/** 「永久关闭」标记：用户对某 versionCode 选择不再提示后写入，命中则此版本不再弹窗 */
export function neverUpdateStorageKey(versionCode: number): string {
  return `app_update_never_v${versionCode}`
}

/**
 * 更新检查诊断快照：真机正式包排查「已是最新」假阳用（确认后移除）。
 * checkAppUpdate 每次比对后写入，profile 手动检查时用 showModal 展示，
 * 便于在不读 console 的情况下确认线上与本机 versionCode 的判定走向。
 */
export const updateDiag = {
  /** 线上 versionCode（0 表示未能取到） */
  latest: 0 as number,
  /** 本机 versionCode（0 表示原生读取失败） */
  current: 0 as number,
  lastResult: '' as string,
}

/** 是否已对该版本选择「永久关闭」（不再提示） */
export function isNeverUpdate(versionCode: number): boolean {
  return !!uni.getStorageSync(neverUpdateStorageKey(versionCode))
}

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
 * 读取本机已安装版本号（Android 原生 versionCode）。
 * 注意：plus.android 返回的是 Java 对象句柄，读字段必须走 plus.android.invoke(obj,'get','field')，
 * 不可直接 pkgInfo.versionCode 属性访问——否则会读不到值返回 0，
 * 被误判为「比线上旧」而反复弹出更新（0.1.1 用户装好后仍弹更新的根因）。
 */
function getCurrentVersionCode(): number {
  // #ifdef APP-PLUS
  try {
    const main = plus.android.runtimeMainActivity()
    const pkgName = plus.android.invoke(main, 'getPackageName')
    const pm = plus.android.invoke(main, 'getPackageManager')
    const pkgInfo = plus.android.invoke(pm, 'getPackageInfo', [pkgName, 0])
    const versionCode = Number(plus.android.invoke(pkgInfo, 'get', 'versionCode'))
    return Number.isFinite(versionCode) && versionCode > 0 ? versionCode : 0
  } catch (e) {
    console.warn('[useAppUpdate] 读取本机版本号失败:', e)
    return 0
  }
  // #endif
  return 0
}

/**
 * 执行一次版本检查。
 *
 * 行为（针对用户需求：叉掉下次仍提示，可永久关闭）：
 * - 不再进行 24h 节流——每次进入应用都会检查，尚未「永久关闭」的新版本都会提示。
 * - 拉到新版本 → 写入全局 updatePromptState，由 UpdateModal 渲染弹窗；
 * - 用户「永久关闭」该版本后，isNeverUpdate 命中 → 返回 latest，不再弹窗。
 */
export async function checkAppUpdate(opts: { manual?: boolean } = {}): Promise<AppUpdateCheckResult> {
  // 非 Android App 环境不支持 APK 更新
  if (!isAndroidApp()) return 'not_supported'

  // 拉取线上版本信息（静默失败）
  const info = await fetchLatestVersion()
  if (!info) return 'error'

  // 比对版本号
  const latest = Number(info.versionCode) || 0
  const current = getCurrentVersionCode()
  // 诊断（真机「已是最新」假阳排查用，确认后移除）：写入快照供 UI 展示 + console 打印
  const result = !latest || current <= 0 || latest <= current ? 'latest' : opts.manual && isNeverUpdate(latest) ? 'never-closed' : 'would-prompt'
  updateDiag.latest = latest
  updateDiag.current = current
  updateDiag.lastResult = result
  console.warn('[appUpdate-diag] latest =', latest, '| current =', current, '| isNever =', isNeverUpdate(latest), '| manual =', opts.manual, '| predict =', result)
  // current<=0 表示本机版本号读取失败（无法判定本机版本），保守视为已最新，避免反复误弹
  if (!latest || current <= 0 || latest <= current) return 'latest'

  // 用户已对该版本选择「永久关闭」→ 直接跳过，不再提示
  if (isNeverUpdate(latest)) return 'latest'

  // 有新版 → 写入全局弹窗状态（真正弹窗由 UpdateModal 渲染）
  updatePromptState.info = info
  updatePromptState.visible = true
  return 'prompted'
}

/** 立即更新：当前待更新信息存在则开始下载安装 */
export function downloadAndInstall(info: AppVersionInfo): void {
  updatePromptState.visible = false
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
