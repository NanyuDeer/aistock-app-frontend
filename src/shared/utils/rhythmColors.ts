/**
 * 节奏仓位档位色板/短码唯一副本（0 空 / 1 轻 / 2 半 / 3 重 / 4 满）。
 *
 * 2026-11-04 职责重定义：颜色语义从「情绪档位」改为「建议仓位」——
 * 色值**保持原五档不变**（本身即冷→暖渐变，与 0→4 档同向），只改语义与命名。
 * 上色唯一来源是后端 `position_index`；`level` 已废弃上屏，禁止回退用它取色。
 * 多模块引用本文件，禁止在组件内定义第二份副本（文档：rhythm/AGENTS.md）。
 */

/** 仓位档位色（索引 = position_index；色值与原五档一致，禁止重选颜色） */
export const RHYTHM_POSITION_COLORS = ['#8a6fae', '#2f9e9e', '#4d7cfe', '#f59e0b', '#ef4444'] as const

/** 仓位短码（空/轻/半/重/满） */
export const RHYTHM_POSITION_SHORT = ['空', '轻', '半', '重', '满'] as const

/** 仓位档位中文全称 */
export const RHYTHM_POSITION_LABEL = ['空仓', '轻仓', '半仓', '重仓', '满仓'] as const

/** 无仓位档位（position_index 缺失 / 旧数据 / 降级）→ 灰格 */
export const RHYTHM_GREY = '#eceef1'

export type RhythmPositionIndex = 0 | 1 | 2 | 3 | 4

/** 档位序号守卫：仅 0-4 整数为合法档位（未知/脏数据不视为合法，灰格回退的判据） */
export function isRhythmPositionIndex(v: number | null | undefined): v is RhythmPositionIndex {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < RHYTHM_POSITION_COLORS.length
}

/** 仓位档位色（缺失/越界 → 灰格）；所有上色点唯一入口 */
export function positionColor(index: number | null | undefined): string {
  return isRhythmPositionIndex(index) ? RHYTHM_POSITION_COLORS[index] : RHYTHM_GREY
}

/** 仓位短码（缺失/越界 → 空串，如实缺省不伪造）；所有短码读取点唯一入口 */
export function positionShort(index: number | null | undefined): string {
  return isRhythmPositionIndex(index) ? RHYTHM_POSITION_SHORT[index] : ''
}

/** 仓位档位中文全称（缺失/越界 → 空串，如实缺省不伪造） */
export function positionLabel(index: number | null | undefined): string {
  return isRhythmPositionIndex(index) ? RHYTHM_POSITION_LABEL[index] : ''
}
