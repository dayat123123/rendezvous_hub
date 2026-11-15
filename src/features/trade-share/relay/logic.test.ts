import { describe, expect, it } from 'vitest'

import {
  aesProblems,
  commandPending,
  commandProgress,
  configProblems,
  cooldownSeconds,
  counterEntries,
  instanceCommandState,
  instanceHealth,
} from './logic'
import type { RelayInstance, RelayView } from './types'

function instance(overrides: Partial<RelayInstance> = {}): RelayInstance {
  return {
    instance: 'relay-1',
    version: '0.1.0',
    connected: true,
    state: 'running',
    last_packet_at: '2026-11-15T03:00:00.000Z',
    last_realtime_at: '2026-11-15T03:00:00.000Z',
    counters: {},
    last_error: null,
    applied_reconnect: 0,
    applied_restart: 0,
    started_at: '2026-11-15T01:00:00.000Z',
    reported_at: '2026-11-15T03:00:00.000Z',
    ...overrides,
  }
}

function view(overrides: Partial<RelayView> = {}): RelayView {
  return {
    iproxy_addr: 'tcp://10.0.0.5:9990',
    identity: 'social_trade_relay',
    heartbeat_seconds: 4,
    aes: {
      configured: false,
      mode: 'ecb',
      fingerprint: null,
      key_length: null,
      has_iv: false,
      updated_at: null,
    },
    reconnect_generation: 0,
    restart_generation: 0,
    last_command_at: null,
    version: 1,
    updated_at: '2026-11-15T00:00:00.000Z',
    updated_by: null,
    trade_notify_enabled: false,
    trade_share_enabled: false,
    instances: [instance()],
    today: {},
    ...overrides,
  }
}

describe('relay commands', () => {
  it('shows nothing before the first command', () => {
    expect(commandProgress(view(), 'reconnect')).toEqual({ generation: 0, state: 'none', doneAt: null })
    expect(commandPending(view())).toBe(false)
    expect(commandPending(undefined)).toBe(false)
  })

  it('waits until an instance applied the generation, then reports done with its time', () => {
    const waiting = view({ reconnect_generation: 3, instances: [instance({ applied_reconnect: 2 })] })
    expect(commandProgress(waiting, 'reconnect')).toEqual({ generation: 3, state: 'pending', doneAt: null })
    expect(commandPending(waiting)).toBe(true)

    const done = view({
      restart_generation: 2,
      instances: [
        instance({ instance: 'old', applied_restart: 1, reported_at: '2026-11-15T03:05:00.000Z' }),
        instance({ instance: 'new', applied_restart: 2, reported_at: '2026-11-15T03:01:00.000Z' }),
      ],
    })
    expect(commandProgress(done, 'restart')).toEqual({
      generation: 2,
      state: 'done',
      doneAt: '2026-11-15T03:01:00.000Z',
    })
    expect(instanceCommandState(done.instances[0]!, done, 'restart')).toBe('pending')
    expect(instanceCommandState(done.instances[1]!, done, 'restart')).toBe('done')
    expect(commandProgress(view({ restart_generation: 1, instances: [] }), 'restart').state).toBe('pending')
  })

  it('counts down the one-minute command limit', () => {
    const now = new Date('2026-11-15T03:00:30.000Z')
    expect(cooldownSeconds(null, now)).toBe(0)
    expect(cooldownSeconds('2026-11-15T03:00:00.000Z', now)).toBe(30)
    expect(cooldownSeconds('2026-11-15T02:58:00.000Z', now)).toBe(0)
  })
})

describe('relay health', () => {
  it('treats reports older than two minutes as stale', () => {
    const now = new Date('2026-11-15T03:02:30.000Z')
    expect(instanceHealth(instance(), now)).toBe('stale')
    expect(instanceHealth(instance({ reported_at: '2026-11-15T03:02:00.000Z' }), now)).toBe('connected')
    expect(instanceHealth(instance({ reported_at: '2026-11-15T03:02:00.000Z', connected: false }), now)).toBe(
      'disconnected',
    )
  })

  it('keeps numeric counters only, in the relay order with unknown ones last', () => {
    expect(
      counterEntries({ zeta: 2, config_errors: 3, received: 10, decode_errors: 1, alpha: 4, note: 'x' }),
    ).toEqual([
      ['received', 10],
      ['decode_errors', 1],
      ['config_errors', 3],
      ['alpha', 4],
      ['zeta', 2],
    ])
    expect(counterEntries(null)).toEqual([])
  })
})

describe('relay inputs', () => {
  it('validates the iProxy address, identity, and heartbeat like the server', () => {
    expect(
      configProblems({ iproxyAddr: 'tcp://10.0.0.5:9990', identity: 'social_trade_relay', heartbeat: '4' }),
    ).toEqual({})
    expect(configProblems({ iproxyAddr: '', identity: '', heartbeat: '4' })).toEqual({})
    expect(configProblems({ iproxyAddr: 'http://x:1', identity: 'ab', heartbeat: '61' })).toEqual({
      iproxyAddr: 'address',
      identity: 'identity',
      heartbeat: 'heartbeat',
    })
    expect(configProblems({ iproxyAddr: 'tcp://x:70000', identity: 'abc', heartbeat: '0' })).toEqual({
      iproxyAddr: 'port',
      heartbeat: 'heartbeat',
    })
  })

  it('accepts AES keys of 16, 24, or 32 printable characters and a 16-character IV', () => {
    const key16 = 'k'.repeat(16)
    expect(aesProblems({ mode: 'ecb', key: key16, iv: '' })).toEqual({})
    expect(aesProblems({ mode: 'ecb', key: 'k'.repeat(24), iv: 'i'.repeat(16) })).toEqual({})
    expect(aesProblems({ mode: 'cbc', key: 'k'.repeat(32), iv: '' })).toEqual({ iv: 'iv_required' })
    expect(aesProblems({ mode: 'cbc', key: 'k'.repeat(20), iv: 'short' })).toEqual({ key: 'key', iv: 'iv' })
    expect(aesProblems({ mode: 'ecb', key: `${'k'.repeat(15)} `, iv: '' })).toEqual({ key: 'key' })
  })
})
