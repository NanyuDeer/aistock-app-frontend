/**
 * 全局常量
 */

/**
 * 判断 env 提供的地址能否作为真机/打包 App 的外部请求地址：
 * - 必须是绝对地址（http/https/ws/wss），相对路径（如 dev 注入的 /api）在 App 端无效；
 * - 且不能是回环地址（localhost/127.x），真机调试时指向本机无法访问。
 * 归因：`env/.env.development` 恒提供 `VITE_API_BASE_URL=/api`（truthy），
 * 会覆盖 `|| 线上兜底`，导致 App 用 `http` 之外的 scheme 请求（request:fail
 * Expected URL scheme 'http' or 'https'）。此判定让 App 只接受真正可用的绝对地址。
 */
function isExternalUrl(value: string | undefined): value is string {
  if (!value) return false
  if (!/^(https?|wss?):\/\//i.test(value)) return false
  const host = value.replace(/^[a-z]+:\/\//i, '').split('/')[0]
  return !/^(localhost|127\.)/i.test(host)
}

function completeApiBase(): string {
  // #ifdef APP-PLUS
  return isExternalUrl(import.meta.env.VITE_API_BASE_URL)
    ? (import.meta.env.VITE_API_BASE_URL as string)
    : 'https://gupiao-api.yaozhineng.com/api'
  // #endif
  // #ifndef APP-PLUS
  return import.meta.env.VITE_API_BASE_URL || '/api'
  // #endif
}

function completeWsBase(): string {
  // #ifdef APP-PLUS
  return isExternalUrl(import.meta.env.VITE_WS_BASE_URL)
    ? (import.meta.env.VITE_WS_BASE_URL as string)
    : 'wss://gupiao-api.yaozhineng.com/ws'
  // #endif
  // #ifndef APP-PLUS
  return import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:3000/ws'
  // #endif
}

function completeAgentWsBase(): string {
  // #ifdef APP-PLUS
  return isExternalUrl(import.meta.env.VITE_AGENT_WS_BASE)
    ? (import.meta.env.VITE_AGENT_WS_BASE as string)
    : 'wss://gupiao-api.yaozhineng.com/api/agent/ws'
  // #endif
  // #ifndef APP-PLUS
  return import.meta.env.VITE_AGENT_WS_BASE || 'ws://localhost:8080/api/agent/ws'
  // #endif
}

// API 基础地址：H5/小程序走同源或 dev server 代理，用相对路径 /api；
// App 端必须使用完整 URL——env 缺失或为相对/回环地址时兜底线上地址，避免全部接口请求失败
export const API_BASE_URL = completeApiBase()

// WebSocket 地址（Node.js 服务）
export const WS_BASE_URL = completeWsBase()

// Agent Python 后端 WebSocket 地址（后端路由前缀 /api/agent + /ws/chat）
// 端口走 env 分层：本地开发默认 8000（env/.env.development 注入），
// 生产由 env/.env.production 注入 wss://gupiao-api.yaozhineng.com/api/agent/ws
export const AGENT_WS_BASE_URL = completeAgentWsBase()

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
