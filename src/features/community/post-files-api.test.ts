import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as SupabaseModule from '@/lib/supabase'

import { postFilesApi } from './post-files-api'

const storage = vi.hoisted(() => ({ bucket: vi.fn(), upload: vi.fn(), sign: vi.fn() }))

vi.mock('@/lib/supabase', async (importOriginal) => ({
  ...(await importOriginal<typeof SupabaseModule>()),
  supabase: () => ({
    storage: {
      from: (bucket: string) => {
        storage.bucket(bucket)
        return { upload: storage.upload, createSignedUrl: storage.sign }
      },
    },
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('post file storage', () => {
  it('uploads into the account folder with the mime type for the extension, re-wrapping the file', async () => {
    storage.upload.mockResolvedValue({ data: {}, error: null })
    const original = new File(['a,b'], 'Data Harian.CSV', { type: 'application/vnd.ms-excel' })

    const result = await postFilesApi.uploadPostFile('acc-1', original)

    expect(storage.bucket).toHaveBeenCalledWith('post-files')
    const [path, body, options] = storage.upload.mock.calls[0] as [string, Blob, object]
    expect(path).toMatch(/^acc-1\/[0-9a-f-]{36}\/file\.csv$/)
    expect(result).toEqual({ path, ext: 'csv' })
    expect(body).not.toBe(original)
    expect(body.type).toBe('text/csv')
    expect(body.size).toBe(3)
    expect(options).toEqual({ contentType: 'text/csv', upsert: false })
  })

  it('maps storage rejections to document error codes', async () => {
    storage.upload.mockResolvedValue({ data: null, error: { message: 'too big', statusCode: '413' } })
    await expect(postFilesApi.uploadPostFile('acc-1', new File(['x'], 'a.pdf'))).rejects.toMatchObject({
      code: 'file_too_large',
    })
    storage.upload.mockResolvedValue({
      data: null,
      error: { message: 'rls', status: 400, statusCode: '403' },
    })
    await expect(postFilesApi.uploadPostFile('acc-1', new File(['x'], 'a.pdf'))).rejects.toMatchObject({
      code: 'upload_forbidden',
    })
    await expect(postFilesApi.uploadPostFile('acc-1', new File(['x'], 'a.xls'))).rejects.toMatchObject({
      code: 'invalid_file_type',
    })
  })

  it('signs a download URL valid for five minutes', async () => {
    storage.sign.mockResolvedValue({ data: { signedUrl: 'https://signed' }, error: null })
    await expect(postFilesApi.postFileUrl('acc-1/u/file.pdf')).resolves.toBe('https://signed')
    expect(storage.sign).toHaveBeenCalledWith('acc-1/u/file.pdf', 300)
  })
})
