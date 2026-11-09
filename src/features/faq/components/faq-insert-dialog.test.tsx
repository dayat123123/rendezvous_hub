import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/test/render'

import type * as ApiModule from '../api'
import { faqApi } from '../api'
import type { AgentFaqArticle } from '../types'
import FaqInsertDialog from './faq-insert-dialog'

vi.mock('../api', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>()
  return { ...actual, faqApi: { ...actual.faqApi, agentSearch: vi.fn(), agentFlag: vi.fn() } }
})

const pin: AgentFaqArticle = {
  id: 'a1',
  category: 'akun',
  question: 'Forgot your PIN?',
  answer: 'Choose **Forgot PIN**.',
  topic: null,
  updated_at: '2026-11-01T00:00:00.000Z',
  open_flags: 2,
}
const fee: AgentFaqArticle = {
  ...pin,
  id: 'a2',
  question: 'What are the fees?',
  answer: 'No fee.',
  open_flags: 0,
}

describe('FaqInsertDialog', () => {
  beforeEach(() => {
    vi.mocked(faqApi.agentSearch)
      .mockReset()
      .mockImplementation((query) => Promise.resolve(query === 'fee' ? [fee] : [pin, fee]))
    vi.mocked(faqApi.agentFlag).mockReset().mockResolvedValue({ id: 9 })
  })

  it('searches in the ticket language and hands the chosen article back', async () => {
    const user = userEvent.setup()
    const onInsert = vi.fn()
    renderWithProviders(<FaqInsertDialog language="en" onInsert={onInsert} onClose={vi.fn()} />)
    const dialog = screen.getByRole('dialog', { name: 'Sisipkan artikel FAQ' })

    expect(
      await within(dialog).findByText('Sudah ditandai 2 kali dan belum ditindaklanjuti.'),
    ).toBeInTheDocument()
    await user.type(within(dialog).getByRole('textbox', { name: 'Cari artikel terbit' }), 'fee')
    await waitFor(() => expect(faqApi.agentSearch).toHaveBeenLastCalledWith('fee', 'en'))
    expect(await within(dialog).findByRole('heading', { name: 'What are the fees?' })).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Sisipkan' }))
    expect(onInsert).toHaveBeenCalledWith(fee)
  })

  it('flags an article as outdated with a required note', async () => {
    const user = userEvent.setup()
    renderWithProviders(<FaqInsertDialog language="id" onInsert={vi.fn()} onClose={vi.fn()} />)
    const dialog = screen.getByRole('dialog')
    await user.click(await within(dialog).findByRole('button', { name: 'What are the fees?' }))
    await user.click(within(dialog).getByRole('button', { name: 'Tandai perlu diperbarui' }))

    await user.click(within(dialog).getByRole('button', { name: 'Kirim catatan' }))
    expect(within(dialog).getByLabelText('Apa yang perlu diperbarui?')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(faqApi.agentFlag).not.toHaveBeenCalled()

    await user.type(within(dialog).getByLabelText('Apa yang perlu diperbarui?'), 'Biaya admin sudah naik')
    await user.click(within(dialog).getByRole('button', { name: 'Kirim catatan' }))
    await waitFor(() => expect(faqApi.agentFlag).toHaveBeenCalledWith('a2', 'Biaya admin sudah naik'))
    expect(await within(dialog).findByRole('button', { name: 'Tandai perlu diperbarui' })).toBeInTheDocument()
  })
})
