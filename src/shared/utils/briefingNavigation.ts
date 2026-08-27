export function buildBriefingUrl(
  type: 'morning' | 'midday' | 'evening',
  date: string,
): string {
  return `/pages-sub-app/briefing/index?type=${type}&date=${date}`
}
