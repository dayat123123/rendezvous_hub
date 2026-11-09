import { describe, expect, it } from 'vitest'

import { filterArticles, helpfulPercent, parseKeywords } from './logic'
import type { FaqArticle } from './types'

const article = (id: string, patch: Partial<FaqArticle>): FaqArticle => ({
  id,
  category_id: 'c1',
  question_id: `Pertanyaan ${id}`,
  question_en: `Question ${id}`,
  answer_id: 'Jawaban',
  answer_en: 'Answer',
  keywords: [],
  topic_code: null,
  sort_order: 0,
  status: 'published',
  version: 1,
  views: 0,
  readers: 0,
  helpful: 0,
  not_helpful: 0,
  tickets_after: 0,
  created_at: '2026-11-01T00:00:00.000Z',
  updated_at: '2026-11-01T00:00:00.000Z',
  updated_by_name: null,
  published_at: null,
  ...patch,
})

describe('FAQ logic', () => {
  it('computes the helpful share only when there are votes', () => {
    expect(helpfulPercent({ helpful: 0, not_helpful: 0 })).toBeNull()
    expect(helpfulPercent({ helpful: 2, not_helpful: 1 })).toBe(67)
  })

  it('parses comma separated keywords in lowercase without duplicates', () => {
    expect(parseKeywords(' PIN, lupa pin ,pin,, ')).toEqual(['pin', 'lupa pin'])
  })

  it('sorts the least helpful first and leaves unrated articles last', () => {
    const items = [
      article('a', { helpful: 9, not_helpful: 1 }),
      article('b', {}),
      article('c', { helpful: 1, not_helpful: 3 }),
    ]
    const sorted = filterArticles(items, { query: '', status: 'all', category: 'all', sort: 'helpful' })
    expect(sorted.map((item) => item.id)).toEqual(['c', 'a', 'b'])
  })

  it('shows archived articles only when that status is chosen', () => {
    const items = [article('a', {}), article('b', { status: 'archived' })]
    expect(filterArticles(items, { query: '', status: 'all', category: 'all', sort: 'order' })).toHaveLength(
      1,
    )
    expect(
      filterArticles(items, { query: '', status: 'archived', category: 'all', sort: 'order' }).map(
        (i) => i.id,
      ),
    ).toEqual(['b'])
  })
})
