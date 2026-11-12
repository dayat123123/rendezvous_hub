import type { StaffRef } from '@/features/community/types'

export const feedSorts = ['latest', 'top'] as const
export type FeedSort = (typeof feedSorts)[number]

export const feedContents = ['media', 'poll'] as const
export type FeedContent = (typeof feedContents)[number]

export const FEED_FILTER_KEY_MAX = 32
export const FEED_FILTER_LABEL_MAX = 40
export const FEED_FILTER_ICON_MAX = 40

export const feedFilterKeyPattern = /^[a-z][a-z0-9_]{1,31}$/
export const feedFilterIconPattern = /^[a-z0-9_]{1,40}$/

export type FeedFilter = {
  key: string
  label_en: string
  label_id: string
  sort: FeedSort
  content: FeedContent | null
  icon: string | null
  position: number
  enabled: boolean
  updated_at: string | null
  updated_by: StaffRef
}

export type FeedFilterDraft = {
  key: string
  label_en: string
  label_id: string
  sort: FeedSort
  content: FeedContent | null
  icon: string | null
  enabled: boolean
}
