import type * as RouterModule from '@tanstack/react-router'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import i18n, { loadStrings } from '@/i18n'
import { usePreferences } from '@/lib/preferences'
import { monitorFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'

import { TopBar } from './top-bar'

vi.mock('@/lib/nav-config', () => ({ SHOW_SYSTEM_HEALTH_NAV: false }))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof RouterModule>()
  const { createElement } = await import('react')
  return {
    ...actual,
    Link: ({ to, children }: { to: string; children: React.ReactNode }) =>
      createElement('a', { href: to }, children),
  }
})

vi.mock('@/features/community/api', () => ({
  communityApi: {
    overview: vi.fn(() =>
      Promise.resolve({
        pending_posts: 0,
        scheduled_posts: 0,
        pending_campaigns: 0,
        open_reports: 0,
        accounts: 0,
        four_eyes: true,
        push_ready: true,
      }),
    ),
  },
}))

vi.mock('@/features/system/api', () => ({
  systemApi: { badge: vi.fn(() => Promise.resolve({ critical: 0, warning: 0, open: 0 })) },
}))

afterEach(async () => {
  usePreferences.getState().setLanguage('id')
  await waitFor(() => expect(i18n.language).toBe('id'))
})

describe('TopBar language menu', () => {
  it('switches the console and every loaded feature bundle to English from the account menu', async () => {
    await loadStrings('platform', 'policy', 'moderation', 'evidence', 'account', 'labels', 'replies')
    const user = userEvent.setup()
    renderWithProviders(<TopBar attention={0} caseAttention={0} />, monitorFixture)
    expect(screen.getByRole('link', { name: 'Pengaturan' })).toBeInTheDocument()

    screen.getByRole('button', { name: 'Akun' }).focus()
    await user.keyboard('{Enter}')
    ;(await screen.findByRole('menuitem', { name: 'Bahasa' })).focus()
    await user.keyboard('{ArrowRight}')
    ;(await screen.findByRole('menuitemradio', { name: 'English' })).focus()
    await user.keyboard('{Enter}')

    await waitFor(() => expect(i18n.language).toBe('en'))
    expect(await screen.findByRole('link', { name: 'Settings' })).toBeInTheDocument()
    expect(i18n.t('account.profile.title')).toBe('My profile')
    expect(i18n.t('labels.label')).toBe('Label')
    expect(window.localStorage.getItem('cs-console.language')).toBe('en')
    expect(document.documentElement.lang).toBe('en')
  })
})
