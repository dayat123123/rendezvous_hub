import { describe, expect, it } from 'vitest'

import { attachmentPolicyFixture } from '@/test/fixtures'

import {
  acceptList,
  allowedLabels,
  attachmentKind,
  documentType,
  duration,
  fallbackPolicy,
  fileSize,
  identifyFile,
  isDocument,
  mediaProblem,
  parsePolicy,
} from './media'

const MB = 1024 * 1024
const file = (name: string, type: string, size: number) => new File([new Uint8Array(size)], name, { type })

describe('chat media', () => {
  const policy = attachmentPolicyFixture()

  it('checks size per kind from the server policy', () => {
    expect(mediaProblem(file('layar.png', 'image/png', 1024), policy)).toBeNull()
    expect(mediaProblem(file('bukti.pdf', 'application/pdf', 9 * MB), policy)).toBeNull()
    expect(mediaProblem(file('rekaman.mp4', 'video/mp4', 24 * MB), policy)).toBeNull()
    expect(mediaProblem(file('foto.jpg', 'image/jpeg', 6 * MB), policy)).toBe('tooLarge')
    expect(mediaProblem(file('besar.pdf', 'application/pdf', 11 * MB), policy)).toBe('tooLarge')
    expect(mediaProblem(file('panjang.mov', 'video/quicktime', 26 * MB), policy)).toBe('tooLarge')
  })

  it('accepts modern Office files, text, CSV, and short videos', () => {
    for (const [name, type] of [
      ['surat.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      ['data.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      ['paparan.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
      ['catatan.txt', 'text/plain'],
      ['mutasi.csv', 'application/vnd.ms-excel'],
      ['layar.webm', 'video/webm'],
      ['iphone.MOV', ''],
    ] as const) {
      expect(mediaProblem(file(name, type, 10), policy)).toBeNull()
    }
  })

  it('refuses macros, legacy Office, archives, programs, audio, and HTML even when renamed', () => {
    for (const [name, type] of [
      ['makro.docm', 'application/vnd.ms-word.document.macroEnabled.12'],
      ['lama.doc', 'application/msword'],
      ['lama.xls', 'application/vnd.ms-excel'],
      ['arsip.zip', 'application/zip'],
      ['setup.exe', 'application/x-msdownload'],
      ['suara.m4a', 'audio/mp4'],
      ['halaman.html', 'text/html'],
      ['gambar.svg', 'image/svg+xml'],
      ['palsu.pdf', 'application/x-msdownload'],
    ] as const) {
      expect(mediaProblem(file(name, type, 10), policy)).toBe('badType')
    }
  })

  it('reports a kind turned off and a format left out by the Super Admin', () => {
    const limited = attachmentPolicyFixture({
      videos: { enabled: false, bucket: 'cs-videos', max_bytes: 25 * MB, max_seconds: 60, formats: [] },
      documents: {
        enabled: true,
        bucket: 'cs-documents',
        max_bytes: 2 * MB,
        formats: [{ code: 'pdf', mime: 'application/pdf', ext: 'pdf' }],
      },
    })
    expect(mediaProblem(file('rekaman.mp4', 'video/mp4', 10), limited)).toBe('disabled')
    expect(mediaProblem(file('data.csv', 'text/csv', 10), limited)).toBe('badType')
    expect(mediaProblem(file('bukti.pdf', 'application/pdf', 3 * MB), limited)).toBe('tooLarge')
    expect(allowedLabels(limited)).toEqual(['PDF', 'JPEG', 'PNG', 'WebP', 'GIF'])
    expect(acceptList(limited).split(',')).toEqual([
      'application/pdf',
      '.pdf',
      'image/jpeg',
      '.jpg',
      '.jpeg',
      'image/png',
      '.png',
      'image/webp',
      '.webp',
      'image/gif',
      '.gif',
    ])
  })

  it('falls back to images and PDF when the policy is missing or malformed', () => {
    expect(parsePolicy(null)).toEqual(fallbackPolicy)
    expect(parsePolicy({ videos: { enabled: true, formats: 'mp4' } }).videos.formats).toEqual([])
    expect(identifyFile(file('foto.jpeg', '', 1))?.code).toBe('jpeg')
  })

  it('tells documents, videos, and images apart in messages', () => {
    expect(isDocument({ bucket: 'cs-documents', mime: null })).toBe(true)
    expect(isDocument({ mime: 'application/pdf' })).toBe(true)
    expect(isDocument({ mime: 'image/png' })).toBe(false)
    expect(attachmentKind({ bucket: 'cs-videos', mime: 'video/mp4' })).toBe('videos')
    expect(attachmentKind({ mime: null })).toBe('images')
    expect(documentType({ mime: 'text/csv' })).toBe('csv')
    expect(documentType({ mime: 'application/octet-stream', name: 'Paparan.PPTX' })).toBe('powerpoint')
    expect(documentType({ mime: null, name: 'tanpa-ekstensi' })).toBe('other')
  })

  it('formats sizes and durations for people', () => {
    expect(fileSize(900)).toBe('900 B')
    expect(fileSize(182_000)).toBe('178 KB')
    expect(fileSize(2_621_440)).toBe('2,5 MB')
    expect(fileSize(null)).toBe('')
    expect(duration(7.4)).toBe('0:07')
    expect(duration(119.6)).toBe('2:00')
    expect(duration(null)).toBe('')
  })
})
