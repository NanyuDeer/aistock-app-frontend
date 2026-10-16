/**
 * 恐贪指数温度分档 —— 单一事实源（single source of truth）。
 *
 * 首页「恐贪胶囊」（shared/components/FearGreedIndex.vue）与「恐贪指数」模块页
 * （modules/fear-greed/pages/index.vue）共用本文件的颜色 / 边界 / 标签，避免两处各
 * 自硬编码导致配色漂移。
 *
 * 颜色为恐贪指数固定标准色（非设计 token），故在此常量定义：
 * 冰点=绿、寒冷=深绿、常温=黄、温热=红、沸点=红（极值档）。
 */

/** 温度档位元信息（颜色 / 边界 / 标签） */
export interface FearGreedZoneMeta {
  /** 区间下界（含） */
  min: number
  /** 区间上界（不含；最后一档为闭区间上界） */
  max: number
  /** 生活化主标签（沸点 / 冰点） */
  label: string
  /** 通俗副标签 */
  subLabel: string
  /** 主色（数值文字色 / 色点 / 箭头） */
  color: string
  /** 渐变起始色（深） */
  start: string
  /** 渐变结束色（浅） */
  end: string
  /** 呼吸灯颜色（rgba） */
  pulseColor: string
  /** 是否极端档（冰点 / 沸点），触发呼吸灯 */
  isExtreme: boolean
}

/** 温度分档（升序；判定为左闭右开） */
export const FEAR_GREED_ZONES: FearGreedZoneMeta[] = [
  {
    min: 0, max: 20, label: '冰点', subLabel: '极度恐惧', color: '#00C853',
    start: '#00C853', end: '#5AFF8F', pulseColor: 'rgba(0, 200, 83, 0.5)', isExtreme: true,
  },
  {
    min: 20, max: 45, label: '寒冷', subLabel: '恐惧', color: '#2E7D32',
    start: '#2E7D32', end: '#5BA363', pulseColor: 'rgba(46, 125, 50, 0)', isExtreme: false,
  },
  {
    min: 45, max: 55, label: '常温', subLabel: '中性', color: '#FFCC00',
    start: '#FFCC00', end: '#FFE066', pulseColor: 'rgba(255, 204, 0, 0)', isExtreme: false,
  },
  {
    min: 55, max: 80, label: '温热', subLabel: '贪婪', color: '#FF5252',
    start: '#FF5252', end: '#FF8080', pulseColor: 'rgba(255, 82, 82, 0)', isExtreme: false,
  },
  {
    min: 80, max: 100, label: '沸点', subLabel: '极度贪婪', color: '#FF3B30',
    start: '#FF3B30', end: '#FF6B60', pulseColor: 'rgba(255, 59, 48, 0.5)', isExtreme: true,
  },
]

/**
 * 取数值对应的温度档位（左闭右开 `v >= min && v < max`）。
 * 越界或异常输入兜底为最后一档（沸点）。
 */
export function fearGreedZoneOf(value: number): FearGreedZoneMeta {
  return (
    FEAR_GREED_ZONES.find((z) => value >= z.min && value < z.max)
    ?? FEAR_GREED_ZONES[FEAR_GREED_ZONES.length - 1]
  )
}
