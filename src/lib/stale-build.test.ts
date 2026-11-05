import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { isStaleBuildError, reloadForNewBuild, watchStaleBuild } from './stale-build'

const reload = vi.fn()

beforeEach(() => {
  window.sessionStorage.clear()
  reload.mockClear()
  vi.stubGlobal('location', { ...window.location, reload })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('stale build handling', () => {
  it('recognises the browser errors of a removed chunk', () => {
    expect(
      isStaleBuildError(new TypeError('Failed to fetch dynamically imported module: /assets/en-1.js')),
    ).toBe(true)
    expect(isStaleBuildError(new TypeError('Importing a module script failed.'))).toBe(true)
    expect(isStaleBuildError(new TypeError('error loading dynamically imported module'))).toBe(true)
    expect(isStaleBuildError(new Error('agent_required'))).toBe(false)
    expect(isStaleBuildError('nope')).toBe(false)
  })

  it('reloads once and refuses to loop within the guard window', () => {
    expect(reloadForNewBuild(1_000_000)).toBe(true)
    expect(reloadForNewBuild(1_010_000)).toBe(false)
    expect(reloadForNewBuild(1_040_000)).toBe(true)
    expect(reload).toHaveBeenCalledTimes(2)
  })

  it('reloads on a Vite preload error and prevents the unhandled rejection', () => {
    const stop = watchStaleBuild()
    const event = new Event('vite:preloadError', { cancelable: true })
    window.dispatchEvent(event)
    expect(reload).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(true)
    stop()
  })
})
