/**
 * 全局常量
 */

// API 基础地址
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

// WebSocket 地址（Node.js 服务）
export const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:3000/ws'

// Agent Python 后端 WebSocket 地址
export const AGENT_WS_BASE_URL = import.meta.env.VITE_AGENT_WS_BASE || 'ws://localhost:8000/ws'

// 平台标识
export const PLATFORM = {
  H5: 'h5',
  APP: 'app-plus',
  MP_WEIXIN: 'mp-weixin'
} as const

// 股票市场标识
export const MARKET = {
  SH: 'sh',
  SZ: 'sz',
  BJ: 'bj'
} as const

// 涨跌色（A 股：红涨绿跌）
export const STOCK_COLOR = {
  UP: '#FF3B30',
  DOWN: '#34C759',
  FLAT: '#999999'
} as const

// 事件重要性等级
export const EVENT_LEVEL = {
  LEVEL_5: { label: '★★★★★', color: '#FF3B30', desc: '极端重大' },
  LEVEL_4: { label: '★★★★', color: '#FF9500', desc: '重大' },
  LEVEL_3: { label: '★★★', color: '#FFCC00', desc: '较大' },
  LEVEL_2: { label: '★★', color: '#34C759', desc: '一般' },
  LEVEL_1: { label: '★', color: '#999999', desc: '轻微' }
} as const
