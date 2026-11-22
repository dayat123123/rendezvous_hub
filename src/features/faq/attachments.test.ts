import { describe, expect, it } from 'vitest'

import { attachmentFormat, attachmentName, attachmentNameValid, moveAttachment } from './attachments'
import type { FaqAttachment } from './types'

const item = (path: string): FaqAttachment => ({
  path,
  name: path,
  kind: 'document',
  mime: 'application/pdf',
  size: 1,
})

describe('FAQ attachments', () => {
  it('maps supported files to a format with its size limit', () => {
    expect(attachmentFormat({ name: 'a.pdf', type: 'application/pdf' })).toMatchObject({
      extension: 'pdf',
      kind: 'document',
      maxBytes: 10 * 1024 * 1024,
    })
    expect(attachmentFormat({ name: 'b.png', type: 'image/png' })).toMatchObject({
      kind: 'image',
      maxBytes: 5 * 1024 * 1024,
    })
    expect(attachmentFormat({ name: 'c.mov', type: 'video/quicktime' })).toMatchObject({
      extension: 'mov',
      kind: 'video',
      maxBytes: 25 * 1024 * 1024,
    })
  })

  it('falls back to the extension only when the browser gives no type', () => {
    expect(attachmentFormat({ name: 'foto.JPEG', type: '' })).toMatchObject({ extension: 'jpg' })
    expect(attachmentFormat({ name: 'klip.mov', type: 'application/octet-stream' })).toMatchObject({
      mime: 'video/quicktime',
    })
    expect(attachmentFormat({ name: 'a.pdf', type: 'text/html' })).toBeNull()
    expect(attachmentFormat({ name: 'setup.exe', type: '' })).toBeNull()
    expect(attachmentFormat({ name: 'file.docx', type: '' })).toBeNull()
  })

  it('cleans file names into display names of at most 120 characters', () => {
    expect(attachmentName('  Formulir\tganti   rekening.pdf ')).toBe('Formulir ganti rekening.pdf')
    expect(Array.from(attachmentName(`${'é'.repeat(150)}.pdf`))).toHaveLength(120)
    expect(attachmentName('\u0000\u0007')).toBe('lampiran')
    expect(attachmentNameValid('  ')).toBe(false)
    expect(attachmentNameValid('x'.repeat(121))).toBe(false)
    expect(attachmentNameValid('Formulir')).toBe(true)
  })

  it('moves an attachment up or down and ignores moves past the ends', () => {
    const items = [item('a'), item('b'), item('c')]
    expect(moveAttachment(items, 2, -1).map((x) => x.path)).toEqual(['a', 'c', 'b'])
    expect(moveAttachment(items, 0, 1).map((x) => x.path)).toEqual(['b', 'a', 'c'])
    expect(moveAttachment(items, 0, -1)).toBe(items)
    expect(moveAttachment(items, 2, 1)).toBe(items)
  })
})
