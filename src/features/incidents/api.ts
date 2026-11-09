import { rpc } from '@/lib/supabase'

import type { Incident, IncidentDraft } from './types'

export const incidentsApi = {
  list: async () => (await rpc<Incident[] | null>('admin_incidents')) ?? [],
  save: (draft: IncidentDraft) =>
    rpc<Incident>('admin_save_incident', {
      p_id: draft.id,
      p_title_id: draft.title_id,
      p_title_en: draft.title_en,
      p_body_id: draft.body_id,
      p_body_en: draft.body_en,
      p_level: draft.level,
      p_starts_at: draft.starts_at,
      p_ends_at: draft.ends_at,
      p_faq_article_id: draft.faq_article_id,
    }),
  end: (id: string) => rpc<Incident>('admin_end_incident', { p_id: id }),
}
