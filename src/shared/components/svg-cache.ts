/**
 * SVG 内容缓存
 * 使用 Vite 的 import.meta.glob 在构建时把 SVG 文件内容打包进 JS
 * 这样 App 端也能直接读取 SVG 内容，替换颜色后生成 data URI
 */

// 导入所有 SVG 文件内容（as raw string）
// 用相对路径，相对于当前文件 src/components/common/svg-cache.ts
const svgModules = import.meta.glob('../../static/assets/icons/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

// 构建 name → content 映射
const svgCache: Record<string, string> = {}
for (const [path, content] of Object.entries(svgModules)) {
  // 从路径中提取图标名
  const match = path.match(/([^/]+)\.svg$/)
  if (match) {
    svgCache[match[1]] = content
  }
}

export function getSvgContent(name: string): string | null {
  return svgCache[name] ?? null
}

export function hasSvg(name: string): boolean {
  return name in svgCache
}
