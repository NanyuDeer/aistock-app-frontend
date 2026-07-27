export function buildBriefingUrl(
  type: 'morning' | 'evening',
  date: string,
): string {
  return `/pages-sub-app/briefing/index?type=${type}&date=${date}`
}
