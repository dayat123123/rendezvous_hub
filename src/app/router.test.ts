import { createMemoryHistory } from '@tanstack/react-router'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/nav-config', () => ({ SHOW_SYSTEM_HEALTH_NAV: false, SHOW_TRADE_SHARE: true }))

import type { AgentProfile } from '@/features/presence/types'
import { agentFixture, monitorFixture } from '@/test/fixtures'

import { createAppRouter } from './router'

async function open(path: string, agent: AgentProfile) {
  const router = createAppRouter(agent)
  router.update({ ...router.options, history: createMemoryHistory({ initialEntries: [path] }) })
  await router.load()
  return router.state.location
}

describe('router', () => {
  it('sends Super Admins from /analytics to the Analitik tab of Komunitas', async () => {
    const location = await open('/analytics', monitorFixture)

    expect(location.pathname).toBe('/community')
    expect(location.search).toEqual({ tab: 'analytics' })
  })

  it('keeps /analytics closed to accounts without Super Admin access', async () => {
    expect((await open('/analytics', agentFixture)).pathname).toBe('/')
  })

  it('opens Komunitas to Super Admins without community permissions, but not to plain agents', async () => {
    expect((await open('/community', monitorFixture)).pathname).toBe('/community')
    expect((await open('/community', agentFixture)).pathname).toBe('/')
  })

  it('sends Super Admins from /system to Pengaturan > Kesehatan sistem, keeping a health tab', async () => {
    const location = await open('/system?tab=healer', monitorFixture)
    expect(location.pathname).toBe('/settings')
    expect(location.search).toEqual({ section: 'systemHealth', tab: 'healer' })
    expect((await open('/system?tab=backup', monitorFixture)).search).toEqual({ section: 'systemHealth' })
    expect((await open('/system', agentFixture)).pathname).toBe('/')
  })

  it('opens /system to relay operators but not to staff without the permission', async () => {
    const operator = { ...agentFixture, roles: ['community'], trade_permissions: ['trade_relay.operate'] }
    expect((await open('/system?tab=relay', operator)).pathname).toBe('/system')
    expect((await open('/', operator)).pathname).toBe('/system')
    expect((await open('/system', { ...operator, trade_permissions: ['trade_share.review'] })).pathname).toBe(
      '/compliance/trade-share',
    )
    expect((await open('/system', { ...operator, trade_permissions: [] })).pathname).toBe('/')
  })

  it('opens Berbagi Trade to Super Admins and trade_share staff, keeping a valid tab and profile', async () => {
    const profile = '44444444-4444-4444-8444-444444444444'
    const location = await open(`/compliance/trade-share?tab=monitoring&profile=${profile}`, monitorFixture)
    expect(location.pathname).toBe('/compliance/trade-share')
    expect(location.search).toEqual({ tab: 'monitoring', profile })

    const reviewer = { ...agentFixture, roles: ['compliance'], trade_permissions: ['trade_share.review'] }
    const router = createAppRouter(reviewer)
    router.update({
      ...router.options,
      history: createMemoryHistory({ initialEntries: ['/compliance/trade-share?tab=nope&profile=budi'] }),
    })
    await router.load()
    expect(router.state.location.pathname).toBe('/compliance/trade-share')
    expect(router.state.matches.at(-1)?.search).toEqual({})

    const manager = { ...agentFixture, roles: [], trade_permissions: ['trade_share.manage'] }
    expect((await open('/', manager)).pathname).toBe('/compliance/trade-share')

    expect((await open('/compliance/trade-share', { ...agentFixture, roles: ['compliance'] })).pathname).toBe(
      '/compliance',
    )
    expect((await open('/compliance/trade-share', agentFixture)).pathname).toBe('/')
  })

  it('opens a Pengaturan section from the address and drops unknown sections', async () => {
    const location = await open('/settings?section=tradeRelay', monitorFixture)
    expect(location.pathname).toBe('/settings')
    expect(location.search).toEqual({ section: 'tradeRelay' })

    const router = createAppRouter(monitorFixture)
    router.update({
      ...router.options,
      history: createMemoryHistory({ initialEntries: ['/settings?section=nope'] }),
    })
    await router.load()
    expect(router.state.matches.at(-1)?.search).toEqual({})

    expect((await open('/settings?section=tradeRelay', agentFixture)).pathname).toBe('/')
  }, 30_000)

  it('opens /features to Super Admins only and keeps a known tab from the search param', async () => {
    const location = await open('/features?tab=banners', monitorFixture)
    expect(location.pathname).toBe('/features')
    expect(location.search).toEqual({ tab: 'banners' })
    expect((await open('/features?tab=features', agentFixture)).pathname).toBe('/')
  })

  it('sends the old Fitur & versi and Tab Stream addresses to their new Komunitas tabs', async () => {
    const features = await open('/features?tab=features', monitorFixture)
    expect(features.pathname).toBe('/community')
    expect(features.search).toEqual({ tab: 'features' })
    const stream = await open('/features?tab=stream', monitorFixture)
    expect(stream.pathname).toBe('/community')
    expect(stream.search).toEqual({ tab: 'filters' })
  }, 30_000)

  it('redirects the old /app address to Komunitas, Banner & Popup, or Pengaturan', async () => {
    const features = await open('/app?tab=features', monitorFixture)
    expect(features.pathname).toBe('/community')
    expect(features.search).toEqual({ tab: 'features' })

    const banners = await open('/app?tab=banners', monitorFixture)
    expect(banners.pathname).toBe('/features')
    expect(banners.search).toEqual({})

    const bare = await open('/app', monitorFixture)
    expect(bare.pathname).toBe('/features')
    expect(bare.search).toEqual({})

    const unknown = await open('/app?tab=backup', monitorFixture)
    expect(unknown.pathname).toBe('/features')
    expect(unknown.search).toEqual({})

    expect((await open('/app?tab=connection', monitorFixture)).pathname).toBe('/settings')
  }, 30_000)

  it('keeps the old /app address closed to accounts without Super Admin access', async () => {
    for (const path of ['/app', '/app?tab=banners', '/app?tab=connection']) {
      expect((await open(path, agentFixture)).pathname).toBe('/')
    }
  })
})
