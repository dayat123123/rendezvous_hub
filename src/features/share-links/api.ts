import { rpc } from '@/lib/supabase'
import type { Json } from '@/types/database'

import { normalizeStats, normalizeStatus } from './logic'
import type { ShareLinkStats, ShareLinksSettings, ShareLinksStatus, StatsRange } from './types'

export const shareLinksApi = {
  stats: async (days: StatsRange) =>
    normalizeStats(await rpc<Partial<ShareLinkStats>>('share_link_stats', { p_days: days })),
  status: async () => normalizeStatus(await rpc<Partial<ShareLinksStatus>>('share_links')),
  save: async (settings: ShareLinksSettings) =>
    normalizeStatus(
      await rpc<Partial<ShareLinksStatus>>('admin_save_share_links', {
        p_config: settings as unknown as Json,
      }),
    ),
}
