import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as SettingsApiModule from '@/features/settings/api'
import { settingsApi } from '@/features/settings/api'
import type { SettingEntry } from '@/features/settings/types'
import { monitorFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'

import { digestTimeSetting, validDigestTime } from '../digest-time'
import { DigestTimeCard } from './digest-time-card'

vi.mock('@/features/settings/api', async (importOriginal) => {
  const actual = await importOriginal<typeof SettingsApiModule>()
  return { ...actual, settingsApi: { ...actual.settingsApi, settings: vi.fn(), setSetting: vi.fn() } }
})

const entry = (value: SettingEntry['value']): SettingEntry => ({
  key: 'notifications.watchlist_digest_time',
  value,
  description: null,
  version: 1,
  updated_at: null,
  updated_by: null,
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(settingsApi.settings).mockResolvedValue([entry('17:05')])
  vi.mocked(settingsApi.setSetting).mockImplementation((key, value) =>
    Promise.resolve({ key, value, version: 2, updated_at: '2026-11-11T09:00:00.000Z' }),
  )
})

describe('digest time helpers', () => {
  it('accepts only HH:MM within a day', () => {
    expect(validDigestTime('00:00')).toBe(true)
    expect(validDigestTime('23:59')).toBe(true)
    expect(validDigestTime('24:00')).toBe(false)
    expect(validDigestTime('6:30')).toBe(false)
    expect(validDigestTime('06:30:00')).toBe(false)
  })

  it('falls back to 17:05 when the setting is missing or malformed', () => {
    expect(digestTimeSetting([entry('06:30')])).toBe('06:30')
    expect(digestTimeSetting([entry(630)])).toBe('17:05')
    expect(digestTimeSetting([])).toBe('17:05')
  })
})

describe('DigestTimeCard', () => {
  it('keeps the time locked and saves the new time after confirmation', async () => {
    const user = userEvent.setup()
    renderWithProviders(<DigestTimeCard />, monitorFixture)

    const time = await screen.findByLabelText('Jam kirim (WIB)')
    expect(time).toHaveValue('17:05')
    expect(time).toBeDisabled()

    const card = time.closest('section') as HTMLElement
    await user.click(within(card).getByRole('button', { name: 'Ubah Jam ringkasan saham pantauan' }))
    fireEvent.change(time, { target: { value: '06:30' } })
    await user.click(within(card).getByRole('button', { name: 'Simpan' }))

    const dialog = await screen.findByRole('alertdialog', { name: 'Ubah jam ringkasan?' })
    expect(dialog).toHaveTextContent('setiap hari pukul 06:30 WIB')
    expect(settingsApi.setSetting).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))
    await waitFor(() =>
      expect(settingsApi.setSetting).toHaveBeenCalledWith('notifications.watchlist_digest_time', '06:30'),
    )
  })

  it('rejects an empty time without asking for confirmation', async () => {
    const user = userEvent.setup()
    renderWithProviders(<DigestTimeCard />, monitorFixture)

    const time = await screen.findByLabelText('Jam kirim (WIB)')
    const card = time.closest('section') as HTMLElement
    await user.click(within(card).getByRole('button', { name: 'Ubah Jam ringkasan saham pantauan' }))
    fireEvent.change(time, { target: { value: '' } })
    await user.click(within(card).getByRole('button', { name: 'Simpan' }))

    expect(screen.getByText('Isi jam dengan format HH:MM, 00:00–23:59.')).toBeVisible()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(settingsApi.setSetting).not.toHaveBeenCalled()
  })
})
