/**
 * PredictionVerification 条件徽标两段态单测（vitest + happy-dom）。
 *
 * 背景：condition_met 判定落地为两段结构——到期前只点亮（entry 含 condition_met: true，**无 result 键**），
 * 到期后才写 hit/miss。旧前端把「c{i} 存在即 verified」当作已验证，导致中间态显示「已验证」+「实际 --」。
 * 本 spec 锁定：中间态 = 「条件已成立 · 待验证」（pending 色），有 result 才走 命中/未命中。
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PredictionVerification from './PredictionVerification.vue'
import type { PredictionRecord, PredictionVerificationEntry } from '@/shared/api/modules/prediction'

const TODAY = '2026-09-16'

const makeRecord = (
  verification: Partial<Record<string, PredictionVerificationEntry>>,
): PredictionRecord => ({
  id: 1,
  source_type: 'market_trace',
  source_id: 'review:2026-09-10',
  report_date: '2026-09-10',
  schema_version: '3.0',
  status: 'pending',
  created_at: '2026-09-10T12:00:00.000Z',
  prediction: {
    prediction_status: 'hypothesis',
    conditions: [{ condition: '若放量站稳前高', scenario: '则趋势延续' }],
  },
  due_dates: {},
  verification,
})

/** 后端第①段「点亮」写入的中间态 entry：只有 condition_met，没有 result */
const midStateEntry = { horizon: 'c0', condition_met: true } as unknown as PredictionVerificationEntry

const mountWith = (verification: Partial<Record<string, PredictionVerificationEntry>>) =>
  mount(PredictionVerification, { props: { record: makeRecord(verification), today: TODAY } })

const badgeTexts = (wrapper: ReturnType<typeof mountWith>): string[] =>
  wrapper.findAll('.result-badge-text').map((n) => n.text())

describe('PredictionVerification 条件徽标（c{i}）', () => {
  it('中间态（condition_met 为 true 且无 result）→「条件已成立 · 待验证」+ pending 色', () => {
    const wrapper = mountWith({ c0: midStateEntry })

    expect(badgeTexts(wrapper)).toEqual(['条件已成立 · 待验证'])
    expect(wrapper.find('.result-badge').classes()).toContain('badge-pending')
    expect(wrapper.text()).not.toContain('已验证')
    expect(wrapper.text()).not.toContain('实际')
  })

  it('到期后（condition_met 保留 + 有 result）→ 命中/未命中，不回落中间态', () => {
    const wrapper = mountWith({
      c0: {
        horizon: 'c0',
        result: 'hit',
        actual: '+5.2%',
        reason: '条件成立且达成锚点',
        verified_at: '2026-09-16T08:00:00.000Z',
        condition_met: true,
      },
    })

    expect(badgeTexts(wrapper)).toEqual(['命中'])
    expect(wrapper.find('.result-badge').classes()).toContain('badge-hit')
    expect(wrapper.text()).toContain('实际 +5.2%')
  })

  it('无 c{i} entry → 仍为「待验证」（既有口径不变）', () => {
    const wrapper = mountWith({})

    expect(badgeTexts(wrapper)).toEqual(['待验证'])
    expect(wrapper.find('.result-badge').classes()).toContain('badge-pending')
  })
})
