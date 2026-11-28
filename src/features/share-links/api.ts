import { rpc } from '@/lib/supabase'
import type { Json } from '@/types/database'

import { normalizeStatus } from './logic'
import type { ShareLinksSettings, ShareLinksStatus } from './types'

export const shareLinksApi = {
  status: async () => normalizeStatus(await rpc<Partial<ShareLinksStatus>>('share_links')),
  save: async (settings: ShareLinksSettings) =>
    normalizeStatus(
      await rpc<Partial<ShareLinksStatus>>('admin_save_share_links', {
        p_config: settings as unknown as Json,
      }),
    ),
}
