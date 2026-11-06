import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { monitorFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'

import type * as ApiModule from '../api'
import { settingsApi } from '../api'
import type { SettingEntry } from '../types'
import { AssignmentSection } from './assignment-section'

vi.mock('../api', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>()
  return { ...actual, settingsApi: { ...actual.settingsApi, settings: vi.fn(), setSetting: vi.fn() } }
})

const entry = (key: string, value: unknown): SettingEntry => ({
  key,
  value,
  description: null,
  version: 1,
  updated_at: null,
  updated_by: null,
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(settingsApi.settings).mockResolvedValue([
    entry('assignment.mode', 'claim'),
    entry('ticket.auto_release_offline_minutes', 0),
    entry('ticket.auto_close_days', 3),
    entry('alerts.unclaimed_minutes', 10),
    entry('alerts.p1_unclaimed_minutes', 2),
  ])
  vi.mocked(settingsApi.setSetting).mockImplementation((key, value) =>
    Promise.resolve({ key, value, version: 2, updated_at: '2026-11-02T03:00:00.000Z' }),
  )
})

describe('AssignmentSection auto-close', () => {
  it('explains rating closes the ticket and saves the unrated limit in days', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AssignmentSection />, monitorFixture)

    const days = await screen.findByLabelText('Batas tanpa rating (hari, 1–30)')
    expect(days).toHaveValue('3')
    expect(days).toBeDisabled()
    expect(screen.getByText(/Tiket langsung ditutup setelah nasabah memberi rating/)).toBeVisible()

    const card = days.closest('section') as HTMLElement
    await user.click(within(card).getByRole('button', { name: 'Ubah Tutup tiket selesai' }))
    await user.clear(days)
    await user.type(days, '31')
    await user.click(within(card).getByRole('button', { name: 'Simpan' }))
    expect(screen.getByText('Isi angka 1–30')).toBeVisible()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()

    await user.clear(days)
    await user.type(days, '7')
    await user.click(within(card).getByRole('button', { name: 'Simpan' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Simpan batas tutup otomatis?' })
    expect(dialog).toHaveTextContent('ditutup otomatis setelah 7 hari')
    expect(settingsApi.setSetting).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))
    await waitFor(() => expect(settingsApi.setSetting).toHaveBeenCalledWith('ticket.auto_close_days', 7))
  })
})

describe('AssignmentSection mode', () => {
  it('keeps the mode locked, restores it on cancel, and switches only after confirmation', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AssignmentSection />, monitorFixture)

    const claim = await screen.findByRole('radio', { name: /Ambil tiket \(default\)/ })
    const auto = screen.getByRole('radio', { name: /Penugasan otomatis/ })
    expect(claim).toBeChecked()
    expect(auto).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Ubah Mode penugasan' }))
    await user.click(auto)
    expect(auto).toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Batal' }))
    expect(claim).toBeChecked()
    expect(auto).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Ubah Mode penugasan' }))
    await user.click(auto)
    const card = auto.closest('section') as HTMLElement
    await user.click(within(card).getByRole('button', { name: 'Simpan' }))
    const dialog = await screen.findByRole('alertdialog', {
      name: 'Ubah mode penugasan ke Penugasan otomatis?',
    })
    expect(settingsApi.setSetting).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))
    await waitFor(() => expect(settingsApi.setSetting).toHaveBeenCalledWith('assignment.mode', 'auto_assign'))
    await waitFor(() => expect(screen.getByRole('radio', { name: /Penugasan otomatis/ })).toBeDisabled())
  })
})
