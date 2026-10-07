/**
 * sectorPredictionToStructured —— horizon 口径说明（metric_projection → metricProjection）映射。
 *
 * 2026-10-06 Task 10：方案 B 字段驱动 —— 后端透传 `metric_projection`（LLM 生成），
 * 前端只做透传映射，缺失/无值即 `undefined`（ConditionalForecastBlock 的 v-if 不渲染，
 * 不在此拼装或编造口径文案）。
 *
 * 采用 vitest 风格（`import ... from 'vitest'`）并注册进 vitest.config.ts 白名单，
 * 以被 `npx vitest run` 采集（见该配置 include 注释）。
 */
import { describe, expect, it } from 'vitest'
import { sectorPredictionToStructured } from './sectorInsight'
import type { SectorInsightPrediction } from '@/shared/api/modules/agent'

describe('sectorPredictionToStructured · horizon metric_projection', () => {
  it('透传 metric_projection 为 metricProjection', () => {
    const prediction: SectorInsightPrediction = {
      present: true,
      horizons: [
        { horizon: 'short', direction: 'bullish', metric_projection: '到期窗口累计同向即命中' },
      ],
    }
    const out = sectorPredictionToStructured(prediction)
    expect(out?.horizons?.[0]?.metricProjection).toBe('到期窗口累计同向即命中')
  })

  it('缺失 metric_projection → metricProjection 为 undefined（字段驱动不渲染）', () => {
    const prediction: SectorInsightPrediction = {
      present: true,
      horizons: [{ horizon: 'mid', direction: 'neutral' }],
    }
    const out = sectorPredictionToStructured(prediction)
    expect(out?.horizons?.[0]?.metricProjection).toBeUndefined()
  })
})
