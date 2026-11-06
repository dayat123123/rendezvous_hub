import { afterEach, describe, expect, it, vi } from 'vitest'

import { uuid } from './utils'

const v4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('uuid', () => {
  it('returns a v4 UUID', () => {
    expect(uuid()).toMatch(v4)
  })

  it('still works on a plain-HTTP LAN origin where crypto.randomUUID is missing', () => {
    vi.stubGlobal('crypto', { getRandomValues: crypto.getRandomValues.bind(crypto) })
    const ids = new Set(Array.from({ length: 50 }, () => uuid()))
    expect(ids.size).toBe(50)
    for (const id of ids) expect(id).toMatch(v4)
  })
})
