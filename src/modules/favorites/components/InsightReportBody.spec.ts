/**
 * InsightReportBody 挂载测试：六阶段因果链纵向时间轴 + 各 block 类型渲染 + 空节兜底。
 *
 * 时间轴要点（本次改造目标）：阶段按因果顺序竖排、序号 1..N、
 * `statusKey !== 'established'` 走中性弱化（`.is-weak`）而非告警色。
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import InsightReportBody from './InsightReportBody.vue'
import type { ReportChainStage, ReportSection } from '@/modules/favorites/utils/useInsightReportSSE'

function stage(over: Partial<ReportChainStage> = {}): ReportChainStage {
  return {
    stage: '结构根因',
    stageKey: 'structural_root',
    claim: '筹码由主力向散户转移',
    epistemic: '假设',
    epistemicKey: 'hypothesis',
    status: '未确立',
    statusKey: 'not_established',
    evidenceIds: [],
    evidenceCount: 0,
    ...over,
  }
}

const CHAIN_SECTION: ReportSection = {
  heading: '六阶段因果链',
  blocks: [{
    type: 'chain',
    stages: [
      stage(),
      stage({ stage: '触发', stageKey: 'trigger', claim: '拉升 7.69%，触发阈值',
        epistemic: '事实', epistemicKey: 'fact', status: '已确立',
        statusKey: 'established', evidenceIds: ['e1', 'e2'], evidenceCount: 2 }),
      stage({ stage: '传导', stageKey: 'transmission', claim: '板块同步走强',
        status: '部分确立', statusKey: 'partial', epistemic: '推断', epistemicKey: 'inference',
        evidenceIds: ['e1'], evidenceCount: 1 }),
    ],
  }],
}

function mountBody(sections: ReportSection[], header = '金富科技（003018） · 2026-09-04') {
  return mount(InsightReportBody, { props: { header, sections } })
}

describe('InsightReportBody 六阶段因果链（纵向时间轴）', () => {
  it('阶段按因果顺序竖排，序号 1..N 顺序正确', () => {
    const wrapper = mountBody([CHAIN_SECTION])
    const nodes = wrapper.findAll('.chain-node')
    expect(nodes).toHaveLength(3)
    expect(nodes.map((n) => n.find('.chain-stage').text()))
      .toEqual(['结构根因', '触发', '传导'])
    expect(nodes.map((n) => n.find('.chain-dot-text').text())).toEqual(['1', '2', '3'])
  })

  it('节点渲染结论正文 + 认知/状态徽标 + 证据条数', () => {
    const wrapper = mountBody([CHAIN_SECTION])
    const second = wrapper.findAll('.chain-node')[1]
    expect(second.find('.chain-claim').text()).toBe('拉升 7.69%，触发阈值')
    expect(second.findAll('.chain-badge').map((b) => b.text())).toEqual(['事实', '已确立'])
    expect(second.find('.chain-evidence').text()).toBe('2 条证据')
  })

  it('未确立/部分确立走中性弱化（is-weak），已确立不弱化', () => {
    const wrapper = mountBody([CHAIN_SECTION])
    const nodes = wrapper.findAll('.chain-node')
    // 结构根因(not_established) / 传导(partial) 弱化；触发(established) 不弱化
    expect(nodes[0].classes()).toContain('is-weak')
    expect(nodes[1].classes()).not.toContain('is-weak')
    expect(nodes[2].classes()).toContain('is-weak')
  })

  it('末节点不画连接线（避免尾部悬空竖线）', () => {
    const wrapper = mountBody([CHAIN_SECTION])
    const nodes = wrapper.findAll('.chain-node')
    expect(nodes[0].find('.chain-line').exists()).toBe(true)
    expect(nodes[2].find('.chain-line').exists()).toBe(false)
  })

  it('只渲染传进来的主链（备选链由后端剔除，前端不做分支渲染）', () => {
    const wrapper = mountBody([CHAIN_SECTION])
    expect(wrapper.text()).not.toContain('备选')
  })
})

describe('InsightReportBody 其他 block 与兜底', () => {
  it('空 blocks → 显示「暂缺」', () => {
    const wrapper = mountBody([{ heading: '证据清单', blocks: [] }])
    expect(wrapper.find('.report-empty').text()).toBe('暂缺')
    expect(wrapper.find('.report-heading').text()).toBe('证据清单')
  })

  it('kv block 渲染两列并保留涨跌 tone 类', () => {
    const wrapper = mountBody([{
      heading: '事件事实',
      blocks: [{
        type: 'kv',
        items: [
          { label: '方向', value: '上涨', tone: 'up' },
          { label: '严重度', value: '中' },
        ],
      }],
    }])
    const rows = wrapper.findAll('.kv-row')
    expect(rows.map((r) => r.find('.kv-label').text())).toEqual(['方向', '严重度'])
    expect(rows[0].find('.kv-value').classes()).toContain('is-up')
    expect(rows[1].find('.kv-value').classes()).not.toContain('is-up')
  })

  it('渲染多章节（流式逐节追加时的常态）', () => {
    const wrapper = mountBody([
      { heading: '事件事实', blocks: [{ type: 'list', items: ['a'] }] },
      CHAIN_SECTION,
    ])
    expect(wrapper.findAll('.report-section')).toHaveLength(2)
    expect(wrapper.findAll('.report-heading').map((h) => h.text()))
      .toEqual(['事件事实', '六阶段因果链'])
  })
})

describe('InsightReportBody 主因结论 / 分层候选 / 证据清单 / 未解问题', () => {
  it('verdict：主因正文单独成行 + 徽标行', () => {
    const wrapper = mountBody([{
      heading: '主因结论',
      blocks: [{
        type: 'verdict',
        text: '缺乏公司层面证据',
        badges: [
          { label: '置信度', value: '低' },
          { label: '归类标签', value: '公司层面' },
          { label: '归因生成时间', value: '2026-09-24 13:46' },
        ],
      }],
    }])
    expect(wrapper.find('.verdict-text').text()).toBe('缺乏公司层面证据')
    expect(wrapper.findAll('.verdict-block .badge').map((b) => b.text()))
      .toEqual(['置信度 低', '归类标签 公司层面', '归因生成时间 2026-09-24 13:46'])
  })

  it('candidates：层级/状态徽标 + 正文 + 证据胶囊', () => {
    const wrapper = mountBody([{
      heading: '分层候选归因',
      blocks: [{
        type: 'candidates',
        items: [
          { layer: '资金层面', status: '佐证偏弱', statusKey: 'weak',
            verdict: '主力与散户方向分化', evidenceIds: ['capital:002342:2026-09-23'] },
          { layer: '公司层面', status: '证据不足', statusKey: 'insufficient',
            verdict: '无公司公告类证据', evidenceIds: [] },
        ],
      }],
    }])
    const cards = wrapper.findAll('.cand-card')
    expect(cards).toHaveLength(2)
    expect(cards[0].findAll('.badge').map((b) => b.text())).toEqual(['资金层面', '佐证偏弱'])
    expect(cards[0].find('.cand-verdict').text()).toBe('主力与散户方向分化')
    expect(cards[0].findAll('.cand-evidence').map((e) => e.text()))
      .toEqual(['证据 capital:002342:2026-09-23'])
    // 无证据的候选不渲染空胶囊行
    expect(cards[1].find('.cand-evidence-row').exists()).toBe(false)
  })

  it('candidates：非 supported 状态走中性弱化（不靠中文字符串匹配）', () => {
    const wrapper = mountBody([{
      heading: '分层候选归因',
      blocks: [{
        type: 'candidates',
        items: [
          { layer: '板块层面', status: '已佐证', statusKey: 'supported', verdict: 'a', evidenceIds: [] },
          { layer: '资金层面', status: '佐证偏弱', statusKey: 'weak', verdict: 'b', evidenceIds: [] },
          { layer: '公司层面', status: '证据不足', statusKey: 'insufficient', verdict: 'c', evidenceIds: [] },
        ],
      }],
    }])
    const cards = wrapper.findAll('.cand-card')
    expect(cards[0].classes()).not.toContain('is-weak')
    expect(cards[1].classes()).toContain('is-weak')
    expect(cards[2].classes()).toContain('is-weak')
  })

  it('evidence：来源/等级/元信息/标题/摘要', () => {
    const wrapper = mountBody([{
      heading: '证据清单',
      blocks: [{
        type: 'evidence',
        items: [{
          sourceId: 'capital:002342:2026-09-23', provider: 'Tushare 资金流', kind: '资金事实',
          occurredAt: '2026-09-23 15:00', level: 'B', title: '资金流向 002342', excerpt: '主力净流入 -0.18 亿',
        }],
      }],
    }])
    const card = wrapper.find('.ev-card')
    expect(card.find('.ev-id').text()).toBe('capital:002342:2026-09-23')
    expect(card.find('.ev-head .badge').text()).toBe('B')
    expect(card.find('.ev-meta').text()).toBe('Tushare 资金流｜资金事实｜2026-09-23 15:00')
    expect(card.find('.ev-title').text()).toBe('资金流向 002342')
    expect(card.find('.ev-excerpt').text()).toBe('主力净流入 -0.18 亿')
  })

  it('list：序号圆标 + 条目文本', () => {
    const wrapper = mountBody([{
      heading: '未解问题',
      blocks: [{ type: 'list', items: ['公司层面是否有未披露公告？', '题材催化是否持续？'] }],
    }])
    const rows = wrapper.findAll('.list-row')
    expect(rows).toHaveLength(2)
    expect(rows.map((r) => r.find('.list-index-text').text())).toEqual(['1', '2'])
    expect(rows[0].find('.list-text').text()).toBe('公司层面是否有未披露公告？')
    // 样式层校验：序号是圆标（与报告章节标题同级但独立于正文）
    expect(wrapper.find('.list-index').exists()).toBe(true)
  })
})
