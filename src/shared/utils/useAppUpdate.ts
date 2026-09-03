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
  /** 线上 versionName（如 "0.1.3"） */
  latest: '' as string,
  /** 本机 versionName（如 "0.1.2"；空表示读取失败） */
  current: '' as string,
  lastResult: '' as string,
  /** 读取本机版本号的详细过程/异常信息（定位根因） */
  versionCodeDetail: '' as string,
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
 *
 * 2026-09-03 根因定论：plus.android 反射（getPackageInfo）在本环境正式包真机返回 null，
 * 无论 flags=0 / PACKAGE_MATCH_ALL / getAttribute / longVersionCode 均无法读出，
 * 导致 current=0 被判"已最新"假阳。此项在 plus 运行时不可靠，弃用原生反射，
 * 改由 getCurrentVersionName() 用 plus.runtime.version（官方 API，返回版本号字符串）读取并做版本号比较。
 */
function getCurrentVersionName(): string {
  // #ifdef APP-PLUS
  try {
    const v = String(plus.runtime.version)
    return v && v.trim() ? v.trim() : ''
  } catch (e) {
    console.warn('[useAppUpdate] 读取本机版本号失败:', e)
    return ''
  }
  // #endif
  return ''
}

/** 解析 "0.1.3" → [0,1,3]，供版本号逐段比较；无法解析时返回 [] */
function parseVersion(str: string): number[] {
  return String(str || '')
    .split('.')
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n))
}

/**
 * 比较两个版本号字符串（如 "0.1.3" vs "0.1.2"）。
 * 返回 >0 表示 a 比 b 新；<0 表示 a 比 b 旧；=0 表示相同。
 * 任意一方无法解析时：能解析的一方判定为更新（避免误判"已最新"）；都无法解析视为相等 → 视为已最新。
 */
function compareVersion(a: string, b: string): number {
  const pa = parseVersion(a)
  const pb = parseVersion(b)
  if (pa.length === 0 && pb.length === 0) return 0
  if (pa.length === 0) return -1
  if (pb.length === 0) return 1
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0)
    if (diff !== 0) return diff
  }
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

  // 比对版本号：用 versionName 字符串比较（线上下发 versionName 与 App 打包 versionName 一致）
  const latest = String(info.versionName || '')
  const current = getCurrentVersionName()
  const isNewer = compareVersion(latest, current) > 0
  // 诊断（真机排查用，确认后移除）：写入快照供 UI 展示 + console 打印
  updateDiag.latest = latest
  updateDiag.current = current
  updateDiag.lastResult = isNewer ? 'would-prompt' : 'latest'
  console.warn('[appUpdate-diag] latest =', latest, '| current =', current, '| manual =', opts.manual, '| would-prompt =', isNewer)
  // 本机版本无法读取（current 为空）时保守视为已最新，避免反复误弹
  if (!latest || !current || !isNewer) return 'latest'

  // 用户已对该版本选择「永久关闭」→ 直接跳过，不再提示
  if (isNeverUpdate(info.versionCode)) return 'latest'

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
