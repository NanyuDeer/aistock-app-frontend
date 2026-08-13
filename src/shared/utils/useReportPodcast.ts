/**
 * 报告页播报组合式函数
 * 从指定 Agent 报告拉取 podcast_brief，点击标题栏播报按钮时打开悬浮播报窗。
 * 后端 /agent/report/:intent/:date 指定日期无报告时会降级返回最近一份，故无需额外容错。
 */
import { ref } from 'vue'
import { agentApi } from '@/shared/api/modules/agent'
import { usePodcastStore } from '@/shared/store/modules/podcast'
import { shanghaiDateString } from '@/shared/utils/tradingTime'

export function useReportPodcast(intent: string) {
  const podcastStore = usePodcastStore()
  const podcastBrief = ref('')
  const reportDate = ref('')
  const podcastLoading = ref(false)

  /** 拉取最近一份报告的播报稿（幂等，静默失败） */
  async function loadPodcast(): Promise<string> {
    if (podcastLoading.value) return podcastBrief.value
    if (podcastBrief.value) return podcastBrief.value
    podcastLoading.value = true
    try {
      const report = (await agentApi.getReport(intent, shanghaiDateString())) as
        | { report_date?: string; content?: { podcast_brief?: string } }
        | null
        | undefined
      const brief = report?.content?.podcast_brief
      if (typeof brief === 'string' && brief) {
        podcastBrief.value = brief
        reportDate.value = report?.report_date || shanghaiDateString()
      }
    } catch {
      // 静默：拉取失败只影响播报按钮是否可用
    } finally {
      podcastLoading.value = false
    }
    return podcastBrief.value
  }

  /** 打开悬浮播报窗（无播报稿时提示） */
  async function openPodcast(title: string) {
    const brief = podcastBrief.value || (await loadPodcast())
    if (!brief) {
      uni.showToast({ title: '暂无播报内容', icon: 'none' })
      return
    }
    void podcastStore.open(
      brief,
      `report_${intent}_${reportDate.value || 'latest'}`,
      title
    )
  }

  return { podcastBrief, podcastLoading, loadPodcast, openPodcast }
}
