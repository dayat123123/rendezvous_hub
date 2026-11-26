import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AgentProfile } from '@/features/presence/types'
import type * as SupabaseModule from '@/lib/supabase'
import { agentFixture, monitorFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'
import { findToast, Toaster } from '@/test/toast'

import type { CommunityPost, OfficialAccount } from '../../types'
import type { FileView, FilesPage, FinreportConfig, ReportDetail, ReportRef } from '../types'
import { ReportsTab } from './reports-tab'

const backend = vi.hoisted(() => ({ rpc: vi.fn(), upload: vi.fn(), bucket: vi.fn() }))

vi.mock('@/lib/supabase', async (importOriginal) => ({
  ...(await importOriginal<typeof SupabaseModule>()),
  rpc: backend.rpc,
  supabase: () => ({
    storage: {
      from: (bucket: string) => {
        backend.bucket(bucket)
        return { upload: backend.upload }
      },
    },
  }),
  appEnv: () => ({
    supabaseUrl: 'http://localhost:8000',
    publicApiUrl: 'https://api.olt.test',
    anonKey: 'anon',
  }),
}))

const writer: AgentProfile = {
  ...agentFixture,
  id: '22222222-2222-4222-8222-222222222222',
  display_name: 'Maya',
  roles: ['community'],
  community_permissions: ['community.post'],
}

const moderator: AgentProfile = {
  ...agentFixture,
  roles: ['community'],
  community_permissions: ['community.moderate'],
}

const superAdmin: AgentProfile = {
  ...monitorFixture,
  community_permissions: ['community.post', 'community.publish'],
}

const research: OfficialAccount = {
  id: 'acc-1',
  username: 'olt_research',
  display_name: 'OLT Research',
  avatar_url: null,
  bio: null,
  follower_count: 0,
  post_count: 0,
  created_at: '2026-11-01T02:00:00.000Z',
  created_by: 'Sinta',
  disabled_at: null,
}

const config: FinreportConfig = {
  official_account: null,
  official_active: false,
  auto_publish: false,
  updated_by: { id: 'sinta', name: 'Sinta' },
  updated_at: '2026-11-25T03:00:00.000Z',
  max_file_bytes: 8 * 1024 * 1024,
}

const report: ReportRef = {
  id: 'rep-1',
  entity_code: 'BBCA',
  entity_name: 'PT Bank Central Asia Tbk',
  period: 'Q3',
  period_start: '2026-01-01',
  period_end: '2026-09-30',
  audit: 'unaudited',
  currency: 'IDR',
  template: 'bank',
  superseded: false,
  warnings: ['restated'],
  post: { id: 'cp-1', status: 'pending', post_id: null, published_at: null },
}

const done: FileView = {
  id: 'file-1',
  source: 'api',
  status: 'done',
  sha256: 'a'.repeat(64),
  size_bytes: 120_000,
  key: { id: 'key-1', name: 'Data laporan OLT', prefix: 'AbCdEfGh' },
  uploaded_by: null,
  attempts: 1,
  retry_at: null,
  error_code: null,
  error_detail: null,
  received_at: '2026-11-25T02:00:00.000Z',
  finished_at: '2026-11-25T02:00:05.000Z',
  retryable: false,
  report,
}

const rejected: FileView = {
  ...done,
  id: 'file-2',
  source: 'hub',
  status: 'rejected',
  sha256: null,
  key: null,
  uploaded_by: { id: 'maya', name: 'Maya' },
  error_code: 'invalid_xbrl',
  error_detail: 'idx-dei:EntityCode is missing',
  received_at: '2026-11-25T01:00:00.000Z',
  retryable: true,
  report: null,
}

const waiting: FileView = {
  ...done,
  id: 'file-3',
  status: 'queued',
  attempts: 2,
  retry_at: '2026-11-25T02:10:00.000Z',
  error_code: 'scanner_unavailable',
  error_detail: null,
  finished_at: null,
  report: null,
}

const page: FilesPage = {
  items: [done, rejected, waiting],
  next_before: null,
  config,
  counts: { done: 1, rejected: 1, queued: 1 },
}

const post: CommunityPost = {
  id: 'cp-1',
  account: research,
  kind: 'post',
  title: null,
  body: '$BBCA ringkasan',
  attachments: [],
  pin_scope: null,
  pin_stock: null,
  pin_until: null,
  pinned: false,
  notify: false,
  status: 'pending',
  publish_at: null,
  post_id: null,
  post: null,
  campaign: null,
  created_by: { id: 'maya', name: 'Maya' },
  created_at: '2026-11-25T02:00:05.000Z',
  updated_at: '2026-11-25T02:00:05.000Z',
  submitted_at: '2026-11-25T02:00:05.000Z',
  reviewed_by: null,
  reviewed_at: null,
  review_note: null,
  published_at: null,
  error: null,
  version: 1,
}

const detail: ReportDetail = {
  ...report,
  sector: 'Keuangan',
  subsector: 'Bank',
  metrics: {
    version: 1,
    template: 'bank',
    months: 9,
    quarter_months: 3,
    balance_base: 'year_end',
    flows: [
      { key: 'net_profit', ytd: 4.5e13, ytd_prior: 4e13, quarter: 1.5e13, quarter_prior: 1.6e13 },
      { key: 'eps', ytd: 365.12, ytd_prior: 324.5 },
    ],
    balances: [{ key: 'loans', end: 9.9e14, year_end: 9e14, previous: 9.5e14 }],
    ratios: [
      { key: 'roe', value: 0.196, year_ago: 0.19 },
      { key: 'der', value: 0.62 },
    ],
  },
  summary: '$BBCA Kuartal III 2026 (belum diaudit)\nLaba bersih bagian induk Rp45,00 T, naik 12,5% YoY.',
  warnings: [{ code: 'restated', lines: ['net_profit', 'loans'] }],
  created_at: '2026-11-25T02:00:05.000Z',
  superseded_at: null,
  supersedes: null,
  superseded_by: null,
  post,
  can_create_post: false,
  files: [done],
  history: [
    {
      ...report,
      id: 'rep-0',
      period: 'Q2',
      period_end: '2026-06-30',
      warnings: [],
      post: { id: 'cp-0', status: 'published', post_id: 'p-0', published_at: '2026-08-01T02:00:00.000Z' },
    },
  ],
}

type Args = Record<string, unknown> | undefined

function serve(overrides: Partial<Record<string, (args: Args) => unknown>> = {}) {
  backend.rpc.mockImplementation((name: string, args: Args) => {
    const handler = overrides[name]
    if (handler) return Promise.resolve(handler(args))
    switch (name) {
      case 'finreport_files':
        return Promise.resolve(page)
      case 'finreport_config':
        return Promise.resolve(config)
      case 'community_accounts':
        return Promise.resolve([research])
      case 'finreport_report':
        return Promise.resolve(detail)
      default:
        return Promise.reject(new Error(`unexpected rpc ${name}`))
    }
  })
}

function render(agent: AgentProfile, onOpenPost?: (id: string) => void) {
  return renderWithProviders(
    <>
      <ReportsTab onOpenPost={onOpenPost} />
      <Toaster />
    </>,
    agent,
  )
}

const zip = (name: string, size = 120_000) => {
  const file = new File(['PK'], name, { type: 'application/zip' })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

beforeEach(() => {
  vi.clearAllMocks()
  serve()
})

describe('ReportsTab', () => {
  it('lists received files with their report, source, status, post and warnings', async () => {
    render(writer)

    const table = await screen.findByRole('table', { name: 'File yang diterima' })
    const first = within(table).getByRole('row', { name: /BBCA/ })
    expect(within(first).getByText('PT Bank Central Asia Tbk')).toBeInTheDocument()
    expect(within(first).getByText('Kuartal III 2026 · Belum diaudit')).toBeInTheDocument()
    expect(within(first).getByText('API · Data laporan OLT')).toBeInTheDocument()
    expect(within(first).getByText('Selesai')).toBeInTheDocument()
    expect(within(first).getByText('Menunggu persetujuan')).toBeInTheDocument()
    expect(within(first).getByText('Disajikan ulang')).toBeInTheDocument()

    const failed = within(table).getByRole('row', { name: /Hub · Maya/ })
    expect(within(failed).getByText('Ditolak')).toBeInTheDocument()
    expect(within(failed).getByText(/XBRL rusak, bukan XBRL IDX/)).toBeInTheDocument()
    expect(within(failed).getByText('idx-dei:EntityCode is missing')).toBeInTheDocument()
    expect(within(failed).getByRole('button', { name: /^Proses ulang file/ })).toBeInTheDocument()

    const queued = within(table)
      .getAllByRole('row')
      .find((row) => row.textContent?.includes('Dalam antrean'))
    expect(queued).toBeDefined()
    expect(within(queued!).getByText(/^Akan dicoba lagi/)).toBeInTheDocument()
    expect(within(queued!).getByText('Antivirus tidak terjangkau.')).toBeInTheDocument()

    expect(screen.getByRole('radio', { name: 'Ditolak (1)' })).toBeInTheDocument()
    expect(screen.getByText(/Diperbarui otomatis setiap 10 detik/)).toBeInTheDocument()
    expect(screen.getByText(/Akun resmi untuk laporan keuangan belum diatur/)).toBeInTheDocument()
    expect(backend.rpc).toHaveBeenCalledWith('finreport_files', {
      p_status: null,
      p_entity: null,
      p_limit: 50,
      p_before: null,
    })
  })

  it('filters by status and stock code', async () => {
    const user = userEvent.setup()
    render(writer)
    await screen.findByRole('table', { name: 'File yang diterima' })

    await user.click(screen.getByRole('radio', { name: 'Ditolak (1)' }))
    await waitFor(() =>
      expect(backend.rpc).toHaveBeenCalledWith(
        'finreport_files',
        expect.objectContaining({ p_status: 'rejected' }),
      ),
    )
    await user.type(screen.getByRole('searchbox', { name: 'Kode emiten' }), '$bbca')
    await waitFor(() =>
      expect(backend.rpc).toHaveBeenCalledWith(
        'finreport_files',
        expect.objectContaining({ p_status: 'rejected', p_entity: 'BBCA' }),
      ),
    )
  })

  it('uploads zip files to storage, submits them, and reports each result', async () => {
    const user = userEvent.setup()
    backend.upload.mockImplementation((path: string, file: File) =>
      Promise.resolve(
        file.name === 'gagal.zip'
          ? { data: null, error: { message: 'Payload too large', status: 413, statusCode: '413' } }
          : { data: { path }, error: null },
      ),
    )
    serve({ finreport_upload: () => ({ ...rejected, id: 'file-9', status: 'queued', retryable: false }) })
    render(writer)

    const good = zip('BBCA Q3 2026.zip')
    await user.upload(screen.getByLabelText('File laporan keuangan (.zip)'), [
      good,
      zip('besar.zip', 9 * 1024 * 1024),
      zip('gagal.zip'),
    ])

    const results = await screen.findByRole('list', { name: 'Hasil unggahan' })
    await waitFor(() => expect(within(results).getByText('Diterima, masuk antrean')).toBeInTheDocument())
    expect(within(results).getByText('Lebih dari 8 MB.')).toBeInTheDocument()
    expect(await within(results).findByText('File lebih dari 8 MiB.')).toBeInTheDocument()
    expect(await findToast('1 file diterima dan masuk antrean')).toBeInTheDocument()

    expect(backend.bucket).toHaveBeenCalledWith('financial-reports')
    expect(backend.upload).toHaveBeenCalledTimes(2)
    const [path, body, options] = backend.upload.mock.calls[0] as [string, File, object]
    expect(path).toMatch(new RegExp(`^hub/${writer.id}/[0-9a-f-]{36}/report\\.zip$`))
    expect(body).toBe(good)
    expect(options).toEqual({ contentType: 'application/zip', upsert: false })
    expect(backend.rpc).toHaveBeenCalledWith('finreport_upload', { p_object: path })
    expect(backend.rpc.mock.calls.filter(([name]) => name === 'finreport_upload')).toHaveLength(1)
  })

  it('reprocesses a rejected file and hides upload and retry from staff without the post permission', async () => {
    const user = userEvent.setup()
    serve({ finreport_retry: () => ({ ...rejected, status: 'queued', error_code: null, retryable: false }) })
    const view = render(writer)

    await user.click(await screen.findByRole('button', { name: /^Proses ulang file/ }))
    await waitFor(() => expect(backend.rpc).toHaveBeenCalledWith('finreport_retry', { p_id: 'file-2' }))
    expect(await findToast('File masuk antrean lagi')).toBeInTheDocument()
    view.unmount()

    render(moderator)
    await screen.findByRole('table', { name: 'File yang diterima' })
    expect(screen.queryByRole('button', { name: /^Proses ulang file/ })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('File laporan keuangan (.zip)')).not.toBeInTheDocument()
    expect(screen.getByText('Unggah dan proses ulang butuh izin Tulis postingan resmi.')).toBeInTheDocument()
  })

  it('shows the report details with the exact post text, warnings, figures, files and history', async () => {
    const user = userEvent.setup()
    const onOpenPost = vi.fn()
    render(writer, onOpenPost)

    await user.click(await screen.findByRole('button', { name: 'Buka laporan BBCA · Kuartal III 2026' }))
    const sheet = await screen.findByRole('dialog', { name: 'Detail laporan' })
    await within(sheet).findByText('PT Bank Central Asia Tbk', { exact: false })
    expect(backend.rpc).toHaveBeenCalledWith('finreport_report', { p_id: 'rep-1' })

    const summary = within(sheet).getByText(/Laba bersih bagian induk Rp45,00 T/)
    expect(summary).toHaveTextContent('$BBCA Kuartal III 2026 (belum diaudit) Laba bersih')
    expect(summary).toHaveClass('whitespace-pre-wrap')

    expect(within(sheet).getByText(/berbeda lebih dari 0,5% dari laporan tahun lalu/)).toBeInTheDocument()
    expect(within(sheet).getByText('Pos: Laba bersih bagian induk, Kredit')).toBeInTheDocument()

    const flows = within(sheet).getByRole('region', { name: 'Laba rugi dan arus kas' })
    const profit = within(flows).getByRole('row', { name: /Laba bersih bagian induk/ })
    expect(within(profit).getByText('Rp45,00 T')).toBeInTheDocument()
    expect(within(profit).getByText('Rp40,00 T')).toBeInTheDocument()
    expect(within(profit).getByText(/\+12,5\s?%/)).toBeInTheDocument()
    expect(within(profit).getByText(/[-−]6,3\s?%/)).toBeInTheDocument()
    expect(within(flows).getByText('Rp365')).toBeInTheDocument()

    const balances = within(sheet).getByRole('region', { name: 'Posisi keuangan' })
    expect(within(balances).getByRole('columnheader', { name: 'Akhir tahun buku lalu' })).toBeInTheDocument()
    expect(within(balances).getByText(/sejak akhir tahun buku/)).toBeInTheDocument()
    expect(within(balances).getByText(/\+10,0\s?%/)).toBeInTheDocument()

    const ratios = within(sheet).getByRole('region', { name: 'Rasio' })
    expect(within(ratios).getByText(/19,6\s?%/)).toBeInTheDocument()
    expect(within(ratios).getByText('0,62x')).toBeInTheDocument()

    expect(within(sheet).getByRole('region', { name: 'File sumber' })).toHaveTextContent(
      'API · Data laporan OLT',
    )
    const history = within(sheet).getByRole('region', { name: 'Laporan lain BBCA' })
    expect(within(history).getByRole('button', { name: 'Kuartal II 2026' })).toBeInTheDocument()
    expect(within(history).getByText('Terbit')).toBeInTheDocument()

    expect(within(sheet).queryByRole('button', { name: 'Buat postingan' })).not.toBeInTheDocument()
    await user.click(within(sheet).getByRole('button', { name: 'Buka di Postingan resmi' }))
    expect(onOpenPost).toHaveBeenCalledWith('cp-1')
  })

  it('creates a post for a report that has none', async () => {
    const user = userEvent.setup()
    const missing: ReportDetail = {
      ...detail,
      post: null,
      can_create_post: true,
      warnings: [{ code: 'no_official_account' }],
    }
    serve({ finreport_report: () => missing, finreport_create_post: () => ({ ...detail, warnings: [] }) })
    render(writer)

    await user.click(await screen.findByRole('button', { name: 'Buka laporan BBCA · Kuartal III 2026' }))
    const sheet = await screen.findByRole('dialog', { name: 'Detail laporan' })
    expect(await within(sheet).findByText('Belum ada postingan untuk laporan ini.')).toBeInTheDocument()
    expect(within(sheet).getByText(/postingan tidak dibuat/)).toBeInTheDocument()
    await user.click(within(sheet).getByRole('button', { name: 'Buat postingan' }))

    await waitFor(() =>
      expect(backend.rpc).toHaveBeenCalledWith('finreport_create_post', { p_report: 'rep-1' }),
    )
    expect(await findToast('Postingan dibuat')).toBeInTheDocument()
    expect(await within(sheet).findByText('Menunggu persetujuan')).toBeInTheDocument()
    expect(within(sheet).queryByRole('button', { name: 'Buat postingan' })).not.toBeInTheDocument()
  })

  it('shows the posting settings read-only to staff who are not Super Admin', async () => {
    serve({
      finreport_config: () => ({
        ...config,
        official_account: research,
        official_active: true,
        auto_publish: true,
      }),
    })
    render(writer)

    expect(await screen.findByText('OLT Research (@olt_research)')).toBeInTheDocument()
    expect(screen.getByText('Nyala')).toBeInTheDocument()
    expect(screen.getByText('Hanya Super Admin yang bisa mengubah pengaturan ini.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Simpan pengaturan' })).not.toBeInTheDocument()
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
    expect(screen.queryByText(/belum diatur/)).not.toBeInTheDocument()
  })

  it('lets a Super Admin pick the official account and turn on auto-publish', async () => {
    const user = userEvent.setup()
    const saved = { ...config, official_account: research, official_active: true, auto_publish: true }
    serve({ finreport_save_config: () => saved })
    render(superAdmin)

    await user.click(await screen.findByRole('combobox', { name: 'Akun resmi' }))
    await user.click(await screen.findByRole('option', { name: 'OLT Research (@olt_research)' }))
    const toggle = screen.getByRole('switch', { name: /^Posting otomatis/ })
    expect(toggle).toHaveAccessibleName(/hanya untuk laporan tanpa peringatan/)
    await user.click(toggle)
    await user.click(screen.getByRole('button', { name: 'Simpan pengaturan' }))

    await waitFor(() =>
      expect(backend.rpc).toHaveBeenCalledWith('finreport_save_config', {
        p_official_account: 'acc-1',
        p_auto_publish: true,
      }),
    )
    expect(await findToast('Pengaturan laporan keuangan disimpan')).toBeInTheDocument()
  })
})
