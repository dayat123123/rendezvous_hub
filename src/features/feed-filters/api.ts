import { rpc } from '@/lib/supabase'

import type { FeedFilter } from './types'

const list = (raw: FeedFilter[] | null) => raw ?? []

export const feedFiltersApi = {
  list: async () => list(await rpc<FeedFilter[] | null>('admin_feed_filters')),
  setEnabled: async (key: string, enabled: boolean) =>
    list(await rpc<FeedFilter[] | null>('admin_set_feed_filter_enabled', { p_key: key, p_enabled: enabled })),
}
