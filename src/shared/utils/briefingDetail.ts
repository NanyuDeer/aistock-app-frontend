import type { BriefType } from '@/shared/api/modules/agent'

export function buildBriefingDetailUrl(date: string, type: BriefType): string {
  return `/pages-sub-app/briefing-detail/index?date=${encodeURIComponent(date)}&type=${type}`
}

/** 兼容早期路由中的 review，后端结构化 Brief 使用 evening 作为晚报类型。 */
export function normalizeBriefingType(type: string | undefined): BriefType {
  return type === 'evening' || type === 'review' ? 'evening' : 'morning'
}
