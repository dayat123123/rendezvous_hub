import { beforeAll, describe, expect, it } from 'vitest'

import { loadStrings } from '@/i18n'
import { ApiError } from '@/lib/errors'

import {
  buildCardDocument,
  cardAttachment,
  cardBlock,
  cardDraftFrom,
  cardErrorText,
  cardProblems,
  cardText,
  cardTextCut,
  cardValid,
  draftBlock,
  draftItem,
  draftMetric,
  emptyCardDraft,
  findCard,
  isImageAttachment,
  moveItem,
  readCardDocument,
  type CardDraft,
} from './card-logic'
import type { CardDocument, PostAttachment } from './types'

beforeAll(async () => {
  await loadStrings('moderation')
})

const holiday: CardDocument = {
  version: 1,
  badge: 'Info pasar',
  title: 'Jadwal Libur Bursa',
  headline: 'Bursa libur dua hari',
  disclaimer: 'Informasi dari OLT Research.',
  blocks: [
    { type: 'paragraph', text: 'Bursa libur pada hari berikut.' },
    { type: 'list', style: 'numbered', items: ['25 Desember', '26 Desember'] },
    { type: 'metrics', metrics: [{ label: 'Hari libur', value: '2 hari', change: '+1 hari', trend: 'up' }] },
    { type: 'callout', title: 'Catatan', text: 'Settlement bergeser.' },
  ],
}

function draft(overrides: Partial<CardDraft> = {}): CardDraft {
  return {
    stock: '',
    badge: '',
    title: 'Judul',
    subtitle: '',
    headline: 'Kalimat utama',
    disclaimer: '',
    blocks: [{ ...draftBlock('paragraph'), text: 'Isi' } as CardDraft['blocks'][number]],
    ...overrides,
  }
}

describe('cardText', () => {
  it('builds the same companion text as private.card_text on the server', () => {
    expect(cardText(holiday, 'BBCA')).toBe(
      '$BBCA — Jadwal Libur Bursa\n\nBursa libur dua hari\n\nBursa libur pada hari berikut.\n\n1. 25 Desember\n2. 26 Desember\n\nHari libur: 2 hari (+1 hari)\n\nCatatan: Settlement bergeser.\n\nInformasi dari OLT Research.',
    )
  })

  it('uses bullets, skips empty parts, drops an empty callout title and caps the text at 2000 characters', () => {
    const doc: CardDocument = {
      version: 1,
      title: 'Judul',
      headline: '  Utama  ',
      blocks: [
        { type: 'list', style: 'bulleted', items: ['A', 'B'] },
        { type: 'callout', title: '', text: 'Tanpa judul' },
        { type: 'metrics', metrics: [{ label: 'ROE', value: '21%' }] },
        { type: 'list', style: 'numbered', items: [] },
      ],
    }
    expect(cardText(doc, null)).toBe('Judul\n\nUtama\n\n• A\n• B\n\nTanpa judul\n\nROE: 21%')
    const long: CardDocument = { ...doc, blocks: [{ type: 'paragraph', text: 'x'.repeat(2500) }] }
    expect(Array.from(cardText(long, null))).toHaveLength(2000)
    expect(cardTextCut(long, null)).toBe(true)
    expect(cardTextCut(doc, null)).toBe(false)
  })
})

describe('buildCardDocument', () => {
  it('trims fields, leaves out empty optional fields, empty points and empty figure rows', () => {
    const list = draftBlock('list')
    const metrics = draftBlock('metrics')
    const doc = buildCardDocument(
      draft({
        stock: ' $bbca ',
        badge: '  ',
        title: ' Jadwal ',
        subtitle: 'Sub',
        disclaimer: ' Catatan ',
        blocks: [
          { ...list, type: 'list', style: 'bulleted', items: [draftItem(' A '), draftItem('  ')] },
          {
            ...metrics,
            type: 'metrics',
            metrics: [
              { ...draftMetric(), label: 'Laba', value: 'Rp1 T', change: '', trend: 'down' },
              draftMetric(),
            ],
          },
        ],
      }),
    )
    expect(doc).toEqual({
      version: 1,
      title: 'Jadwal',
      subtitle: 'Sub',
      headline: 'Kalimat utama',
      disclaimer: 'Catatan',
      blocks: [
        { type: 'list', style: 'bulleted', items: ['A'] },
        { type: 'metrics', metrics: [{ label: 'Laba', value: 'Rp1 T', trend: 'down' }] },
      ],
    })
    expect(cardAttachment(draft({ stock: ' $bbca ' }))).toMatchObject({ type: 'card', stock_code: 'BBCA' })
    expect(cardAttachment(draft())).not.toHaveProperty('stock_code')
  })

  it('round-trips a saved card, including research cards, back into an editable draft', () => {
    const restored = cardDraftFrom({
      type: 'card',
      source: 'research',
      research_id: 'rep-1',
      kind: 'financial_report',
      stock_code: 'BBCA',
      document: { ...holiday, subtitle: 'PT Bank Central Asia Tbk.' },
    })
    expect(restored).toMatchObject({
      stock: 'BBCA',
      badge: 'Info pasar',
      subtitle: 'PT Bank Central Asia Tbk.',
    })
    expect(buildCardDocument(restored)).toEqual({ ...holiday, subtitle: 'PT Bank Central Asia Tbk.' })
    expect(cardDraftFrom({ type: 'card', document: {} as CardDocument }).blocks).toHaveLength(1)
  })
})

describe('cardProblems', () => {
  it('accepts a complete card', () => {
    expect(cardValid(cardProblems(draft()))).toBe(true)
  })

  it('requires the title and headline and at least one block, and checks the stock code', () => {
    const problems = cardProblems(draft({ title: ' ', headline: '', blocks: [], stock: '12' }))
    expect(problems).toMatchObject({
      title: { code: 'required' },
      headline: { code: 'required' },
      blocks: { code: 'blocksNone' },
      stock: { code: 'stockInvalid' },
    })
    expect(cardValid(problems)).toBe(false)
  })

  it('enforces the server limits on lengths and block counts', () => {
    const problems = cardProblems(
      draft({
        title: 'x'.repeat(201),
        headline: 'x'.repeat(201),
        disclaimer: 'x'.repeat(401),
        blocks: Array.from({ length: 21 }, () => ({ ...draftBlock('paragraph'), text: 'Isi' }) as never),
      }),
    )
    expect(problems).toMatchObject({
      title: { code: 'tooLong', max: 200 },
      headline: { code: 'tooLong', max: 200 },
      disclaimer: { code: 'tooLong', max: 400 },
      blocks: { code: 'blocksMany', max: 20 },
    })
  })

  it('flags empty blocks, half-filled figures and too many figures per row', () => {
    const empty = draftBlock('paragraph')
    const list = draftBlock('list')
    const half = { ...draftBlock('metrics'), metrics: [{ ...draftMetric(), label: 'Laba' }] } as never
    const many = {
      ...draftBlock('metrics'),
      metrics: Array.from({ length: 7 }, () => ({ ...draftMetric(), label: 'A', value: '1' })),
    } as never
    const callout = draftBlock('callout')
    const problems = cardProblems(draft({ blocks: [empty, list, half, many, callout] }))
    const codes = Object.values(problems.block).map((problem) => problem.code)
    expect(codes).toEqual(['blockEmpty', 'blockEmpty', 'metricIncomplete', 'metricsMany', 'blockEmpty'])
  })
})

describe('card attachments', () => {
  it('tells image attachments from cards', () => {
    const attachments: PostAttachment[] = [
      { path: 'posts/acc/a.png' },
      { type: 'card', source: 'manual', document: holiday },
    ]
    expect(attachments.filter(isImageAttachment)).toEqual([{ path: 'posts/acc/a.png' }])
    expect(findCard(attachments)?.document.title).toBe('Jadwal Libur Bursa')
    expect(findCard([])).toBeNull()
  })

  it('reads cards defensively, skipping unknown or malformed blocks', () => {
    expect(
      readCardDocument({
        ...holiday,
        blocks: [{ type: 'video' }, { type: 'paragraph' }, 'teks', ...holiday.blocks],
      }),
    ).toEqual(holiday)
    expect(readCardDocument({})).toBeNull()
    expect(readCardDocument({ ...holiday, headline: ' ' })).toBeNull()
    expect(cardBlock({ type: 'list', items: ['A', '', 2] })).toEqual({
      type: 'list',
      style: 'bulleted',
      items: ['A'],
    })
    expect(
      cardBlock({
        type: 'metrics',
        metrics: [{ label: 'K', value: '1', trend: 'sideways' }, { label: 'X' }],
      }),
    ).toEqual({ type: 'metrics', metrics: [{ label: 'K', value: '1' }] })
  })
})

describe('moveItem', () => {
  it('moves an item one step and ignores moves past the ends', () => {
    expect(moveItem(['a', 'b', 'c'], 2, -1)).toEqual(['a', 'c', 'b'])
    expect(moveItem(['a', 'b'], 0, -1)).toEqual(['a', 'b'])
    expect(moveItem(['a', 'b'], 1, 1)).toEqual(['a', 'b'])
  })
})

describe('cardErrorText', () => {
  it('explains card errors in Indonesian and falls back to the shared messages', () => {
    expect(cardErrorText(new ApiError('invalid_card'))).toBe(
      'Kartu tidak lengkap: isi judul, kalimat utama, dan minimal satu blok.',
    )
    expect(cardErrorText(new ApiError('invalid_stock'))).toMatch(/^Kode saham tidak valid/)
    expect(cardErrorText(new ApiError('content_blocked'))).toBe('Teks mengandung kata terlarang.')
  })
})

describe('emptyCardDraft', () => {
  it('starts with one empty paragraph', () => {
    expect(emptyCardDraft().blocks.map((block) => block.type)).toEqual(['paragraph'])
  })
})
