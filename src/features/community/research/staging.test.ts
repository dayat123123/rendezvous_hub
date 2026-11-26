import { describe, expect, it } from 'vitest'

import { guessTarget, planStaged, stagedKind, targetOf, type Staged } from './staging'

const MB = 1024 * 1024

function staged(id: string, name: string, size = 1000, target: string | null = null): Staged {
  const file = new File(['x'], name)
  Object.defineProperty(file, 'size', { value: size })
  return { id, file, kind: stagedKind(name), target, error: null }
}

describe('staging research uploads', () => {
  it('sorts files into report zips, documents and unknown files', () => {
    expect(stagedKind('instance.ZIP')).toBe('zip')
    expect(stagedKind('Laporan.pdf')).toBe('document')
    expect(stagedKind('Data.xlsx')).toBe('document')
    expect(stagedKind('Data.xls')).toBe('other')
  })

  it('matches a document to the zip whose name it starts with, only when that is unambiguous', () => {
    const zips = [staged('a', 'ADES-Q3.zip'), staged('b', 'ITMG-Q3.zip'), staged('c', 'ITMG.zip')]
    expect(guessTarget('ADES-Q3 laporan.pdf', zips)).toBe('a')
    expect(guessTarget('itmg-q3.xlsx', zips)).toBeNull()
    expect(guessTarget('FinancialStatement.pdf', zips)).toBeNull()
  })

  it('uses the only zip when a document has no explicit report', () => {
    const zip = staged('z', 'instance.zip')
    const doc = staged('d', 'laporan.pdf')
    expect(targetOf(doc, [zip])).toBe('z')
    expect(targetOf(doc, [zip, staged('y', 'lain.zip')])).toBeNull()
    expect(targetOf({ ...doc, target: 'gone' }, [zip])).toBe('z')
  })

  it('plans one batch per valid zip and skips files with their own problems', () => {
    const plan = planStaged(
      [
        staged('z', 'instance.zip'),
        staged('big', 'besar.zip', 9 * MB),
        staged('d', 'laporan.pdf'),
        staged('x', 'catatan.txt'),
        staged('huge', 'tebal.pdf', 21 * MB, 'z'),
      ],
      8 * MB,
    )
    expect(plan.ready).toBe(true)
    expect(plan.batches.map((batch) => [batch.zip.id, batch.documents.map((doc) => doc.id)])).toEqual([
      ['z', ['d']],
    ])
    expect(plan.problems.get('big')).toEqual({ code: 'zip', problem: 'size' })
    expect(plan.problems.get('x')).toEqual({ code: 'type' })
    expect(plan.problems.get('huge')).toEqual({ code: 'document', problem: 'size' })
  })

  it('blocks the upload when a document has no report or a report has too many documents', () => {
    expect(planStaged([staged('d', 'laporan.pdf')], 8 * MB)).toMatchObject({ ready: false })
    const two = planStaged([staged('a', 'a.zip'), staged('b', 'b.zip'), staged('d', 'laporan.pdf')], 8 * MB)
    expect(two.ready).toBe(false)
    expect(two.problems.get('d')).toEqual({ code: 'pickReport' })
    const crowded = planStaged(
      [staged('z', 'z.zip'), ...['1', '2', '3', '4'].map((n) => staged(n, `${n}.pdf`))],
      8 * MB,
    )
    expect(crowded.ready).toBe(false)
    expect(crowded.problems.get('z')).toEqual({ code: 'tooManyDocuments', max: 3 })
  })
})
