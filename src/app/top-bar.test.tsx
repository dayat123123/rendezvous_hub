import type * as RouterModule from '@tanstack/react-router'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { systemApi } from '@/features/system/api'
import { agentFixture, monitorFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'

import { TopBar } from './top-bar'

const nav = vi.hoisted(() => ({ SHOW_SYSTEM_HEALTH_NAV: false, SHOW_TRADE_SHARE: true }))

vi.mock('@/lib/nav-config', () => nav)

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof RouterModule>()
  const { createElement } = await import('react')
  return {
    ...actual,
    Link: ({ to, children }: { to: string; children: React.ReactNode }) =>
      createElement('a', { href: to }, children),
    useRouterState: ({ select }: { select: (state: { location: { pathname: string } }) => unknown }) =>
      select({ location: { pathname: '/compliance/cases' } }),
  }
})

const notices = vi.hoisted(() => ({ unseen: 0 }))

vi.mock('@/features/compliance/notices/api', () => ({
  noticesApi: {
    list: vi.fn(() => Promise.resolve({ unseen: notices.unseen, last_seen_id: 0, items: [] })),
    seen: vi.fn(() => Promise.resolve({ unseen: 0, last_seen_id: 0, items: [] })),
  },
}))

vi.mock('@/features/community/api', () => ({
  communityApi: {
    overview: vi.fn(() =>
      Promise.resolve({
        pending_posts: 2,
        scheduled_posts: 0,
        pending_campaigns: 1,
        open_reports: 4,
        accounts: 1,
        four_eyes: true,
        push_ready: false,
      }),
    ),
  },
}))

vi.mock('@/features/system/api', () => ({
  systemApi: {
    badge: vi.fn(() => Promise.resolve({ critical: 0, warning: 0, open: 0 })),
  },
}))

afterEach(() => {
  nav.SHOW_SYSTEM_HEALTH_NAV = false
  notices.unseen = 0
})

function navLinks() {
  return within(screen.getByRole('navigation', { name: 'Menu' }))
    .getAllByRole('link')
    .map((link) => link.textContent)
}

describe('TopBar', () => {
  it('shows status and capacity to agents', () => {
    renderWithProviders(<TopBar attention={0} caseAttention={0} />, agentFixture)

    expect(screen.getByRole('button', { name: 'Ubah status: Online' })).toBeInTheDocument()
    expect(screen.getByText('Aktif 1/5')).toBeInTheDocument()
    expect(screen.queryByText('Mode pantau')).not.toBeInTheDocument()
    expect(navLinks()).toEqual(['Layanan Nasabah'])
  })

  it('shows only Banner & Popup to the product role, without Settings or ticket menus', () => {
    renderWithProviders(<TopBar attention={0} caseAttention={0} />, { ...monitorFixture, roles: ['product'] })

    expect(navLinks()).toEqual(['Komunitas', 'Banner & Popup'])
    expect(screen.queryByText('Mode pantau')).not.toBeInTheDocument()
  })

  it('keeps the search button named and its shortcut on one line when the bar is crowded', () => {
    renderWithProviders(<TopBar attention={0} caseAttention={0} />, monitorFixture)

    const search = screen.getByRole('button', { name: 'Cari tiket atau nasabah… (Ctrl K)' })
    const shortcut = within(search).getByText('Ctrl K')
    expect(shortcut).toHaveClass('whitespace-nowrap', 'shrink-0')
    expect(search.parentElement).toHaveClass('@container')
  })

  it('shows monitor mode and admin menus to Super Admins without status or capacity', () => {
    renderWithProviders(<TopBar attention={0} caseAttention={0} />, monitorFixture)

    expect(screen.getByText('Mode pantau')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Ubah status/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/^Aktif \d+\/\d+$/)).not.toBeInTheDocument()
    expect(navLinks()).toEqual([
      'Layanan Nasabah',
      'Dashboard',
      'Laporan',
      'Komunitas',
      'Pusat Bantuan',
      'Banner & Popup',
      'Berbagi Trade',
      'Pengaturan',
    ])
    expect(screen.getByRole('link', { name: 'Komunitas' })).toHaveAttribute('href', '/community')
    expect(screen.getByRole('link', { name: 'Berbagi Trade' })).toHaveAttribute(
      'href',
      '/compliance/trade-share',
    )
    expect(screen.queryByRole('link', { name: 'Relay Trade' })).not.toBeInTheDocument()
  })

  it('shows Banner & Popup before Berbagi Trade and Pengaturan to Super Admins only', () => {
    const { unmount } = renderWithProviders(<TopBar attention={0} caseAttention={0} />, monitorFixture)
    expect(screen.getByRole('link', { name: 'Banner & Popup' })).toHaveAttribute('href', '/features')
    const links = navLinks()
    expect(links.indexOf('Banner & Popup')).toBe(links.indexOf('Berbagi Trade') - 1)
    expect(links.indexOf('Berbagi Trade')).toBe(links.indexOf('Pengaturan') - 1)
    unmount()

    for (const roles of [['cs_agent'], ['compliance'], ['community']]) {
      const view = renderWithProviders(<TopBar attention={0} caseAttention={0} />, { ...agentFixture, roles })
      expect(screen.queryByRole('link', { name: 'Banner & Popup' })).not.toBeInTheDocument()
      view.unmount()
    }
  })

  it('places Akun Nasabah and Komunitas before Pengaturan for CS accounts with customer access', () => {
    renderWithProviders(<TopBar attention={0} caseAttention={0} />, {
      ...monitorFixture,
      roles: ['cs_agent', 'cs_super_admin'],
      nasabah_permissions: ['online_user.view'],
    })
    expect(navLinks()).toEqual([
      'Layanan Nasabah',
      'Dashboard',
      'Laporan',
      'Akun Nasabah',
      'Komunitas',
      'Pusat Bantuan',
      'Banner & Popup',
      'Berbagi Trade',
      'Pengaturan',
    ])
  })

  it('hides Kesehatan sistem and shows open system problems on Pengaturan instead', async () => {
    vi.mocked(systemApi.badge).mockResolvedValue({ critical: 1, warning: 2, open: 3 })
    renderWithProviders(<TopBar attention={0} caseAttention={0} />, monitorFixture)

    expect(screen.queryByRole('link', { name: /Kesehatan sistem/ })).not.toBeInTheDocument()
    const settings = await screen.findByRole('link', { name: /Pengaturan/ })
    await waitFor(() => expect(settings).toHaveTextContent(/Pengaturans*1/))
  })

  it('shows Kesehatan sistem right before Pengaturan for Super Admins when the switch is on', () => {
    nav.SHOW_SYSTEM_HEALTH_NAV = true
    renderWithProviders(<TopBar attention={0} caseAttention={0} />, monitorFixture)

    expect(navLinks()).toEqual([
      'Layanan Nasabah',
      'Dashboard',
      'Laporan',
      'Komunitas',
      'Pusat Bantuan',
      'Banner & Popup',
      'Berbagi Trade',
      'Kesehatan sistem',
      'Pengaturan',
    ])
  })

  it('groups the compliance pages under one Kepatuhan menu for staff who also have other menus', async () => {
    const user = userEvent.setup()
    nav.SHOW_SYSTEM_HEALTH_NAV = true
    renderWithProviders(<TopBar attention={0} caseAttention={0} />, {
      ...monitorFixture,
      roles: ['cs_super_admin', 'compliance'],
      trade_permissions: ['trade_share.review'],
    })

    const links = navLinks()
    expect(links.at(-1)).toBe('Pengaturan')
    expect(links).not.toContain('Kasus')
    expect(links.indexOf('Kesehatan sistem')).toBeLessThan(links.indexOf('Pengaturan'))
    const menu = screen.getByRole('button', { name: 'Kepatuhan' })
    expect(menu).toHaveAttribute('data-current', 'true')
    await user.click(menu)
    const list = await screen.findByRole('menu')
    expect(
      within(list)
        .getAllByRole('link')
        .map((item) => item.textContent),
    ).toEqual([
      'Ringkasan',
      'Kasus',
      'Tenggat pengaduan',
      'Kebijakan konten',
      'Dokumen hukum',
      'Retensi data',
      'Berbagi Trade',
      'Jejak Audit',
      'Bukti',
    ])
    expect(within(list).getByText('Pengaduan nasabah')).toBeVisible()
    expect(within(list).getByText('Aturan')).toBeVisible()
    expect(within(list).getByText('Catatan & bukti')).toBeVisible()
  })

  it('adds Berbagi Trade to the compliance menus only with a trade permission', () => {
    const { unmount } = renderWithProviders(<TopBar attention={0} caseAttention={0} />, {
      ...agentFixture,
      roles: ['compliance'],
      trade_permissions: ['trade_share.review'],
    })
    const links = navLinks()
    expect(links.indexOf('Berbagi Trade')).toBe(links.indexOf('Retensi data') + 1)
    unmount()

    renderWithProviders(<TopBar attention={0} caseAttention={0} />, {
      ...agentFixture,
      roles: ['compliance'],
      trade_permissions: ['trade_relay.operate'],
    })
    expect(screen.queryByRole('link', { name: 'Berbagi Trade' })).not.toBeInTheDocument()
  })

  it('gives relay operators a Relay Trade menu that opens the system page', () => {
    renderWithProviders(<TopBar attention={0} caseAttention={0} />, {
      ...agentFixture,
      roles: ['community'],
      trade_permissions: ['trade_relay.operate'],
    })
    expect(navLinks()).toEqual(['Relay Trade'])
    expect(screen.getByRole('link', { name: 'Relay Trade' })).toHaveAttribute('href', '/system')
  })

  it('shows Berbagi Trade to non-compliance staff who manage trade sharing', () => {
    renderWithProviders(<TopBar attention={0} caseAttention={0} />, {
      ...agentFixture,
      trade_permissions: ['trade_share.manage'],
    })
    expect(navLinks()).toEqual(['Layanan Nasabah', 'Berbagi Trade'])
  })

  it('shows only Komunitas to community staff, with the items they can act on', async () => {
    renderWithProviders(<TopBar attention={0} caseAttention={0} />, {
      ...agentFixture,
      roles: ['community'],
      community_permissions: ['community.publish'],
    })
    expect(navLinks()).toEqual(['Komunitas'])
    expect(await screen.findByLabelText('3 perlu tindakan di Komunitas')).toBeInTheDocument()
  })

  it('shows Akun Nasabah after Layanan Nasabah to plain CS accounts with customer access', () => {
    renderWithProviders(<TopBar attention={0} caseAttention={0} />, {
      ...agentFixture,
      nasabah_permissions: ['online_user.view'],
    })
    expect(navLinks()).toEqual(['Layanan Nasabah', 'Akun Nasabah'])
  })

  it('marks unhandled critical system alerts in red on Kesehatan sistem', async () => {
    nav.SHOW_SYSTEM_HEALTH_NAV = true
    vi.mocked(systemApi.badge).mockResolvedValue({ critical: 2, warning: 3, open: 5 })
    renderWithProviders(<TopBar attention={0} caseAttention={0} />, monitorFixture)

    const count = await screen.findByLabelText('2 alert kritis belum ditangani')
    expect(count).toHaveTextContent('2')
    expect(count).toHaveClass('text-danger')
    expect(systemApi.badge).toHaveBeenCalled()
  })

  it('shows unhandled warnings in amber when nothing is critical', async () => {
    nav.SHOW_SYSTEM_HEALTH_NAV = true
    vi.mocked(systemApi.badge).mockResolvedValue({ critical: 0, warning: 1, open: 1 })
    renderWithProviders(<TopBar attention={0} caseAttention={0} />, monitorFixture)

    const count = await screen.findByLabelText('1 peringatan belum ditangani')
    expect(count).toHaveClass('text-warning')
  })

  it('does not ask for the system badge without Super Admin access', () => {
    nav.SHOW_SYSTEM_HEALTH_NAV = true
    vi.mocked(systemApi.badge).mockClear()
    renderWithProviders(<TopBar attention={0} caseAttention={0} />, agentFixture)

    expect(systemApi.badge).not.toHaveBeenCalled()
  })

  it('shows only Pusat Bantuan to the service content role', () => {
    renderWithProviders(<TopBar attention={0} caseAttention={0} />, {
      ...agentFixture,
      roles: ['cs_content'],
    })
    expect(navLinks()).toEqual(['Pusat Bantuan'])
    expect(screen.getByRole('link', { name: 'Pusat Bantuan' })).toHaveAttribute('href', '/content')
  })

  it('lists Dokumen hukum among the compliance menus', () => {
    renderWithProviders(<TopBar attention={0} caseAttention={0} />, {
      ...agentFixture,
      roles: ['compliance'],
    })
    expect(navLinks()).toEqual([
      'Ringkasan',
      'Kasus',
      'Tenggat pengaduan',
      'Kebijakan konten',
      'Dokumen hukum',
      'Retensi data',
      'Jejak Audit',
      'Bukti',
    ])
  })

  it('shows unseen case notices on Ringkasan and in the case notice button for compliance', async () => {
    notices.unseen = 2
    renderWithProviders(<TopBar attention={0} caseAttention={0} />, {
      ...agentFixture,
      roles: ['compliance'],
    })

    expect(await screen.findByRole('button', { name: '2 kasus baru belum dilihat' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Ringkasan/ })).toHaveTextContent('Ringkasan2')
  })

  it('gives Super Admins the case notice button and plain agents none', () => {
    const { unmount } = renderWithProviders(<TopBar attention={0} caseAttention={0} />, monitorFixture)
    expect(screen.getByRole('button', { name: 'Kasus baru' })).toBeInTheDocument()
    unmount()
    renderWithProviders(<TopBar attention={0} caseAttention={0} />, agentFixture)
    expect(screen.queryByRole('button', { name: 'Kasus baru' })).not.toBeInTheDocument()
  })

  it('offers profile, performance, password and sign-out-everywhere in the account menu', async () => {
    const user = userEvent.setup()
    renderWithProviders(<TopBar attention={0} caseAttention={0} />, agentFixture)
    expect(screen.getByRole('button', { name: 'Kinerja saya' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Akun' }))
    const items = (await screen.findAllByRole('menuitem')).map((item) => item.textContent)
    expect(items).toEqual(expect.arrayContaining(['Profil saya', 'Kinerja saya', 'Ganti password']))
    expect(items).toContain('Keluar dari semua perangkat')

    await user.click(screen.getByRole('menuitem', { name: 'Ganti password' }))
    expect(
      await screen.findByRole('dialog', { name: 'Ganti password' }, { timeout: 5_000 }),
    ).toBeInTheDocument()
  })

  it('hides Kinerja saya from staff who do not handle tickets', async () => {
    const user = userEvent.setup()
    renderWithProviders(<TopBar attention={0} caseAttention={0} />, {
      ...agentFixture,
      roles: ['compliance'],
    })
    expect(screen.queryByRole('button', { name: 'Kinerja saya' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Akun' }))
    const items = (await screen.findAllByRole('menuitem')).map((item) => item.textContent)
    expect(items).toContain('Profil saya')
    expect(items).toContain('Ganti password')
    expect(items).not.toContain('Kinerja saya')
  })
})
