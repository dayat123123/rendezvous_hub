const imageOnly = /^\s*!\[[^\]]*\]\([^)]*\)\s*$/
const bullet = /^(\s*)[-*]\s+(.*)$/
const link = /\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g
const url = /(https?:\/\/[^\s)]+)/

function stripEmphasis(text: string) {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*\s][^*]*)\*/g, '$1')
    .replace(/(^|[^\w])_([^_\s][^_]*)_(?=[^\w]|$)/g, '$1$2')
}

function plainLine(line: string) {
  const item = bullet.exec(line)
  const body = item ? `${item[1] ?? ''}• ${item[2] ?? ''}` : line
  const linked = body.replace(link, (_, label: string, href: string) =>
    label.trim() === href ? href : `${label.trim()} (${href})`,
  )
  return linked
    .split(url)
    .map((part, index) => (index % 2 === 1 ? part : stripEmphasis(part)))
    .join('')
    .trimEnd()
}

export function faqPlainText(markdown: string) {
  return markdown
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((line) => !imageOnly.test(line))
    .map(plainLine)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function faqSnippet(question: string, answer: string) {
  return `${question.trim()}\n\n${faqPlainText(answer)}`
}

export function appendSnippet(current: string, snippet: string) {
  if (current.trim() === '') return snippet
  return `${current.replace(/\s+$/, '')}\n\n${snippet}`
}
