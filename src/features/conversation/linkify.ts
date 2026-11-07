export type TextPart =
  | { kind: 'text'; text: string; href?: undefined }
  | { kind: 'url' | 'email' | 'phone'; text: string; href: string }

type Found = { start: number; end: number; kind: 'url' | 'email' | 'phone'; text: string; href: string }

const httpsLink = /https:\/\/[^\s<>"'`{}|\\^[\]]+/gi
const wwwLink = /(?<![\w@./-])www\.[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+(?:[/?#][^\s<>"'`{}|\\^[\]]*)?/gi
const email = /(?<![\w.%+-])[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}(?![\w-])/g
const phone = /(?<![\w+])(?:\+62[ -]?|0)\d(?:[ -]?\d){8,13}(?!\w)/g
const trailing = /[.,;:!?\]}'"»”’]+$/

function trimLink(raw: string) {
  let url = raw.replace(trailing, '')
  while (url.endsWith(')') && (url.match(/\(/g) ?? []).length < (url.match(/\)/g) ?? []).length) {
    url = url.slice(0, -1).replace(trailing, '')
  }
  return url
}

export function linkify(text: string): TextPart[] {
  const found: Found[] = []
  for (const match of text.matchAll(httpsLink)) {
    const url = trimLink(match[0])
    found.push({ start: match.index, end: match.index + url.length, kind: 'url', text: url, href: url })
  }
  for (const match of text.matchAll(wwwLink)) {
    const url = trimLink(match[0])
    found.push({
      start: match.index,
      end: match.index + url.length,
      kind: 'url',
      text: url,
      href: `https://${url}`,
    })
  }
  for (const match of text.matchAll(email)) {
    found.push({
      start: match.index,
      end: match.index + match[0].length,
      kind: 'email',
      text: match[0],
      href: `mailto:${match[0]}`,
    })
  }
  for (const match of text.matchAll(phone)) {
    const digits = match[0].replace(/\D/g, '')
    found.push({
      start: match.index,
      end: match.index + match[0].length,
      kind: 'phone',
      text: match[0],
      href: `tel:${match[0].startsWith('+') ? '+' : ''}${digits}`,
    })
  }
  found.sort((a, b) => a.start - b.start || b.end - a.end)

  const parts: TextPart[] = []
  let cursor = 0
  for (const item of found) {
    if (item.start < cursor) continue
    if (item.start > cursor) parts.push({ kind: 'text', text: text.slice(cursor, item.start) })
    parts.push({ kind: item.kind, text: item.text, href: item.href })
    cursor = item.end
  }
  if (cursor < text.length) parts.push({ kind: 'text', text: text.slice(cursor) })
  return parts
}
