import { describe, it, expect } from 'vitest'
import { mergeUsageBySession } from './sessionUsageMerge'
import type { SessionUsageItem } from '@/shared/api/modules/agent'

function item(session_id: string, total_tokens: number): SessionUsageItem {
  return { session_id, total_tokens, turn_count: 1 }
}

describe('mergeUsageBySession 会话用量合并', () => {
  it('本地优先：同 session_id 以本地为准，不累加', () => {
    const local: Record<string, SessionUsageItem> = { s1: item('s1', 100) }
    const server: Record<string, SessionUsageItem> = { s1: item('s1', 500) }
    const merged = mergeUsageBySession(local, server)
    expect(merged.s1.total_tokens).toBe(100)
  })

  it('服务端补足：本地没有的会话用服务端数据', () => {
    const local: Record<string, SessionUsageItem> = { s1: item('s1', 100) }
    const server: Record<string, SessionUsageItem> = { s2: item('s2', 200) }
    const merged = mergeUsageBySession(local, server)
    expect(Object.keys(merged).sort()).toEqual(['s1', 's2'])
    expect(merged.s2.total_tokens).toBe(200)
  })

  it('本地为空：仅服务端数据', () => {
    const server: Record<string, SessionUsageItem> = { s2: item('s2', 200) }
    const merged = mergeUsageBySession({}, server)
    expect(merged.s2.total_tokens).toBe(200)
  })

  it('服务端为空：仅本地数据', () => {
    const local: Record<string, SessionUsageItem> = { s1: item('s1', 100) }
    const merged = mergeUsageBySession(local, {})
    expect(merged.s1.total_tokens).toBe(100)
  })
})
