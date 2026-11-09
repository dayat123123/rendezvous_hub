import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as SurveyApiModule from '@/features/survey/api'
import { surveyApi } from '@/features/survey/api'
import type * as TicketsApiModule from '@/features/tickets/api'
import { ticketsApi } from '@/features/tickets/api'
import { downloadText } from '@/lib/download'
import { monitorFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'

import type * as ApiModule from '../api'
import { reportsApi } from '../api'
import { HelpReportSection } from './help-report-section'
import { RatingReasonsSection } from './rating-reasons-section'

vi.mock('../api', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>()
  return { ...actual, reportsApi: { ...actual.reportsApi, ratingReasons: vi.fn(), helpReport: vi.fn() } }
})

vi.mock('@/features/survey/api', async (importOriginal) => {
  const actual = await importOriginal<typeof SurveyApiModule>()
  return { ...actual, surveyApi: { config: vi.fn(), save: vi.fn() } }
})

vi.mock('@/features/tickets/api', async (importOriginal) => {
  const actual = await importOriginal<typeof TicketsApiModule>()
  return { ...actual, ticketsApi: { ...actual.ticketsApi, topics: vi.fn() } }
})

vi.mock('@/lib/download', () => ({ downloadText: vi.fn() }))

const range = { from: '2026-11-01', to: '2026-11-09' }

describe('report help sections', () => {
  beforeEach(() => {
    vi.mocked(downloadText).mockReset()
    vi.mocked(ticketsApi.topics)
      .mockReset()
      .mockResolvedValue([{ code: 'order', name: 'Pesanan', help_url: null, urgent: false }])
    vi.mocked(surveyApi.config)
      .mockReset()
      .mockResolvedValue({
        config: { reasons: [{ code: 'slow', id: 'Terlalu lama', en: 'Too slow' }] },
        updated_at: null,
        updated_by: null,
      })
    vi.mocked(reportsApi.ratingReasons)
      .mockReset()
      .mockResolvedValue({
        by_topic: [{ topic: 'order', reason: 'slow', count: 4 }],
        by_agent: [{ agent_id: 'a', agent_name: 'Rina', reason: 'legacy', count: 2 }],
      })
    vi.mocked(reportsApi.helpReport)
      .mockReset()
      .mockResolvedValue({
        from: range.from,
        to: range.to,
        topics: [
          {
            topic: 'order',
            name: 'Pesanan',
            tickets: 9,
            median_first_response_minutes: 4,
            median_resolution_minutes: 95,
          },
        ],
        articles: [
          {
            id: 'a1',
            question: 'Cara reset PIN',
            readers: 30,
            helpful: 6,
            not_helpful: 2,
            tickets_after: 3,
            prevented: 27,
            helpful_percent: 75,
          },
        ],
        misses: [],
      })
  })

  it('shows low rating reasons per topic and agent with labels and exports CSV', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RatingReasonsSection range={range} />, monitorFixture)

    const byTopic = await screen.findByRole('group', { name: 'Per topik' })
    expect(await within(byTopic).findByText('Pesanan')).toBeInTheDocument()
    expect(await within(byTopic).findByText('Terlalu lama')).toBeInTheDocument()
    const byAgent = screen.getByRole('group', { name: 'Per CS' })
    expect(within(byAgent).getByText('Rina')).toBeInTheDocument()
    expect(within(byAgent).getByText('legacy')).toBeInTheDocument()
    expect(reportsApi.ratingReasons).toHaveBeenCalledWith(range)

    await user.click(within(byTopic).getByRole('button', { name: 'Ekspor CSV Per topik' }))
    expect(downloadText).toHaveBeenCalledWith(
      'laporan-alasan-topik-2026-11-01-2026-11-09.csv',
      expect.stringContaining('order,Pesanan,slow,Terlalu lama,4'),
      'text/csv;charset=utf-8',
    )
  })

  it('shows the help report tables and exports each one', async () => {
    const user = userEvent.setup()
    renderWithProviders(<HelpReportSection range={range} />, monitorFixture)

    const topics = await screen.findByRole('group', { name: 'Topik dan waktu tanggapan' })
    expect(within(topics).getByText('Pesanan')).toBeInTheDocument()
    const articles = screen.getByRole('group', { name: 'Artikel FAQ' })
    expect(within(articles).getByText('Cara reset PIN')).toBeInTheDocument()
    expect(within(articles).getByText('75%')).toBeInTheDocument()
    const misses = screen.getByRole('group', { name: 'Pencarian tanpa hasil' })
    expect(within(misses).getByText('Tidak ada pencarian tanpa hasil di rentang ini.')).toBeInTheDocument()
    expect(within(misses).getByRole('button', { name: 'Ekspor CSV Pencarian tanpa hasil' })).toBeDisabled()

    await user.click(within(articles).getByRole('button', { name: 'Ekspor CSV Artikel FAQ' }))
    expect(downloadText).toHaveBeenCalledWith(
      'laporan-bantuan-artikel-2026-11-01-2026-11-09.csv',
      expect.stringContaining('Cara reset PIN,30,6,2,75,3,27'),
      'text/csv;charset=utf-8',
    )
    await user.click(within(topics).getByRole('button', { name: 'Ekspor CSV Topik dan waktu tanggapan' }))
    expect(downloadText).toHaveBeenLastCalledWith(
      'laporan-bantuan-topik-2026-11-01-2026-11-09.csv',
      expect.stringContaining('order,Pesanan,9,4,95'),
      'text/csv;charset=utf-8',
    )
  })
})
