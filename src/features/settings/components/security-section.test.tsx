import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { monitorFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'

import type * as ApiModule from '../api'
import { settingsApi } from '../api'
import { SecuritySection } from './security-section'

vi.mock('../api', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>()
  return { ...actual, settingsApi: { ...actual.settingsApi, settings: vi.fn(), setSetting: vi.fn() } }
})

const entry = (key: string, value: unknown) => ({
  key,
  value: value as never,
  description: null,
  version: 1,
  updated_at: null,
  updated_by: null,
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(settingsApi.settings).mockResolvedValue([
    entry('security.mfa_required_roles', ['cs_super_admin']),
    entry('security.login_max_failures', 5),
    entry('security.login_lock_minutes', 15),
  ])
  vi.mocked(settingsApi.setSetting).mockImplementation((key, value) =>
    Promise.resolve({ key, value, version: 2, updated_at: '2026-11-20T03:00:00.000Z' }),
  )
})

describe('SecuritySection', () => {
  it('keeps Super Admin required and saves extra 2FA roles after confirmation', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SecuritySection />, monitorFixture)

    const superAdmin = await screen.findByRole('checkbox', { name: /Super Admin/ })
    expect(superAdmin).toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Ubah Wajib 2FA' }))
    expect(superAdmin).toBeDisabled()
    await user.click(screen.getByRole('checkbox', { name: 'Kepatuhan' }))
    await user.click(screen.getByRole('button', { name: 'Simpan' }))

    const dialog = await screen.findByRole('alertdialog', { name: 'Simpan peran wajib 2FA?' })
    expect(settingsApi.setSetting).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))
    await waitFor(() =>
      expect(settingsApi.setSetting).toHaveBeenCalledWith('security.mfa_required_roles', [
        'cs_super_admin',
        'compliance',
      ]),
    )
  })

  it('validates and saves the lockout limits together', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SecuritySection />, monitorFixture)

    await user.click(await screen.findByRole('button', { name: 'Ubah Kunci akun' }))
    const failures = screen.getByLabelText('Batas password salah (3–20 kali)')
    const minutes = screen.getByLabelText('Lama kunci (1–1440 menit)')
    await user.clear(failures)
    await user.type(failures, '2')
    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    expect(await screen.findByText('Isi angka 3–20')).toBeInTheDocument()
    expect(settingsApi.setSetting).not.toHaveBeenCalled()

    await user.clear(failures)
    await user.type(failures, '4')
    await user.clear(minutes)
    await user.type(minutes, '30')
    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Simpan aturan kunci akun?' })
    expect(dialog).toHaveTextContent('30 menit setelah 4 kali')
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))
    await waitFor(() => {
      expect(settingsApi.setSetting).toHaveBeenCalledWith('security.login_max_failures', 4)
      expect(settingsApi.setSetting).toHaveBeenCalledWith('security.login_lock_minutes', 30)
    })
  })
})
