import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { monitorFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'

import type * as ApiModule from '../api'
import { surveyApi } from '../api'
import type { AdminSurveyConfig } from '../types'
import { SurveySection } from './survey-section'

vi.mock('../api', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>()
  return { ...actual, surveyApi: { config: vi.fn(), save: vi.fn() } }
})

const saved: AdminSurveyConfig = {
  config: {
    question: { id: 'Bagaimana layanan CS kami?', en: 'How was our customer service?' },
    scale: 5,
    low_max: 2,
    reasons: [
      { code: 'slow', id: 'Terlalu lama', en: 'Too slow' },
      { code: 'unclear', id: 'Penjelasan kurang jelas', en: 'Unclear answer' },
    ],
  },
  updated_at: '2026-11-08T03:00:00.000Z',
  updated_by: 'Sinta',
}

describe('SurveySection', () => {
  beforeEach(() => {
    vi.mocked(surveyApi.config).mockReset().mockResolvedValue(saved)
    vi.mocked(surveyApi.save).mockReset()
  })

  it('shows the saved survey locked until edit', async () => {
    renderWithProviders(<SurveySection />, monitorFixture)

    const question = await screen.findByLabelText('Pertanyaan (Indonesia)')
    expect(question).toHaveValue('Bagaimana layanan CS kami?')
    expect(question).toBeDisabled()
    expect(screen.getByLabelText('Kode alasan 2')).toHaveValue('unclear')
    expect(screen.getByText(/Sinta/)).toBeInTheDocument()
  })

  it('edits scale, limit and reasons, then saves after confirmation', async () => {
    const user = userEvent.setup()
    vi.mocked(surveyApi.save).mockImplementation((config) =>
      Promise.resolve({ config, updated_at: '2026-11-09T03:00:00.000Z', updated_by: 'Sinta' }),
    )
    renderWithProviders(<SurveySection />, monitorFixture)

    await user.click(await screen.findByRole('button', { name: /Ubah/ }))
    await user.click(screen.getByRole('radio', { name: '3 pilihan (1, 3, 5)' }))
    await user.clear(screen.getByLabelText('Batas nilai rendah'))
    await user.type(screen.getByLabelText('Batas nilai rendah'), '1')
    await user.click(screen.getByRole('button', { name: 'Hapus alasan 1' }))
    await user.click(screen.getByRole('button', { name: 'Tambah alasan' }))
    await user.type(screen.getByLabelText('Kode alasan 2'), 'unclear')
    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    expect(screen.getByText(/Kode harus unik/)).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()

    await user.clear(screen.getByLabelText('Kode alasan 2'))
    await user.type(screen.getByLabelText('Kode alasan 2'), 'rude')
    await user.type(screen.getByLabelText('Label Indonesia alasan 2'), 'Kurang ramah')
    await user.type(screen.getByLabelText('Label Inggris alasan 2'), 'Unfriendly')
    await user.click(screen.getByRole('button', { name: 'Simpan' }))

    const confirm = await screen.findByRole('alertdialog')
    expect(
      within(confirm).getByText(/Skala 1–3, nilai 1 ke bawah dianggap rendah, 2 pilihan alasan/),
    ).toBeInTheDocument()
    await user.click(within(confirm).getByRole('button', { name: 'Simpan' }))

    await waitFor(() =>
      expect(surveyApi.save).toHaveBeenCalledWith({
        question: { id: 'Bagaimana layanan CS kami?', en: 'How was our customer service?' },
        scale: 3,
        low_max: 1,
        reasons: [
          { code: 'unclear', id: 'Penjelasan kurang jelas', en: 'Unclear answer' },
          { code: 'rude', id: 'Kurang ramah', en: 'Unfriendly' },
        ],
      }),
    )
  })
})
