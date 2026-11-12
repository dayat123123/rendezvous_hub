import { describe, expect, it } from 'vitest'

import { cleanFeedFilterDraft, feedFilterDraft, feedFilterProblems } from './logic'
import type { FeedFilter } from './types'

const media: FeedFilter = {
  key: 'media',
  label_en: 'Chart & Media',
  label_id: 'Grafik & Media',
  sort: 'latest',
  content: 'media',
  icon: 'image',
  position: 2,
  enabled: true,
  updated_at: null,
  updated_by: null,
}

describe('feedFilterDraft', () => {
  it('starts a new tab as an enabled latest-first tab over all posts', () => {
    expect(feedFilterDraft(null)).toEqual({
      key: '',
      label_en: '',
      label_id: '',
      sort: 'latest',
      content: null,
      icon: null,
      enabled: true,
    })
  })

  it('copies an existing tab without its position or audit fields', () => {
    expect(feedFilterDraft(media)).toEqual({
      key: 'media',
      label_en: 'Chart & Media',
      label_id: 'Grafik & Media',
      sort: 'latest',
      content: 'media',
      icon: 'image',
      enabled: true,
    })
  })
})

describe('cleanFeedFilterDraft', () => {
  it('trims labels, lower-cases the key and icon, and empties a blank icon', () => {
    expect(
      cleanFeedFilterDraft({
        ...feedFilterDraft(null),
        key: ' Trending ',
        label_en: ' Hot ',
        label_id: ' Ramai ',
        icon: ' Whatshot ',
      }),
    ).toMatchObject({ key: 'trending', label_en: 'Hot', label_id: 'Ramai', icon: 'whatshot' })
    expect(cleanFeedFilterDraft({ ...feedFilterDraft(null), icon: '  ' }).icon).toBeNull()
  })
})

describe('feedFilterProblems', () => {
  const valid = { ...feedFilterDraft(null), key: 'trending', label_en: 'Hot', label_id: 'Ramai' }

  it('accepts a valid new tab', () => {
    expect(feedFilterProblems(valid, { creating: true, keys: ['latest'] })).toEqual({})
  })

  it('checks the key format and duplicates only when creating', () => {
    expect(feedFilterProblems({ ...valid, key: 'a' }, { creating: true, keys: [] }).key).toBe('format')
    expect(feedFilterProblems({ ...valid, key: '1top' }, { creating: true, keys: [] }).key).toBe('format')
    expect(feedFilterProblems({ ...valid, key: 'top' }, { creating: true, keys: ['top'] }).key).toBe('taken')
    expect(feedFilterProblems({ ...valid, key: 'top' }, { creating: false, keys: ['top'] })).toEqual({})
  })

  it('requires both labels up to 40 characters and a lowercase icon name', () => {
    expect(
      feedFilterProblems(
        { ...valid, label_en: '', label_id: 'x'.repeat(41), icon: 'trending up' },
        { creating: false, keys: [] },
      ),
    ).toEqual({ labelEn: 'required', labelId: 'length', icon: 'format' })
  })
})
