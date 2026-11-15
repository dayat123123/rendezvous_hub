import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { agentFixture, monitorFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'
import { Toaster } from '@/test/toast'

import { tradeShareApi } from '../api'
import type { TradeSetting } from '../types'
import { SettingsTab } from './settings-tab'

vi.mock('../api', () => ({
  tradeShareApi: { settings: vi.fn(), updateSetting: vi.fn() },
}))

const setting = (key: string, value: unknown): TradeSetting => ({
  key,
  value,
  description: null,
  version: 1,
  updated_at: '2026-11-15T01:00:00.000Z',
  updated_by: null,
})

const settings = [
  setting('trade_share.enabled', true),
  setting('trade_share.pilot_only', true),
  setting('trade_share.four_eyes', false),
  setting('trade_share.min_delay_minutes', 15),
  setting('trade_share.boards', ['RG']),
  setting('trade_share.eod_flush_time', '16:30'),
]

function renderTab(agent = monitorFixture) {
  return renderWithProviders(
    <>
      <SettingsTab />
      <Toaster />
    </>,
    agent,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(tradeShareApi.settings).mockResolvedValue(settings)
  vi.mocked(tradeShareApi.updateSetting).mockResolvedValue(settings)
})

describe('SettingsTab', () => {
  it('turns the kill switch off only after a confirmation with a reason', async () => {
    const user = userEvent.setup()
    renderTab()

    expect(await screen.findByText('Fitur menyala')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Matikan fitur' }))
    const confirm = await screen.findByRole('dialog', { name: 'Matikan Berbagi Trade?' })
    expect(within(confirm).getByText(/order yang belum dilaporkan dibatalkan/)).toBeInTheDocument()

    await user.click(within(confirm).getByRole('button', { name: 'Matikan fitur' }))
    expect(tradeShareApi.updateSetting).not.toHaveBeenCalled()

    await user.type(within(confirm).getByRole('textbox', { name: 'Alasan' }), 'Insiden pasar')
    await user.click(within(confirm).getByRole('button', { name: 'Matikan fitur' }))
    await waitFor(() =>
      expect(tradeShareApi.updateSetting).toHaveBeenCalledWith('trade_share.enabled', false, 'Insiden pasar'),
    )
  })

  it('edits the shared boards with a multiselect', async () => {
    const user = userEvent.setup()
    renderTab()

    await user.click(await screen.findByRole('button', { name: 'Ubah Board yang dibagikan' }))
    const dialog = await screen.findByRole('dialog', { name: 'Ubah Board yang dibagikan' })
    const boards = within(dialog).getByRole('group', { name: 'Board yang dibagikan' })
    expect(within(boards).getAllByRole('checkbox')).toHaveLength(4)
    await user.click(within(boards).getByRole('checkbox', { name: /TN/ }))
    await user.click(within(boards).getByRole('checkbox', { name: /RG/ }))
    await user.click(within(boards).getByRole('checkbox', { name: /NG/ }))
    await user.type(within(dialog).getByRole('textbox', { name: 'Alasan' }), 'Uji board')
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))

    await waitFor(() =>
      expect(tradeShareApi.updateSetting).toHaveBeenCalledWith(
        'trade_share.boards',
        ['TN', 'NG'],
        'Uji board',
      ),
    )
  })

  it('validates integer bounds and the HH:MM sweep time before saving', async () => {
    const user = userEvent.setup()
    renderTab()

    await user.click(await screen.findByRole('button', { name: 'Ubah Jeda minimum' }))
    const delay = await screen.findByRole('dialog', { name: 'Ubah Jeda minimum' })
    const input = within(delay).getByRole('textbox', { name: 'Jeda minimum' })
    await user.clear(input)
    await user.type(input, '2000')
    await user.type(within(delay).getByRole('textbox', { name: 'Alasan' }), 'Naikkan jeda')
    await user.click(within(delay).getByRole('button', { name: 'Simpan' }))
    expect(within(delay).getByRole('alert')).toHaveTextContent('Batas 1–1.440.')
    expect(tradeShareApi.updateSetting).not.toHaveBeenCalled()

    await user.clear(input)
    await user.type(input, '30')
    await user.click(within(delay).getByRole('button', { name: 'Simpan' }))
    await waitFor(() =>
      expect(tradeShareApi.updateSetting).toHaveBeenCalledWith(
        'trade_share.min_delay_minutes',
        30,
        'Naikkan jeda',
      ),
    )
  })

  it('is read-only for reviewers without the manage permission', async () => {
    renderTab({ ...agentFixture, roles: ['compliance'], trade_permissions: ['trade_share.review'] })

    expect(await screen.findByText('Fitur menyala')).toBeInTheDocument()
    expect(screen.getByText(/Hanya baca/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Matikan fitur' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Ubah / })).not.toBeInTheDocument()
    expect(screen.getByText('16:30 WIB')).toBeInTheDocument()
    expect(screen.getByText('15 menit')).toBeInTheDocument()
  })
})
