/**
 * 全局常量
 */

// API 基础地址：H5/小程序走同源或 dev server 代理，用相对路径 /api；
// App 端必须使用完整 URL——env 缺失时兜底线上地址，避免打包 App 全部接口请求失败
export const API_BASE_URL = (() => {
  // #ifdef APP-PLUS
  return import.meta.env.VITE_API_BASE_URL || 'https://gupiao-api.yaozhineng.com/api'
  // #endif
  // #ifndef APP-PLUS
  return import.meta.env.VITE_API_BASE_URL || '/api'
  // #endif
})()

// WebSocket 地址（Node.js 服务）
export const WS_BASE_URL = (() => {
  // #ifdef APP-PLUS
  return import.meta.env.VITE_WS_BASE_URL || 'wss://gupiao-api.yaozhineng.com/ws'
  // #endif
  // #ifndef APP-PLUS
  return import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:3000/ws'
  // #endif
})()

// Agent Python 后端 WebSocket 地址（后端路由前缀 /api/agent + /ws/chat）
// 端口走 env 分层：本地开发默认 8000（env/.env.development 注入），
// 生产由 env/.env.production 注入 wss://gupiao-api.yaozhineng.com/api/agent/ws；
// 此处 fallback 仅在 env 缺失时兜底：App 端兜底线上，其余平台对齐本地开发约定
export const AGENT_WS_BASE_URL = (() => {
  // #ifdef APP-PLUS
  return import.meta.env.VITE_AGENT_WS_BASE || 'wss://gupiao-api.yaozhineng.com/api/agent/ws'
  // #endif
  // #ifndef APP-PLUS
  return import.meta.env.VITE_AGENT_WS_BASE || 'ws://localhost:8000/api/agent/ws'
  // #endif
})()

// 平台标识
export const PLATFORM = {
  H5: 'h5',
  APP: 'app-plus',
  MP_WEIXIN: 'mp-weixin'
} as const

// App 安装包下载资源地址（Web 前端 public/download/ 托管的静态文件，非 API 域）
// 仅 Android App 端应用内更新使用；env 缺失时兜底线上 Web 地址
export const DOWNLOAD_BASE_URL =
  (import.meta.env.VITE_DOWNLOAD_BASE_URL as string) || 'https://gupiao.yaozhineng.com/download'

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
