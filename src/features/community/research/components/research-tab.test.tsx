import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AgentProfile } from '@/features/presence/types'
import type * as SupabaseModule from '@/lib/supabase'
import { agentFixture, monitorFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'
import { findToast, Toaster } from '@/test/toast'

import type { CommunityPost, OfficialAccount } from '../../types'
import type { FileView, FilesPage, ResearchConfig, ReportDetail, ReportRef, ResearchDocument } from '../types'
import { ResearchTab } from './research-tab'

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

const config: ResearchConfig = {
  official_account: null,
  official_active: false,
  auto_publish: false,
  updated_by: { id: 'sinta', name: 'Sinta' },
  updated_at: '2026-11-25T03:00:00.000Z',
  max_file_bytes: 8 * 1024 * 1024,
}

const report: ReportRef = {
  id: 'rep-1',
  kind: 'financial_report',
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
  document: {
    version: 1,
    badge: 'Ringkasan otomatis',
    title: 'Laporan Keuangan Kuartal III 2026',
    subtitle: 'PT Bank Central Asia Tbk. · Belum diaudit',
    headline: 'Laba bersih kuartal III naik 9,0% YoY',
    disclaimer: 'Diolah otomatis dari laporan keuangan. Bukan rekomendasi investasi.',
    blocks: [
      { type: 'paragraph', text: 'BCA membukukan laba bersih Rp15,68 T pada kuartal III 2026.' },
      {
        type: 'metrics',
        metrics: [
          { label: 'Laba bersih kuartal III', value: 'Rp15,68 T', change: '+9,0% YoY', trend: 'up' },
          { label: 'ROE disetahunkan', value: '21,3%', change: 'tahun lalu 21,5%', trend: 'down' },
        ],
      },
      { type: 'list', style: 'numbered', items: ['Kredit tumbuh 11,2% YoY.', 'Dana murah naik.'] },
      { type: 'callout', title: 'Poin utama', text: 'Laba tumbuh di atas kredit.' },
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
  documents: [],
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
      case 'research_files':
        return Promise.resolve(page)
      case 'research_config':
        return Promise.resolve(config)
      case 'community_accounts':
        return Promise.resolve([research])
      case 'research_report':
        return Promise.resolve(detail)
      default:
        return Promise.reject(new Error(`unexpected rpc ${name}`))
    }
  })
}

function render(agent: AgentProfile, onOpenPost?: (id: string) => void) {
  return renderWithProviders(
    <>
      <ResearchTab onOpenPost={onOpenPost} />
      <Toaster />
    </>,
    agent,
  )
}

const zip = (name: string, size = 120_000) => {
  const file = new File(['PK'], name, { type: 'application/x-zip-compressed' })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

beforeEach(() => {
  vi.clearAllMocks()
  serve()
})

describe('ResearchTab', () => {
  it('lists received files with their report, source, status, post and warnings', async () => {
    render(writer)

    const table = await screen.findByRole('table', { name: 'File yang diterima' })
    const first = within(table).getByRole('row', { name: /BBCA/ })
    expect(within(first).getByText('PT Bank Central Asia Tbk')).toBeInTheDocument()
    expect(within(table).getByRole('columnheader', { name: 'Jenis' })).toBeInTheDocument()
    expect(within(first).getByText('Laporan keuangan')).toBeInTheDocument()
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
    expect(screen.getByText(/Akun resmi untuk riset belum diatur/)).toBeInTheDocument()
    expect(backend.rpc).toHaveBeenCalledWith('research_files', {
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
        'research_files',
        expect.objectContaining({ p_status: 'rejected' }),
      ),
    )
    await user.type(screen.getByRole('searchbox', { name: 'Kode emiten' }), '$bbca')
    await waitFor(() =>
      expect(backend.rpc).toHaveBeenCalledWith(
        'research_files',
        expect.objectContaining({ p_status: 'rejected', p_entity: 'BBCA' }),
      ),
    )
  })

  it('stages zip files with their documents and uploads them together on Unggah', async () => {
    const replies = [
      null,
      null,
      { message: 'Payload too large', status: 413, statusCode: '413' },
      { message: 'new row violates row-level security policy', status: 400, statusCode: '403' },
      { message: 'mime type is not supported', status: 400, statusCode: '415' },
    ]
    const user = userEvent.setup()
    backend.upload.mockImplementation((path: string) => {
      const failure = replies.shift()
      return Promise.resolve(failure ? { data: null, error: failure } : { data: { path }, error: null })
    })
    serve({ research_upload: () => ({ ...rejected, id: 'file-9', status: 'queued', retryable: false }) })
    render(writer)

    const good = zip('BBCA Q3 2026.zip')
    const pdf = new File(['%PDF-1.7'], 'BBCA Q3 2026 laporan.pdf', { type: '' })
    await user.upload(screen.getByLabelText('File laporan (.zip) dan dokumennya (PDF/XLSX)'), [
      good,
      zip('besar.zip', 9 * 1024 * 1024),
      zip('gagal.zip'),
      zip('ditolak.zip'),
      zip('tipe.zip'),
      pdf,
    ])

    const staged = await screen.findByRole('list', { name: 'Siap diunggah' })
    expect(within(staged).getByText('Lebih dari 8 MB. File ini tidak ikut diunggah.')).toBeInTheDocument()
    const target = within(staged).getByRole('combobox', { name: 'Laporan untuk BBCA Q3 2026 laporan.pdf' })
    expect(within(target).getByRole('option', { selected: true })).toHaveTextContent('BBCA Q3 2026.zip')
    expect(backend.upload).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Unggah 4 laporan' }))

    const results = await screen.findByRole('list', { name: 'Hasil unggahan' })
    await waitFor(() => expect(within(results).getByText('Diterima, masuk antrean')).toBeInTheDocument())
    expect(within(results).getByText(/^Bersama 1 dokumen/)).toBeInTheDocument()
    expect(await within(results).findByText('File lebih dari 8 MiB.')).toBeInTheDocument()
    expect(
      await within(results).findByText('Akun ini tidak punya izin mengunggah file riset.'),
    ).toBeInTheDocument()
    expect(
      await within(results).findByText('Storage menolak jenis file ini. Pastikan yang diunggah file .zip.'),
    ).toBeInTheDocument()
    expect(await findToast('1 file diterima dan masuk antrean')).toBeInTheDocument()

    expect(backend.bucket).toHaveBeenCalledWith('financial-reports')
    expect(backend.bucket).toHaveBeenCalledWith('post-files')
    expect(backend.upload).toHaveBeenCalledTimes(5)
    const [path, body, options] = backend.upload.mock.calls[0] as [string, Blob, object]
    expect(path).toMatch(new RegExp(`^hub/${writer.id}/[0-9a-f-]{36}/report\\.zip$`))
    expect(body).toBeInstanceOf(Blob)
    expect(body.type).toBe('application/zip')
    expect(body.size).toBe(2)
    expect(body).not.toBe(good)
    expect(options).toEqual({ contentType: 'application/zip', upsert: false })
    const [docPath, docBody] = backend.upload.mock.calls[1] as [string, Blob, object]
    expect(docPath).toMatch(/^research\/[0-9a-f-]{36}\/file\.pdf$/)
    expect(docBody.type).toBe('application/pdf')
    expect(backend.rpc).toHaveBeenCalledWith('research_upload', {
      p_object: path,
      p_documents: [{ object: docPath }],
    })
    expect(backend.rpc.mock.calls.filter(([name]) => name === 'research_upload')).toHaveLength(1)

    const left = screen.getByRole('list', { name: 'Siap diunggah' })
    expect(within(left).queryByText('BBCA Q3 2026.zip')).not.toBeInTheDocument()
    expect(within(left).queryByText('BBCA Q3 2026 laporan.pdf')).not.toBeInTheDocument()
    expect(within(left).getByText('gagal.zip')).toBeInTheDocument()
  })

  it('keeps Unggah disabled until every document belongs to a report', async () => {
    const user = userEvent.setup()
    render(writer)

    const input = await screen.findByLabelText('File laporan (.zip) dan dokumennya (PDF/XLSX)')
    await user.upload(input, new File(['%PDF'], 'laporan.pdf'))
    const staged = await screen.findByRole('list', { name: 'Siap diunggah' })
    expect(within(staged).getByText('Tambahkan file zip laporannya juga.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Unggah 1 laporan' })).toBeDisabled()

    await user.upload(input, [zip('ADES.zip'), zip('ITMG.zip')])
    expect(within(staged).getByText('Pilih laporan untuk dokumen ini.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Unggah 2 laporan' })).toBeDisabled()

    await user.selectOptions(
      within(staged).getByRole('combobox', { name: 'Laporan untuk laporan.pdf' }),
      'ITMG.zip',
    )
    expect(within(staged).getByText(/untuk ITMG\.zip/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Unggah 2 laporan' })).toBeEnabled()

    await user.click(within(staged).getByRole('button', { name: 'Hapus ITMG.zip dari daftar' }))
    expect(within(staged).queryByText('Pilih laporan untuk dokumen ini.')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Unggah 1 laporan' })).toBeEnabled()
    expect(backend.upload).not.toHaveBeenCalled()
  })

  it('reprocesses a rejected file and hides upload and retry from staff without the post permission', async () => {
    const user = userEvent.setup()
    serve({ research_retry: () => ({ ...rejected, status: 'queued', error_code: null, retryable: false }) })
    const view = render(writer)

    await user.click(await screen.findByRole('button', { name: /^Proses ulang file/ }))
    await waitFor(() => expect(backend.rpc).toHaveBeenCalledWith('research_retry', { p_id: 'file-2' }))
    expect(await findToast('File masuk antrean lagi')).toBeInTheDocument()
    view.unmount()

    render(moderator)
    await screen.findByRole('table', { name: 'File yang diterima' })
    expect(screen.queryByRole('button', { name: /^Proses ulang file/ })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('File laporan (.zip) dan dokumennya (PDF/XLSX)')).not.toBeInTheDocument()
    expect(screen.getByText('Unggah dan proses ulang butuh izin Tulis postingan resmi.')).toBeInTheDocument()

    await userEvent
      .setup()
      .click(await screen.findByRole('button', { name: 'Buka laporan BBCA · Kuartal III 2026' }))
    const sheet = await screen.findByRole('dialog', { name: 'Detail laporan' })
    await within(sheet).findByRole('region', { name: 'Dokumen sumber' })
    expect(within(sheet).queryByRole('button', { name: 'Tambah dokumen' })).not.toBeInTheDocument()
  })

  it('shows the report details with the exact post text, warnings, figures, files and history', async () => {
    const user = userEvent.setup()
    const onOpenPost = vi.fn()
    render(writer, onOpenPost)

    await user.click(await screen.findByRole('button', { name: 'Buka laporan BBCA · Kuartal III 2026' }))
    const sheet = await screen.findByRole('dialog', { name: 'Detail laporan' })
    await within(sheet).findByRole('heading', { name: /PT Bank Central Asia Tbk/ })
    expect(backend.rpc).toHaveBeenCalledWith('research_report', { p_id: 'rep-1' })

    const summary = within(sheet).getByText(/Laba bersih bagian induk Rp45,00 T/)
    expect(summary).toHaveTextContent('$BBCA Kuartal III 2026 (belum diaudit) Laba bersih')
    expect(summary).toHaveClass('whitespace-pre-wrap')
    expect(
      within(sheet).getByText('Laporan keuangan · Kuartal III 2026 · Belum diaudit', { exact: false }),
    ).toBeInTheDocument()

    const preview = within(sheet).getByRole('region', { name: 'Tampilan di aplikasi' })
    const card = within(preview).getByRole('article', { name: 'Laporan Keuangan Kuartal III 2026' })
    expect(within(card).getByText('Ringkasan otomatis')).toBeInTheDocument()
    expect(within(card).getByText('Laba bersih kuartal III naik 9,0% YoY')).toBeInTheDocument()
    expect(within(card).getByText('Rp15,68 T')).toBeInTheDocument()
    expect(within(card).getByText('Poin utama')).toBeInTheDocument()

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

  it('lists source documents, uploads a new one to the post files bucket, and removes one', async () => {
    const ready: ResearchDocument = {
      id: 'doc-1',
      status: 'ready',
      source: 'api',
      name: 'BBCA Laporan Keuangan Kuartal III 2026.pdf',
      path: 'research/0b6a4f1e-2c3d-4e5f-8a9b-0c1d2e3f4a5b/file.pdf',
      mime: 'application/pdf',
      size_bytes: 2_500_000,
      key: { id: 'key-1', name: 'Data laporan OLT', prefix: 'AbCdEfGh' },
      uploaded_by: null,
      error_code: null,
      error_detail: null,
      received_at: '2026-11-25T02:00:06.000Z',
      finished_at: '2026-11-25T02:00:08.000Z',
    }
    const blocked: ResearchDocument = {
      ...ready,
      id: 'doc-2',
      status: 'rejected',
      source: 'hub',
      name: 'Data.xlsx',
      path: 'research/1b6a4f1e-2c3d-4e5f-8a9b-0c1d2e3f4a5b/file.xlsx',
      key: null,
      uploaded_by: { id: 'maya', name: 'Maya' },
      error_code: 'macro_not_allowed',
    }
    const checking: ResearchDocument = {
      ...ready,
      id: 'doc-3',
      status: 'queued',
      source: 'hub',
      name: 'Laporan lengkap.pdf',
      key: null,
      uploaded_by: { id: 'maya', name: 'Maya' },
    }
    const scanning: ResearchDocument = { ...checking, id: 'doc-4', status: 'processing', name: 'Data.xlsx' }
    const user = userEvent.setup()
    backend.upload.mockResolvedValue({ data: { path: 'x' }, error: null })
    serve({
      research_report: () => ({ ...detail, documents: [ready, blocked] }),
      research_add_document: () => ({ ...detail, documents: [ready, blocked, checking, scanning] }),
      research_remove_document: () => ({ ...detail, documents: [blocked, checking, scanning] }),
    })
    render(writer)

    await user.click(await screen.findByRole('button', { name: 'Buka laporan BBCA · Kuartal III 2026' }))
    const sheet = await screen.findByRole('dialog', { name: 'Detail laporan' })
    const section = await within(sheet).findByRole('region', { name: 'Dokumen sumber' })
    expect(
      within(section).getByRole('button', { name: 'BBCA Laporan Keuangan Kuartal III 2026.pdf' }),
    ).toBeInTheDocument()
    expect(within(section).getByText('Siap')).toBeInTheDocument()
    expect(within(section).getByText(/API · Data laporan OLT/)).toBeInTheDocument()
    expect(within(section).getByText('Ditolak')).toBeInTheDocument()
    expect(within(section).getByText('File Excel berisi makro.')).toBeInTheDocument()

    await user.type(
      within(section).getByRole('textbox', { name: 'Nama tampilan dokumen' }),
      'Laporan lengkap.pdf',
    )
    const pdf = new File(['%PDF-1.7'], 'FinancialStatement-2026-III-BBCA.pdf', { type: '' })
    await user.upload(within(section).getByLabelText('Pilih dokumen sumber'), pdf)

    await waitFor(() => expect(backend.rpc).toHaveBeenCalledWith('research_add_document', expect.anything()))
    expect(backend.bucket).toHaveBeenCalledWith('post-files')
    const [path, body, options] = backend.upload.mock.calls[0] as [string, Blob, object]
    expect(path).toMatch(/^research\/[0-9a-f-]{36}\/file\.pdf$/)
    expect(body.type).toBe('application/pdf')
    expect(options).toEqual({ contentType: 'application/pdf', upsert: false })
    expect(backend.rpc).toHaveBeenCalledWith('research_add_document', {
      p_report: 'rep-1',
      p_object: path,
      p_name: 'Laporan lengkap.pdf',
    })
    expect(await findToast('Dokumen diunggah dan sedang diperiksa')).toBeInTheDocument()
    expect(await within(section).findByText('Menunggu')).toBeInTheDocument()
    expect(within(section).getByRole('textbox', { name: 'Nama tampilan dokumen' })).toHaveValue('')
    expect(within(section).getByText(/Sudah 3 dokumen/)).toBeInTheDocument()
    expect(within(section).getByRole('button', { name: 'Tambah dokumen' })).toBeDisabled()

    await user.click(
      within(section).getByRole('button', {
        name: 'Hapus dokumen BBCA Laporan Keuangan Kuartal III 2026.pdf',
      }),
    )
    await waitFor(() =>
      expect(backend.rpc).toHaveBeenCalledWith('research_remove_document', { p_id: 'doc-1' }),
    )
    expect(await findToast('Dokumen dihapus dari laporan dan postingannya')).toBeInTheDocument()
    await waitFor(() =>
      expect(
        within(section).queryByRole('button', { name: 'BBCA Laporan Keuangan Kuartal III 2026.pdf' }),
      ).not.toBeInTheDocument(),
    )
  })

  it('refuses document types the server would not accept before uploading', async () => {
    const user = userEvent.setup({ applyAccept: false })
    render(writer)

    await user.click(await screen.findByRole('button', { name: 'Buka laporan BBCA · Kuartal III 2026' }))
    const sheet = await screen.findByRole('dialog', { name: 'Detail laporan' })
    const section = await within(sheet).findByRole('region', { name: 'Dokumen sumber' })
    expect(within(section).getByText('Belum ada dokumen sumber.')).toBeInTheDocument()
    await user.upload(within(section).getByLabelText('Pilih dokumen sumber'), new File(['x'], 'data.xls'))
    expect(await within(section).findByRole('alert')).toHaveTextContent('Format ini tidak diterima')
    expect(backend.upload).not.toHaveBeenCalled()
  })

  it('creates a post for a report that has none', async () => {
    const user = userEvent.setup()
    const missing: ReportDetail = {
      ...detail,
      post: null,
      can_create_post: true,
      warnings: [{ code: 'no_official_account' }],
    }
    serve({ research_report: () => missing, research_create_post: () => ({ ...detail, warnings: [] }) })
    render(writer)

    await user.click(await screen.findByRole('button', { name: 'Buka laporan BBCA · Kuartal III 2026' }))
    const sheet = await screen.findByRole('dialog', { name: 'Detail laporan' })
    expect(await within(sheet).findByText('Belum ada postingan untuk laporan ini.')).toBeInTheDocument()
    expect(within(sheet).getByText(/postingan tidak dibuat/)).toBeInTheDocument()
    await user.click(within(sheet).getByRole('button', { name: 'Buat postingan' }))

    await waitFor(() =>
      expect(backend.rpc).toHaveBeenCalledWith('research_create_post', { p_report: 'rep-1' }),
    )
    expect(await findToast('Postingan dibuat')).toBeInTheDocument()
    expect(await within(sheet).findByText('Menunggu persetujuan')).toBeInTheDocument()
    expect(within(sheet).queryByRole('button', { name: 'Buat postingan' })).not.toBeInTheDocument()
  })

  it('shows the posting settings read-only to staff who are not Super Admin', async () => {
    serve({
      research_config: () => ({
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
    serve({ research_save_config: () => saved })
    render(superAdmin)

    await user.click(await screen.findByRole('combobox', { name: 'Akun resmi' }))
    await user.click(await screen.findByRole('option', { name: 'OLT Research (@olt_research)' }))
    const toggle = screen.getByRole('switch', { name: /^Posting otomatis/ })
    expect(toggle).toHaveAccessibleName(/hanya untuk laporan tanpa peringatan/)
    await user.click(toggle)
    await user.click(screen.getByRole('button', { name: 'Simpan pengaturan' }))

    await waitFor(() =>
      expect(backend.rpc).toHaveBeenCalledWith('research_save_config', {
        p_official_account: 'acc-1',
        p_auto_publish: true,
      }),
    )
    expect(await findToast('Pengaturan riset disimpan')).toBeInTheDocument()
  })
})
