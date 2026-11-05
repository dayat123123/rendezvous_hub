import type * as RouterModule from '@tanstack/react-router'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { agentFixture, monitorFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'

import { useOverlays } from '../bus'
import { CommandPalette } from './command-palette'

const nav = vi.hoisted(() => ({ SHOW_SYSTEM_HEALTH_NAV: false }))
const navigate = vi.hoisted(() => vi.fn())

vi.mock('@/lib/nav-config', () => nav)

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof RouterModule>()
  return { ...actual, useNavigate: () => navigate }
})

vi.mock('@/features/tickets/api', () => ({
  ticketsApi: {
    lists: vi.fn(() => new Promise(() => undefined)),
    search: vi.fn(() => new Promise(() => undefined)),
    topics: vi.fn(() => new Promise(() => undefined)),
  },
}))

beforeEach(() => {
  navigate.mockClear()
  useOverlays.setState({ palette: true })
})

afterEach(() => {
  nav.SHOW_SYSTEM_HEALTH_NAV = false
  useOverlays.setState({ palette: false })
})

describe('CommandPalette', () => {
  it('opens the Analitik tab of Komunitas for Super Admins', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CommandPalette onOpenTicket={vi.fn()} />, monitorFixture)

    await user.click(screen.getByRole('option', { name: 'Buka Analitik' }))

    expect(navigate).toHaveBeenCalledWith({ to: '/community', search: { tab: 'analytics' } })
  })

  it('hides Kesehatan sistem while the switch is off', () => {
    renderWithProviders(<CommandPalette onOpenTicket={vi.fn()} />, monitorFixture)

    expect(screen.getByRole('option', { name: 'Buka Pengaturan' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Buka Kesehatan sistem' })).not.toBeInTheDocument()
  })

  it('lists Kesehatan sistem again when the switch is on', () => {
    nav.SHOW_SYSTEM_HEALTH_NAV = true
    renderWithProviders(<CommandPalette onOpenTicket={vi.fn()} />, monitorFixture)

    expect(screen.getByRole('option', { name: 'Buka Kesehatan sistem' })).toBeInTheDocument()
  })

  it('lists Fitur & Kampanye and each of its tabs for Super Admins', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CommandPalette onOpenTicket={vi.fn()} />, monitorFixture)

    expect(screen.getByRole('option', { name: 'Buka Fitur & Kampanye' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Buka Fitur & Kampanye › Fitur & versi' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /Koneksi aplikasi/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /Aplikasi/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('option', { name: 'Buka Fitur & Kampanye › Banner & popup' }))

    expect(navigate).toHaveBeenCalledWith({ to: '/features', search: { tab: 'banners' } })
  })

  it('opens Fitur & Kampanye on its default tab', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CommandPalette onOpenTicket={vi.fn()} />, monitorFixture)

    await user.click(screen.getByRole('option', { name: 'Buka Fitur & Kampanye' }))

    expect(navigate).toHaveBeenCalledWith({ to: '/features', search: undefined })
  })

  it('keeps Fitur & Kampanye out of the palette for CS agents', () => {
    renderWithProviders(<CommandPalette onOpenTicket={vi.fn()} />, agentFixture)

    expect(screen.queryByRole('option', { name: /Fitur & Kampanye/ })).not.toBeInTheDocument()
  })
})
