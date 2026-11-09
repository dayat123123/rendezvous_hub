import { describe, expect, it } from 'vitest'

import { reasonLabel, surveyConfig, surveyDraft, surveyProblems, surveyValid } from './logic'

const config = {
  question: { id: 'Bagaimana layanan CS kami?', en: 'How was our customer service?' },
  scale: 5 as const,
  low_max: 2,
  reasons: [{ code: 'slow', id: 'Terlalu lama', en: 'Too slow' }],
}

describe('survey logic', () => {
  it('round-trips a saved config', () => {
    const draft = surveyDraft(config)
    expect(surveyValid(surveyProblems(draft))).toBe(true)
    expect(surveyConfig(draft)).toEqual(config)
  })

  it('rejects duplicate codes, short labels and a low limit out of range', () => {
    const draft = {
      ...surveyDraft(config),
      low_max: '5',
      reasons: [...config.reasons, { code: 'slow', id: 'x', en: 'Late' }],
    }
    const problems = surveyProblems(draft)
    expect(problems.low_max).toBe(true)
    expect(problems.reasons).toEqual([{}, { code: true, id: true }])
    expect(surveyValid(problems)).toBe(false)
  })

  it('labels reason codes in the UI language and falls back to the code', () => {
    expect(reasonLabel(config.reasons, 'slow', 'en')).toBe('Too slow')
    expect(reasonLabel(config.reasons, 'slow', 'id')).toBe('Terlalu lama')
    expect(reasonLabel(config.reasons, 'other', 'id')).toBe('other')
  })
})
