function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function renderInline(text: string): string {
  let result = escapeHtml(text)
  result = result.replace(/`([^`]+)`/g, '<code>$1</code>')
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  result = result.replace(/\*(.+?)\*/g, '<em>$1</em>')
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
  result = result.replace(/\[\[([^\]]+)\]\]/g, '<span class="wikiLink">$1</span>')
  return result
}

function parseTableRow(cells: string): string[] {
  return cells
    .split('|')
    .map((s) => s.trim())
    .filter((s) => s !== '')
}

export function mdToHtml(md: string): string {
  const lines = md.split('\n')
  const out: string[] = []
  let inFrontmatter = false
  let inCodeBlock = false
  let codeLines: string[] = []
  let inTable = false
  let tableRows: string[][] = []
  let inList: 'ul' | 'ol' | null = null

  function closeList() {
    if (inList) {
      out.push(`</${inList}>`)
      inList = null
    }
  }

  function closeTable() {
    if (inTable) {
      out.push('</tbody></table></div>')
      inTable = false
      tableRows = []
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trimEnd()

    // YAML frontmatter
    if (i === 0 && trimmed === '---') {
      inFrontmatter = true
      continue
    }
    if (inFrontmatter && trimmed === '---') {
      inFrontmatter = false
      continue
    }
    if (inFrontmatter) continue

    // Code block
    if (/^```/.test(trimmed)) {
      if (inCodeBlock) {
        out.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`)
        codeLines = []
        inCodeBlock = false
      } else {
        closeList()
        closeTable()
        inCodeBlock = true
      }
      continue
    }
    if (inCodeBlock) {
      codeLines.push(line)
      continue
    }

    // Horizontal rule
    if (/^---$/.test(trimmed) || /^\*\*\*$/.test(trimmed)) {
      closeList()
      closeTable()
      out.push('<hr />')
      continue
    }

    // Headers
    const hMatch = trimmed.match(/^(#{1,4})\s+(.+)$/)
    if (hMatch) {
      closeList()
      closeTable()
      const level = hMatch[1].length
      out.push(`<h${level}>${renderInline(hMatch[2])}</h${level}>`)
      continue
    }

    // Code block fence end (already handled above)

    // Table
    if (/^\|.+\|$/.test(trimmed)) {
      const cells = parseTableRow(trimmed)
      if (cells.length > 1) {
        // Check if it's a separator row: | :--- | :---: | ---: |
        if (/^[\s:|:-]+$/.test(trimmed)) {
          continue
        }
        if (!inTable) {
          inTable = true
          tableRows = [cells]
          out.push('<div class="table-wrap"><table><thead><tr>')
          for (const cell of cells) {
            out.push(`<th>${renderInline(cell)}</th>`)
          }
          out.push('</tr></thead><tbody>')
        } else {
          out.push('<tr>')
          for (const cell of cells) {
            out.push(`<td>${renderInline(cell)}</td>`)
          }
          out.push('</tr>')
        }
        continue
      }
    }
    closeTable()

    // Unordered list
    const ulMatch = trimmed.match(/^[-*]\s+(.+)$/)
    if (ulMatch) {
      if (inList !== 'ul') {
        closeList()
        inList = 'ul'
        out.push('<ul>')
      }
      out.push(`<li>${renderInline(ulMatch[1])}</li>`)
      continue
    }

    // Ordered list
    const olMatch = trimmed.match(/^\d+\.\s+(.+)$/)
    if (olMatch) {
      if (inList !== 'ol') {
        closeList()
        inList = 'ol'
        out.push('<ol>')
      }
      out.push(`<li>${renderInline(olMatch[1])}</li>`)
      continue
    }

    closeList()

    // Empty line
    if (trimmed === '') {
      out.push('')
      continue
    }

    // Paragraph
    out.push(`<p>${renderInline(trimmed)}</p>`)
  }

  closeList()
  closeTable()
  if (inCodeBlock && codeLines.length) {
    out.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`)
  }

  return out.join('\n')
}
