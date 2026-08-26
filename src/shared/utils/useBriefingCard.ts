/**
 * 晨报/午间报/晚报卡片组合式 Hook
 * 封装时间判断、API 调用、数据解析和状态管理
 *
 * 首页“今日专属”卡片支持晨报/午间报/晚报切换：午间报走通用报告端点
 * （/agent/report/midday/:date），结构为 display_report；晨/晚报走结构化
 * Brief 端点（/agent/brief/:type/:date），结构为 brief.v1。
 */
import { ref, computed, type Ref, type ComputedRef } from 'vue'
import { agentApi } from '@/shared/api/modules/agent'
import {
  parseBriefingReport,
  type BriefingReport,
  type BriefingType,
} from './briefingReport'
import { parseMiddayReport, type MiddayReport } from './middayReport'
import { shanghaiDateString, shanghaiDateTimeParts } from './tradingTime'

export type { BriefingReport, BriefingType } from './briefingReport'
export type { MiddayReport } from './middayReport'

/** 首页“今日专属”卡片展示的报告类型：晨报 / 午间报 / 晚报。 */
export type HomeBriefingType = 'morning' | 'midday' | 'evening'

export type BriefingStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error'

export interface BriefingCardState {
  type: Ref<HomeBriefingType>
  date: Ref<string>
  typeLabel: ComputedRef<string>
  summary: Ref<string>
  report: Ref<BriefingReport | null>
  middayReport: Ref<MiddayReport | null>
  loading: Ref<boolean>
  status: Ref<BriefingStatus>
  refresh: () => Promise<void>
}

/**
 * 根据上海当前时间判断报告类型：
 * - 15:30 及之后 → 晚报（收盘复盘）
 * - 12:00 – 15:30 → 午间报（午间报 12:05 生成）
 * - 其余时段（早间） → 晨报（9:10 生成）
 */
export function briefingTypeAtShanghaiTime(date: Date = new Date()): HomeBriefingType {
  const { hour, minute } = shanghaiDateTimeParts(date)
  if (hour > 15 || (hour === 15 && minute >= 30)) {
    return 'evening'
  }
  if (hour >= 12) {
    return 'midday'
  }
  return 'morning'
}

export function useBriefingCard(
  fixedType?: HomeBriefingType,
  fixedDate?: string,
): BriefingCardState {
  const type = ref<HomeBriefingType>(fixedType ?? briefingTypeAtShanghaiTime())
  const date = ref<string>(fixedDate ?? shanghaiDateString())
  const summary = ref('')
  const report = ref<BriefingReport | null>(null)
  const middayReport = ref<MiddayReport | null>(null)
  const loading = ref(false)
  const status = ref<BriefingStatus>('idle')

  const typeLabel = computed(() => {
    if (type.value === 'morning') return '晨报'
    if (type.value === 'midday') return '午间报'
    return '晚报'
  })

  async function fetchData() {
    loading.value = true
    status.value = 'loading'
    try {
      // 午间报分支：走通用报告端点，结构为 display_report（同早点听页方案 A）
      if (type.value === 'midday') {
        const res: unknown = await agentApi.getReport('midday', date.value)
        middayReport.value = parseMiddayReport(res, date.value)
        report.value = null
        if (!middayReport.value) {
          status.value = 'empty'
          summary.value = ''
          return
        }
        summary.value = middayReport.value.content.display_report.summary
        status.value = 'ready'
        return
      }

      // 晨/晚报分支：午间报数据与晨晚不通用，切换类型时清空
      middayReport.value = null
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
      middayReport.value = null
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
    middayReport,
    loading,
    status,
    refresh: fetchData,
  }
}
