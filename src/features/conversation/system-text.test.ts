import { describe, expect, it } from 'vitest'

import { systemText } from './system-text'

const texts = {
  code: 'ticket_claimed',
  texts: {
    id: 'Tiket diambil oleh Hendi – CS Resmi.',
    en: 'Your ticket is now handled by Hendi – Official CS.',
  },
}

describe('systemText', () => {
  it('uses the translation for the console language', () => {
    expect(systemText({ body: 'Tiket diambil oleh Hendi – CS Resmi.', payload: texts }, 'en')).toBe(
      'Your ticket is now handled by Hendi – Official CS.',
    )
    expect(systemText({ body: 'x', payload: texts }, 'id')).toBe('Tiket diambil oleh Hendi – CS Resmi.')
  })

  it('falls back to the stored body for older messages, unknown languages, and blank translations', () => {
    expect(systemText({ body: 'Tiket ditutup.', payload: {} }, 'en')).toBe('Tiket ditutup.')
    expect(systemText({ body: 'Tiket ditutup.', payload: texts }, 'fr')).toBe('Tiket ditutup.')
    expect(systemText({ body: 'Tiket ditutup.', payload: { texts: { en: ' ' } } }, 'en')).toBe(
      'Tiket ditutup.',
    )
  })
})
