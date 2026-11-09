export type Block =
  | { kind: 'paragraph'; lines: string[] }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'image'; alt: string; src: string }

const bullet = /^\s*[-*]\s+(.*)$/
const numbered = /^\s*\d+[.)]\s+(.*)$/
const image =
  /^\s*!\[([^\]]*)\]\((https?:\/\/[^\s/?#]+(?:\/[^\s?#]*)?\/storage\/v1\/object\/public\/faq-images\/[0-9a-f-]{36}\.(?:jpg|png|webp))\)\s*$/

export function parseBlocks(text: string): Block[] {
  const blocks: Block[] = []
  for (const line of text.replace(/\r\n/g, '\n').split('\n')) {
    const item = bullet.exec(line) ?? numbered.exec(line)
    const picture = image.exec(line)
    const last = blocks.at(-1)
    if (picture) {
      blocks.push({ kind: 'image', alt: picture[1] ?? '', src: picture[2] ?? '' })
    } else if (item) {
      const ordered = numbered.test(line) && !bullet.test(line)
      if (last?.kind === 'list' && last.ordered === ordered) last.items.push(item[1] ?? '')
      else blocks.push({ kind: 'list', ordered, items: [item[1] ?? ''] })
    } else if (line.trim() === '') {
      if (last?.kind === 'paragraph' && last.lines.length > 0) blocks.push({ kind: 'paragraph', lines: [] })
    } else if (last?.kind === 'paragraph') {
      last.lines.push(line.trim())
    } else {
      blocks.push({ kind: 'paragraph', lines: [line.trim()] })
    }
  }
  return blocks.filter((block) => (block.kind === 'paragraph' ? block.lines.length > 0 : true))
}
