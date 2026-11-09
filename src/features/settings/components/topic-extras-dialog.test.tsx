import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { agentFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'

import type * as ApiModule from '../api'
import { settingsApi } from '../api'
import type { TopicConfig } from '../types'
import { TopicsSection } from './topics-section'

vi.mock('../api', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>()
  return {
    ...actual,
    settingsApi: {
      ...actual.settingsApi,
      topics: vi.fn(),
      options: vi.fn(),
      topicPicker: vi.fn(),
      saveTopicExtras: vi.fn(),
    },
  }
})

const order: TopicConfig = {
  code: 'order',
  name_id: 'Order & Transaksi',
  name_en: 'Orders',
  skill: 'general',
  default_priority: 'P3',
  help_url: null,
  sort_order: 10,
  active: true,
  description_id: null,
  description_en: null,
  icon: 'receipt',
  style: 'normal',
  flags: [],
  intake: [
    {
      key: 'order_no',
      type: 'text',
      label_id: 'Nomor order',
      label_en: 'Order number',
      required: true,
      options: [],
    },
  ],
  customer_replies: [],
  sop: null,
}

const content = { ...agentFixture, roles: ['cs_content'] }

async function openExtras() {
  const user = userEvent.setup()
  renderWithProviders(<TopicsSection />, content)
  const row = await screen.findByRole('row', { name: /Order & Transaksi/ })
  expect(within(row).getByText('1 pertanyaan · 0 saran')).toBeInTheDocument()
  await user.click(
    within(row).getByRole('button', {
      name: 'Atur pertanyaan awal, saran balasan, dan SOP Order & Transaksi',
    }),
  )
  return { user, dialog: await screen.findByRole('dialog', { name: 'Isian & SOP: Order & Transaksi' }) }
}

describe('TopicExtrasDialog', () => {
  beforeEach(() => {
    vi.mocked(settingsApi.topics).mockReset().mockResolvedValue([order])
    vi.mocked(settingsApi.options).mockReset().mockResolvedValue({ teams: [], skills: [] })
    vi.mocked(settingsApi.topicPicker).mockReset().mockResolvedValue({})
    vi.mocked(settingsApi.saveTopicExtras)
      .mockReset()
      .mockImplementation((code, extras) => Promise.resolve({ ...order, code, ...extras }))
  })

  it('adds a choice question, a suggested reply and an SOP, then saves them trimmed', async () => {
    const { user, dialog } = await openExtras()
    expect(within(dialog).getByLabelText('Pertanyaan (Indonesia)')).toHaveValue('Nomor order')

    await user.click(within(dialog).getByRole('button', { name: 'Tambah pertanyaan' }))
    const second = within(dialog).getByRole('group', { name: 'Pertanyaan 2' })
    await user.type(within(second).getByLabelText('Kunci'), 'channel')
    await user.type(within(second).getByLabelText('Pertanyaan (Indonesia)'), 'Lewat mana?')
    await user.type(within(second).getByLabelText('Pertanyaan (Inggris)'), 'Which channel?')
    await user.click(within(second).getByRole('combobox', { name: 'Jenis isian' }))
    await user.click(await screen.findByRole('option', { name: 'Pilihan' }))
    const values = within(second).getAllByLabelText('Nilai')
    const labelsId = within(second).getAllByLabelText('Label (Indonesia)')
    const labelsEn = within(second).getAllByLabelText('Label (Inggris)')
    await user.type(values[0]!, 'app')
    await user.type(labelsId[0]!, 'Aplikasi')
    await user.type(labelsEn[0]!, 'App')
    await user.type(values[1]!, 'web')
    await user.type(labelsId[1]!, 'Situs')
    await user.type(labelsEn[1]!, 'Website')
    await user.click(within(second).getByRole('switch', { name: 'Wajib diisi' }))

    await user.click(within(dialog).getByRole('button', { name: 'Tambah saran' }))
    await user.type(within(dialog).getByLabelText('Saran 1 (Indonesia)'), ' Sudah saya coba ')
    await user.type(within(dialog).getByLabelText('Saran 1 (Inggris)'), 'I tried that')
    await user.type(within(dialog).getByLabelText('SOP untuk CS'), 'Minta bukti transfer')

    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))
    await waitFor(() => expect(settingsApi.saveTopicExtras).toHaveBeenCalledTimes(1))
    expect(settingsApi.saveTopicExtras).toHaveBeenCalledWith('order', {
      intake: [
        order.intake![0],
        {
          key: 'channel',
          type: 'choice',
          label_id: 'Lewat mana?',
          label_en: 'Which channel?',
          required: true,
          options: [
            { value: 'app', label_id: 'Aplikasi', label_en: 'App' },
            { value: 'web', label_id: 'Situs', label_en: 'Website' },
          ],
        },
      ],
      customer_replies: [{ id: 'Sudah saya coba', en: 'I tried that' }],
      sop: 'Minta bukti transfer',
    })
    await waitFor(() => expect(dialog).not.toBeInTheDocument())
    expect(await screen.findByText('2 pertanyaan · 1 saran · SOP')).toBeInTheDocument()
  })

  it('blocks saving while a question is invalid and removes a question', async () => {
    const { user, dialog } = await openExtras()
    await user.click(within(dialog).getByRole('button', { name: 'Tambah pertanyaan' }))
    const second = within(dialog).getByRole('group', { name: 'Pertanyaan 2' })
    await user.type(within(second).getByLabelText('Kunci'), 'order_no')

    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))
    expect(within(dialog).getByText('Kunci sudah dipakai pertanyaan lain.')).toBeInTheDocument()
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Periksa lagi isian yang ditandai merah.')
    expect(settingsApi.saveTopicExtras).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole('button', { name: 'Hapus pertanyaan 2' }))
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))
    await waitFor(() =>
      expect(settingsApi.saveTopicExtras).toHaveBeenCalledWith('order', {
        intake: order.intake,
        customer_replies: [],
        sop: null,
      }),
    )
  })
})
