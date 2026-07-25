/**
 * 精简 Markdown → HTML 转换（uni-app 安全渲染）
 *
 * 支持：## ### --- **bold** | 表格 有序/无序列表
 * 用于 mp-html 组件的 content 属性
 */
export function markdownToHtml(md: string): string {
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  html = html.replace(/^### (.+)$/gm, '<h3 class="md-h3">$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2 class="md-h2">$1</h2>')

  html = html.replace(/^---$/gm, '<hr class="md-hr" />')

  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

  html = html.replace(/^(\d+)\.\s+(.+)$/gm, '<li class="md-ol-li">$1. $2</li>')
  html = html.replace(/^-\s+(.+)$/gm, '<li class="md-ul-li">· $1</li>')

  const lines = html.split('\n')
  const result: string[] = []
  let inTable = false
  let tableRows: string[] = []

  for (const line of lines) {
    if (/^\|.+\|$/.test(line.trim())) {
      if (!inTable) { inTable = true; tableRows = [] }
      if (!/^\|[-:\s|]+\|$/.test(line.trim())) {
        tableRows.push(line.trim())
      }
    } else {
      if (inTable) {
        if (tableRows.length > 0) {
          result.push('<table class="md-table">')
          for (let i = 0; i < tableRows.length; i++) {
            const tag = i === 0 ? 'th' : 'td'
            const cells = tableRows[i].split('|').filter(c => c.trim())
              .map(c => `<${tag}>${c.trim()}</${tag}>`).join('')
            result.push(`<tr>${cells}</tr>`)
          }
          result.push('</table>')
        }
        inTable = false; tableRows = []
      }
      result.push(line)
    }
  }
  if (inTable && tableRows.length > 0) {
    result.push('<table class="md-table">')
    for (let i = 0; i < tableRows.length; i++) {
      const tag = i === 0 ? 'th' : 'td'
      const cells = tableRows[i].split('|').filter(c => c.trim())
        .map(c => `<${tag}>${c.trim()}</${tag}>`).join('')
      result.push(`<tr>${cells}</tr>`)
    }
    result.push('</table>')
  }

  html = result.join('\n')
  html = html.replace(/(<li class="md-ol-li">[\s\S]*?<\/li>)/g, '<ol class="md-ol">$1</ol>')
  html = html.replace(/(<li class="md-ul-li">[\s\S]*?<\/li>)/g, '<ul class="md-ul">$1</ul>')
  html = html.replace(/\n{2,}/g, '<br />')
  // 将剩余单个换行符替换为空格，避免 mp-html 将行内 <strong> 前后的 \n 解释为块级分隔导致换行
  html = html.replace(/\n/g, ' ')

  return html
}

/** 从 Markdown 中提取第一个 ## 标题 */
export function extractTitle(md: string): string {
  const m = md.match(/^## (.+)$/m)
  return m ? m[1] : ''
}
