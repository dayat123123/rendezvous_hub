import { QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { TooltipProvider } from '@/components/ui/menu'
import { messageFixture } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'
import { dismissToasts, findToast, Toaster } from '@/test/toast'

import type { ChatMessage, PendingMessage } from '../types'
import { buildRows } from '../rows'
import { MessageList } from './message-list'

const virtual = vi.hoisted(() => ({ scrollToIndex: vi.fn(), scrollToOffset: vi.fn() }))

vi.mock('@tanstack/react-virtual', async () => {
  const { useRef } = await import('react')
  type Options = { count: number; getItemKey: (index: number) => string | number }
  return {
    useVirtualizer: (options: Options) => {
      const current = useRef(options)
      current.current = options
      const instance = useRef({
        getVirtualItems: () =>
          Array.from({ length: current.current.count }, (_, index) => ({
            index,
            key: current.current.getItemKey(index),
            start: index * 64,
            end: index * 64 + 64,
            size: 64,
          })),
        getTotalSize: () => current.current.count * 64,
        getOffsetForIndex: (index: number) => [index * 64, 'start'],
        measureElement: () => undefined,
        scrollToIndex: virtual.scrollToIndex,
        scrollToOffset: virtual.scrollToOffset,
      })
      return instance.current
    },
  }
})

const ME = 'agent-me'
const stamp = (minute: number) => new Date(Date.UTC(2026, 9, 30, 2, minute)).toISOString()

function customer(id: string, minute: number, extra: Partial<ChatMessage> = {}) {
  return messageFixture({
    id,
    body: `Pesan ${id}`,
    created_at: stamp(minute),
    cursor: stamp(minute),
    ...extra,
  })
}

function staff(id: string, minute: number, extra: Partial<ChatMessage> = {}) {
  return customer(id, minute, { sender_id: ME, sender_role: 'agent', sender_display_name: 'Rina', ...extra })
}

const history = [customer('m1', 1), staff('m2', 2), customer('m3', 3)]

type ListProps = Partial<Parameters<typeof MessageList>[0]>

function props(overrides: ListProps = {}) {
  return {
    messages: history,
    pending: [] as PendingMessage[],
    meId: ME,
    customerReadAt: null,
    hasOlder: false,
    loadingOlder: false,
    onLoadOlder: vi.fn(),
    trustedHost: () => false,
    onResend: vi.fn(),
    onDiscard: vi.fn(),
    ...overrides,
  }
}

function setup(overrides: ListProps = {}) {
  const result = renderWithProviders(
    <>
      <MessageList {...props(overrides)} />
      <Toaster />
    </>,
  )
  const rerender = (next: ListProps) =>
    result.rerender(
      <QueryClientProvider client={result.client}>
        <TooltipProvider>
          <MessageList {...props({ ...overrides, ...next })} />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>,
    )
  return { ...result, rerender }
}

function scrollTo(distanceFromBottom: number) {
  const log = screen.getByRole('log')
  Object.defineProperty(log, 'clientHeight', { configurable: true, value: 600 })
  Object.defineProperty(log, 'scrollHeight', { configurable: true, value: 5000 })
  Object.defineProperty(log, 'scrollTop', {
    configurable: true,
    writable: true,
    value: 5000 - 600 - distanceFromBottom,
  })
  fireEvent.scroll(log)
}

const jumpButton = () => screen.queryByRole('button', { name: 'Ke pesan terbaru' })

async function settled() {
  await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
}

describe('MessageList navigation', () => {
  beforeEach(() => {
    virtual.scrollToIndex.mockReset()
    virtual.scrollToOffset.mockReset()
  })

  afterEach(() => dismissToasts())

  it('opens at the newest message', async () => {
    setup()
    await waitFor(() => expect(virtual.scrollToIndex).toHaveBeenCalledWith(3, { align: 'end' }))
  })

  it('shows the jump button away from the bottom and hides it back at the bottom', async () => {
    setup()
    await settled()
    expect(jumpButton()).not.toBeInTheDocument()

    scrollTo(200)
    expect(jumpButton()).not.toBeInTheDocument()

    scrollTo(900)
    expect(jumpButton()).toBeInTheDocument()

    scrollTo(10)
    expect(jumpButton()).not.toBeInTheDocument()
  })

  it('counts new customer and system messages while scrolled up and jumps on click', async () => {
    const view = setup()
    await settled()
    scrollTo(2000)
    virtual.scrollToIndex.mockClear()

    view.rerender({
      messages: [
        ...history,
        customer('m4', 4),
        staff('m5', 5),
        customer('m6', 6, { kind: 'system', sender_role: 'system', sender_id: null }),
      ],
    })
    await settled()

    const button = jumpButton()
    expect(button).toHaveAccessibleDescription('2 pesan baru')
    expect(within(button!).getByText('2')).toBeInTheDocument()
    expect(virtual.scrollToIndex).not.toHaveBeenCalled()

    fireEvent.click(button!)
    expect(virtual.scrollToIndex).toHaveBeenCalledWith(6, { align: 'end', behavior: 'auto' })
    expect(within(jumpButton()!).queryByText('2')).not.toBeInTheDocument()

    scrollTo(0)
    expect(jumpButton()).not.toBeInTheDocument()
  })

  it('scrolls smoothly when the newest message is close', async () => {
    setup()
    await settled()
    scrollTo(700)
    virtual.scrollToIndex.mockClear()

    fireEvent.click(jumpButton()!)

    expect(virtual.scrollToIndex).toHaveBeenCalledWith(3, { align: 'end', behavior: 'smooth' })
  })

  it('caps the badge at 99+', async () => {
    const view = setup()
    await settled()
    scrollTo(900)

    view.rerender({
      messages: [...history, ...Array.from({ length: 120 }, (_, index) => customer(`n${index}`, 10 + index))],
    })

    expect(await within(jumpButton()!).findByText('99+')).toBeInTheDocument()
  })

  it('keeps following new messages at the bottom but not while scrolled up', async () => {
    const view = setup()
    await settled()
    virtual.scrollToIndex.mockClear()

    view.rerender({ messages: [...history, customer('m4', 4)] })
    await waitFor(() =>
      expect(virtual.scrollToIndex).toHaveBeenCalledWith(4, { align: 'end', behavior: 'auto' }),
    )

    scrollTo(900)
    virtual.scrollToIndex.mockClear()
    view.rerender({ messages: [...history, customer('m4', 4), customer('m5', 5)] })
    await settled()
    await settled()

    expect(virtual.scrollToIndex).not.toHaveBeenCalled()
    expect(within(jumpButton()!).getByText('1')).toBeInTheDocument()
  })

  it('scrolls to the newest message once after the agent sends, even when scrolled up', async () => {
    const view = setup()
    await settled()
    scrollTo(2000)
    virtual.scrollToIndex.mockClear()

    view.rerender({ followSignal: 1 })
    await waitFor(() =>
      expect(virtual.scrollToIndex).toHaveBeenCalledWith(3, { align: 'end', behavior: 'auto' }),
    )

    virtual.scrollToIndex.mockClear()
    view.rerender({ followSignal: 1, messages: [...history, staff('m4', 4)] })
    await waitFor(() =>
      expect(virtual.scrollToIndex).toHaveBeenCalledWith(4, { align: 'end', behavior: 'auto' }),
    )

    scrollTo(2000)
    virtual.scrollToIndex.mockClear()
    view.rerender({ followSignal: 1, messages: [...history, staff('m4', 4), customer('m5', 5)] })
    await settled()
    await settled()
    expect(virtual.scrollToIndex).not.toHaveBeenCalled()
  })

  it('jumps to a loaded original message and highlights it briefly', async () => {
    const reply = staff('m4', 4, {
      reply_to_id: 'm1',
      reply_to_body: 'Pesan m1',
      reply_to_sender_username: 'budi',
    })
    setup({ messages: [...history, reply] })
    await settled()
    virtual.scrollToIndex.mockClear()

    const quote = screen.getByRole('button', { name: /Pesan m1/ })
    quote.focus()
    expect(quote).toHaveFocus()
    fireEvent.click(quote)

    await waitFor(() =>
      expect(virtual.scrollToIndex).toHaveBeenCalledWith(1, { align: 'center', behavior: 'auto' }),
    )
    const original = screen.getByText('Pesan m1', { selector: 'p' }).closest('[data-highlighted]')
    expect(original).toHaveClass('animate-flash')
    await waitFor(() => expect(document.querySelector('[data-highlighted]')).toBeNull(), { timeout: 3000 })
  })

  it('loads older pages to reach an original that is not loaded yet', async () => {
    const older = customer('m0', 0, { body: 'Pesan lama sekali' })
    const reply = staff('m4', 4, {
      reply_to_id: 'm0',
      reply_to_body: 'Pesan lama sekali',
      reply_to_sender_username: 'budi',
    })
    const onFindOlder = vi.fn<(id: string) => Promise<boolean>>()

    function Harness() {
      const [messages, setMessages] = useState([...history, reply])
      onFindOlder.mockImplementation(() => {
        setMessages([older, ...history, reply])
        return Promise.resolve(true)
      })
      return <MessageList {...props({ messages, hasOlder: true, onFindOlder })} />
    }

    renderWithProviders(<Harness />)
    await settled()
    virtual.scrollToIndex.mockClear()

    fireEvent.click(screen.getByRole('button', { name: /Pesan lama sekali/ }))

    await waitFor(() => expect(onFindOlder).toHaveBeenCalledWith('m0'))
    await waitFor(() =>
      expect(virtual.scrollToIndex).toHaveBeenCalledWith(1, { align: 'center', behavior: 'auto' }),
    )
    expect(
      screen.getByText('Pesan lama sekali', { selector: 'p' }).closest('[data-highlighted]'),
    ).toHaveClass('animate-flash')
  })

  it('tells the agent when the original message cannot be found', async () => {
    const reply = staff('m4', 4, { reply_to_id: 'gone', reply_to_body: 'Pesan hilang' })
    const onFindOlder = vi.fn(() => Promise.resolve(false))
    setup({ messages: [...history, reply], hasOlder: true, onFindOlder })
    await settled()
    virtual.scrollToIndex.mockClear()

    fireEvent.click(screen.getByRole('button', { name: /Pesan hilang/ }))

    expect(await findToast('Pesan yang dibalas tidak ditemukan.')).toBeInTheDocument()
    expect(onFindOlder).toHaveBeenCalledWith('gone')
    expect(virtual.scrollToIndex).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ align: 'center' }),
    )
  })

  describe('floating date', () => {
    const twoDays = [
      ...Array.from({ length: 40 }, (_, i) => customer(`a${i}`, i)),
      ...Array.from({ length: 40 }, (_, i) => customer(`b${i}`, 24 * 60 + i)),
    ]
    const days = buildRows(twoDays, [], { notes: [] }).filter((row) => row.kind === 'day')
    const pill = () => screen.getByTestId('floating-date')

    afterEach(() => vi.useRealTimers())

    it('shows the day of the topmost visible message while scrolling, then fades out', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      setup({ messages: twoDays })
      await screen.findByText('Pesan b39')

      scrollTo(2000)
      expect(pill()).toHaveTextContent(days[0]?.kind === 'day' ? days[0].label : '')
      expect(pill()).toHaveClass('opacity-100')

      act(() => void vi.advanceTimersByTime(1600))
      expect(pill()).toHaveClass('opacity-0')
    })

    it('stays hidden at the latest messages', async () => {
      setup({ messages: twoDays })
      await screen.findByText('Pesan b39')
      scrollTo(10)
      expect(screen.queryByTestId('floating-date')?.className ?? '').not.toContain('opacity-100')
    })
  })
})
