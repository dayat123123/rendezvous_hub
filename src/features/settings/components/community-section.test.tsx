import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { policyVersionsApi } from '@/features/compliance/policy-versions/api'
import type * as PolicyApiModule from '@/features/compliance/policy-versions/api'
import { monitorFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'

import type * as ApiModule from '../api'
import { settingsApi } from '../api'
import { CommunitySection } from './community-section'

vi.mock('../api', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>()
  return { ...actual, settingsApi: { ...actual.settingsApi, settings: vi.fn(), setSetting: vi.fn() } }
})

vi.mock('@/features/compliance/policy-versions/api', async (importOriginal) => {
  const actual = await importOriginal<typeof PolicyApiModule>()
  return {
    ...actual,
    policyVersionsApi: { ...actual.policyVersionsApi, fourEyes: vi.fn(), setFourEyes: vi.fn() },
  }
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(settingsApi.settings).mockResolvedValue([
    {
      key: 'community.four_eyes',
      value: true,
      description: null,
      version: 1,
      updated_at: null,
      updated_by: null,
    },
  ])
  vi.mocked(settingsApi.setSetting).mockImplementation((key, value) =>
    Promise.resolve({ key, value, version: 2, updated_at: '2026-11-02T03:00:00.000Z' }),
  )
  vi.mocked(policyVersionsApi.fourEyes).mockResolvedValue({
    enabled: true,
    version: 1,
    updated_at: '2026-11-01T03:00:00.000Z',
    updated_by: 'Kirana',
  })
})

describe('CommunitySection', () => {
  it('keeps the four-eyes rule locked and turns it off only after confirmation', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CommunitySection />, monitorFixture)

    const toggle = await screen.findByRole('switch', { name: 'Aturan empat mata' })
    expect(toggle).toBeChecked()
    expect(toggle).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Ubah Aturan empat mata' }))
    await user.click(toggle)
    expect(toggle).not.toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Batal' }))
    expect(toggle).toBeChecked()
    expect(toggle).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Ubah Aturan empat mata' }))
    await user.click(toggle)
    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Matikan aturan empat mata?' })
    expect(dialog).toHaveTextContent('tanpa diperiksa staf lain')
    expect(settingsApi.setSetting).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))
    await waitFor(() => expect(settingsApi.setSetting).toHaveBeenCalledWith('community.four_eyes', false))
  })

  it('confirms the content policy four-eyes change before saving', async () => {
    const user = userEvent.setup()
    vi.mocked(policyVersionsApi.setFourEyes).mockResolvedValue({
      enabled: false,
      version: 2,
      updated_at: '2026-11-02T03:00:00.000Z',
      updated_by: 'Sinta',
    })
    renderWithProviders(<CommunitySection />, monitorFixture)

    const toggle = await screen.findByRole('switch', { name: 'Empat mata kebijakan konten' })
    expect(toggle).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Ubah Empat mata kebijakan konten' }))
    await user.click(toggle)
    const card = toggle.closest('section') as HTMLElement
    await user.click(within(card).getByRole('button', { name: 'Simpan' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Matikan empat mata kebijakan konten?' })
    expect(policyVersionsApi.setFourEyes).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))
    await waitFor(() => expect(policyVersionsApi.setFourEyes).toHaveBeenCalledWith(false))
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: 'Empat mata kebijakan konten' })).toBeDisabled(),
    )
  })
})
