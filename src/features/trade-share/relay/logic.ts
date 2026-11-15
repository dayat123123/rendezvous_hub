import {
  COMMAND_COOLDOWN_SECONDS,
  CONFIG_WATCH_SECONDS,
  RELAY_STALE_SECONDS,
  relayCounterNames,
  type AesMode,
  type RelayCommand,
  type RelayInstance,
  type RelayView,
} from './types'

export type CommandState = 'none' | 'pending' | 'done'

export type CommandProgress = { generation: number; state: CommandState; doneAt: string | null }

const appliedOf = (instance: RelayInstance, command: RelayCommand) =>
  command === 'reconnect' ? instance.applied_reconnect : instance.applied_restart

export function commandProgress(view: RelayView, command: RelayCommand): CommandProgress {
  const generation = command === 'reconnect' ? view.reconnect_generation : view.restart_generation
  if (generation <= 0) return { generation, state: 'none', doneAt: null }
  const done = view.instances
    .filter((instance) => (appliedOf(instance, command) ?? -1) >= generation)
    .sort((a, b) => Date.parse(b.reported_at) - Date.parse(a.reported_at))[0]
  return done
    ? { generation, state: 'done', doneAt: done.reported_at }
    : { generation, state: 'pending', doneAt: null }
}

export function instanceCommandState(
  instance: RelayInstance,
  view: RelayView,
  command: RelayCommand,
): CommandState {
  const generation = command === 'reconnect' ? view.reconnect_generation : view.restart_generation
  if (generation <= 0) return 'none'
  return (appliedOf(instance, command) ?? -1) >= generation ? 'done' : 'pending'
}

export function commandPending(view: RelayView | undefined) {
  if (!view) return false
  return (
    commandProgress(view, 'reconnect').state === 'pending' ||
    commandProgress(view, 'restart').state === 'pending'
  )
}

export function cooldownSeconds(lastCommandAt: string | null, now: Date = new Date()) {
  if (!lastCommandAt) return 0
  const elapsed = (now.getTime() - Date.parse(lastCommandAt)) / 1000
  if (Number.isNaN(elapsed)) return 0
  return Math.max(0, Math.ceil(COMMAND_COOLDOWN_SECONDS - elapsed))
}

export function instanceStale(instance: Pick<RelayInstance, 'reported_at'>, now: Date = new Date()) {
  return now.getTime() - Date.parse(instance.reported_at) > RELAY_STALE_SECONDS * 1000
}

export type InstanceHealth = 'connected' | 'disconnected' | 'stale' | 'idle'

export function instanceHealth(instance: RelayInstance, now: Date = new Date()): InstanceHealth {
  if (instanceStale(instance, now)) return 'stale'
  if (!instance.connected && instance.state === 'not_configured') return 'idle'
  return instance.connected ? 'connected' : 'disconnected'
}

export function newestInstance(view: Pick<RelayView, 'instances'>): RelayInstance | null {
  return [...view.instances].sort((a, b) => Date.parse(b.reported_at) - Date.parse(a.reported_at))[0] ?? null
}

export type ConfigPickup = 'no_relay' | 'pending' | 'reported' | 'stale'

export function configPickup(view: RelayView, now: Date = new Date()): ConfigPickup {
  const instance = newestInstance(view)
  if (!instance) return 'no_relay'
  if (instanceStale(instance, now)) return 'stale'
  return Date.parse(instance.reported_at) < Date.parse(view.updated_at) ? 'pending' : 'reported'
}

export function relayPending(view: RelayView | undefined, now: Date = new Date()) {
  if (!view) return false
  const recent = now.getTime() - Date.parse(view.updated_at) < CONFIG_WATCH_SECONDS * 1000
  return commandPending(view) || (recent && configPickup(view, now) === 'pending')
}

export const DEFAULT_RELAY_IDENTITY = 'social_trade_relay'

export type RelayAddress = { host: string; port: string }

const addressPattern = /^tcp:\/\/(.+):(\d{1,5})$/
const hostPattern = /^[A-Za-z0-9._-]{1,253}$/
const identityPattern = /^[A-Za-z0-9._-]{3,63}$/

export function parseAddress(address: string | null | undefined): RelayAddress {
  const match = addressPattern.exec((address ?? '').trim())
  return match ? { host: match[1] ?? '', port: match[2] ?? '' } : { host: '', port: '' }
}

export function composeAddress({ host, port }: RelayAddress) {
  return `tcp://${host.trim()}:${port.trim()}`
}

export type ConnectionField = 'host' | 'port' | 'identity' | 'heartbeat'

export function connectionProblems(input: {
  host: string
  port: string
  identity: string
  heartbeat: string
}): Partial<Record<ConnectionField, ConnectionField>> {
  const problems: Partial<Record<ConnectionField, ConnectionField>> = {}
  if (!hostPattern.test(input.host.trim())) problems.host = 'host'
  const port = input.port.trim()
  if (!/^\d{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535) problems.port = 'port'
  const identity = input.identity.trim()
  if (identity && !identityPattern.test(identity)) problems.identity = 'identity'
  const heartbeat = input.heartbeat.trim()
  if (!/^\d{1,2}$/.test(heartbeat) || Number(heartbeat) < 1 || Number(heartbeat) > 60) {
    problems.heartbeat = 'heartbeat'
  }
  return problems
}

const printable = /^[\x21-\x7e]+$/

export type AesProblem = 'key' | 'iv' | 'iv_required'

export function aesProblems(input: {
  mode: AesMode
  key: string
  iv: string
}): Partial<Record<'key' | 'iv', AesProblem>> {
  const problems: Partial<Record<'key' | 'iv', AesProblem>> = {}
  if (!printable.test(input.key) || ![16, 24, 32].includes(input.key.length)) problems.key = 'key'
  if (input.iv === '') {
    if (input.mode === 'cbc') problems.iv = 'iv_required'
  } else if (!printable.test(input.iv) || input.iv.length !== 16) {
    problems.iv = 'iv'
  }
  return problems
}

export function counterEntries(counters: Record<string, unknown> | null | undefined) {
  return Object.entries(counters ?? {})
    .filter((entry): entry is [string, number] => typeof entry[1] === 'number')
    .sort(([a], [b]) => counterRank(a) - counterRank(b) || a.localeCompare(b))
}

function counterRank(name: string) {
  const index = (relayCounterNames as readonly string[]).indexOf(name)
  return index === -1 ? relayCounterNames.length : index
}
