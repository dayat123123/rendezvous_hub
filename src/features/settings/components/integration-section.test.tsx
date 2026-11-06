import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { monitorFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'

import type * as ApiModule from '../api'
import { settingsApi } from '../api'
import type { IntegrationStatus } from '../types'
import { IntegrationSection } from './integration-section'
import { SettingsPage } from './settings-page'

vi.mock('../api', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>()
  return {
    ...actual,
    settingsApi: {
      ...actual.settingsApi,
      accounts: vi.fn(() => Promise.resolve([])),
      options: vi.fn(() => Promise.resolve({ teams: [], skills: [] })),
      integration: vi.fn(),
      testIntegration: vi.fn(),
      saveIntegration: vi.fn(),
      clearIntegration: vi.fn(),
    },
  }
})

const notSet: IntegrationStatus = {
  url: '',
  client_id: '',
  configured: false,
  connected_at: null,
  connected_by: null,
  public_key: 'MCowBQYDK2VwAyEAkey',
  key_configured: true,
}

const active: IntegrationStatus = {
  ...notSet,
  url: 'http://10.0.0.5:9001/csAdmin',
  client_id: 'web-cs',
  configured: true,
  connected_at: '2026-11-02T03:00:00.000Z',
  connected_by: 'Adi',
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(settingsApi.integration).mockResolvedValue(notSet)
})

async function unlock(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Ubah Alamat dan client id' }))
}

async function confirmSave(user: ReturnType<typeof userEvent.setup>) {
  const dialog = await screen.findByRole('alertdialog', {
    name: 'Simpan dan aktifkan integrasi API Nasabah?',
  })
  await user.click(within(dialog).getByRole('button', { name: 'Simpan & aktifkan' }))
}

describe('IntegrationSection', () => {
  it('starts empty with a not-set-up badge and no broker-specific config name', async () => {
    renderWithProviders(<IntegrationSection />, monitorFixture)

    expect(await screen.findByText('Belum diatur')).toBeVisible()
    expect(screen.getByLabelText('Alamat API Nasabah')).toHaveValue('')
    expect(screen.getByLabelText('Alamat API Nasabah')).toBeDisabled()
    expect(screen.getByLabelText('Client id')).toHaveValue('')
    expect(screen.getByLabelText('Client id')).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Simpan & aktifkan' })).not.toBeInTheDocument()
    expect(screen.getByText(/Menu Akun Nasabah belum tampil untuk CS/)).toBeVisible()
    expect(screen.getByLabelText('Kunci integrasi').textContent).toContain('client_id       = <client id>')
    expect(document.body.textContent).not.toMatch(/csAdminEL|docker\/\.env/)
  })

  it('requires both fields before testing or saving', async () => {
    const user = userEvent.setup()
    renderWithProviders(<IntegrationSection />, monitorFixture)

    await unlock(user)
    expect(screen.getByLabelText('Alamat API Nasabah')).toHaveFocus()
    await user.click(screen.getByRole('button', { name: 'Simpan & aktifkan' }))
    expect(screen.getByText('Alamat API Nasabah wajib diisi')).toBeVisible()
    expect(screen.getByText('Client id wajib diisi')).toBeVisible()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tes koneksi' }))
    expect(settingsApi.saveIntegration).not.toHaveBeenCalled()
    expect(settingsApi.testIntegration).not.toHaveBeenCalled()
  })

  it('keeps the integration off when the connection test fails', async () => {
    const user = userEvent.setup()
    vi.mocked(settingsApi.saveIntegration).mockResolvedValue({
      saved: false,
      check: { result: 'refused', status: 401, duration_ms: 12 },
      status: notSet,
    })
    renderWithProviders(<IntegrationSection />, monitorFixture)

    await unlock(user)
    await user.type(screen.getByLabelText('Alamat API Nasabah'), 'http://10.0.0.5:9001/csAdmin/')
    await user.type(screen.getByLabelText('Client id'), 'web-cs')
    expect(screen.getByLabelText('Kunci integrasi').textContent).toContain('client_id       = web-cs')
    await user.click(screen.getByRole('button', { name: 'Simpan & aktifkan' }))
    expect(settingsApi.saveIntegration).not.toHaveBeenCalled()
    await confirmSave(user)

    expect(settingsApi.saveIntegration).toHaveBeenCalledWith('http://10.0.0.5:9001/csAdmin', 'web-cs')
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Belum disimpan. API Nasabah menolak kunci integrasi. Pastikan client_id dan public_key di config CS Admin service',
    )
    expect(screen.getByText('Belum diatur')).toBeVisible()
    expect(screen.getByLabelText('Alamat API Nasabah')).toBeEnabled()
  })

  it('activates after a successful test and can be disconnected', async () => {
    const user = userEvent.setup()
    vi.mocked(settingsApi.saveIntegration).mockResolvedValue({
      saved: true,
      check: { result: 'ok', status: 200, duration_ms: 30 },
      status: active,
    })
    vi.mocked(settingsApi.clearIntegration).mockResolvedValue(notSet)
    renderWithProviders(<IntegrationSection />, monitorFixture)

    await unlock(user)
    await user.type(screen.getByLabelText('Alamat API Nasabah'), 'http://10.0.0.5:9001/csAdmin')
    await user.type(screen.getByLabelText('Client id'), 'web-cs')
    await user.click(screen.getByRole('button', { name: 'Simpan & aktifkan' }))
    await confirmSave(user)

    expect(await screen.findByText('Aktif')).toBeVisible()
    expect(screen.getByText(/^Aktif sejak .*, diatur oleh Adi\.$/)).toBeVisible()
    expect(screen.getByLabelText('Alamat API Nasabah')).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Simpan & aktifkan' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Putuskan' }))
    const confirm = screen.getByRole('alertdialog', { name: 'Putuskan integrasi API Nasabah?' })
    await user.click(within(confirm).getByRole('button', { name: 'Putuskan' }))
    await waitFor(() => expect(settingsApi.clearIntegration).toHaveBeenCalledTimes(1))
    expect(await screen.findByText('Belum diatur')).toBeVisible()
    expect(screen.getByLabelText('Alamat API Nasabah')).toHaveValue('')
  })

  it('tests the typed values without saving', async () => {
    const user = userEvent.setup()
    vi.mocked(settingsApi.testIntegration).mockResolvedValue({ result: 'ok', status: 200, duration_ms: 25 })
    renderWithProviders(<IntegrationSection />, monitorFixture)

    await unlock(user)
    await user.type(screen.getByLabelText('Alamat API Nasabah'), 'http://10.0.0.5:8080')
    await user.type(screen.getByLabelText('Client id'), 'web-cs.prod')
    await user.click(screen.getByRole('button', { name: 'Tes koneksi' }))

    expect(settingsApi.testIntegration).toHaveBeenCalledWith('http://10.0.0.5:8080', 'web-cs.prod')
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Terhubung. API Nasabah menerbitkan token integrasi',
    )
    expect(settingsApi.saveIntegration).not.toHaveBeenCalled()
  })

  it('restores the saved values when editing is cancelled', async () => {
    const user = userEvent.setup()
    vi.mocked(settingsApi.integration).mockResolvedValue(active)
    renderWithProviders(<IntegrationSection />, monitorFixture)

    const url = await screen.findByLabelText('Alamat API Nasabah')
    expect(url).toHaveValue('http://10.0.0.5:9001/csAdmin')
    expect(url).toBeDisabled()
    await unlock(user)
    expect(screen.queryByRole('button', { name: 'Putuskan' })).not.toBeInTheDocument()
    await user.clear(url)
    await user.type(url, 'http://10.0.0.9:9001')
    await user.clear(screen.getByLabelText('Client id'))
    await user.type(screen.getByLabelText('Client id'), 'other')
    expect(screen.getByLabelText('Kunci integrasi').textContent).toContain('client_id       = other')

    await user.click(screen.getByRole('button', { name: 'Batal' }))
    expect(url).toHaveValue('http://10.0.0.5:9001/csAdmin')
    expect(url).toBeDisabled()
    expect(screen.getByLabelText('Client id')).toHaveValue('web-cs')
    expect(screen.getByLabelText('Kunci integrasi').textContent).toContain('client_id       = web-cs')
    expect(screen.getByRole('button', { name: 'Ubah Alamat dan client id' })).toHaveFocus()

    await unlock(user)
    await user.type(url, '/x')
    await user.keyboard('{Escape}')
    expect(url).toHaveValue('http://10.0.0.5:9001/csAdmin')
    expect(url).toBeDisabled()
    expect(settingsApi.saveIntegration).not.toHaveBeenCalled()
  })

  it('warns that the current connection is replaced and saves only after confirming', async () => {
    const user = userEvent.setup()
    vi.mocked(settingsApi.integration).mockResolvedValue(active)
    vi.mocked(settingsApi.saveIntegration).mockResolvedValue({
      saved: true,
      check: { result: 'ok', status: 200, duration_ms: 30 },
      status: { ...active, url: 'http://10.0.0.9:9001' },
    })
    renderWithProviders(<IntegrationSection />, monitorFixture)

    await unlock(user)
    const url = screen.getByLabelText('Alamat API Nasabah')
    await user.clear(url)
    await user.type(url, 'http://10.0.0.9:9001')
    await user.click(screen.getByRole('button', { name: 'Simpan & aktifkan' }))
    const dialog = await screen.findByRole('alertdialog', {
      name: 'Simpan dan aktifkan integrasi API Nasabah?',
    })
    expect(dialog).toHaveTextContent('Alamat dan client id lama akan diganti')
    await user.click(within(dialog).getByRole('button', { name: 'Batal' }))
    expect(settingsApi.saveIntegration).not.toHaveBeenCalled()
    expect(url).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Simpan & aktifkan' }))
    await confirmSave(user)
    await waitFor(() =>
      expect(settingsApi.saveIntegration).toHaveBeenCalledWith('http://10.0.0.9:9001', 'web-cs'),
    )
    await waitFor(() => expect(screen.getByLabelText('Alamat API Nasabah')).toBeDisabled())
  })
})

describe('SettingsPage', () => {
  it('flags the integration in the menu until it is active', async () => {
    const { unmount } = renderWithProviders(<SettingsPage />, monitorFixture)
    expect(await screen.findByRole('button', { name: 'Integrasi API Nasabah Belum diatur' })).toBeVisible()
    unmount()

    renderWithProviders(<SettingsPage />, {
      ...monitorFixture,
      settings: { ...monitorFixture.settings, nasabah_ready: true },
    })
    expect(await screen.findByRole('button', { name: 'Integrasi API Nasabah' })).toBeVisible()
  })
})
