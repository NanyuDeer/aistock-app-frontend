import type { SessionUsageItem } from '@/shared/api/modules/agent'

/**
 * 会话用量合并：本地优先，服务端仅补本地没有的 session_id。
 * 不做数值相加——本地与服务端是同一轮 DONE 的 token_usage 双份记录，sum 会翻倍。
 */
export function mergeUsageBySession(
  local: Record<string, SessionUsageItem>,
  server: Record<string, SessionUsageItem>,
): Record<string, SessionUsageItem> {
  const merged: Record<string, SessionUsageItem> = { ...local }
  for (const [sid, item] of Object.entries(server)) {
    if (!merged[sid]) merged[sid] = item
  }
  return merged
}
