import { rpc } from '@/lib/supabase'

import type { ComplianceNotices } from './types'

const normalize = (raw: Partial<ComplianceNotices>): ComplianceNotices => ({
  unseen: raw.unseen ?? 0,
  last_seen_id: raw.last_seen_id ?? 0,
  items: raw.items ?? [],
})

export const noticesApi = {
  list: async () => normalize(await rpc<Partial<ComplianceNotices>>('compliance_notices')),
  seen: async () => normalize(await rpc<Partial<ComplianceNotices>>('compliance_notices_seen')),
}
