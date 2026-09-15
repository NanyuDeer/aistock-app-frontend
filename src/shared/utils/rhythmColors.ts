/**
 * 节奏大师档位色板/短码唯一副本（ice 紫灰 / low 青 / normal 主蓝 / active 橙 / euphoria 红）。
 * 多模块引用本文件，禁止在组件内定义第二份副本（文档：rhythm/AGENTS.md）。
 */
export const RHYTHM_LEVEL_COLORS = {
  ice: '#8a6fae',
  low: '#2f9e9e',
  normal: '#4d7cfe',
  active: '#f59e0b',
  euphoria: '#ef4444',
} as const

export const RHYTHM_LEVEL_SHORT: Record<string, string> = {
  ice: '冰', low: '低', normal: '常', active: '活', euphoria: '亢',
}

/** 无档位（灰格/行缺失/沿用前值） */
export const RHYTHM_GREY = '#eceef1'

export type RhythmLevelKey = keyof typeof RHYTHM_LEVEL_COLORS
export const RHYTHM_LEVEL_KEYS: RhythmLevelKey[] = Object.keys(RHYTHM_LEVEL_COLORS) as RhythmLevelKey[]
