import type { ReactNode } from 'react'

import { parseBlocks } from './markdown-blocks'

const inline = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|_[^_\s][^_]*_|\[[^\]]+\]\(https:\/\/[^\s)]+\))/g

function renderInline(text: string): ReactNode[] {
  return text.split(inline).map((part, index) => {
    const key = `${index}-${part}`
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4)
      return <strong key={key}>{part.slice(2, -2)}</strong>
    if (/^\[[^\]]+\]\(https:\/\//.test(part)) {
      const label = part.slice(1, part.indexOf(']('))
      const href = part.slice(part.indexOf('](') + 2, -1)
      return (
        <a key={key} href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline">
          {label}
        </a>
      )
    }
    if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_')))
      if (part.length > 2) return <em key={key}>{part.slice(1, -1)}</em>
    return part
  })
}

export function FaqMarkdown({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-2 text-sm leading-relaxed">
      {parseBlocks(text).map((block, index) => {
        if (block.kind === 'paragraph') return <p key={index}>{renderInline(block.lines.join(' '))}</p>
        if (block.kind === 'image')
          return (
            <img
              key={index}
              src={block.src}
              alt={block.alt}
              loading="lazy"
              className="max-h-64 rounded-lg border"
            />
          )
        const items = block.items.map((item, itemIndex) => <li key={itemIndex}>{renderInline(item)}</li>)
        return block.ordered ? (
          <ol key={index} className="list-decimal pl-5">
            {items}
          </ol>
        ) : (
          <ul key={index} className="list-disc pl-5">
            {items}
          </ul>
        )
      })}
    </div>
  )
}
