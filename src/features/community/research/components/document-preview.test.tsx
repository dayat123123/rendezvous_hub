import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DocumentPreview } from './document-preview'

const document = {
  version: 1,
  badge: 'Ringkasan otomatis',
  title: 'Laporan Keuangan Kuartal III 2026',
  subtitle: 'PT Bank Central Asia Tbk. · Belum diaudit',
  headline: 'Laba bersih kuartal III naik 9,0% YoY',
  disclaimer: 'Diolah otomatis dari laporan keuangan. Bukan rekomendasi investasi.',
  blocks: [
    { type: 'paragraph', text: 'BCA membukukan laba bersih Rp15,68 T pada kuartal III 2026.' },
    {
      type: 'metrics',
      metrics: [
        { label: 'Laba bersih kuartal III', value: 'Rp15,68 T', change: '+9,0% YoY', trend: 'up' },
        { label: 'Kredit', value: 'Rp935,4 T', change: '+11,2% YoY', trend: 'flat' },
        { label: 'ROE disetahunkan', value: '21,3%', change: 'tahun lalu 21,5%', trend: 'down' },
        { label: 'Aset', value: 'Rp1.500 T' },
      ],
    },
    { type: 'chart', series: [1, 2, 3] },
    { type: 'list', style: 'numbered', items: ['Kredit tumbuh.', 'Dana murah naik.'] },
    { type: 'list', style: 'bulleted', items: ['Biaya terjaga.'] },
    { type: 'callout', title: 'Poin utama', text: 'Laba tumbuh di atas kredit.' },
  ],
}

const summary = '$BBCA Kuartal III 2026 (belum diaudit)\nLaba bersih Rp15,68 T.'

describe('DocumentPreview', () => {
  it('renders the card blocks in order with trend colours and the disclaimer last', () => {
    render(<DocumentPreview document={document} summary={summary} />)

    const card = screen.getByRole('article', { name: 'Laporan Keuangan Kuartal III 2026' })
    expect(within(card).getByText('Ringkasan otomatis')).toBeInTheDocument()
    expect(within(card).getByText('PT Bank Central Asia Tbk. · Belum diaudit')).toBeInTheDocument()
    expect(within(card).getByText('Laba bersih kuartal III naik 9,0% YoY')).toBeInTheDocument()
    expect(within(card).getByText(/BCA membukukan laba bersih/)).toBeInTheDocument()

    const [metrics, numbered, bulleted] = within(card).getAllByRole('list') as [
      HTMLElement,
      HTMLElement,
      HTMLElement,
    ]
    const [up, flat, down, plain] = within(metrics).getAllByRole('listitem') as [
      HTMLElement,
      HTMLElement,
      HTMLElement,
      HTMLElement,
    ]
    expect(within(metrics).getAllByRole('listitem')).toHaveLength(4)
    expect(up).toHaveTextContent('Laba bersih kuartal IIIRp15,68 Tnaik+9,0% YoY')
    expect(within(up).getByText('+9,0% YoY').parentElement).toHaveClass('text-success')
    expect(within(flat).getByText('+11,2% YoY').parentElement).toHaveClass('text-muted-foreground')
    expect(within(down).getByText('tahun lalu 21,5%').parentElement).toHaveClass('text-destructive')
    expect(within(down).getByText('turun')).toHaveClass('sr-only')
    expect(plain).toHaveTextContent('AsetRp1.500 T')

    expect(numbered.tagName).toBe('OL')
    expect(
      within(numbered)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Kredit tumbuh.', 'Dana murah naik.'])
    expect(bulleted.tagName).toBe('UL')
    const callout = within(card).getByText('Poin utama').closest('aside')
    expect(callout).toHaveTextContent('Poin utamaLaba tumbuh di atas kredit.')
    expect(callout).toHaveClass('border-primary')
    expect(card.lastElementChild).toHaveTextContent('Bukan rekomendasi investasi.')
    expect(screen.queryByText(/Laba bersih Rp15,68 T\./)).not.toBeInTheDocument()
  })

  it('skips unknown block types without breaking the card', () => {
    render(
      <DocumentPreview
        document={{
          ...document,
          blocks: [
            { type: 'video', url: 'x' },
            { type: 'paragraph', text: 'Hanya ini' },
          ],
        }}
        summary={summary}
      />,
    )

    const card = screen.getByRole('article')
    expect(within(card).getByText('Hanya ini')).toBeInTheDocument()
    expect(within(card).queryByRole('list')).not.toBeInTheDocument()
    expect(within(card).queryByText('x')).not.toBeInTheDocument()
  })

  it('falls back to the plain summary for reports made before the card format', () => {
    render(<DocumentPreview document={{}} summary={summary} />)

    expect(screen.queryByRole('article')).not.toBeInTheDocument()
    expect(screen.getByText(/dibuat sebelum format kartu riset/)).toBeInTheDocument()
    const text = screen.getByText(/Laba bersih Rp15,68 T\./)
    expect(text).toHaveTextContent('$BBCA Kuartal III 2026 (belum diaudit) Laba bersih Rp15,68 T.')
    expect(text).toHaveClass('whitespace-pre-wrap')
  })
})
