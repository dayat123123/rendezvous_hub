import { describe, expect, it } from 'vitest'

import {
  aesProblems,
  commandPending,
  commandProgress,
  composeAddress,
  configPickup,
  connectionProblems,
  cooldownSeconds,
  counterEntries,
  instanceCommandState,
  instanceHealth,
  newestInstance,
  parseAddress,
  relayPending,
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

  it('shows a relay without an iProxy address as not configured instead of disconnected', () => {
    const now = new Date('2026-11-15T03:02:30.000Z')
    expect(
      instanceHealth(
        instance({ reported_at: '2026-11-15T03:02:00.000Z', connected: false, state: 'not_configured' }),
        now,
      ),
    ).toBe('idle')
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
  it('splits a stored tcp://host:port address and composes it back', () => {
    expect(parseAddress('tcp://olt-uat.local:9990')).toEqual({ host: 'olt-uat.local', port: '9990' })
    expect(parseAddress(' tcp://10.0.0.5:1 ')).toEqual({ host: '10.0.0.5', port: '1' })
    expect(parseAddress(null)).toEqual({ host: '', port: '' })
    expect(parseAddress('10.0.0.5:9990')).toEqual({ host: '', port: '' })
    expect(composeAddress({ host: ' 10.0.0.5 ', port: ' 9990 ' })).toBe('tcp://10.0.0.5:9990')
    expect(composeAddress(parseAddress('tcp://a.b:7'))).toBe('tcp://a.b:7')
  })

  it('validates host, port, identity, and heartbeat like the server', () => {
    expect(
      connectionProblems({ host: '10.0.0.5', port: '9990', identity: 'social_trade_relay', heartbeat: '4' }),
    ).toEqual({})
    expect(connectionProblems({ host: 'olt', port: '1', identity: '', heartbeat: '60' })).toEqual({})
    expect(connectionProblems({ host: '', port: '', identity: 'ab', heartbeat: '61' })).toEqual({
      host: 'host',
      port: 'port',
      identity: 'identity',
      heartbeat: 'heartbeat',
    })
    expect(connectionProblems({ host: 'olt uat', port: '70000', identity: 'abc', heartbeat: '0' })).toEqual({
      host: 'host',
      port: 'port',
      heartbeat: 'heartbeat',
    })
    expect(connectionProblems({ host: 'h'.repeat(254), port: '0', identity: 'abc', heartbeat: '4' })).toEqual(
      {
        host: 'host',
        port: 'port',
      },
    )
  })

  it('tells whether the relay reported after the last config change', () => {
    const now = new Date('2026-11-15T03:01:00.000Z')
    const base = view({ updated_at: '2026-11-15T03:00:30.000Z' })
    expect(configPickup({ ...base, instances: [] }, now)).toBe('no_relay')
    expect(
      configPickup({ ...base, instances: [instance({ reported_at: '2026-11-15T03:00:10.000Z' })] }, now),
    ).toBe('pending')
    expect(
      configPickup({ ...base, instances: [instance({ reported_at: '2026-11-15T03:00:50.000Z' })] }, now),
    ).toBe('reported')
    expect(
      configPickup({ ...base, instances: [instance({ reported_at: '2026-11-15T02:55:00.000Z' })] }, now),
    ).toBe('stale')
    expect(
      relayPending({ ...base, instances: [instance({ reported_at: '2026-11-15T03:00:10.000Z' })] }, now),
    ).toBe(true)
    expect(
      relayPending(
        { ...base, instances: [instance({ reported_at: '2026-11-15T03:00:10.000Z' })] },
        new Date('2026-11-15T03:20:00.000Z'),
      ),
    ).toBe(false)
    expect(relayPending(undefined, now)).toBe(false)
    expect(
      newestInstance({
        instances: [
          instance({ instance: 'a', reported_at: '2026-11-15T03:00:00.000Z' }),
          instance({ instance: 'b', reported_at: '2026-11-15T03:00:40.000Z' }),
        ],
      })?.instance,
    ).toBe('b')
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
