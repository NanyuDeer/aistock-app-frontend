/**
 * OCR 识图添加股票 - 图片选择与压缩工具
 *
 * 平台差异：
 * - H5：canvas 压缩后 toDataURL 转 base64（chooseImage 返回 blob URL）
 * - App/小程序：uni.compressImage 压缩后 readFile 读 base64
 */
import { isH5 } from './platform'
import type { OcrImageInput } from '@/shared/api/modules/stock'

/** 最多识别的图片数（与后端 StockOcrService.MAX_IMAGES 一致） */
export const MAX_OCR_IMAGES = 8
/** 压缩目标最长边（参考 PC Web 端实现） */
const MAX_SIDE = 1400
/** JPEG 压缩质量 */
const JPEG_QUALITY = 0.6

/** 选择图片（最多 8 张），返回本地临时路径列表 */
export function chooseOcrImages(): Promise<string[]> {
  return new Promise((resolve, reject) => {
    uni.chooseImage({
      count: MAX_OCR_IMAGES,
      sizeType: ['compressed', 'original'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        // 部分平台类型为 string | string[]，统一归一化为数组
        const paths = Array.isArray(res.tempFilePaths) ? res.tempFilePaths : [res.tempFilePaths]
        resolve(paths.filter(Boolean))
      },
      fail: (err) => {
        // 用户取消选择不算错误
        const msg = String((err as { errMsg?: string } | null)?.errMsg || '')
        if (msg.includes('cancel')) resolve([])
        else reject(new Error('选择图片失败'))
      },
    })
  })
}

/** 将本地图片路径转为 OCR 可用的 { data, mime }（base64 + jpeg） */
export async function toOcrImageInput(filePath: string): Promise<OcrImageInput> {
  if (isH5) {
    const dataUrl = await compressH5Image(filePath)
    const match = /^data:(image\/[\w+-]+);base64,(.+)$/.exec(dataUrl)
    if (!match) throw new Error('图片处理失败')
    return { data: match[2], mime: match[1] }
  }
  // App / 小程序：先压缩再读 base64
  const compressed = await compressLocalImage(filePath)
  const fs = uni.getFileSystemManager()
  const raw = fs.readFileSync(compressed, 'base64')
  // App 端 readFileSync 带 encoding 时返回 string；兜底处理 ArrayBuffer
  const base64 = typeof raw === 'string' ? raw : ''
  return { data: base64, mime: 'image/jpeg' }
}

/** App/小程序：uni.compressImage 压缩（失败则回退原图） */
function compressLocalImage(src: string): Promise<string> {
  return new Promise((resolve) => {
    uni.compressImage({
      src,
      quality: Math.round(JPEG_QUALITY * 100),
      success: (res) => resolve(res.tempFilePath || src),
      fail: () => resolve(src),
    })
  })
}

/** H5：canvas 压缩 → dataURL */
function compressH5Image(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img')
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height))
        const width = Math.max(1, Math.round(img.width * scale))
        const height = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('canvas 不可用')
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY))
      } catch (e) {
        reject(e instanceof Error ? e : new Error('图片压缩失败'))
      }
    }
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = src
  })
}
