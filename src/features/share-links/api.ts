import { rpc } from '@/lib/supabase'
import type { Json } from '@/types/database'

import { normalizeStatus } from './logic'
import type { ShareLinksConfig, ShareLinksStatus } from './types'

export const shareLinksApi = {
  status: async () => normalizeStatus(await rpc<Partial<ShareLinksStatus>>('share_links')),
  save: async (config: ShareLinksConfig) =>
    normalizeStatus(
      await rpc<Partial<ShareLinksStatus>>('admin_save_share_links', { p_config: config as unknown as Json }),
    ),
}
