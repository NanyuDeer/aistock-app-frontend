/**
 * 全局 polyfill：仅为缺失环境（如部分老旧 Android WebView）注入 TextEncoder/TextDecoder。
 *
 * 背景：PDF 导出链（jspdf → canvg → fast-png）会在模块顶层执行 `new TextEncoder()`，
 * WebView 若缺少该全局对象，App 启动时模块初始化即抛 ReferenceError → 白屏。
 *
 * 双轨机制（缺一不可）：
 * - 本模块作为 main.ts 的第一条 import，覆盖 **dev（HBuilder 运行）** 场景——开发态按
 *   import 顺序执行，main.ts 首行即最先求值，能先于 fast-png 定义全局对象。
 * - 发行打包（`uni build`）由 vite.config 的 prependGlobalPolyfill 插件把同一段 polyfill
 *   字面前插到 bundle 开头，因为生产态依赖会被 Rollup 前置，import 顺序不再可靠。
 */
;(() => {
  // 端上若已存在原生实现则不动，避免覆盖
  if (typeof TextEncoder !== 'undefined' && typeof TextDecoder !== 'undefined') return

  // UTF-8 编解码（经典 escape/unescape 技巧，端上无 Buffer，逐字节构建）
  const utf8Encode = (str: string): Uint8Array => {
    if (unescape && encodeURIComponent) {
      // escape/encodeURIComponent 组合：将 UTF-8 变成 latin1 二进制串再转字节
      const bin = unescape(encodeURIComponent(str))
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      return bytes
    }
    // 兜底：仅 ASCII（fast-png 用于内部文件名，多为 ASCII，足够防白屏）
    const bytes = new Uint8Array(str.length)
    for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i) & 0xff
    return bytes
  }

  const utf8Decode = (bytes: Uint8Array): string => {
    let bin = ''
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
    return decodeURIComponent(escape(bin))
  }

  const g = globalThis as any

  if (typeof TextEncoder === 'undefined') {
    class TextEncoderPolyfill {
      readonly encoding = 'utf-8'
      encode(input = ''): Uint8Array {
        return utf8Encode(String(input))
      }
    }
    g.TextEncoder = TextEncoderPolyfill
  }

  if (typeof TextDecoder === 'undefined') {
    class TextDecoderPolyfill {
      readonly encoding = 'utf-8'
      readonly fatal = false
      readonly ignoreBOM = false
      decode(input?: Uint8Array): string {
        if (!input) return ''
        return utf8Decode(input instanceof Uint8Array ? input : new Uint8Array(input as any))
      }
    }
    g.TextDecoder = TextDecoderPolyfill
  }
})()