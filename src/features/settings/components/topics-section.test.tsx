import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { agentFixture, monitorFixture } from '@/test/fixtures'
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
      saveTopic: vi.fn(),
      topicPicker: vi.fn(),
      saveTopicPicker: vi.fn(),
      reorderTopics: vi.fn(),
    },
  }
})

const fraud: TopicConfig = {
  code: 'fraud',
  name_id: 'Laporkan Penipuan',
  name_en: 'Report Fraud',
  skill: 'fraud',
  default_priority: 'P1',
  help_url: null,
  sort_order: 60,
  active: true,
  description_id: 'Aktivitas mencurigakan atau orang yang mengaku CS',
  description_en: 'Suspicious activity or someone posing as customer service',
  icon: 'shield',
  style: 'danger',
  flags: ['fraud'],
}

const content = { ...agentFixture, roles: ['cs_content'] }

describe('TopicsSection', () => {
  beforeEach(() => {
    vi.mocked(settingsApi.topics).mockReset().mockResolvedValue([fraud])
    vi.mocked(settingsApi.options)
      .mockReset()
      .mockResolvedValue({
        teams: [],
        skills: [
          { code: 'general', name: 'Umum' },
          { code: 'fraud', name: 'Penipuan' },
        ],
      })
    vi.mocked(settingsApi.saveTopic).mockReset().mockResolvedValue([fraud])
    vi.mocked(settingsApi.topicPicker).mockReset().mockResolvedValue({})
    vi.mocked(settingsApi.saveTopicPicker).mockReset().mockResolvedValue({})
  })

  it('lists topics with their description and the danger style', async () => {
    renderWithProviders(<TopicsSection />, content)

    const row = await screen.findByRole('row', { name: /Laporkan Penipuan/ })
    expect(within(row).getByText('Aktivitas mencurigakan atau orang yang mengaku CS')).toBeInTheDocument()
    expect(within(row).getByText('Merah')).toBeInTheDocument()
  })

  it('edits description, icon and style with a live preview; only Super Admins change the flags', async () => {
    const user = userEvent.setup()
    renderWithProviders(<TopicsSection />, content)
    const row = await screen.findByRole('row', { name: /Laporkan Penipuan/ })
    await user.click(within(row).getByRole('button', { name: 'Ubah' }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('checkbox', { name: 'Penipuan' })).toBeDisabled()
    const description = within(dialog).getByLabelText('Deskripsi (Indonesia)')
    await user.clear(description)
    await user.type(description, 'Laporkan aktivitas mencurigakan')
    await user.click(within(dialog).getByRole('radio', { name: 'Kunci' }))

    const preview = within(dialog).getByRole('group', { name: 'Pratinjau di aplikasi' })
    expect(within(preview).getByText('Laporkan aktivitas mencurigakan')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))
    await waitFor(() => expect(settingsApi.saveTopic).toHaveBeenCalledTimes(1))
    expect(vi.mocked(settingsApi.saveTopic).mock.calls[0]?.[0]).toMatchObject({
      code: 'fraud',
      description_id: 'Laporkan aktivitas mencurigakan',
      description_en: 'Suspicious activity or someone posing as customer service',
      icon: 'lock',
      style: 'danger',
      flags: ['fraud'],
    })
  })

  it('lets Super Admins mark a topic as a complaint', async () => {
    const user = userEvent.setup()
    renderWithProviders(<TopicsSection />, monitorFixture)
    const row = await screen.findByRole('row', { name: /Laporkan Penipuan/ })
    await user.click(within(row).getByRole('button', { name: 'Ubah' }))
    const dialog = await screen.findByRole('dialog')

    await user.click(within(dialog).getByRole('checkbox', { name: 'Pengaduan' }))
    await user.click(within(dialog).getByRole('button', { name: 'Simpan' }))
    await waitFor(() => expect(settingsApi.saveTopic).toHaveBeenCalledTimes(1))
    expect(vi.mocked(settingsApi.saveTopic).mock.calls[0]?.[0].flags).toEqual(['complaint', 'fraud'])
  })

  it('saves the topic page title and hint in both languages', async () => {
    const user = userEvent.setup()
    renderWithProviders(<TopicsSection />, content)
    await screen.findByRole('row', { name: /Laporkan Penipuan/ })

    await user.type(screen.getByLabelText('Judul (Indonesia)'), 'Ada kendala apa?')
    await user.type(screen.getByLabelText('Judul (Inggris)'), 'What do you need?')
    await user.click(screen.getByRole('button', { name: 'Simpan teks halaman' }))

    await waitFor(() =>
      expect(settingsApi.saveTopicPicker).toHaveBeenCalledWith({
        title_id: 'Ada kendala apa?',
        title_en: 'What do you need?',
        hint_id: '',
        hint_en: '',
      }),
    )
  })

  it('moves a topic up and down and saves the whole order', async () => {
    const account: TopicConfig = {
      ...fraud,
      code: 'account',
      name_id: 'Akun & Login',
      name_en: 'Account',
      sort_order: 10,
      style: 'normal',
      flags: [],
      icon: 'account',
    }
    vi.mocked(settingsApi.topics).mockResolvedValue([account, fraud])
    vi.mocked(settingsApi.reorderTopics)
      .mockReset()
      .mockImplementation((codes) =>
        Promise.resolve(
          codes.map((code, index) => ({
            ...(code === 'fraud' ? fraud : account),
            sort_order: (index + 1) * 10,
          })),
        ),
      )
    const user = userEvent.setup()
    renderWithProviders(<TopicsSection />, content)

    expect(await screen.findByRole('button', { name: 'Naikkan Akun & Login' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Turunkan Laporkan Penipuan' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Naikkan Laporkan Penipuan' }))
    await waitFor(() => expect(settingsApi.reorderTopics).toHaveBeenCalledWith(['fraud', 'account']))
    const rows = screen.getAllByRole('row').slice(1)
    expect(rows[0]).toHaveTextContent('Laporkan Penipuan')
  })
})
