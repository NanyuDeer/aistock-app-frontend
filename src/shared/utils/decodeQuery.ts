/**
 * 页面 query 参数容错解码。
 *
 * 背景：uni-app 各端 onLoad 的 options 行为不一致——H5 由 uni 解析层已 decode，
 * App / 小程序端可能原样返回 `%E5%B8%AE...` 转义串；若入口忘记 encodeURIComponent，
 * 还可能出现双重编码（`%25E5...`）。直接把编码串当用户输入会导致对话页显示乱码、
 * 会话标题被污染（历史回归：个股详情「去问 AI」漏编码，commit 7737fe7）。
 *
 * 策略：最多解两层，能解就解；遇到非法编码（如问句本身含 `5%`）立即停止并返回上一轮结果。
 */
export function safeDecodeQuery(raw: string | undefined | null): string {
  let value = String(raw ?? '')
  // 单层编码与双重编码各解一次；不含 % 说明本就是明文，直接返回
  for (let i = 0; i < 2 && value.includes('%'); i++) {
    try {
      value = decodeURIComponent(value)
    } catch {
      break
    }
  }
  return value
}
