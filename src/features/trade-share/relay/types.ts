export const relayCommands = ['reconnect', 'restart'] as const
export type RelayCommand = (typeof relayCommands)[number]

export const aesModes = ['ecb', 'cbc'] as const
export type AesMode = (typeof aesModes)[number]

export const relayCounterNames = [
  'received',
  'recv_overflow',
  'heartbeats',
  'other',
  'decode_errors',
  'encrypted_no_key',
  'decrypt_errors',
  'decompress_errors',
  'filtered_out',
  'orders',
  'trades',
  'forwarded_order',
  'forwarded_fill',
  'buffer_overflow',
  'sent_batches',
  'send_errors',
  'send_rejected',
  'accepted',
  'duplicate',
  'ignored',
  'dropped',
  'invalid',
  'reconnects',
  'config_errors',
] as const
export type RelayCounterName = (typeof relayCounterNames)[number]

export const relayStates = ['starting', 'not_configured', 'connected', 'error'] as const

export const relayDailyMetrics = [
  'accepted',
  'duplicate',
  'ignored',
  'invalid',
  'owner_push',
  'not_shared',
  'board_not_shared',
  'stock_excluded',
] as const

export const COMMAND_COOLDOWN_SECONDS = 60
export const CONFIG_WATCH_SECONDS = 300
export const RELAY_STALE_SECONDS = 120

export type RelayInstance = {
  instance: string
  version: string | null
  connected: boolean
  state: string | null
  last_packet_at: string | null
  last_realtime_at: string | null
  counters: Record<string, number>
  last_error: string | null
  applied_reconnect: number | null
  applied_restart: number | null
  started_at: string | null
  reported_at: string
}

export type RelayAes = {
  configured: boolean
  mode: AesMode
  fingerprint: string | null
  key_length: number | null
  has_iv: boolean
  updated_at: string | null
}

export type RelayView = {
  iproxy_addr: string | null
  identity: string
  heartbeat_seconds: number
  aes: RelayAes
  reconnect_generation: number
  restart_generation: number
  last_command_at: string | null
  version: number
  updated_at: string
  updated_by: string | null
  updated_by_name?: string | null
  trade_notify_enabled: boolean
  trade_share_enabled: boolean
  instances: RelayInstance[]
  today: Record<string, number>
}

export type RelayConfigInput = { iproxyAddr: string; identity: string; heartbeatSeconds: number }

export type AesInput = { mode: AesMode; key: string; iv: string }
