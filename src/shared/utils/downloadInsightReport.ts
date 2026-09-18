/**
 * 完整洞察报告 PDF 下载（2026-09-13）。
 * H5：fetch(带JWT) → Blob → a[download]；App：uni.downloadFile + uni.openDocument。
 * 备注：报告由 app-api 组装数据并调用 agent-py 实时渲染，无落盘。
 */
import { API_BASE_URL } from '@/shared/utils/constants'

/** 报告端点 URL（H5 fetch / App downloadFile 共用） */
export function buildInsightReportUrl(eventId: string): string {
  const base = API_BASE_URL.replace(/\/$/, '')
  return `${base}/cn/favorites/movements/${encodeURIComponent(eventId)}/report.pdf`
}

function authHeader(): Record<string, string> {
  const token = uni.getStorageSync('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/** H5：带鉴权拉取 PDF 并触发浏览器下载 */
async function downloadOnH5(eventId: string): Promise<void> {
  const res = await fetch(buildInsightReportUrl(eventId), { headers: authHeader() })
  if (res.status === 409) throw new Error('该异动暂无完整归因')
  if (res.status !== 200) throw new Error('报告生成失败，请重试')
  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = `insight-report-${eventId.split(':')[1] ?? 'report'}.pdf`
  try {
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

/** App：uni.downloadFile（带鉴权）后调用系统阅读器打开 */
function downloadOnApp(eventId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    uni.downloadFile({
      url: buildInsightReportUrl(eventId),
      header: authHeader(),
      success: (res) => {
        if (res.statusCode === 409) { reject(new Error('该异动暂无完整归因')); return }
        if (res.statusCode !== 200) { reject(new Error('报告生成失败，请重试')); return }
        uni.openDocument({
          filePath: res.tempFilePath,
          fileType: 'pdf',
          showMenu: true,
          success: () => resolve(),
          fail: () => reject(new Error('请先安装 PDF 阅读器，或使用其他应用打开')),
        })
      },
      fail: () => reject(new Error('报告生成失败，请重试')),
    })
  })
}

/** 统一下载入口：按平台分流 */
export async function downloadInsightReport(eventId: string): Promise<void> {
  // #ifdef H5
  return await downloadOnH5(eventId)
  // #endif
  // #ifndef H5
  await downloadOnApp(eventId)
  // #endif
}
