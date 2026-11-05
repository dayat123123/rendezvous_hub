import { createMemoryHistory } from '@tanstack/react-router'
import { describe, expect, it } from 'vitest'

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

  it('keeps /system reachable by Super Admins while it is hidden from navigation', async () => {
    expect((await open('/system', monitorFixture)).pathname).toBe('/system')
    expect((await open('/system', agentFixture)).pathname).toBe('/')
  })

  it('opens /features to Super Admins only and keeps a known tab from the search param', async () => {
    const location = await open('/features?tab=banners', monitorFixture)
    expect(location.pathname).toBe('/features')
    expect(location.search).toEqual({ tab: 'banners' })
    expect((await open('/features?tab=features', agentFixture)).pathname).toBe('/')
  })

  it('redirects the old /app address to Fitur & Kampanye or Pengaturan', async () => {
    for (const tab of ['features', 'banners'] as const) {
      const location = await open(`/app?tab=${tab}`, monitorFixture)
      expect(location.pathname).toBe('/features')
      expect(location.search).toEqual({ tab })
    }

    const bare = await open('/app', monitorFixture)
    expect(bare.pathname).toBe('/features')
    expect(bare.search).toEqual({})

    const unknown = await open('/app?tab=backup', monitorFixture)
    expect(unknown.pathname).toBe('/features')
    expect(unknown.search).toEqual({})

    expect((await open('/app?tab=connection', monitorFixture)).pathname).toBe('/settings')
  })

  it('keeps the old /app address closed to accounts without Super Admin access', async () => {
    for (const path of ['/app', '/app?tab=banners', '/app?tab=connection']) {
      expect((await open(path, agentFixture)).pathname).toBe('/')
    }
  })
})
