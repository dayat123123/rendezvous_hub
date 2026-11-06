import { act, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import i18n from '@/i18n'
import { usePreferences } from '@/lib/preferences'
import { messageFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'

import { SystemMessage } from './message-bubble'

const claimed = messageFixture({
  kind: 'system',
  sender_role: 'system',
  body: 'Tiket diambil oleh Hendi – CS Resmi.',
  payload: {
    code: 'ticket_claimed',
    texts: {
      id: 'Tiket diambil oleh Hendi – CS Resmi.',
      en: 'Your ticket is now handled by Hendi – Official CS.',
    },
  },
})

afterEach(async () => {
  await act(async () => {
    await i18n.changeLanguage('id')
  })
  usePreferences.setState({ language: 'id' })
})

describe('SystemMessage', () => {
  it('switches the system text when the console language changes', async () => {
    renderWithProviders(<SystemMessage message={claimed} />)
    expect(screen.getByText(/Tiket diambil oleh Hendi – CS Resmi\./)).toBeInTheDocument()

    await act(async () => {
      await i18n.changeLanguage('en')
    })

    expect(await screen.findByText(/Your ticket is now handled by Hendi – Official CS\./)).toBeInTheDocument()
    expect(screen.queryByText(/Tiket diambil oleh Hendi/)).not.toBeInTheDocument()
  })

  it('keeps the stored text for messages created before translations existed', () => {
    renderWithProviders(
      <SystemMessage message={messageFixture({ kind: 'system', body: 'Tiket ditutup.', payload: {} })} />,
    )
    expect(screen.getByText(/Tiket ditutup\./)).toBeInTheDocument()
  })
})
