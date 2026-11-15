import { rpc } from '@/lib/supabase'

import type { AesInput, RelayCommand, RelayConfigInput, RelayView } from './types'

function view(raw: RelayView): RelayView {
  return {
    ...raw,
    aes: raw.aes ?? {
      configured: false,
      mode: 'ecb',
      fingerprint: null,
      key_length: null,
      has_iv: false,
      updated_at: null,
    },
    instances: (raw.instances ?? []).map((instance) => ({ ...instance, counters: instance.counters ?? {} })),
    today: raw.today ?? {},
  }
}

export const relayApi = {
  get: async () => view(await rpc<RelayView>('trade_relay_get')),
  command: async (action: RelayCommand, reason: string) =>
    view(await rpc<RelayView>('trade_relay_command', { p_action: action, p_reason: reason.trim() })),
  update: async (input: RelayConfigInput, reason: string) =>
    view(
      await rpc<RelayView>('trade_relay_update', {
        p_iproxy_addr: input.iproxyAddr.trim() || null,
        p_identity: input.identity.trim() || null,
        p_heartbeat_seconds: input.heartbeatSeconds,
        p_reason: reason.trim(),
      }),
    ),
  setAes: async (input: AesInput, reason: string) =>
    view(
      await rpc<RelayView>('trade_relay_set_aes', {
        p_mode: input.mode,
        p_key: input.key,
        p_iv: input.iv === '' ? null : input.iv,
        p_reason: reason.trim(),
      }),
    ),
  clearAes: async (reason: string) =>
    view(await rpc<RelayView>('trade_relay_clear_aes', { p_reason: reason.trim() })),
  setNotify: async (enabled: boolean, reason: string) =>
    view(await rpc<RelayView>('trade_notify_set_enabled', { p_enabled: enabled, p_reason: reason.trim() })),
}
