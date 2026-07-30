/**
 * 早晚报结构化 API
 *
 * 改造说明：原双人对话播报已升级为结构化早晚报（方案四：分段式布局）。
 * - BriefingItem：单条结构化洞见（来源 + 利空利好 + 标题 + 结论 + 关联标签）
 * - BriefingSummary：早晚报汇总（音频入口 + 条目列表）
 *
 * 后端早晚报整合接口由王昌泽开发中，前端先用 morning/review 报告降级解析。
 * 后端就绪后，getBriefingSummary 直接对接 /agent/briefing/summary 即可。
 */
import request from '../request'

// ── 结构化类型定义 ──

/** 早晚报条目来源（对应各 Agent） */
export type BriefingSource =
  | 'morning' // 晨报Agent
  | 'event' // 事件传导
  | 'trend' // 趋势评分
  | 'hot_burst' // 机构调研
  | 'alert' // 异动公告
  | 'review' // 复盘Agent
  | 'wind_leader' // 风口龙头

/** 利空利好标记 */
export type Sentiment = 'bull' | 'bear' | 'mixed'

/** 关联标签类型 */
export type BriefingTagType = 'stock' | 'sector' | 'indicator'

/** 关联标签（标的/板块/指标） */
export interface BriefingTag {
  text: string
  type: BriefingTagType
}

/** 单条结构化早晚报条目 */
export interface BriefingItem {
  /** 唯一标识，用于 v-for key */
  id: string
  /** 来源类型 */
  source: BriefingSource
  /** 利空利好 */
  sentiment: Sentiment
  /** 标题（一句话结论） */
  title: string
  /** 核心结论（2-3 句研判） */
  conclusion: string
  /** 关联标的/板块标签 */
  relatedTags: BriefingTag[]
  /** 是否头条（第一条，隔夜美股/地缘影响） */
  isHeadline?: boolean
  /** 是否异动公告（最后一条，自选股异动） */
  isAlert?: boolean
}

/** 早晚报汇总数据 */
export interface BriefingSummary {
  /** 日期 YYYY-MM-DD */
  date: string
  /** 音频地址（来自 broadcast 报告） */
  audioUrl: string | null
  /** 结构化条目列表（3-5 条） */
  items: BriefingItem[]
}

// ── 标签映射常量 ──

/** 来源 → 中文标签 */
export const SOURCE_LABELS: Record<BriefingSource, string> = {
  morning: '晨报Agent',
  event: '事件传导',
  trend: '趋势评分',
  hot_burst: '机构调研',
  alert: '异动公告',
  review: '复盘Agent',
  wind_leader: '风口龙头',
}

/** 来源 → 方案四 insight-icon 字母 */
export const SOURCE_ICONS: Record<BriefingSource, string> = {
  morning: '晨',
  event: '事',
  trend: '势',
  hot_burst: '研',
  alert: '异',
  review: '复',
  wind_leader: '风',
}

/** 利空利好 → 中文标签 */
export const SENTIMENT_LABELS: Record<Sentiment, string> = {
  bull: '利好',
  bear: '利空',
  mixed: '短空中多',
}

// ── API 端点 ──

export const briefingApi = {
  /**
   * 获取结构化早晚报汇总
   *
   * 后端整合接口（/agent/briefing/summary）由王昌泽开发中。
   * 当前前端降级方案：在组件内分别获取 broadcast 音频 + morning/review 报告，
   * 用 splitReportToCards 解析后映射为 BriefingItem[]。
   *
   * 后端就绪后，此方法直接对接：
   *   return request.get<BriefingSummary>('/agent/briefing/summary', { params: { date } })
   */
  getBriefingSummary(date: string) {
    // TODO: 王昌泽后端早晚报整合完成后，切换为直接请求 /agent/briefing/summary
    return request.get<BriefingSummary>('/agent/briefing/summary', {
      params: { date },
    })
  },

  /** 获取今日晨报（旧接口，兼容保留） */
  getMorning() {
    return request.get('/agent/briefing/morning')
  },

  /** 获取今日晚报（旧接口，兼容保留） */
  getEvening() {
    return request.get('/agent/briefing/evening')
  },

  /** 生成音频 */
  generateAudio(type: 'morning' | 'evening') {
    return request.post('/agent/briefing/generate-audio', { type })
  },
}
