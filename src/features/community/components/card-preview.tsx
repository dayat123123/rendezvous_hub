import { MinusIcon, TrendingDownIcon, TrendingUpIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import { cardBlock } from '../card-logic'
import type { CardBlock, CardDocument, CardMetric, MetricTrend } from '../types'

const trendTone: Record<MetricTrend, string> = {
  up: 'text-success',
  down: 'text-destructive',
  flat: 'text-muted-foreground',
}

const trendIcon = { up: TrendingUpIcon, down: TrendingDownIcon, flat: MinusIcon } as const

function MetricChip({ metric }: { metric: CardMetric }) {
  const { t } = useTranslation()
  const Icon = metric.trend ? trendIcon[metric.trend] : null
  return (
    <li className="flex min-w-0 flex-col gap-0.5 rounded-md border bg-subtle px-3 py-2">
      <span className="text-xs break-words text-muted-foreground">{metric.label}</span>
      <span className="tabular text-sm font-semibold break-words">{metric.value}</span>
      {metric.change ? (
        <span
          className={cn(
            'flex items-center gap-1 text-xs break-words',
            metric.trend ? trendTone[metric.trend] : 'text-muted-foreground',
          )}
        >
          {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden /> : null}
          {metric.trend ? (
            <span className="sr-only">{t(`moderation.card.trend.${metric.trend}`)}</span>
          ) : null}
          <span className="tabular">{metric.change}</span>
        </span>
      ) : null}
    </li>
  )
}

function Block({ block }: { block: CardBlock }) {
  switch (block.type) {
    case 'paragraph':
      return <p className="text-sm break-words whitespace-pre-line">{block.text}</p>
    case 'metrics':
      return (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {block.metrics.map((metric, index) => (
            <MetricChip key={`${metric.label}-${index}`} metric={metric} />
          ))}
        </ul>
      )
    case 'list': {
      const List = block.style === 'numbered' ? 'ol' : 'ul'
      return (
        <List
          className={cn(
            'flex flex-col gap-1 pl-5 text-sm',
            block.style === 'numbered' ? 'list-decimal' : 'list-disc',
          )}
        >
          {block.items.map((item, index) => (
            <li key={index} className="break-words">
              {item}
            </li>
          ))}
        </List>
      )
    }
    case 'callout':
      return (
        <aside className="flex flex-col gap-1 rounded-md border-l-2 border-primary bg-primary/5 px-3 py-2">
          {block.title ? <p className="text-sm font-medium break-words">{block.title}</p> : null}
          <p className="text-sm break-words whitespace-pre-line">{block.text}</p>
        </aside>
      )
  }
}

export function CardPreview({ document, stock }: { document: CardDocument; stock?: string | null }) {
  const blocks = document.blocks.map(cardBlock).filter((block) => block !== null)
  return (
    <article
      aria-label={document.title || undefined}
      className="flex max-w-xl min-w-0 flex-col gap-3 rounded-lg border bg-card p-4"
    >
      <header className="flex flex-col items-start gap-1">
        {document.badge || stock ? (
          <span className="flex flex-wrap items-center gap-1.5">
            {stock ? (
              <span className="rounded-sm border px-1.5 py-0.5 font-mono text-xs font-medium">${stock}</span>
            ) : null}
            {document.badge ? (
              <span className="rounded-sm bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                {document.badge}
              </span>
            ) : null}
          </span>
        ) : null}
        {document.title ? <p className="text-sm font-semibold break-words">{document.title}</p> : null}
        {document.subtitle ? (
          <p className="text-xs break-words text-muted-foreground">{document.subtitle}</p>
        ) : null}
      </header>
      {document.headline ? <p className="text-panel font-semibold break-words">{document.headline}</p> : null}
      {blocks.map((block, index) => (
        <Block key={index} block={block} />
      ))}
      {document.disclaimer ? (
        <p className="border-t pt-2 text-xs break-words text-muted-foreground">{document.disclaimer}</p>
      ) : null}
    </article>
  )
}
