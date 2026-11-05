const RELOAD_KEY = 'cs-console.stale-reload-at'
const RELOAD_GUARD_MS = 30_000

const chunkFailure =
  /dynamically imported module|importing a module script failed|error loading dynamically imported module|failed to fetch|loading (css )?chunk/i

export function isStaleBuildError(error: unknown) {
  if (!(error instanceof Error)) return false
  return error.name === 'ChunkLoadError' || chunkFailure.test(error.message)
}

export function reloadForNewBuild(now = Date.now()) {
  try {
    const last = Number(window.sessionStorage.getItem(RELOAD_KEY) ?? 0)
    if (now - last < RELOAD_GUARD_MS) return false
    window.sessionStorage.setItem(RELOAD_KEY, String(now))
  } catch {
    return false
  }
  window.location.reload()
  return true
}

export function watchStaleBuild() {
  const listener = (event: Event) => {
    if (reloadForNewBuild()) event.preventDefault()
  }
  window.addEventListener('vite:preloadError', listener)
  return () => window.removeEventListener('vite:preloadError', listener)
}
