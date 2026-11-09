import { describe, expect, it } from 'vitest'

import { appendSnippet, faqPlainText, faqSnippet } from './plain-text'

describe('faqPlainText', () => {
  it('strips emphasis and keeps https links as plain URLs', () => {
    expect(
      faqPlainText(
        'Buka **Pengaturan** lalu *Keamanan*.\nPanduan: [lihat di sini](https://help.example.com/a_b_c)',
      ),
    ).toBe('Buka Pengaturan lalu Keamanan.\nPanduan: lihat di sini (https://help.example.com/a_b_c)')
  })

  it('keeps a bare link label once and leaves underscores inside URLs alone', () => {
    expect(
      faqPlainText('[https://x.example/a](https://x.example/a) dan https://y.example/_b_ _miring_'),
    ).toBe('https://x.example/a dan https://y.example/_b_ miring')
  })

  it('turns bullets into dots, keeps numbered steps and drops image lines', () => {
    const answer =
      '1. Masuk\n2. Pilih menu\n\n- satu\n* dua\n![Contoh](https://api.example/storage/v1/object/public/faq-images/x.png)\n\n\n\nSelesai'
    expect(faqPlainText(answer)).toBe('1. Masuk\n2. Pilih menu\n\n• satu\n• dua\n\nSelesai')
  })
})

describe('faqSnippet and appendSnippet', () => {
  it('puts the question above the answer and appends after existing text', () => {
    const snippet = faqSnippet(' Lupa PIN? ', 'Pilih **Lupa PIN**.')
    expect(snippet).toBe('Lupa PIN?\n\nPilih Lupa PIN.')
    expect(appendSnippet('', snippet)).toBe(snippet)
    expect(appendSnippet('Halo Budi,  \n', snippet)).toBe(`Halo Budi,\n\n${snippet}`)
  })
})
