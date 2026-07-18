/**
 * icons-lxy 图标清单
 * 每次新增图标时,在这里添加图标名称
 * 
 * 分类说明:
 * - quote: 行情类
 * - action: 功能类
 * - alert: 提醒类
 * - nav: 导航类
 * - analysis: 分析类
 */

export interface IconItem {
  name: string
  category: 'quote' | 'action' | 'alert' | 'nav' | 'analysis'
  label: string
}

export const iconsLxyList: IconItem[] = [
  // 行情类
  { name: 'quote-up', category: 'quote', label: '上涨' },
  { name: 'quote-down', category: 'quote', label: '下跌' },
  { name: 'quote-kline', category: 'quote', label: 'K线' },
  { name: 'quote-volume', category: 'quote', label: '成交量' },

  // 功能类
  { name: 'action-search', category: 'action', label: '搜索' },
  { name: 'action-filter', category: 'action', label: '筛选' },
  { name: 'action-star', category: 'action', label: '收藏' },
  { name: 'action-share', category: 'action', label: '分享' },
  { name: 'action-refresh', category: 'action', label: '刷新' },

  // 提醒类
  { name: 'alert-warming', category: 'alert', label: '预警' },
  { name: 'alert-flash', category: 'alert', label: '异动' },
  { name: 'alert-push', category: 'alert', label: '推送' },
  { name: 'alert-notice', category: 'alert', label: '通知' },

  // 导航类
  { name: 'nav-home', category: 'nav', label: '首页' },
  { name: 'nav-quote', category: 'nav', label: '行情' },
  { name: 'nav-user', category: 'nav', label: '我的' },

  // 分析类
  { name: 'analysis-briefing', category: 'analysis', label: '晨报' },
  { name: 'analysis-earnings', category: 'analysis', label: '业绩' },
  { name: 'analysis-event', category: 'analysis', label: '事件' },
  { name: 'analysis-valuation', category: 'analysis', label: '估值' },
]

export const categoryLabels: Record<string, string> = {
  all: '全部',
  quote: '行情类',
  action: '功能类',
  alert: '提醒类',
  nav: '导航类',
  analysis: '分析类',
}

export const colorPresets = [
  { name: '默认灰', value: '#9ca3af' },
  { name: '主题蓝', value: '#4d7cfe' },
  { name: '上涨红', value: '#f43f5e' },
  { name: '下跌绿', value: '#22c55e' },
  { name: '深灰', value: '#374151' },
  { name: '白色', value: '#ffffff' },
]
