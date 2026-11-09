import { describe, expect, it } from 'vitest'

import { helpArticlesCsv, helpCsvName, helpMissesCsv, reasonsByTopicCsv } from './help-csv'

const range = { from: '2026-11-01', to: '2026-11-09' }

describe('help report CSV', () => {
  it('names each export by table and range', () => {
    expect(helpCsvName('topics', range)).toBe('laporan-bantuan-topik-2026-11-01-2026-11-09.csv')
    expect(helpCsvName('misses', range)).toBe('laporan-bantuan-pencarian-2026-11-01-2026-11-09.csv')
    expect(helpCsvName('reasons-agent', range)).toBe('laporan-alasan-cs-2026-11-01-2026-11-09.csv')
  })

  it('writes article rows and guards formula-like search text', () => {
    const articles = helpArticlesCsv(
      [
        {
          id: 'a',
          question: 'Cara reset PIN',
          readers: 10,
          helpful: 3,
          not_helpful: 1,
          tickets_after: 2,
          prevented: 8,
          helpful_percent: 75,
        },
      ],
      ['q', 'r', 'h', 'n', 'p', 't', 'x'],
    )
    expect(articles).toContain('Cara reset PIN,10,3,1,75,2,8\r\n')
    expect(helpMissesCsv([{ query: '=cmd', language: 'id', count: 2 }], ['q', 'l', 'c'])).toContain(
      "'=cmd,id,2",
    )
  })

  it('labels topics and reasons', () => {
    const csv = reasonsByTopicCsv(
      [{ topic: 'order', reason: 'slow', count: 4 }],
      ['code', 'topic', 'reasonCode', 'reason', 'count'],
      () => 'Pesanan',
      () => 'Terlalu lama',
    )
    expect(csv).toContain('order,Pesanan,slow,Terlalu lama,4\r\n')
  })
})
