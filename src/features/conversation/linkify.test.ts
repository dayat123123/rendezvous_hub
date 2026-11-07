import { describe, expect, it } from 'vitest'

import { linkify } from './linkify'

const links = (text: string) =>
  linkify(text)
    .filter((part) => part.kind !== 'text')
    .map((part) => [part.kind, part.text, part.href])

describe('linkify', () => {
  it('finds https links and trims trailing punctuation', () => {
    expect(
      links('Koneksi https://greenvest.evergreensekuritas.co.id:29001. Lalu (https://olt.test/a).'),
    ).toEqual([
      [
        'url',
        'https://greenvest.evergreensekuritas.co.id:29001',
        'https://greenvest.evergreensekuritas.co.id:29001',
      ],
      ['url', 'https://olt.test/a', 'https://olt.test/a'],
    ])
  })

  it('opens www addresses as https and leaves http as text', () => {
    expect(links('Buka www.evergreensekuritas.co.id/bantuan, lama http://old.olt.test')).toEqual([
      ['url', 'www.evergreensekuritas.co.id/bantuan', 'https://www.evergreensekuritas.co.id/bantuan'],
    ])
    expect(links('www. kosong dan swww.x.com')).toEqual([])
  })

  it('finds emails as mailto links', () => {
    expect(links('Kirim ke cs.olt+bantuan@evergreen.co.id. Terima kasih')).toEqual([
      ['email', 'cs.olt+bantuan@evergreen.co.id', 'mailto:cs.olt+bantuan@evergreen.co.id'],
    ])
  })

  it('finds Indonesian phone numbers as tel links', () => {
    expect(links('Hubungi 0812-3456-7890 atau +62 21 5091 2345, kantor 021-5091234')).toEqual([
      ['phone', '0812-3456-7890', 'tel:081234567890'],
      ['phone', '+62 21 5091 2345', 'tel:+622150912345'],
      ['phone', '021-5091234', 'tel:0215091234'],
    ])
  })

  it('leaves dates, ticket numbers, account numbers and short numbers as text', () => {
    expect(links('Tiket CS-20261107-0003 tanggal 07-11-2026, RDN 1040004235789, kode 081234')).toEqual([])
  })

  it('keeps a link whole when it contains an email or a number, and keeps the text around it', () => {
    expect(links('https://olt.test/u/budi@mail.com dan https://olt.test/08123456789')).toEqual([
      ['url', 'https://olt.test/u/budi@mail.com', 'https://olt.test/u/budi@mail.com'],
      ['url', 'https://olt.test/08123456789', 'https://olt.test/08123456789'],
    ])
    expect(
      linkify('Email a@b.co ya')
        .map((part) => part.text)
        .join(''),
    ).toBe('Email a@b.co ya')
  })
})
