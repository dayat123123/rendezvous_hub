import { describe, expect, it } from 'vitest'

import { incidentProblems, type IncidentForm } from './logic'

const base: IncidentForm = {
  title_id: 'Gangguan transfer',
  title_en: 'Transfer outage',
  body_id: 'Transfer antarbank tertunda.',
  body_en: 'Interbank transfers are delayed.',
  level: 'warning',
  starts: '2026-11-09T08:00',
  ends: '',
  faq_article_id: null,
}

describe('incidentProblems', () => {
  it('accepts a complete form without an end time', () => {
    expect(incidentProblems(base)).toEqual({})
  })

  it('flags short texts and an end before the start', () => {
    expect(incidentProblems({ ...base, title_en: 'ab', body_id: ' ', ends: '2026-11-09T07:00' })).toEqual({
      title_en: 'title',
      body_id: 'body',
      ends: 'order',
    })
  })

  it('compares an end without a start against now', () => {
    const now = new Date('2026-11-09T05:00:00Z')
    expect(incidentProblems({ ...base, starts: '', ends: '2026-11-09T11:00' }, now)).toEqual({
      ends: 'order',
    })
    expect(incidentProblems({ ...base, starts: '', ends: '2026-11-09T13:00' }, now)).toEqual({})
  })
})
