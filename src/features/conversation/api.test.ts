import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/lib/errors'
import type * as SupabaseModule from '@/lib/supabase'
import { attachmentPolicyFixture } from '@/test/fixtures'

import { conversationApi } from './api'

const storageUpload = vi.fn(() => Promise.resolve({ error: null }))

vi.mock('@/lib/supabase', async (importOriginal) => ({
  ...(await importOriginal<typeof SupabaseModule>()),
  appEnv: () => ({ supabaseUrl: 'http://cs.test', anonKey: 'anon-key', appEnv: 'development' }),
  supabase: () => ({
    auth: { getSession: () => Promise.resolve({ data: { session: { access_token: 'staff-jwt' } } }) },
    storage: { from: () => ({ upload: storageUpload }) },
  }),
}))

const policy = attachmentPolicyFixture()
const fetchMock = vi.fn<typeof fetch>()

function reply(status: number, body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }))
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset()
  storageUpload.mockClear()
})

afterEach(() => vi.unstubAllGlobals())

describe('conversationApi.upload', () => {
  it('sends videos through the media service and keeps the original name', async () => {
    fetchMock.mockImplementation(() =>
      reply(200, {
        bucket: 'cs-videos',
        path: 'rooms/r1/u1/abc.mp4',
        mime: 'video/mp4',
        size: 2048,
        duration: 42.5,
        width: 720,
        height: 1280,
        thumbnail: 'rooms/r1/u1/abc.jpg',
      }),
    )
    const file = new File([new Uint8Array(4096)], 'Rekaman layar iPhone.MOV', { type: 'video/quicktime' })

    const attachment = await conversationApi.upload('r1', 'u1', file, policy)

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url as string).toMatch(
      /^http:\/\/cs\.test\/media\/v1\/object\/cs-videos\/rooms\/r1\/u1\/[\w-]+\.mov$/,
    )
    expect(init?.method).toBe('POST')
    expect(init?.headers).toMatchObject({ apikey: 'anon-key', Authorization: 'Bearer staff-jwt' })
    expect(init?.body).toBe(file)
    expect(attachment).toEqual({
      bucket: 'cs-videos',
      path: 'rooms/r1/u1/abc.mp4',
      mime: 'video/mp4',
      name: 'Rekaman layar iPhone.MOV',
      size: 2048,
      duration: 42.5,
      width: 720,
      height: 1280,
      thumbnail: 'rooms/r1/u1/abc.jpg',
    })
    expect(storageUpload).not.toHaveBeenCalled()
  })

  it('sends documents through the media service with a random storage name', async () => {
    fetchMock.mockImplementation(() =>
      reply(200, { bucket: 'cs-documents', path: 'rooms/r1/u1/x.csv', mime: 'text/csv', size: 12 }),
    )
    const file = new File(['a,b\n1,2\n'], 'Mutasi rekening.csv', { type: 'application/vnd.ms-excel' })

    const attachment = await conversationApi.upload('r1', 'u1', file, policy)

    expect(fetchMock.mock.calls[0]![0] as string).toMatch(/\/cs-documents\/rooms\/r1\/u1\/[\w-]+\.csv$/)
    expect(fetchMock.mock.calls[0]![0] as string).not.toContain('Mutasi')
    expect(attachment).toEqual({
      bucket: 'cs-documents',
      path: 'rooms/r1/u1/x.csv',
      mime: 'text/csv',
      name: 'Mutasi rekening.csv',
      size: 12,
    })
  })

  it('passes media error codes on and treats a bare 413 as too large', async () => {
    const file = new File(['x'], 'Laporan.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })
    fetchMock.mockImplementationOnce(() => reply(422, { code: 'office_macro', message: 'berisi makro' }))
    await expect(conversationApi.upload('r1', 'u1', file, policy)).rejects.toMatchObject({
      code: 'office_macro',
      status: 422,
    })

    fetchMock.mockImplementationOnce(() => Promise.resolve(new Response('too large', { status: 413 })))
    await expect(conversationApi.upload('r1', 'u1', file, policy)).rejects.toMatchObject({
      code: 'file_too_large',
    })

    fetchMock.mockImplementationOnce(() => reply(401, { code: 'invalid_token' }))
    const expired = await conversationApi.upload('r1', 'u1', file, policy).catch((error: unknown) => error)
    expect(expired).toBeInstanceOf(ApiError)
    expect(expired).toMatchObject({ code: 'session_expired' })
  })

  it('keeps uploading images straight to storage', async () => {
    const file = new File(['png'], 'layar.png', { type: 'image/png' })
    const attachment = await conversationApi.upload('r1', 'u1', file, policy)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(storageUpload).toHaveBeenCalledWith(expect.stringMatching(/^rooms\/r1\/u1\/[\w-]+\.png$/), file, {
      contentType: 'image/png',
    })
    expect(attachment).toMatchObject({ mime: 'image/png' })
  })
})
