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

describe('copyText inside a modal dialog', () => {
  it('places the fallback textarea inside the dialog so its focus trap keeps the selection', async () => {
    vi.stubGlobal('navigator', { ...navigator, clipboard: undefined })
    const dialog = document.createElement('div')
    dialog.setAttribute('role', 'dialog')
    const button = document.createElement('button')
    dialog.append(button)
    document.body.append(dialog)
    button.focus()
    let parent: Element | null = null
    document.execCommand = vi.fn(() => {
      parent = document.activeElement?.parentElement ?? null
      return true
    })
    await copyText('rahasia')
    expect(parent).toBe(dialog)
    expect(dialog.querySelector('textarea')).toBeNull()
    expect(document.activeElement).toBe(button)
    dialog.remove()
  })

  it('reports failure when focus is pulled away from the fallback textarea', async () => {
    vi.stubGlobal('navigator', { ...navigator, clipboard: undefined })
    const outside = document.createElement('button')
    document.body.append(outside)
    const steal = () => outside.focus()
    document.addEventListener('focusin', steal, { once: true })
    const execCommand = vi.fn(() => true)
    document.execCommand = execCommand
    await expect(copyText('rahasia')).rejects.toThrow('Copy to clipboard failed')
    expect(execCommand).not.toHaveBeenCalled()
    outside.remove()
  })
})
