import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { FaqMarkdown } from './markdown'
import { parseBlocks } from './markdown-blocks'

describe('FAQ markdown', () => {
  it('splits paragraphs and lists', () => {
    expect(parseBlocks('Halo\nsemua\n\n- satu\n- dua\n1. pertama\n\nAkhir')).toEqual([
      { kind: 'paragraph', lines: ['Halo', 'semua'] },
      { kind: 'list', ordered: false, items: ['satu', 'dua'] },
      { kind: 'list', ordered: true, items: ['pertama'] },
      { kind: 'paragraph', lines: ['Akhir'] },
    ])
  })

  it('renders bold, italic and https links, and leaves other links as text', () => {
    render(
      <FaqMarkdown text="Buka **Profil**, pilih *Ganti PIN*, lihat [panduan](https://olt.co.id/pin) atau [ini](http://x.id)." />,
    )
    expect(screen.getByText('Profil').tagName).toBe('STRONG')
    expect(screen.getByText('Ganti PIN').tagName).toBe('EM')
    const link = screen.getByRole('link', { name: 'panduan' })
    expect(link).toHaveAttribute('href', 'https://olt.co.id/pin')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.queryByRole('link', { name: 'ini' })).not.toBeInTheDocument()
    expect(screen.getByText(/\[ini\]\(http:\/\/x\.id\)/)).toBeInTheDocument()
  })
})
