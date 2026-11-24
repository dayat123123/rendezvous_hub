import { describe, expect, it } from 'vitest'

import { changeDirection, countOpen, expiryInstant, sortChanges, totalDeleted, valueProblem } from './logic'
import type { RetentionChange } from './types'

const years = { unit: 'years' as const, allow_off: true, min: 1, max: 30, value: 5 }

const change = (id: number, status: RetentionChange['status']): RetentionChange => ({
  id,
  key: 'retention.posts_years',
  old_value: 5,
  new_value: 3,
  direction: 'delete_sooner',
  reason: 'Arahan kepatuhan 12/2026',
  status,
  requested_by: { id: 'k', name: 'Kirana' },
  requested_at: '2026-11-24T03:00:00.000Z',
  decided_by: null,
  decided_at: null,
  decision_note: null,
  effective_at: null,
  applied_at: null,
  cancelled_by: null,
  cancelled_at: null,
  cancel_note: null,
  expires_at: null,
  mine: false,
  can_decide: false,
  can_cancel: false,
})

describe('retention logic', () => {
  it('treats shorter periods, larger delete limits, and turning the guard on as deleting sooner', () => {
    expect(changeDirection(years, 5, 3)).toBe('delete_sooner')
    expect(changeDirection(years, 5, 10)).toBe('keep_longer')
    expect(changeDirection(years, 5, 0)).toBe('keep_longer')
    expect(changeDirection(years, 0, 30)).toBe('delete_sooner')
    expect(changeDirection({ unit: 'rows', allow_off: false }, 20000, 50000)).toBe('delete_sooner')
    expect(changeDirection({ unit: 'rows', allow_off: false }, 20000, 1000)).toBe('keep_longer')
    expect(changeDirection({ unit: 'switch', allow_off: false }, 0, 1)).toBe('delete_sooner')
    expect(changeDirection({ unit: 'switch', allow_off: false }, 1, 0)).toBe('keep_longer')
  })

  it('validates drafts against the allowed range and the "never" option', () => {
    expect(valueProblem('3', years)).toBeNull()
    expect(valueProblem('0', years)).toBeNull()
    expect(valueProblem('5', years)).toBe('same')
    expect(valueProblem('31', years)).toBe('range')
    expect(valueProblem('2.5', years)).toBe('invalid')
    expect(valueProblem('', years)).toBe('invalid')
    expect(valueProblem('0', { ...years, allow_off: false })).toBe('range')
  })

  it('ends a hold at the end of the chosen day in WIB', () => {
    expect(expiryInstant('2027-01-31')).toBe('2027-01-31T23:59:59+07:00')
    expect(expiryInstant('')).toBeNull()
  })

  it('sums deleted rows and puts open requests first', () => {
    expect(totalDeleted({ deleted: { posts: 3, support_chat: 2 } })).toBe(5)
    expect(totalDeleted({ deleted: {} })).toBe(0)
    const changes = [change(1, 'applied'), change(3, 'rejected'), change(2, 'pending'), change(4, 'approved')]
    expect(sortChanges(changes).map((item) => item.id)).toEqual([4, 2, 3, 1])
    expect(countOpen(changes)).toBe(2)
  })
})
