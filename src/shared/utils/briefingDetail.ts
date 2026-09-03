import type { BriefType } from '@/shared/api/modules/agent'

/** 早点听页 Tab 类型：晨报/午间报（盘中报）/晚报。 */
export type BriefingTabType = BriefType | 'midday'

export function buildBriefingDetailUrl(date: string, type: BriefType): string {
  return `/pages-sub-app/briefing-detail/index?date=${encodeURIComponent(date)}&type=${type}`
}

/** 兼容早期路由中的 review，后端结构化 Brief 使用 evening 作为晚报类型；midday 为午间报。 */
export function normalizeBriefingType(type: string | undefined): BriefingTabType {
  if (type === 'evening' || type === 'review') return 'evening'
  if (type === 'midday') return 'midday'
  return 'morning'
}
