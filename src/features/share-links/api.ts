import { rpc } from '@/lib/supabase'
import type { DateRange } from '@/features/reports/types'
import type { Json } from '@/types/database'

import { normalizeStats, normalizeStatus } from './logic'
import type { ShareLinkStats, ShareLinksSettings, ShareLinksStatus } from './types'

export const shareLinksApi = {
  stats: async (range: DateRange) =>
    normalizeStats(
      await rpc<Partial<ShareLinkStats>>('share_link_stats_range', { p_from: range.from, p_to: range.to }),
    ),
  status: async () => normalizeStatus(await rpc<Partial<ShareLinksStatus>>('share_links')),
  save: async (settings: ShareLinksSettings) =>
    normalizeStatus(
      await rpc<Partial<ShareLinksStatus>>('admin_save_share_links', {
        p_config: settings as unknown as Json,
      }),
    ),
}
