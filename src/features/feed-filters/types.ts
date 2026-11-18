import type { StaffRef } from '@/features/community/types'

export const feedSorts = ['latest', 'top'] as const
export type FeedSort = (typeof feedSorts)[number]

export const feedContents = ['media', 'poll'] as const
export type FeedContent = (typeof feedContents)[number]

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
