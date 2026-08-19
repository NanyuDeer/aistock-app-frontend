import { describe, it, expect } from 'vitest'
import { buildFavoritesQuestion, buildStockQuestion } from './chatSuggestions'
import type { FavoriteStock } from '@/shared/store/modules/favorites'

function fav(name: string): FavoriteStock {
  return { symbol: 'dummy', name }
}

describe('buildFavoritesQuestion', () => {
  it('空列表回退提示', () => {
    expect(buildFavoritesQuestion([])).toBe('我的自选股还是空的')
  })

  it('≤5 只：拼接名称（、分隔）', () => {
    const list = [fav('贵州茅台'), fav('宁德时代'), fav('平安银行')]
    expect(buildFavoritesQuestion(list)).toBe('我的自选股里 贵州茅台、宁德时代、平安银行 怎么样')
  })

  it('单只股票同样拼接', () => {
    expect(buildFavoritesQuestion([fav('贵州茅台')])).toBe('我的自选股里 贵州茅台 怎么样')
  })

  it('恰好 5 只：不追加截断提示', () => {
    const list = ['A', 'B', 'C', 'D', 'E'].map(fav)
    expect(buildFavoritesQuestion(list)).toBe('我的自选股里 A、B、C、D、E 怎么样')
  })

  it('>5 只：截断为前 5 并追加提示', () => {
    const list = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(fav)
    expect(buildFavoritesQuestion(list)).toBe('我的自选股里 A、B、C、D、E 怎么样（仅展示前 5 只）')
  })

  it('跳过空名称条目', () => {
    const list = [fav('贵州茅台'), fav(''), fav('宁德时代')]
    expect(buildFavoritesQuestion(list)).toBe('我的自选股里 贵州茅台、宁德时代 怎么样')
  })

  it('全为空名称视为空列表', () => {
    expect(buildFavoritesQuestion([fav('')])).toBe('我的自选股还是空的')
  })
})

describe('buildStockQuestion', () => {
  it('正常名称生成问句', () => {
    expect(buildStockQuestion('贵州茅台')).toBe('贵州茅台现在怎么样')
  })

  it('空名称回退通用问句', () => {
    expect(buildStockQuestion('')).toBe('这只股票现在怎么样')
    expect(buildStockQuestion('   ')).toBe('这只股票现在怎么样')
  })
})
