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

export const RHYTHM_LEVEL_SHORT: Record<RhythmLevelKey, string> = {
  ice: '冰', low: '低', normal: '常', active: '活', euphoria: '亢',
}

/** 档位中文全名（与 rhythm 模块 rhythmInsight 的 LEVEL_LABEL 同口径：冰点/低迷/常温/活跃/亢奋） */
export const RHYTHM_LEVEL_LABEL: Record<RhythmLevelKey, string> = {
  ice: '冰点', low: '低迷', normal: '常温', active: '活跃', euphoria: '亢奋',
}

/** 无档位（灰格/行缺失/沿用前值） */
export const RHYTHM_GREY = '#eceef1'

export type RhythmLevelKey = keyof typeof RHYTHM_LEVEL_COLORS
export const RHYTHM_LEVEL_KEYS: RhythmLevelKey[] = Object.keys(RHYTHM_LEVEL_COLORS) as RhythmLevelKey[]

/** 档位键守卫：未知档位（后端新增第六档 / 脏数据）不视为合法键（色板/短码唯一副本的漂移防护） */
export function isRhythmLevelKey(v: string | null | undefined): v is RhythmLevelKey {
  // 用 hasOwnProperty 而非 `in`：`in` 会走原型链（`'toString' in RHYTHM_LEVEL_COLORS === true`），与"仅五档键为真"的契约不符
  return !!v && Object.prototype.hasOwnProperty.call(RHYTHM_LEVEL_COLORS, v)
}

/** 档位短码（未知档位如实回退首字母，不伪造）——所有读取点唯一入口 */
export function levelShort(level: string | null | undefined): string {
  return isRhythmLevelKey(level) ? RHYTHM_LEVEL_SHORT[level] : (level ?? '').slice(0, 1)
}

/** 档位中文全名（未知档位如实回退短码，不伪造） */
export function levelLabel(level: string | null | undefined): string {
  return isRhythmLevelKey(level) ? RHYTHM_LEVEL_LABEL[level] : levelShort(level)
}
