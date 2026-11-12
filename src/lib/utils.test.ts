import { describe, expect, it } from 'vitest'

import { cn, moveItem } from './utils'

describe('moveItem', () => {
  it('moves an item up or down and ignores moves past the ends', () => {
    expect(moveItem(['a', 'b', 'c'], 2, -1)).toEqual(['a', 'c', 'b'])
    expect(moveItem(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c'])
    expect(moveItem(['a', 'b', 'c'], 0, -1)).toEqual(['a', 'b', 'c'])
    expect(moveItem(['a', 'b', 'c'], 2, 1)).toEqual(['a', 'b', 'c'])
  })

  it('returns a new array without touching the input', () => {
    const items = ['a', 'b']
    expect(moveItem(items, 0, 1)).not.toBe(items)
    expect(items).toEqual(['a', 'b'])
  })
})

describe('cn', () => {
  it('keeps custom font sizes next to text colors', () => {
    expect(cn('text-row text-primary-foreground')).toBe('text-row text-primary-foreground')
    expect(cn('text-muted-foreground', 'text-label')).toBe('text-muted-foreground text-label')
  })

  it('still resolves conflicts inside the font size scale', () => {
    expect(cn('text-sm', 'text-row')).toBe('text-row')
    expect(cn('text-panel', 'text-xs')).toBe('text-xs')
  })

  it('treats the floating shadow as a shadow size', () => {
    expect(cn('shadow-none', 'shadow-float')).toBe('shadow-float')
  })
})
