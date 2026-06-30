/**
 * 双人对话播报 API
 */
import request from '../request'

export interface BriefingSegment {
  host: 'A' | 'B'
  text: string
  audioUrl?: string
}

export interface BriefingData {
  date: string
  title: string
  audioUrl?: string
  segments: BriefingSegment[]
  events: any[]
  sectors: any[]
}

export const briefingApi = {
  /** 获取今日晨报 */
  getMorning() {
    return request.get<BriefingData>('/agent/briefing/morning')
  },

  /** 获取今日晚报 */
  getEvening() {
    return request.get<BriefingData>('/agent/briefing/evening')
  },

  /** 生成双人对话音频 */
  generateAudio(type: 'morning' | 'evening') {
    return request.post('/agent/briefing/generate-audio', { type })
  }
}
