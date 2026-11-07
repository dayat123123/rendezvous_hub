import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as SupabaseModule from '@/lib/supabase'

import { nasabahApi } from './api'

const getSession = vi.fn()

vi.mock('@/lib/supabase', async (importOriginal) => {
  const actual = await importOriginal<typeof SupabaseModule>()
  return { ...actual, supabase: () => ({ auth: { getSession } }) }
})

const fetchMock = vi.fn<typeof fetch>()

function reply(status: number, body: unknown) {
  fetchMock.mockResolvedValueOnce(
    new Response(typeof body === 'string' ? body : JSON.stringify(body), { status }),
  )
}

describe('nasabahApi', () => {
  beforeEach(() => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'console-token' } } })
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('lists without a search using server paging and the console session', async () => {
    reply(200, {
      data: [{ LoginId: 'budi' }],
      message: 'ok',
      pagination: { current_page: 2, per_page: 30, total_items: 31, total_pages: 2 },
    })
    const page = await nasabahApi.users(2, '  ')
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe('/api-nasabah/online/get-list-online-user?page=2&size=30')
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer console-token')
    expect(page).toMatchObject({ total: 31, totalPages: 2, rows: [{ LoginId: 'budi' }] })
  })

  describe('search', () => {
    const user = (LoginId: string, Email: string) => ({ LoginId, Email })
    const serve = (pages: Record<string, { rows: unknown[]; totalPages?: number }>) =>
      fetchMock.mockImplementation((input) => {
        const url = new URL(input as string, 'http://hub.test')
        const key = `${url.searchParams.has('email') ? 'email' : 'loginId'}:${url.searchParams.get('page')}`
        const found = pages[key] ?? { rows: [] }
        const totalPages = found.totalPages ?? 1
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: found.rows,
              pagination: {
                current_page: Number(url.searchParams.get('page')),
                per_page: 100,
                total_items: found.rows.length * totalPages,
                total_pages: totalPages,
              },
            }),
            { status: 200 },
          ),
        )
      })
    const urls = () => fetchMock.mock.calls.map(([input]) => input as string).sort()

    it('finds a customer by the start of an email that has no @ yet', async () => {
      serve({
        'loginId:1': { rows: [] },
        'email:1': {
          rows: [user('Anonim', ''), user('Hidayat2', 'dayatburgerkill389@gmail.com'), user('Tanpa', '')],
        },
      })
      const page = await nasabahApi.users(1, ' dayatburger ')
      expect(urls()).toEqual([
        '/api-nasabah/online/get-list-online-user?page=1&size=100&email=dayatburger',
        '/api-nasabah/online/get-list-online-user?page=1&size=100&loginId=dayatburger',
      ])
      expect(page).toMatchObject({ total: 1, page: 1, totalPages: 1, rows: [{ LoginId: 'Hidayat2' }] })
    })

    it('merges LoginId and email matches without duplicates, ignoring case', async () => {
      serve({
        'loginId:1': {
          rows: [
            user('Hidayat', 'hidayatullah10070@gmail.com'),
            user('Hidayat2', 'dayatburgerkill389@gmail.com'),
          ],
        },
        'email:1': {
          rows: [
            user('hidayat', 'hidayatullah10070@gmail.com'),
            user('Zaki', 'HIDAYAT.zaki@olt.test'),
            user('Kosong', ''),
          ],
        },
      })
      const page = await nasabahApi.users(1, 'hidayat')
      expect(page.rows.map((row) => row.LoginId)).toEqual(['Hidayat', 'Hidayat2', 'Zaki'])
      expect(page.total).toBe(3)
    })

    it('finds text in the middle of an email or LoginId', async () => {
      serve({
        'loginId:1': { rows: [user('Hidayat2', 'dayatburgerkill389@gmail.com')] },
        'email:1': {
          rows: [
            user('Hidayat2', 'dayatburgerkill389@gmail.com'),
            user('Kosong', ''),
            user('Budi', 'budi@olt.test'),
          ],
        },
      })
      const page = await nasabahApi.users(1, 'burger')
      expect(page.rows.map((row) => row.LoginId)).toEqual(['Hidayat2'])
    })

    it('finds a full email address', async () => {
      serve({
        'loginId:1': { rows: [] },
        'email:1': { rows: [user('Hidayat', 'hidayatullah10070@gmail.com'), user('Kosong', '')] },
      })
      const page = await nasabahApi.users(1, 'hidayatullah10070@gmail.com')
      expect(page.rows.map((row) => row.LoginId)).toEqual(['Hidayat'])
    })

    it('reads later csAdmin pages where empty emails push matches back', async () => {
      serve({
        'email:1': { rows: [user('A', ''), user('B', '')], totalPages: 3 },
        'email:2': { rows: [user('C', ''), user('Dewi', 'dewi@olt.test')], totalPages: 3 },
        'email:3': { rows: [user('Eko', 'dewi.eko@olt.test')], totalPages: 3 },
      })
      const page = await nasabahApi.users(1, 'dewi')
      expect(page.rows.map((row) => row.LoginId)).toEqual(['Dewi', 'Eko'])
      expect(page.limited).toBe(false)
    })

    it('stops after five csAdmin pages and says the result is limited', async () => {
      serve({ 'email:1': { rows: [user('Dewi', 'dewi@olt.test')], totalPages: 9 } })
      const page = await nasabahApi.users(1, 'dewi')
      expect(fetchMock.mock.calls.filter(([input]) => (input as string).includes('email='))).toHaveLength(5)
      expect(page.limited).toBe(true)
    })

    it('pages the merged result on the client', async () => {
      const many = Array.from({ length: 35 }, (_, i) => user(`budi${String(i).padStart(2, '0')}`, ''))
      serve({ 'loginId:1': { rows: many } })
      const page = await nasabahApi.users(2, 'budi')
      expect(page).toMatchObject({ total: 35, page: 2, totalPages: 2 })
      expect(page.rows.map((row) => row.LoginId)).toEqual(['budi30', 'budi31', 'budi32', 'budi33', 'budi34'])
    })

    it('skips the LoginId lookup for characters only an email can have', async () => {
      serve({ 'email:1': { rows: [user('Sari', 'sari+promo@olt.test')] } })
      const page = await nasabahApi.users(1, 'sari+promo')
      expect(urls()).toEqual(['/api-nasabah/online/get-list-online-user?page=1&size=100&email=sari%2Bpromo'])
      expect(page.rows).toHaveLength(1)
    })

    it('returns nothing without calling csAdmin when neither pattern fits', async () => {
      const page = await nasabahApi.users(1, "budi' OR 1=1")
      expect(fetchMock).not.toHaveBeenCalled()
      expect(page).toMatchObject({ rows: [], total: 0, totalPages: 0 })
    })
  })

  it('treats the legacy "No data available" body as an empty page', async () => {
    reply(200, '{"message": "No data available"}')
    expect(await nasabahApi.openings(1, { loginId: '', custId: 'C1' })).toMatchObject({ rows: [], total: 0 })
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      '/api-nasabah/online/get-list-opening-rekening-online-user?page=1&size=30&custId=C1',
    )
  })

  it('sends decisions with only the fields the gateway trusts', async () => {
    reply(200, { message: 'Success to create approval.', data: null })
    await nasabahApi.decide({ ApprovalId: 41, LoginId: 'budi' }, false)
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)).toEqual({
      ApprovalId: 41,
      LoginId: 'budi',
      Status: 0,
    })
  })

  it('maps gateway codes and keeps legacy messages', async () => {
    reply(403, { code: 'self_approval', message: 'The submitter of an approval cannot decide it' })
    await expect(nasabahApi.decide({ ApprovalId: 1, LoginId: 'x' }, true)).rejects.toMatchObject({
      code: 'self_approval',
      status: 403,
    })
    reply(409, { message: 'Failed, loginId budi is exist.', data: null })
    await expect(nasabahApi.submit({ LoginId: 'budi' })).rejects.toMatchObject({
      code: 'conflict',
      detail: 'Failed, loginId budi is exist.',
    })
    reply(500, '')
    await expect(nasabahApi.catalog()).rejects.toMatchObject({ code: 'upstream_error' })
  })

  it('changes an online user status with the reason', async () => {
    reply(200, { message: 'Success update status online user for loginId budi.', data: null })
    await nasabahApi.setStatus(' budi ', 3, ' Akses mencurigakan dari luar negeri ')
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe('/api-nasabah/online/update-status-online-user')
    expect(init?.method).toBe('PUT')
    expect(JSON.parse(init?.body as string)).toEqual({
      LoginId: 'budi',
      Status: 3,
      Reason: 'Akses mencurigakan dari luar negeri',
    })
  })

  it('refuses to call the gateway without a console session', async () => {
    getSession.mockResolvedValue({ data: { session: null } })
    await expect(nasabahApi.catalog()).rejects.toMatchObject({ code: 'session_expired' })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
