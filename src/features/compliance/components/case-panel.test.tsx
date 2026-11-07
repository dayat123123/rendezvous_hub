import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { agentFixture, messageFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'

import type * as ApiModule from '../api'
import { complianceApi } from '../api'
import type { CaseDetail } from '../types'
import { CasePanel } from './case-panel'

vi.mock('../api', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>()
  return { ...actual, complianceApi: { ...actual.complianceApi, detail: vi.fn(), messages: vi.fn() } }
})

const compliance = { ...agentFixture, roles: ['compliance' as const] }

function detail(overrides: Partial<CaseDetail> = {}): CaseDetail {
  return {
    id: 't-plain',
    ticket_number: 'CS-20261107-0003',
    case: false,
    room_id: 'r-1',
    version: 3,
    status: 'closed',
    priority: 'P1',
    flags: [],
    topic: 'app',
    topic_name: 'Aplikasi/Teknis',
    language: 'id',
    fake_cs: false,
    customer: { id: 'c-1', display_name: 'WILLIAM SUMITHIO', username: 'TNT', deleted: false },
    agent: { id: 'a-1', display_name: 'Hendi', agent_code: 'CS-0004' },
    created_at: '2026-11-07T07:20:00Z',
    complaint_received_at: null,
    complaint_due_at: null,
    complaint_extended_at: null,
    resolved_at: '2026-11-07T07:31:00Z',
    closed_at: '2026-11-07T07:32:00Z',
    outcome: 'answered',
    rating: 5,
    deadline: null,
    review: null,
    resolution_summary: null,
    returned_reason: null,
    rating_comment: null,
    context: {},
    complaint_extension_reason: null,
    extension_days: 10,
    can_extend: false,
    events: [],
    notes: [],
    reviews: [],
    ...overrides,
  }
}

describe('CasePanel', () => {
  beforeEach(() => {
    vi.mocked(complianceApi.detail).mockReset()
    vi.mocked(complianceApi.messages)
      .mockReset()
      .mockResolvedValue([messageFixture({ body: 'tolong di solved ticket ini ya' })])
  })

  it('opens a regular ticket read only: transcript and timeline, no review, access note', async () => {
    let opened = false
    vi.mocked(complianceApi.detail).mockImplementation(() => {
      opened = true
      return Promise.resolve(detail())
    })
    vi.mocked(complianceApi.messages).mockImplementation(() => {
      expect(opened).toBe(true)
      return Promise.resolve([messageFixture({ body: 'tolong di solved ticket ini ya' })])
    })
    renderWithProviders(<CasePanel ticketId="t-plain" onClose={vi.fn()} />, compliance)

    expect(await screen.findByText('tolong di solved ticket ini ya')).toBeInTheDocument()
    expect(screen.getByText('Tiket biasa')).toBeInTheDocument()
    const tabs = within(screen.getByRole('tablist', { name: /./ }))
    expect(tabs.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Transkrip', 'Riwayat'])
    expect(screen.getByText(/bukan pengaduan atau penipuan/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Unduh transkrip/ })).toBeEnabled()
  })

  it('keeps the review tab for complaints and fraud cases', async () => {
    vi.mocked(complianceApi.detail).mockResolvedValue(detail({ case: true, flags: ['complaint'] }))
    renderWithProviders(<CasePanel ticketId="t-plain" onClose={vi.fn()} />, compliance)

    expect(await screen.findByRole('tab', { name: /Tinjauan/ })).toBeInTheDocument()
    expect(screen.queryByText(/bukan pengaduan atau penipuan/)).not.toBeInTheDocument()
  })
})
