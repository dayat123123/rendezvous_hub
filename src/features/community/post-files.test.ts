import { beforeAll, describe, expect, it } from 'vitest'

import { loadStrings } from '@/i18n'
import { ApiError } from '@/lib/errors'

import { isImageAttachment } from './card-logic'
import {
  POST_FILE_ACCEPT,
  chipFiles,
  fileDraftsFrom,
  fileNameProblem,
  postErrorText,
  postFileExt,
  postFileMime,
  postFilePath,
  postFileProblem,
  postFilesPayload,
  postFilesProblem,
  type FileDraft,
} from './post-files'
import type { PostAttachment } from './types'

beforeAll(async () => {
  await loadStrings('moderation')
})

const MB = 1024 * 1024

const draft = (overrides: Partial<FileDraft> = {}): FileDraft => ({
  id: 'f1',
  name: 'Laporan.pdf',
  size: 1000,
  ext: 'pdf',
  path: 'acc-1/0b6a4f1e-2c3d-4e5f-8a9b-0c1d2e3f4a5b/file.pdf',
  accountId: 'acc-1',
  state: 'done',
  error: null,
  ...overrides,
})

describe('post file types', () => {
  it('maps each allowed extension to the mime type storage expects', () => {
    expect(postFileExt('Laporan Tahunan.PDF')).toBe('pdf')
    expect(postFileMime('pdf')).toBe('application/pdf')
    expect(postFileMime('xlsx')).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    expect(postFileMime('csv')).toBe('text/csv')
    expect(postFileMime('docx')).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    )
    expect(postFileMime('pptx')).toBe(
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    )
    expect(postFileExt('data.xls')).toBeNull()
    expect(POST_FILE_ACCEPT).toBe('.pdf,.xlsx,.csv,.docx,.pptx')
  })

  it('builds the storage path inside the official account folder', () => {
    expect(postFilePath('acc-1', 'u-1', 'xlsx')).toBe('acc-1/u-1/file.xlsx')
  })
})

describe('postFileProblem', () => {
  it('rejects old Office formats with their own reason and other types generally', () => {
    for (const name of ['data.xls', 'surat.doc', 'slide.ppt', 'makro.xlsm']) {
      expect(postFileProblem({ name, size: 100 })).toEqual({ code: 'legacy' })
    }
    expect(postFileProblem({ name: 'run.exe', size: 100 })).toEqual({ code: 'type' })
    expect(postFileProblem({ name: 'tanpa-ekstensi', size: 100 })).toEqual({ code: 'type' })
  })

  it('applies 20 MB to documents and 10 MB to CSV, and rejects empty files', () => {
    expect(postFileProblem({ name: 'a.pdf', size: 20 * MB })).toBeNull()
    expect(postFileProblem({ name: 'a.pdf', size: 20 * MB + 1 })).toEqual({ code: 'size', max: 20 * MB })
    expect(postFileProblem({ name: 'a.csv', size: 10 * MB + 1 })).toEqual({ code: 'size', max: 10 * MB })
    expect(postFileProblem({ name: 'a.docx', size: 0 })).toEqual({ code: 'empty' })
  })
})

describe('fileNameProblem', () => {
  it('follows the server rule: trimmed, 1–120 characters, no slashes or control characters', () => {
    expect(fileNameProblem('  Laporan Tahunan 2025.pdf ')).toBeNull()
    expect(fileNameProblem('   ')).toBe('nameRequired')
    expect(fileNameProblem('x'.repeat(121))).toBe('nameLong')
    expect(fileNameProblem('a/b.pdf')).toBe('nameChars')
    expect(fileNameProblem('a\\b.pdf')).toBe('nameChars')
    expect(fileNameProblem('a\tb.pdf')).toBe('nameChars')
  })
})

describe('postFilesProblem', () => {
  it('blocks saving while uploads run, after failures, for another account, too many files, or bad names', () => {
    expect(postFilesProblem([draft()], 'acc-1')).toBeNull()
    expect(postFilesProblem([draft({ state: 'uploading', path: null })], 'acc-1')).toBe('uploading')
    expect(postFilesProblem([draft({ state: 'failed' })], 'acc-1')).toBe('failed')
    expect(postFilesProblem([draft()], 'acc-2')).toBe('stale')
    expect(
      postFilesProblem(
        Array.from({ length: 6 }, (_, i) => draft({ id: `f${i}` })),
        'acc-1',
      ),
    ).toBe('tooMany')
    expect(postFilesProblem([draft({ name: 'a/b.pdf' })], 'acc-1')).toBe('names')
  })
})

describe('payload and prefill', () => {
  const saved: PostAttachment[] = [
    { path: 'posts/acc-1/a.png' },
    {
      type: 'file',
      file: {
        bucket: 'post-files',
        path: 'acc-1/0b6a4f1e-2c3d-4e5f-8a9b-0c1d2e3f4a5b/file.pdf',
        name: 'Laporan Tahunan 2025.pdf',
        mime: 'application/pdf',
        size: 120000,
      },
    },
  ]

  it('sends only path and trimmed name for uploaded files', () => {
    expect(
      postFilesPayload([
        draft({ name: '  Laporan.pdf ' }),
        draft({ id: 'f2', state: 'uploading', path: null }),
      ]),
    ).toEqual([
      {
        type: 'file',
        file: { path: 'acc-1/0b6a4f1e-2c3d-4e5f-8a9b-0c1d2e3f4a5b/file.pdf', name: 'Laporan.pdf' },
      },
    ])
  })

  it('prefills drafts and chips from saved attachments and never treats files as images', () => {
    expect(fileDraftsFrom(saved, 'acc-1')).toEqual([
      draft({
        id: 'acc-1/0b6a4f1e-2c3d-4e5f-8a9b-0c1d2e3f4a5b/file.pdf',
        name: 'Laporan Tahunan 2025.pdf',
        size: 120000,
      }),
    ])
    expect(chipFiles(saved)).toEqual([
      {
        key: 'acc-1/0b6a4f1e-2c3d-4e5f-8a9b-0c1d2e3f4a5b/file.pdf',
        name: 'Laporan Tahunan 2025.pdf',
        ext: 'pdf',
        size: 120000,
        path: 'acc-1/0b6a4f1e-2c3d-4e5f-8a9b-0c1d2e3f4a5b/file.pdf',
      },
    ])
    expect(saved.filter(isImageAttachment)).toEqual([{ path: 'posts/acc-1/a.png' }])
  })
})

describe('postErrorText', () => {
  it('explains document errors and still explains card errors', () => {
    expect(postErrorText(new ApiError('duplicate_file'))).toBe('Dokumen yang sama dipasang dua kali.')
    expect(postErrorText(new ApiError('file_not_found', undefined, 404))).toMatch(/^Dokumen belum terunggah/)
    expect(postErrorText(new ApiError('invalid_file_type'))).toBe(
      'Isi dokumen tidak sesuai dengan ekstensinya.',
    )
    expect(postErrorText(new ApiError('invalid_card'))).toMatch(/^Kartu tidak lengkap/)
  })
})
