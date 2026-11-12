import { rpc } from '@/lib/supabase'

import type { FeedFilter, FeedFilterDraft } from './types'

const list = (raw: FeedFilter[] | null) => raw ?? []

export const feedFiltersApi = {
  list: async () => list(await rpc<FeedFilter[] | null>('admin_feed_filters')),
  save: (draft: FeedFilterDraft) =>
    rpc<FeedFilter>('admin_save_feed_filter', {
      p_key: draft.key,
      p_label_en: draft.label_en,
      p_label_id: draft.label_id,
      p_sort: draft.sort,
      p_content: draft.content,
      p_icon: draft.icon,
      p_position: null,
      p_enabled: draft.enabled,
    }),
  reorder: async (keys: string[]) =>
    list(await rpc<FeedFilter[] | null>('admin_reorder_feed_filters', { p_keys: keys })),
  remove: async (key: string) =>
    list(await rpc<FeedFilter[] | null>('admin_delete_feed_filter', { p_key: key })),
}
