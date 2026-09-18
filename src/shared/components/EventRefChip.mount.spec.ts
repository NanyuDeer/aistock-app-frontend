/**
 * 链树事件胶囊（EventRefChip + 两处接入）挂载护栏（vitest + happy-dom）。
 *
 * 覆盖 spec §3.2-4 / §7.1-7.3（2026-09-17 P3' Task 4.2）：
 * - 胶囊：headline + 来源标记（warehouse=中台 / search=检索，文案不同）；ref 为 http(s) URL 可点（emit select），
 *   非 URL（`event:<id>` / `search:<query>|<title>`）不可点（不伪造跳转）；
 * - InsightCard 溯源子卡：traceStructured.events 为空/缺省 → 该区不渲染；有值 → 条数一致；
 * - AttributionChainView：每个板块分支下渲染其 props.chain 的 events（缺省/空数组不渲染该区）。
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('@/shared/api/modules/attributionChain', () => ({
  fetchAttributionChain: vi.fn(async () => null),
}))

import EventRefChip from './EventRefChip.vue'
import InsightCard from './InsightCard.vue'
import AttributionChainView from './AttributionChainView.vue'

const CHIP = '.as-event-chip'

describe('EventRefChip 事件胶囊', () => {
  it('来源标记文案区分：warehouse=中台 / search=检索', () => {
    const wh = mount(EventRefChip, { props: { headline: 'A', source: 'warehouse', eventRef: 'https://e.com/a' } })
    const se = mount(EventRefChip, { props: { headline: 'B', source: 'search', eventRef: 'search:q|B' } })

    expect(wh.find('.as-event-chip__src').text()).toBe('中台')
    expect(se.find('.as-event-chip__src').text()).toBe('检索')
    expect(wh.find('.as-event-chip__src').text()).not.toBe(se.find('.as-event-chip__src').text())
  })

  it('ref 为 http(s) URL → 点击 emit select（带 URL）', async () => {
    const wrapper = mount(EventRefChip, {
      props: { headline: 'A', source: 'warehouse', eventRef: 'https://e.com/a' },
    })
    await wrapper.find(CHIP).trigger('tap')

    expect(wrapper.emitted('select')?.[0]).toEqual(['https://e.com/a'])
  })

  it('ref 非 URL（event:<id> / search:<q>|<title> / 空）→ 不可点，不 emit', async () => {
    for (const eventRef of ['event:123', 'search:半导体材料|标题', '']) {
      const wrapper = mount(EventRefChip, { props: { headline: 'A', source: 'search', eventRef } })
      await wrapper.find(CHIP).trigger('tap')

      expect(wrapper.emitted('select')).toBeUndefined()
    }
  })
})

describe('InsightCard 溯源子卡事件胶囊', () => {
  const trace = (events?: Array<{ headline: string; ref?: string; source?: 'warehouse' | 'search' }>) => ({
    summary: '大盘一句话',
    index_pct: -1.2,
    badge: '自驱动',
    detail: '驱动一句话',
    ...(events === undefined ? {} : { events }),
  })

  it('events 缺省 / 空数组 → 不渲染事件区', () => {
    for (const events of [undefined, []]) {
      const wrapper = mount(InsightCard, { props: { title: 't', traceStructured: trace(events) } })
      expect(wrapper.find('.as-insight-card__events').exists()).toBe(false)
      expect(wrapper.findAll(CHIP)).toHaveLength(0)
    }
  })

  it('events 有值 → 渲染对应条数（顺序与数据一致）', () => {
    const wrapper = mount(InsightCard, {
      props: {
        title: 't',
        traceStructured: trace([
          { headline: '限制落地', ref: 'https://e.com/a', source: 'warehouse' },
          { headline: '检索命中', ref: 'search:q|检索命中', source: 'search' },
        ]),
      },
    })

    expect(wrapper.findAll(CHIP)).toHaveLength(2)
    expect(wrapper.findAll('.as-event-chip__tx').map((n) => n.text())).toEqual(['限制落地', '检索命中'])
  })

  it('胶囊点击 → 卡片 emit eventSelect（透出事件对象）', async () => {
    const wrapper = mount(InsightCard, {
      props: { title: 't', traceStructured: trace([{ headline: '限制落地', ref: 'https://e.com/a', source: 'warehouse' }]) },
    })
    await wrapper.find(CHIP).trigger('tap')

    expect(wrapper.emitted('eventSelect')?.[0]?.[0]).toMatchObject({ ref: 'https://e.com/a', headline: '限制落地' })
  })
})

describe('AttributionChainView 板块分支事件胶囊', () => {
  const chainOf = (
    events?: Array<{ event_id: string | null; ref: string; headline: string; source: 'warehouse' | 'search' }>,
  ) => ({
    date: '2026-09-16',
    root: { type: 'market' as const, date: '2026-09-16', summary: '大盘一句话', index_pct: -1.2 },
    children: [
      {
        sector: '半导体材料',
        relation: 'self_driven' as const,
        pct: -3,
        trace_summary: '驱动一句话',
        ...(events === undefined ? {} : { events }),
      },
    ],
  })

  it('child.events 缺省 / 空数组 → 不渲染事件区', () => {
    for (const events of [undefined, []]) {
      const wrapper = mount(AttributionChainView, { props: { date: '2026-09-16', chain: chainOf(events) } })
      expect(wrapper.find('.acv-events').exists()).toBe(false)
      expect(wrapper.findAll(CHIP)).toHaveLength(0)
    }
  })

  it('child.events 有值 → 渲染对应条数（中台/检索标记）', () => {
    const wrapper = mount(AttributionChainView, {
      props: {
        date: '2026-09-16',
        chain: chainOf([
          { event_id: 'e1', ref: 'https://e.com/a', headline: '限制落地', source: 'warehouse' },
          { event_id: null, ref: 'search:q|检索命中', headline: '检索命中', source: 'search' },
        ]),
      },
    })

    expect(wrapper.findAll(CHIP)).toHaveLength(2)
    expect(wrapper.findAll('.as-event-chip__src').map((n) => n.text())).toEqual(['中台', '检索'])
  })
})

describe('AttributionChainView 板块行弱依据标记（R16，2026-09-17）', () => {
  const chainWith = (extraction?: { source?: string; weak?: boolean }) => ({
    date: '2026-09-16',
    root: { type: 'market' as const, date: '2026-09-16', summary: '证据不足，未确认主因', index_pct: -0.411 },
    children: [
      {
        sector: '黄金概念',
        relation: 'self_driven' as const,
        pct: -1.87,
        trace_summary: '避险资金流出',
        ...(extraction === undefined ? {} : { extraction }),
      },
    ],
  })

  it('extraction 缺省 / weak 非 true → 不渲染弱标记（老数据与正常日零变化）', () => {
    for (const ex of [undefined, { source: 'snapshot' }, { source: 'candidate_claim', weak: false }]) {
      const wrapper = mount(AttributionChainView, { props: { date: '2026-09-16', chain: chainWith(ex) } })
      expect(wrapper.find('.acv-weak').exists()).toBe(false)
    }
  })

  it('extraction.weak=true → 中性灰标记文案按 source 分流（snapshot=无归因依据 / candidate_claim=依据较弱）', () => {
    const snapshot = mount(AttributionChainView, {
      props: { date: '2026-09-16', chain: chainWith({ source: 'snapshot', weak: true }) },
    })
    expect(snapshot.find('.acv-weak').text()).toBe('无归因依据')

    const claim = mount(AttributionChainView, {
      props: { date: '2026-09-16', chain: chainWith({ source: 'candidate_claim', weak: true }) },
    })
    expect(claim.find('.acv-weak').text()).toBe('依据较弱')
  })
})
