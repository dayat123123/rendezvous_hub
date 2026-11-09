import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { monitorFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'

import type * as ApiModule from '../api'
import { settingsApi } from '../api'
import { AccountLimitCard } from './account-limit-card'

vi.mock('../api', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>()
  return { ...actual, settingsApi: { ...actual.settingsApi, settings: vi.fn(), setSetting: vi.fn() } }
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(settingsApi.settings).mockResolvedValue([
    {
      key: 'accounts.max_per_customer',
      value: 200,
      description: null,
      version: 1,
      updated_at: null,
      updated_by: null,
    },
  ])
  vi.mocked(settingsApi.setSetting).mockImplementation((key, value) =>
    Promise.resolve({ key, value, version: 2, updated_at: '2026-11-09T03:00:00.000Z' }),
  )
})

describe('AccountLimitCard', () => {
  it('keeps the limit locked, rejects values above 200, and saves after confirmation', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AccountLimitCard />, monitorFixture)

    const limit = await screen.findByLabelText('Batas rekening (1–200)')
    expect(limit).toHaveValue('200')
    expect(limit).toBeDisabled()

    const card = limit.closest('section') as HTMLElement
    await user.click(within(card).getByRole('button', { name: 'Ubah Batas rekening per nasabah' }))
    await user.clear(limit)
    await user.type(limit, '201')
    await user.click(within(card).getByRole('button', { name: 'Simpan' }))
    expect(screen.getByText('Isi angka 1–200')).toBeVisible()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()

    await user.clear(limit)
    await user.type(limit, '100')
    await user.click(within(card).getByRole('button', { name: 'Simpan' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Simpan batas rekening?' })
    expect(dialog).toHaveTextContent('paling banyak 100 rekening per nasabah')
    expect(settingsApi.setSetting).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))
    await waitFor(() => expect(settingsApi.setSetting).toHaveBeenCalledWith('accounts.max_per_customer', 100))
  })
})
