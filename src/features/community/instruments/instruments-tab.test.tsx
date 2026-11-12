import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AgentProfile } from '@/features/presence/types'
import { ApiError } from '@/lib/errors'
import { agentFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'
import { Toaster } from '@/test/toast'

import { instrumentsApi } from './api'
import { InstrumentsTab } from './instruments-tab'
import type { InstrumentCheck, MarketInstrument } from './types'

vi.mock('./api', () => ({
  instrumentsApi: { list: vi.fn(), check: vi.fn(), save: vi.fn(), reorder: vi.fn(), remove: vi.fn() },
}))

const moderator: AgentProfile = {
  ...agentFixture,
  id: 'raka',
  roles: ['community'],
  community_permissions: ['community.moderate'],
}

function instrument(overrides: Partial<MarketInstrument> = {}): MarketInstrument {
  return {
    code: 'IHSG',
    kind: 'index',
    name: 'Indeks Harga Saham Gabungan',
    description: null,
    aliases: ['COMPOSITE', 'JCI'],
    position: 0,
    enabled: true,
    room_enabled: true,
    created_at: '2026-11-10T01:00:00.000Z',
    updated_at: '2026-11-10T01:00:00.000Z',
    updated_by: { id: 'raka', name: 'Raka' },
    usage: { code: 'IHSG', posts: 1200, posts_7d: 80, watchers: 340, room_id: 'room-ihsg', room_members: 95 },
    ...overrides,
  }
}

const kehati = instrument({
  code: 'SRI-KEHATI',
  name: 'Indeks SRI-KEHATI',
  aliases: ['SRIKEHATI'],
  position: 1,
  room_enabled: false,
  updated_by: null,
  usage: { code: 'SRI-KEHATI', posts: 4, posts_7d: 0, watchers: 1, room_id: null, room_members: 0 },
})

const lq45 = instrument({ code: 'LQ45', name: 'Indeks LQ45', aliases: [], position: 2 })

function check(overrides: Partial<InstrumentCheck>): InstrumentCheck {
  return {
    code: 'X',
    role: 'code',
    valid: true,
    instrument: null,
    alias_of: null,
    stock_format: false,
    posts: 0,
    posts_7d: 0,
    watchers: 0,
    room_id: null,
    room_members: 0,
    ...overrides,
  }
}

function renderTab(onOpenRoom = vi.fn()) {
  renderWithProviders(
    <>
      <InstrumentsTab onOpenRoom={onOpenRoom} />
      <Toaster />
    </>,
    moderator,
  )
  return onOpenRoom
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(instrumentsApi.list).mockResolvedValue([instrument(), kehati, lq45])
})

describe('InstrumentsTab', () => {
  it('lists indices with aliases, toggles, usage, and last change, and opens the room UI', async () => {
    const user = userEvent.setup()
    const onOpenRoom = renderTab()
    const table = await screen.findByRole('table', { name: 'Indeks' })
    const ihsg = within(table).getByRole('row', { name: /\$IHSG/ })
    expect(within(ihsg).getByText('Indeks Harga Saham Gabungan')).toBeVisible()
    expect(
      within(within(ihsg).getByRole('list', { name: 'Alias $IHSG' }))
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['COMPOSITE', 'JCI'])
    expect(within(ihsg).getByText('1.200 postingan · 80 dalam 7 hari')).toBeVisible()
    expect(within(ihsg).getByText('340 pemantau')).toBeVisible()
    expect(within(ihsg).getByText('Room: 95 anggota')).toBeVisible()
    expect(within(ihsg).getByText(/oleh Raka/)).toBeVisible()
    expect(within(ihsg).getByRole('switch', { name: 'Room $IHSG dibuka' })).toBeChecked()

    const sri = within(table).getByRole('row', { name: /\$SRI-KEHATI/ })
    expect(within(sri).getByRole('switch', { name: 'Room $SRI-KEHATI dibuka' })).not.toBeChecked()
    expect(within(sri).getByText('Ditutup')).toBeVisible()
    expect(within(sri).getByText('Belum ada room')).toBeVisible()

    await user.click(within(sri).getByRole('button', { name: 'Kelola room $SRI-KEHATI' }))
    expect(onOpenRoom).toHaveBeenCalledWith('SRI-KEHATI')
  })

  it('warns about posts, watchers, room, and a stock-format code before creating, then saves on confirmation', async () => {
    const user = userEvent.setup()
    vi.mocked(instrumentsApi.check).mockResolvedValue([
      check({
        code: 'BBRI',
        stock_format: true,
        posts: 120,
        watchers: 30,
        room_id: 'room-bbri',
        room_members: 45,
      }),
      check({ code: 'JCI', role: 'alias', alias_of: 'IHSG' }),
    ])
    vi.mocked(instrumentsApi.save).mockResolvedValue(instrument({ code: 'BBRI', name: 'Indeks BBRI' }))
    renderTab()
    await user.click(await screen.findByRole('button', { name: 'Tambah indeks' }))
    const dialog = await screen.findByRole('dialog', { name: 'Tambah indeks' })

    await user.type(within(dialog).getByLabelText('Kode'), 'b')
    await user.type(within(dialog).getByLabelText('Alias'), 'j c i')
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))
    expect(
      within(dialog).getByText('Kode 2–24 huruf atau angka, diawali huruf, boleh dipisah tanda strip.'),
    ).toBeVisible()
    expect(within(dialog).getByText('Nama wajib diisi.')).toBeVisible()
    expect(instrumentsApi.check).not.toHaveBeenCalled()

    const alias = within(dialog).getByLabelText('Alias')
    await user.clear(alias)
    await user.type(alias, '$jci{Enter}')
    expect(
      within(within(dialog).getByRole('list', { name: 'Alias yang ditambahkan' })).getByText('JCI'),
    ).toBeVisible()
    expect(alias).toHaveValue('')
    await user.type(within(dialog).getByLabelText('Kode'), 'bri')
    await user.type(within(dialog).getByLabelText('Nama'), 'Indeks BBRI')
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))

    const warning = await within(dialog).findByRole('alert')
    expect(instrumentsApi.check).toHaveBeenCalledWith('BBRI', ['JCI'])
    expect(warning).toHaveTextContent(
      'Kode BBRI sudah dipakai di 120 postingan, 30 pemantau, dan room diskusi dengan 45 anggota.',
    )
    expect(warning).toHaveTextContent('BBRI berformat kode saham — pastikan bukan kode saham.')
    expect(warning).toHaveTextContent('JCI sudah menjadi alias IHSG, jadi server akan menolaknya.')
    expect(instrumentsApi.save).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole('button', { name: 'Kembali' }))
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Hapus alias JCI' }))
    vi.mocked(instrumentsApi.check).mockResolvedValueOnce([
      check({ code: 'BBRI', stock_format: true, posts: 120, watchers: 30, room_id: 'room-bbri' }),
    ])
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))
    await within(dialog).findByRole('alert')
    await user.click(within(dialog).getByRole('button', { name: 'Tetap simpan' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(instrumentsApi.save).toHaveBeenCalledWith({
      code: 'BBRI',
      name: 'Indeks BBRI',
      aliases: [],
      description: null,
      enabled: true,
      room_enabled: true,
    })
    expect(await screen.findByText('Indeks $BBRI disimpan')).toBeVisible()
  })

  it('saves an edit without a warning when only its own aliases are checked, and shows server errors', async () => {
    const user = userEvent.setup()
    vi.mocked(instrumentsApi.check).mockResolvedValue([
      check({ code: 'SRI-KEHATI', instrument: 'SRI-KEHATI', posts: 4, watchers: 1 }),
      check({ code: 'SRIKEHATI', role: 'alias', alias_of: 'SRI-KEHATI', stock_format: true }),
      check({ code: 'KEHATI', role: 'alias' }),
    ])
    vi.mocked(instrumentsApi.save)
      .mockRejectedValueOnce(new ApiError('instrument_alias_taken', 'Alias sudah dipakai', 409))
      .mockResolvedValueOnce(kehati)
    renderTab()
    await user.click(await screen.findByRole('button', { name: 'Ubah indeks $SRI-KEHATI' }))
    const dialog = await screen.findByRole('dialog', { name: 'Ubah indeks $SRI-KEHATI' })
    expect(within(dialog).getByLabelText('Kode')).toBeDisabled()
    await user.type(within(dialog).getByLabelText('Alias'), 'kehati')
    await user.type(within(dialog).getByLabelText('Deskripsi (opsional)'), 'Indeks saham berkelanjutan')
    await user.click(within(dialog).getByRole('switch', { name: /Room diskusi dibuka/ }))
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))

    expect(await screen.findByText('Alias sudah dipakai sebagai kode atau alias indeks lain.')).toBeVisible()
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument()
    expect(instrumentsApi.check).toHaveBeenCalledWith('SRI-KEHATI', ['SRIKEHATI', 'KEHATI'])
    expect(instrumentsApi.save).toHaveBeenCalledWith({
      code: 'SRI-KEHATI',
      name: 'Indeks SRI-KEHATI',
      aliases: ['SRIKEHATI', 'KEHATI'],
      description: 'Indeks saham berkelanjutan',
      enabled: true,
      room_enabled: true,
    })
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('toggles an index and asks before closing its room', async () => {
    const user = userEvent.setup()
    vi.mocked(instrumentsApi.save).mockResolvedValue(instrument())
    renderTab()
    await user.click(await screen.findByRole('switch', { name: 'Aktifkan indeks $LQ45' }))
    await waitFor(() =>
      expect(instrumentsApi.save).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'LQ45', enabled: false }),
      ),
    )
    expect(await screen.findByText('Indeks $LQ45 dinonaktifkan')).toBeVisible()

    await user.click(screen.getByRole('switch', { name: 'Room $IHSG dibuka' }))
    const confirm = await screen.findByRole('alertdialog', { name: 'Tutup room $IHSG?' })
    expect(instrumentsApi.save).toHaveBeenCalledTimes(1)
    await user.click(within(confirm).getByRole('button', { name: 'Tutup room' }))
    await waitFor(() =>
      expect(instrumentsApi.save).toHaveBeenLastCalledWith({
        code: 'IHSG',
        name: 'Indeks Harga Saham Gabungan',
        aliases: ['COMPOSITE', 'JCI'],
        description: null,
        enabled: true,
        room_enabled: false,
      }),
    )
    expect(await screen.findByText('Room $IHSG ditutup')).toBeVisible()

    await user.click(screen.getByRole('switch', { name: 'Room $SRI-KEHATI dibuka' }))
    await waitFor(() =>
      expect(instrumentsApi.save).toHaveBeenLastCalledWith(
        expect.objectContaining({ code: 'SRI-KEHATI', room_enabled: true }),
      ),
    )
  })

  it('reorders with every code and deletes after explaining the tagging fallback', async () => {
    const user = userEvent.setup()
    vi.mocked(instrumentsApi.reorder).mockResolvedValue([kehati, instrument(), lq45])
    vi.mocked(instrumentsApi.remove).mockResolvedValue([kehati, lq45])
    renderTab()
    await user.click(await screen.findByRole('button', { name: 'Naikkan $SRI-KEHATI' }))
    await waitFor(() => expect(instrumentsApi.reorder).toHaveBeenCalledWith(['SRI-KEHATI', 'IHSG', 'LQ45']))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Naikkan $SRI-KEHATI' })).toBeDisabled())

    await user.click(screen.getByRole('button', { name: 'Hapus indeks $IHSG' }))
    const confirm = await screen.findByRole('alertdialog', { name: 'Hapus indeks $IHSG?' })
    expect(confirm).toHaveTextContent('Postingan yang menyebut $IHSG atau aliasnya (COMPOSITE, JCI)')
    expect(confirm).toHaveTextContent('ditandai ulang seperti kode biasa')
    expect(instrumentsApi.remove).not.toHaveBeenCalled()
    await user.click(within(confirm).getByRole('button', { name: 'Hapus' }))
    await waitFor(() => expect(instrumentsApi.remove).toHaveBeenCalledWith('IHSG'))
    expect(await screen.findByText('Indeks $IHSG dihapus')).toBeVisible()
    await waitFor(() => expect(screen.queryByRole('row', { name: /\$IHSG/ })).not.toBeInTheDocument())
  })

  it('shows the permission error when the server refuses the list', async () => {
    vi.mocked(instrumentsApi.list).mockRejectedValue(
      new ApiError('community_forbidden', 'Izin komunitas tidak cukup', 403),
    )
    renderTab()
    expect(await screen.findByText('Izin komunitas Anda tidak cukup untuk aksi ini.')).toBeVisible()
  })
})
