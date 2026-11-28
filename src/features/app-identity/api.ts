import { rpc } from '@/lib/supabase'
import type { Json } from '@/types/database'

import { normalizeIdentityStatus } from './logic'
import type { AppIdentity, AppIdentityStatus } from './types'

export const appIdentityApi = {
  status: async () => normalizeIdentityStatus(await rpc<Partial<AppIdentityStatus>>('app_identity')),
  save: async (identity: AppIdentity) =>
    normalizeIdentityStatus(
      await rpc<Partial<AppIdentityStatus>>('admin_save_app_identity', {
        p_identity: identity as unknown as Json,
      }),
    ),
}
