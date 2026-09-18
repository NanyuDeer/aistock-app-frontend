/**
 * 仓位文案显示格式化（单点，spec §5.8）。
 *
 * 后端 `position_band.text` 带「建议仓位：」前缀，历史报告可能是无前缀旧版文案；
 * 前端 4 个消费点（洞见卡标题 / 日历格 / 首页节奏条 / 主档位块门控）曾各自处理
 * （仅 1/4 剥离前缀 → 同屏两种格式，违 H12）。所有消费点必须走本函数。
 */
export function formatBandText(text: string | null | undefined): string {
  return String(text ?? '').trim().replace(/^建议仓位[：:]*\s*/, '')
}
