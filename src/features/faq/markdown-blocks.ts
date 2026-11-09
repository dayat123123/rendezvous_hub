export type Block =
  { kind: 'paragraph'; lines: string[] } | { kind: 'list'; ordered: boolean; items: string[] }

const bullet = /^\s*[-*]\s+(.*)$/
const numbered = /^\s*\d+[.)]\s+(.*)$/

export function parseBlocks(text: string): Block[] {
  const blocks: Block[] = []
  for (const line of text.replace(/\r\n/g, '\n').split('\n')) {
    const item = bullet.exec(line) ?? numbered.exec(line)
    const last = blocks.at(-1)
    if (item) {
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
