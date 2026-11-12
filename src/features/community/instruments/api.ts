import { rpc } from '@/lib/supabase'

import type { InstrumentCheck, InstrumentDraft, MarketInstrument } from './types'

function instrument(raw: MarketInstrument): MarketInstrument {
  return {
    ...raw,
    aliases: raw.aliases ?? [],
    usage: raw.usage ?? {
      code: raw.code,
      posts: 0,
      posts_7d: 0,
      watchers: 0,
      room_id: null,
      room_members: 0,
    },
  }
}

const list = (raw: MarketInstrument[] | null) => (raw ?? []).map(instrument)

export const instrumentsApi = {
  list: async () => list(await rpc<MarketInstrument[] | null>('community_instruments')),
  check: async (code: string, aliases: string[]) =>
    (await rpc<InstrumentCheck[] | null>('community_instrument_check', {
      p_code: code,
      p_aliases: aliases,
    })) ?? [],
  save: async (draft: InstrumentDraft) =>
    instrument(
      await rpc<MarketInstrument>('community_save_instrument', {
        p_code: draft.code,
        p_name: draft.name,
        p_aliases: draft.aliases,
        p_description: draft.description,
        p_position: null,
        p_enabled: draft.enabled,
        p_room_enabled: draft.room_enabled,
        p_kind: 'index',
      }),
    ),
  reorder: async (codes: string[]) =>
    list(await rpc<MarketInstrument[] | null>('community_reorder_instruments', { p_codes: codes })),
  remove: async (code: string) =>
    list(await rpc<MarketInstrument[] | null>('community_delete_instrument', { p_code: code })),
}
