import {
  documentExt,
  documentProblem,
  uploadProblem,
  type DocumentProblem,
  type UploadProblem,
} from './logic'
import { RESEARCH_DOCUMENT_MAX_BYTES, RESEARCH_MAX_DOCUMENTS } from './types'

export type StagedKind = 'zip' | 'document' | 'other'

export type Staged = {
  id: string
  file: File
  kind: StagedKind
  target: string | null
  error: string | null
}

export type StagedProblem =
  | { code: 'zip'; problem: UploadProblem }
  | { code: 'document'; problem: DocumentProblem }
  | { code: 'type' }
  | { code: 'noReport' }
  | { code: 'pickReport' }
  | { code: 'tooManyDocuments'; max: number }

export const stagedKind = (name: string): StagedKind =>
  /\.zip$/i.test(name.trim()) ? 'zip' : documentExt(name) ? 'document' : 'other'

const baseName = (name: string) =>
  name
    .trim()
    .replace(/\.[^.]+$/, '')
    .toLowerCase()

export function guessTarget(name: string, zips: Pick<Staged, 'id' | 'file'>[]): string | null {
  const lower = name.trim().toLowerCase()
  const matches = zips.filter((zip) => {
    const base = baseName(zip.file.name)
    return base.length > 0 && lower.startsWith(base)
  })
  return matches.length === 1 ? (matches[0]?.id ?? null) : null
}

export const zipsOf = (staged: Staged[]) => staged.filter((item) => item.kind === 'zip')

export function targetOf(item: Staged, zips: Staged[]): string | null {
  if (item.target && zips.some((zip) => zip.id === item.target)) return item.target
  return zips.length === 1 ? (zips[0]?.id ?? null) : null
}

function ownProblem(item: Staged, maxZipBytes: number): StagedProblem | null {
  if (item.kind === 'other') return { code: 'type' }
  if (item.kind === 'zip') {
    const problem = uploadProblem(item.file, maxZipBytes)
    return problem ? { code: 'zip', problem } : null
  }
  const problem = documentProblem(item.file, RESEARCH_DOCUMENT_MAX_BYTES)
  return problem ? { code: 'document', problem } : null
}

export type StagedPlan = {
  problems: Map<string, StagedProblem>
  zips: Staged[]
  batches: { zip: Staged; documents: Staged[] }[]
  ready: boolean
}

export function planStaged(staged: Staged[], maxZipBytes: number): StagedPlan {
  const problems = new Map<string, StagedProblem>()
  for (const item of staged) {
    const problem = ownProblem(item, maxZipBytes)
    if (problem) problems.set(item.id, problem)
  }
  const zips = zipsOf(staged).filter((zip) => !problems.has(zip.id))
  const batches = zips.map((zip) => ({ zip, documents: [] as Staged[] }))
  let blocked = false
  for (const item of staged) {
    if (item.kind !== 'document' || problems.has(item.id)) continue
    const target = targetOf(item, zips)
    const batch = batches.find((entry) => entry.zip.id === target)
    if (!batch) {
      problems.set(item.id, { code: zips.length === 0 ? 'noReport' : 'pickReport' })
      blocked = true
      continue
    }
    batch.documents.push(item)
  }
  for (const batch of batches) {
    if (batch.documents.length > RESEARCH_MAX_DOCUMENTS) {
      problems.set(batch.zip.id, { code: 'tooManyDocuments', max: RESEARCH_MAX_DOCUMENTS })
      blocked = true
    }
  }
  return { problems, zips, batches, ready: !blocked && batches.length > 0 }
}
