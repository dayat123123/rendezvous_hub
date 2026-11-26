import i18n from '@/i18n'
import { errorText } from '@/lib/error-text'
import { toApiError } from '@/lib/errors'

import { cleanStock, stockCodePattern } from './logic'
import {
  MAX_POST_BODY,
  type CardAttachment,
  type CardBlock,
  type CardBlockType,
  type CardDocument,
  type CardMetric,
  type ImageAttachment,
  type MetricTrend,
  type PostAttachment,
} from './types'

export const CARD_LIMITS = {
  title: 200,
  headline: 200,
  subtitle: 200,
  badge: 40,
  disclaimer: 400,
  blocks: 20,
  text: 1000,
  calloutTitle: 120,
  item: 300,
  items: 20,
  metrics: 6,
  metricText: 60,
  bytes: 32_000,
} as const

export const cardBlockTypes = [
  'paragraph',
  'list',
  'callout',
  'metrics',
] as const satisfies readonly CardBlockType[]

export const metricTrends = ['up', 'down', 'flat'] as const satisfies readonly MetricTrend[]

type Raw = Record<string, unknown>

const isRecord = (value: unknown): value is Raw =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isText = (value: unknown): value is string => typeof value === 'string' && value.trim() !== ''

const present = <T>(value: T | null): value is T => value !== null

const isTrend = (value: unknown): value is MetricTrend =>
  typeof value === 'string' && (metricTrends as readonly string[]).includes(value)

export const isImageAttachment = (attachment: PostAttachment): attachment is ImageAttachment =>
  typeof (attachment as Partial<ImageAttachment>).path === 'string'

export const isCardAttachment = (attachment: PostAttachment): attachment is CardAttachment =>
  (attachment as Partial<CardAttachment>).type === 'card'

export const findCard = (attachments: PostAttachment[]) => attachments.find(isCardAttachment) ?? null

function cardMetric(raw: unknown): CardMetric | null {
  if (!isRecord(raw) || !isText(raw.label) || !isText(raw.value)) return null
  return {
    label: raw.label,
    value: raw.value,
    ...(isText(raw.change) ? { change: raw.change } : {}),
    ...(isTrend(raw.trend) ? { trend: raw.trend } : {}),
  }
}

export function cardBlock(raw: unknown): CardBlock | null {
  if (!isRecord(raw)) return null
  switch (raw.type) {
    case 'paragraph':
      return isText(raw.text) ? { type: 'paragraph', text: raw.text } : null
    case 'list': {
      const items = Array.isArray(raw.items) ? raw.items.filter(isText) : []
      if (items.length === 0) return null
      return { type: 'list', style: raw.style === 'numbered' ? 'numbered' : 'bulleted', items }
    }
    case 'callout':
      return isText(raw.text)
        ? { type: 'callout', title: isText(raw.title) ? raw.title : '', text: raw.text }
        : null
    case 'metrics': {
      const metrics = Array.isArray(raw.metrics) ? raw.metrics.map(cardMetric).filter(present) : []
      return metrics.length > 0 ? { type: 'metrics', metrics } : null
    }
    default:
      return null
  }
}

export function readCardDocument(raw: unknown): CardDocument | null {
  if (!isRecord(raw) || !isText(raw.title) || !isText(raw.headline)) return null
  return {
    version: 1,
    ...(isText(raw.badge) ? { badge: raw.badge } : {}),
    title: raw.title,
    ...(isText(raw.subtitle) ? { subtitle: raw.subtitle } : {}),
    headline: raw.headline,
    ...(isText(raw.disclaimer) ? { disclaimer: raw.disclaimer } : {}),
    blocks: Array.isArray(raw.blocks) ? raw.blocks.map(cardBlock).filter(present) : [],
  }
}

const spaces = (value: string) => value.replace(/^ +| +$/g, '')

function blockText(block: CardBlock): string | null {
  switch (block.type) {
    case 'paragraph':
      return block.text
    case 'callout':
      return [block.title || null, block.text].filter(present).join(': ')
    case 'list':
      return block.items.length === 0
        ? null
        : block.items
            .map((item, index) => `${block.style === 'bulleted' ? '• ' : `${index + 1}. `}${item}`)
            .join('\n')
    case 'metrics':
      return block.metrics.length === 0
        ? null
        : block.metrics
            .map((metric) =>
              [`${metric.label}:`, metric.value, metric.change ? `(${metric.change})` : null]
                .filter(present)
                .join(' '),
            )
            .join('\n')
  }
}

function fullText(document: CardDocument, stock: string | null) {
  const blocks = document.blocks.map(blockText).filter(present)
  return Array.from(
    [
      `${stock ? `$${stock} — ` : ''}${document.title}`,
      spaces(document.headline) || null,
      blocks.length > 0 ? blocks.join('\n\n') : null,
      spaces(document.disclaimer ?? '') || null,
    ]
      .filter(present)
      .join('\n\n'),
  )
}

// Mirrors private.card_text on the server: the plain body older apps show for a card post.
export const cardText = (document: CardDocument, stock: string | null) =>
  spaces(fullText(document, stock).slice(0, MAX_POST_BODY).join(''))

export const cardTextCut = (document: CardDocument, stock: string | null) =>
  fullText(document, stock).length > MAX_POST_BODY

let sequence = 0
const nextId = () => `card-${++sequence}`

export type DraftItem = { id: string; text: string }
export type DraftMetric = {
  id: string
  label: string
  value: string
  change: string
  trend: MetricTrend | ''
}

export type DraftBlock =
  | { id: string; type: 'paragraph'; text: string }
  | { id: string; type: 'list'; style: 'numbered' | 'bulleted'; items: DraftItem[] }
  | { id: string; type: 'callout'; title: string; text: string }
  | { id: string; type: 'metrics'; metrics: DraftMetric[] }

export type CardDraft = {
  stock: string
  badge: string
  title: string
  subtitle: string
  headline: string
  disclaimer: string
  blocks: DraftBlock[]
}

export const draftItem = (text = ''): DraftItem => ({ id: nextId(), text })

export const draftMetric = (metric?: CardMetric): DraftMetric => ({
  id: nextId(),
  label: metric?.label ?? '',
  value: metric?.value ?? '',
  change: metric?.change ?? '',
  trend: metric?.trend ?? '',
})

export function draftBlock(type: CardBlockType): DraftBlock {
  switch (type) {
    case 'paragraph':
      return { id: nextId(), type, text: '' }
    case 'list':
      return { id: nextId(), type, style: 'numbered', items: [draftItem()] }
    case 'callout':
      return { id: nextId(), type, title: '', text: '' }
    case 'metrics':
      return { id: nextId(), type, metrics: [draftMetric()] }
  }
}

export const emptyCardDraft = (): CardDraft => ({
  stock: '',
  badge: '',
  title: '',
  subtitle: '',
  headline: '',
  disclaimer: '',
  blocks: [draftBlock('paragraph')],
})

function blockDraft(block: CardBlock): DraftBlock {
  switch (block.type) {
    case 'paragraph':
      return { id: nextId(), type: 'paragraph', text: block.text }
    case 'list':
      return { id: nextId(), type: 'list', style: block.style, items: block.items.map(draftItem) }
    case 'callout':
      return { id: nextId(), type: 'callout', title: block.title, text: block.text }
    case 'metrics':
      return { id: nextId(), type: 'metrics', metrics: block.metrics.map(draftMetric) }
  }
}

export function cardDraftFrom(attachment: CardAttachment): CardDraft {
  const document = readCardDocument(attachment.document)
  if (!document) return { ...emptyCardDraft(), stock: attachment.stock_code ?? '' }
  return {
    stock: attachment.stock_code ?? '',
    badge: document.badge ?? '',
    title: document.title,
    subtitle: document.subtitle ?? '',
    headline: document.headline,
    disclaimer: document.disclaimer ?? '',
    blocks: document.blocks.map(blockDraft),
  }
}

function buildBlock(block: DraftBlock): CardBlock {
  switch (block.type) {
    case 'paragraph':
      return { type: 'paragraph', text: block.text.trim() }
    case 'list':
      return {
        type: 'list',
        style: block.style,
        items: block.items.map((item) => item.text.trim()).filter(Boolean),
      }
    case 'callout':
      return { type: 'callout', title: block.title.trim(), text: block.text.trim() }
    case 'metrics':
      return {
        type: 'metrics',
        metrics: block.metrics
          .map((metric) => ({
            label: metric.label.trim(),
            value: metric.value.trim(),
            change: metric.change.trim(),
            trend: metric.trend,
          }))
          .filter((metric) => metric.label || metric.value)
          .map(({ label, value, change, trend }) => ({
            label,
            value,
            ...(change ? { change } : {}),
            ...(trend ? { trend } : {}),
          })),
      }
  }
}

export function buildCardDocument(draft: CardDraft): CardDocument {
  const optional = (key: 'badge' | 'subtitle' | 'disclaimer') => {
    const value = draft[key].trim()
    return value ? { [key]: value } : {}
  }
  return {
    version: 1,
    ...optional('badge'),
    title: draft.title.trim(),
    ...optional('subtitle'),
    headline: draft.headline.trim(),
    ...optional('disclaimer'),
    blocks: draft.blocks.map(buildBlock),
  }
}

export const cardStock = (draft: CardDraft) => cleanStock(draft.stock) || null

export function cardAttachment(draft: CardDraft): CardAttachment {
  const stock = cardStock(draft)
  return { type: 'card', ...(stock ? { stock_code: stock } : {}), document: buildCardDocument(draft) }
}

export type CardProblem =
  | { code: 'required' }
  | { code: 'tooLong'; max: number }
  | { code: 'stockInvalid' }
  | { code: 'blocksNone' }
  | { code: 'blocksMany'; max: number }
  | { code: 'tooLarge' }
  | { code: 'blockEmpty' }
  | { code: 'metricIncomplete' }
  | { code: 'metricsMany'; max: number }
  | { code: 'itemsMany'; max: number }

export type CardProblems = {
  stock?: CardProblem
  badge?: CardProblem
  title?: CardProblem
  subtitle?: CardProblem
  headline?: CardProblem
  disclaimer?: CardProblem
  blocks?: CardProblem
  block: Record<string, CardProblem>
}

const length = (value: string, max: number, required = false): CardProblem | undefined => {
  const size = value.trim().length
  if (required && size === 0) return { code: 'required' }
  return size > max ? { code: 'tooLong', max } : undefined
}

const longest = (values: string[], max: number) => values.some((value) => value.trim().length > max)

function blockProblem(block: DraftBlock): CardProblem | undefined {
  switch (block.type) {
    case 'paragraph':
      return block.text.trim() ? length(block.text, CARD_LIMITS.text) : { code: 'blockEmpty' }
    case 'list': {
      const items = block.items.map((item) => item.text).filter((text) => text.trim())
      if (items.length === 0) return { code: 'blockEmpty' }
      if (items.length > CARD_LIMITS.items) return { code: 'itemsMany', max: CARD_LIMITS.items }
      return longest(items, CARD_LIMITS.item) ? { code: 'tooLong', max: CARD_LIMITS.item } : undefined
    }
    case 'callout':
      if (!block.text.trim()) return { code: 'blockEmpty' }
      return length(block.title, CARD_LIMITS.calloutTitle) ?? length(block.text, CARD_LIMITS.text)
    case 'metrics': {
      const rows = block.metrics.filter((metric) => metric.label.trim() || metric.value.trim())
      if (rows.length === 0) return { code: 'blockEmpty' }
      if (block.metrics.length > CARD_LIMITS.metrics) return { code: 'metricsMany', max: CARD_LIMITS.metrics }
      if (rows.some((metric) => !metric.label.trim() || !metric.value.trim()))
        return { code: 'metricIncomplete' }
      return longest(
        rows.flatMap((metric) => [metric.label, metric.value, metric.change]),
        CARD_LIMITS.metricText,
      )
        ? { code: 'tooLong', max: CARD_LIMITS.metricText }
        : undefined
    }
  }
}

export function cardProblems(draft: CardDraft): CardProblems {
  const stock = cleanStock(draft.stock)
  const block: Record<string, CardProblem> = {}
  for (const item of draft.blocks) {
    const problem = blockProblem(item)
    if (problem) block[item.id] = problem
  }
  const size = new TextEncoder().encode(JSON.stringify(buildCardDocument(draft))).length
  const blocks: CardProblem | undefined =
    draft.blocks.length === 0
      ? { code: 'blocksNone' }
      : draft.blocks.length > CARD_LIMITS.blocks
        ? { code: 'blocksMany', max: CARD_LIMITS.blocks }
        : size > CARD_LIMITS.bytes
          ? { code: 'tooLarge' }
          : undefined
  const problems: CardProblems = {
    stock: stock && !stockCodePattern.test(stock) ? { code: 'stockInvalid' } : undefined,
    badge: length(draft.badge, CARD_LIMITS.badge),
    title: length(draft.title, CARD_LIMITS.title, true),
    subtitle: length(draft.subtitle, CARD_LIMITS.subtitle),
    headline: length(draft.headline, CARD_LIMITS.headline, true),
    disclaimer: length(draft.disclaimer, CARD_LIMITS.disclaimer),
    blocks,
    block,
  }
  return problems
}

export const cardValid = (problems: CardProblems) =>
  Object.entries(problems).every(([key, value]) =>
    key === 'block' ? Object.keys(value as object).length === 0 : value === undefined,
  )

export const moveItem = <T>(list: T[], index: number, offset: -1 | 1) => {
  const target = index + offset
  if (target < 0 || target >= list.length) return list
  const next = [...list]
  const [item] = next.splice(index, 1) as [T]
  next.splice(target, 0, item)
  return next
}

const cardCodes = ['invalid_card', 'invalid_stock'] as const

export function cardErrorText(error: unknown) {
  const { code } = toApiError(error)
  return (cardCodes as readonly string[]).includes(code)
    ? i18n.t(`moderation.card.errors.${code as (typeof cardCodes)[number]}`)
    : errorText(error)
}
