/**
 * 画像 API 契约（用户画像自动挖掘一期 Task 8）
 *
 * 覆盖三件事：
 *  1. `updateUserProfile` 变为三字段**部分更新**（未传字段不夹带，后端 COALESCE 保留旧值）；
 *  2. 新增 `getInferenceMeta` / `clearInferences` 的 URL 与返回形状（本轮只定义，Task 9 再接 UI）；
 *  3. 风险偏好枚举守卫 `isRiskTolerance` 的运行时行为（提交值必须落在枚举内）。
 *
 * 采用 vitest 风格（`import ... from 'vitest'`）并注册进 vitest.config.ts 白名单，
 * 否则 `npm test` 会静默跳过；tests/run-node-specs.mjs 据白名单反向排除。
 */
import { beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest'

const requestMock = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('@/shared/api/request', () => ({ default: requestMock }))

import {
  RISK_TOLERANCE_VALUES,
  clearInferences,
  getInferenceMeta,
  isRiskTolerance,
  updateUserProfile,
  type RiskTolerance,
} from './profile'

beforeEach(() => {
  vi.clearAllMocks()
  requestMock.get.mockResolvedValue(null)
  requestMock.put.mockResolvedValue(null)
  requestMock.delete.mockResolvedValue({ deleted: 0 })
})

describe('updateUserProfile · 三字段部分更新', () => {
  it('仅昵称：载荷只含 nickname', async () => {
    await updateUserProfile({ nickname: '小明' })
    expect(requestMock.put).toHaveBeenCalledWith('/user/profile', { nickname: '小明' })
  })

  it('仅投资偏好：载荷只含 investment_preferences（不夹带其他字段）', async () => {
    await updateUserProfile({ investment_preferences: ['白酒', '半导体'] })
    expect(requestMock.put).toHaveBeenCalledWith('/user/profile', {
      investment_preferences: ['白酒', '半导体'],
    })
  })

  it('仅风险偏好：载荷只含 risk_tolerance', async () => {
    await updateUserProfile({ risk_tolerance: 'balanced' })
    expect(requestMock.put).toHaveBeenCalledWith('/user/profile', { risk_tolerance: 'balanced' })
  })

  it('三字段可一次提交', async () => {
    const payload = {
      nickname: '小明',
      investment_preferences: ['白酒'],
      risk_tolerance: 'aggressive' as const,
    }
    await updateUserProfile(payload)
    expect(requestMock.put).toHaveBeenCalledWith('/user/profile', payload)
  })

  it('类型：三字段均可选且类型正确', () => {
    type Payload = Parameters<typeof updateUserProfile>[0]
    expectTypeOf<Payload['nickname']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<Payload['investment_preferences']>().toEqualTypeOf<string[] | undefined>()
    expectTypeOf<Payload['risk_tolerance']>().toEqualTypeOf<RiskTolerance | undefined>()
  })
})

describe('风险偏好枚举', () => {
  it('枚举恰为 conservative / balanced / aggressive 三档', () => {
    expect(RISK_TOLERANCE_VALUES).toEqual(['conservative', 'balanced', 'aggressive'])
  })

  it('isRiskTolerance 只接受枚举内字符串', () => {
    for (const value of RISK_TOLERANCE_VALUES) {
      expect(isRiskTolerance(value)).toBe(true)
    }
    for (const value of ['high', 'Conservative', '', null, undefined, 1, {}]) {
      expect(isRiskTolerance(value)).toBe(false)
    }
  })
})

describe('推断画像接口（本轮只定义，Task 9 接 UI）', () => {
  it('getInferenceMeta 走 GET /user/profile/inferences/meta 并返回计数契约', async () => {
    requestMock.get.mockResolvedValue({
      count: 3,
      dimensions: ['preferred_sectors', 'question_topics', 'active_hours'],
      updated_at: '2026-11-05T00:30:00.000Z',
    })
    const meta = await getInferenceMeta()
    expect(requestMock.get).toHaveBeenCalledWith('/user/profile/inferences/meta')
    expect(meta).toEqual({
      count: 3,
      dimensions: ['preferred_sectors', 'question_topics', 'active_hours'],
      updated_at: '2026-11-05T00:30:00.000Z',
    })
    expectTypeOf(meta).toEqualTypeOf<{
      count: number
      dimensions: string[]
      updated_at: string | null
    }>()
  })

  it('getInferenceMeta 的 updated_at 允许为 null', () => {
    expectTypeOf<Awaited<ReturnType<typeof getInferenceMeta>>['updated_at']>().toEqualTypeOf<
      string | null
    >()
  })

  it('clearInferences 走 DELETE /user/profile/inferences 并返回删除行数', async () => {
    requestMock.delete.mockResolvedValue({ deleted: 5 })
    const result = await clearInferences()
    expect(requestMock.delete).toHaveBeenCalledWith('/user/profile/inferences')
    expect(result).toEqual({ deleted: 5 })
    expectTypeOf(result).toEqualTypeOf<{ deleted: number }>()
  })
})
