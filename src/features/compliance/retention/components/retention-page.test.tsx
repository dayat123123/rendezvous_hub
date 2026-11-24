import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { loadStrings } from '@/i18n'
import { agentFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'
import { Toaster } from '@/test/toast'

import { retentionApi } from '../api'
import type { RetentionChange, RetentionOverview, RetentionRule } from '../types'
import { RetentionPage } from './retention-page'

vi.mock('../api', () => ({
  retentionApi: {
    overview: vi.fn(),
    preview: vi.fn(),
    requestChange: vi.fn(),
    decide: vi.fn(),
    cancel: vi.fn(),
    addHold: vi.fn(),
    releaseHold: vi.fn(),
    runNow: vi.fn(),
  },
}))

const rule = (overrides: Partial<RetentionRule> & Pick<RetentionRule, 'key'>): RetentionRule => ({
  unit: 'years',
  category: 'content',
  value: 5,
  default: 5,
  min: 1,
  max: 30,
  allow_off: true,
  pending: null,
  ...overrides,
})

const pending: RetentionChange = {
  id: 7,
  key: 'retention.direct_chat_years',
  old_value: 5,
  new_value: 3,
  direction: 'delete_sooner',
  reason: 'Arahan kepatuhan 12/2026',
  status: 'pending',
  requested_by: { id: 'l1', name: 'Laras' },
  requested_at: '2026-11-24T03:00:00.000Z',
  decided_by: null,
  decided_at: null,
  decision_note: null,
  effective_at: null,
  applied_at: null,
  cancelled_by: null,
  cancelled_at: null,
  cancel_note: null,
  expires_at: '2026-12-08T03:00:00.000Z',
  mine: false,
  can_decide: true,
  can_cancel: true,
}

const overview = (canRun: boolean): RetentionOverview => ({
  enabled: true,
  schedule: { cron: '41 19 * * *', time_wib: '02.41' },
  delay_days: 7,
  request_days: 14,
  can_run: canRun,
  rules: [
    rule({
      key: 'retention.purge_enabled',
      unit: 'switch',
      category: 'guard',
      value: 1,
      default: 1,
      min: 0,
      max: 1,
      allow_off: false,
    }),
    rule({ key: 'retention.posts_years' }),
    rule({ key: 'retention.direct_chat_years', category: 'chat', pending }),
    rule({ key: 'retention.chat_years', category: 'chat', value: 10, default: 10, min: 5, allow_off: false }),
  ],
  changes: [pending],
  holds: [
    {
      id: 'h1',
      target_type: 'user',
      target_id: 'u1',
      target_label: '@rt_cici',
      reason: 'Permintaan penyidik kasus 7/2026',
      reference: 'BAP-7/2026',
      created_by: { id: 'k1', name: 'Kirana' },
      created_at: '2026-11-20T03:00:00.000Z',
      expires_at: null,
      released_by: null,
      released_at: null,
      release_note: null,
      active: true,
      can_release: false,
    },
  ],
  runs: [
    {
      id: 1,
      source: 'cron',
      actor: null,
      started_at: '2026-11-23T19:41:00.000Z',
      finished_at: '2026-11-23T19:41:05.000Z',
      enabled: true,
      deleted: { posts: 12, support_chat: 3 },
      capped: ['posts'],
      files_queued: 4,
      applied: 0,
      errors: {},
    },
  ],
})

beforeAll(async () => {
  await loadStrings('retention')
})

beforeEach(() => {
  vi.clearAllMocks()
})

const render = (roles: string[], canRun = false) => {
  vi.mocked(retentionApi.overview).mockResolvedValue(overview(canRun))
  renderWithProviders(
    <>
      <RetentionPage />
      <Toaster />
    </>,
    { ...agentFixture, roles },
  )
}

describe('RetentionPage', () => {
  it('shows the rules with their current values, defaults, and pending changes', async () => {
    render(['compliance'])
    expect(await screen.findByRole('heading', { name: 'Konten komunitas' })).toBeInTheDocument()
    expect(screen.getAllByText('5 tahun').length).toBeGreaterThan(0)
    expect(screen.getAllByText('10 tahun').length).toBeGreaterThan(0)
    expect(screen.getByText('Menunggu keputusan → 3 tahun')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ajukan perubahan: Chat DM & grup' })).toBeDisabled()
    expect(screen.getByText('Setiap hari 02.41 WIB')).toBeInTheDocument()
  })

  it('requests a change with a reason and warns when data would be deleted sooner', async () => {
    vi.mocked(retentionApi.requestChange).mockResolvedValue({
      ...pending,
      key: 'retention.posts_years',
      id: 9,
    })
    render(['compliance'])
    await userEvent.click(await screen.findByRole('button', { name: 'Ajukan perubahan: Post' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.clear(within(dialog).getByLabelText('Nilai baru'))
    await userEvent.type(within(dialog).getByLabelText('Nilai baru'), '3')
    expect(within(dialog).getByText(/Data akan terhapus lebih cepat/)).toBeInTheDocument()
    await userEvent.type(within(dialog).getByLabelText('Alasan perubahan'), 'Arahan kepatuhan 12/2026')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Ajukan' }))
    await waitFor(() =>
      expect(retentionApi.requestChange).toHaveBeenCalledWith(
        'retention.posts_years',
        3,
        'Arahan kepatuhan 12/2026',
      ),
    )
    expect(await screen.findByText('Permintaan dikirim. Staf lain perlu menyetujuinya.')).toBeInTheDocument()
  })

  it('lets another staff member approve a pending request', async () => {
    vi.mocked(retentionApi.decide).mockResolvedValue({
      ...pending,
      status: 'approved',
      effective_at: '2026-12-01T03:00:00.000Z',
    })
    render(['compliance'])
    await userEvent.click(await screen.findByRole('radio', { name: 'Permintaan (1)' }))
    expect(screen.getByText('Arahan kepatuhan 12/2026')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Setujui' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/berlaku 7 hari setelah disetujui/)).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Setujui' }))
    await waitFor(() => expect(retentionApi.decide).toHaveBeenCalledWith(7, true, ''))
  })

  it('shows holds and only lets another staff member release them', async () => {
    render(['compliance'])
    await userEvent.click(await screen.findByRole('radio', { name: 'Penahanan' }))
    expect(screen.getByText('@rt_cici')).toBeInTheDocument()
    expect(screen.getByText('Hanya staf lain yang bisa melepas')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Lepas' })).not.toBeInTheDocument()
  })

  it('shows run history and the manual run only for Super Admin', async () => {
    render(['compliance'])
    await userEvent.click(await screen.findByRole('radio', { name: 'Riwayat run' }))
    expect(screen.getByText('Post: 12')).toBeInTheDocument()
    expect(screen.getByText(/Batas baris tercapai: Post/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Jalankan sekarang' })).not.toBeInTheDocument()
  })

  it('runs the guard on demand for Super Admin', async () => {
    vi.mocked(retentionApi.runNow).mockResolvedValue({ run_id: 2, enabled: true, deleted: { posts: 4 } })
    render(['cs_super_admin'], true)
    await userEvent.click(await screen.findByRole('radio', { name: 'Riwayat run' }))
    await userEvent.click(screen.getByRole('button', { name: 'Jalankan sekarang' }))
    const dialog = await screen.findByRole('alertdialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Jalankan sekarang' }))
    await waitFor(() => expect(retentionApi.runNow).toHaveBeenCalled())
    expect(await screen.findByText('Run selesai: 4 baris dihapus.')).toBeInTheDocument()
  })
})
