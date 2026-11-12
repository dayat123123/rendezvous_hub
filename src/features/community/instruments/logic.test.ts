import { describe, expect, it } from 'vitest'

import {
  cleanInstrumentDraft,
  collisionWarnings,
  instrumentDraft,
  instrumentProblems,
  listText,
  mergeAliases,
  parseAliases,
} from './logic'
import type { InstrumentCheck } from './types'

function entry(overrides: Partial<InstrumentCheck>): InstrumentCheck {
  return {
    code: 'X',
    role: 'code',
    valid: true,
    instrument: null,
    alias_of: null,
    stock_format: false,
    posts: 0,
    posts_7d: 0,
    watchers: 0,
    room_id: null,
    room_members: 0,
    ...overrides,
  }
}

describe('aliases', () => {
  it('parses typed aliases like cashtags and merges them without duplicates', () => {
    expect(parseAliases(' $jci, composite;  idx-comp ')).toEqual(['JCI', 'COMPOSITE', 'IDX-COMP'])
    expect(mergeAliases(['JCI'], ['COMPOSITE', 'JCI'])).toEqual(['JCI', 'COMPOSITE'])
  })

  it('adds a pending alias that was typed but not added yet', () => {
    expect(
      cleanInstrumentDraft(
        { ...instrumentDraft(null), code: ' $ihsg ', name: ' IHSG ', aliases: ['JCI'] },
        'composite',
      ),
    ).toEqual({
      code: 'IHSG',
      name: 'IHSG',
      aliases: ['JCI', 'COMPOSITE'],
      description: null,
      enabled: true,
      room_enabled: true,
    })
  })
})

describe('instrumentProblems', () => {
  const valid = { ...instrumentDraft(null), code: 'SRI-KEHATI', name: 'Indeks SRI-KEHATI' }

  it('accepts hyphenated codes and aliases', () => {
    expect(instrumentProblems({ ...valid, aliases: ['SRIKEHATI'] }, true)).toEqual({})
  })

  it('checks the code format only when creating', () => {
    for (const code of ['A', '1ABC', 'SRI-', 'AB--C', `A${'B'.repeat(24)}`]) {
      expect(instrumentProblems({ ...valid, code }, true).code).toBe('format')
    }
    expect(instrumentProblems({ ...valid, code: 'A' }, false).code).toBeUndefined()
  })

  it('checks the name, description, and aliases', () => {
    expect(instrumentProblems({ ...valid, name: '' }, true).name).toBe('required')
    expect(instrumentProblems({ ...valid, name: 'x'.repeat(81) }, true).name).toBe('length')
    expect(instrumentProblems({ ...valid, description: 'x'.repeat(301) }, true).description).toBe('length')
    expect(instrumentProblems({ ...valid, aliases: ['J C I'] }, true).aliases).toBe('format')
    expect(instrumentProblems({ ...valid, aliases: ['SRI-KEHATI'] }, true).aliases).toBe('self')
    expect(
      instrumentProblems(
        { ...valid, aliases: Array.from({ length: 11 }, (_, index) => `ALIAS${index}`) },
        true,
      ).aliases,
    ).toBe('max')
  })
})

describe('collisionWarnings', () => {
  it('warns on create about usage, existing instruments, aliases, and stock-format codes', () => {
    const warnings = collisionWarnings(
      [
        entry({
          code: 'BBRI',
          stock_format: true,
          posts: 120,
          watchers: 30,
          room_id: 'room-1',
          room_members: 45,
        }),
        entry({ code: 'JCI', role: 'alias', alias_of: 'IHSG' }),
        entry({ code: 'LQ-45', role: 'alias' }),
      ],
      null,
    )
    expect(warnings).toEqual([
      {
        token: 'BBRI',
        role: 'code',
        posts: 120,
        watchers: 30,
        room: true,
        roomMembers: 45,
        instrument: null,
        aliasOf: null,
        stockFormat: true,
      },
      {
        token: 'JCI',
        role: 'alias',
        posts: 0,
        watchers: 0,
        room: false,
        roomMembers: 0,
        instrument: null,
        aliasOf: 'IHSG',
        stockFormat: false,
      },
    ])
  })

  it('skips the edited code itself and aliases it already owns', () => {
    expect(
      collisionWarnings(
        [
          entry({ code: 'IHSG', instrument: 'IHSG', posts: 900, watchers: 50, stock_format: true }),
          entry({ code: 'JCI', role: 'alias', alias_of: 'IHSG', posts: 5, stock_format: true }),
          entry({ code: 'COMPOSITE', role: 'alias', alias_of: 'IHSG', stock_format: true }),
        ],
        { code: 'IHSG' },
      ),
    ).toEqual([])
  })

  it('still warns about a new alias added while editing', () => {
    expect(
      collisionWarnings(
        [
          entry({ code: 'IHSG', instrument: 'IHSG' }),
          entry({ code: 'LQ45', role: 'alias', instrument: 'LQ45' }),
        ],
        { code: 'IHSG' },
      ),
    ).toMatchObject([{ token: 'LQ45', role: 'alias', instrument: 'LQ45' }])
  })
})

describe('listText', () => {
  it('joins usage parts in the UI language', () => {
    expect(listText(['120 postingan', '30 pemantau', 'room'], 'id')).toBe(
      '120 postingan, 30 pemantau, dan room',
    )
    expect(listText(['120 posts', '30 watchers'], 'en')).toBe('120 posts and 30 watchers')
  })
})
