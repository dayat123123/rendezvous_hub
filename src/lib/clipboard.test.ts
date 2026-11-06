import { afterEach, describe, expect, it, vi } from 'vitest'

import { copyText } from './clipboard'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('copyText', () => {
  it('uses the async clipboard when the page is a secure context', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
    await copyText('kunci')
    expect(writeText).toHaveBeenCalledWith('kunci')
  })

  it('falls back to a hidden textarea on a plain-HTTP LAN origin', async () => {
    vi.stubGlobal('navigator', { ...navigator, clipboard: undefined })
    let selected = ''
    const execCommand = vi.fn(() => {
      selected = document.activeElement instanceof HTMLTextAreaElement ? document.activeElement.value : ''
      return true
    })
    document.execCommand = execCommand
    await copyText('kunci')
    expect(execCommand).toHaveBeenCalledWith('copy')
    expect(selected).toBe('kunci')
    expect(document.querySelector('textarea')).toBeNull()
  })

  it('rejects when the browser refuses to copy', async () => {
    vi.stubGlobal('navigator', { ...navigator, clipboard: undefined })
    document.execCommand = vi.fn(() => false)
    await expect(copyText('kunci')).rejects.toThrow('Copy to clipboard failed')
  })
})
