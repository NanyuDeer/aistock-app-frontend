/**
 * 晨报/晚报卡片组合式 Hook
 * 封装时间判断、API 调用、数据解析和状态管理
 */
import { ref, computed, type Ref, type ComputedRef } from 'vue'
import { agentApi } from '@/shared/api/modules/agent'
import {
  parseBriefingReport,
  type BriefingReport,
  type BriefingType,
} from './briefingReport'
import { shanghaiDateString, shanghaiDateTimeParts } from './tradingTime'

export type { BriefingReport, BriefingType } from './briefingReport'

export type BriefingStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error'

export interface BriefingCardState {
  type: Ref<BriefingType>
  date: Ref<string>
  typeLabel: ComputedRef<string>
  summary: Ref<string>
  report: Ref<BriefingReport | null>
  loading: Ref<boolean>
  status: Ref<BriefingStatus>
  refresh: () => Promise<void>
}

/** 根据上海当前时间判断报告类型：15:30 前为晨报，之后为晚报 */
export function briefingTypeAtShanghaiTime(date: Date = new Date()): BriefingType {
  const { hour, minute } = shanghaiDateTimeParts(date)
  if (hour < 15 || (hour === 15 && minute < 30)) {
    return 'morning'
  }
  return 'evening'
}

export function useBriefingCard(
  fixedType?: BriefingType,
  fixedDate?: string,
): BriefingCardState {
  const type = ref<BriefingType>(fixedType ?? briefingTypeAtShanghaiTime())
  const date = ref<string>(fixedDate ?? shanghaiDateString())
  const summary = ref('')
  const report = ref<BriefingReport | null>(null)
  const loading = ref(false)
  const status = ref<BriefingStatus>('idle')

  const typeLabel = computed(() => (type.value === 'morning' ? '晨报' : '晚报'))

  async function fetchData() {
    loading.value = true
    status.value = 'loading'
    try {
      const res: unknown = await agentApi.getBrief(type.value, date.value)
      // 兼容两种响应格式：{ data: { content } } 或 { content }
      const data = (res as Record<string, unknown>)?.data ?? res
      if (!data) {
        status.value = 'empty'
        summary.value = ''
        report.value = null
        return
      }
      const parsed = parseBriefingReport(data, type.value)
      if (!parsed) {
        status.value = 'empty'
        summary.value = ''
        report.value = null
        return
      }
      report.value = parsed
      summary.value = parsed.summary
      status.value = 'ready'
    } catch {
      status.value = 'error'
      summary.value = ''
      report.value = null
    } finally {
      loading.value = false
    }
  }

  return {
    type,
    date,
    typeLabel,
    summary,
    report,
    loading,
    status,
    refresh: fetchData,
  }
}
