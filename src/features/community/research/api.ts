import { ApiError, toApiError } from '@/lib/errors'
import { rpc, supabase } from '@/lib/supabase'
import { uuid } from '@/lib/utils'

import { POST_FILES_BUCKET, postFileMime } from '../post-files'
import { documentExt, documentPath, objectPath } from './logic'
import {
  RESEARCH_BUCKET,
  RESEARCH_PAGE_SIZE,
  type FileView,
  type FilesFilter,
  type FilesPage,
  type ReportDetail,
  type ReportMetrics,
  type ResearchConfig,
} from './types'

function metrics(raw: ReportMetrics | null): ReportMetrics {
  return {
    ...(raw ?? { version: 1, template: 'basic', months: 0, balance_base: 'year_ago' }),
    flows: raw?.flows ?? [],
    balances: raw?.balances ?? [],
    ratios: raw?.ratios ?? [],
  }
}

function detail(raw: ReportDetail): ReportDetail {
  return {
    ...raw,
    metrics: metrics(raw.metrics),
    document: raw.document ?? {},
    warnings: raw.warnings ?? [],
    files: raw.files ?? [],
    documents: raw.documents ?? [],
    history: raw.history ?? [],
    post: raw.post ? { ...raw.post, attachments: raw.post.attachments ?? [] } : null,
  }
}

type StorageFailure = { status?: number; statusCode?: string }

function uploadError(error: StorageFailure) {
  const code = Number(error.statusCode)
  const status = code > 0 ? code : error.status
  if (status === 413) return new ApiError('file_too_large', undefined, 413)
  if (status === 415) return new ApiError('invalid_file_type', undefined, 415)
  if (status === 401 || status === 403) return new ApiError('upload_forbidden', undefined, status)
  return toApiError(error)
}

async function uploadDocument(file: File) {
  const ext = documentExt(file.name)
  if (!ext) throw new ApiError('invalid_file_type', undefined, 415)
  const path = documentPath(uuid(), ext)
  const mime = postFileMime(ext)
  const { error } = await supabase()
    .storage.from(POST_FILES_BUCKET)
    .upload(path, new Blob([file], { type: mime }), { contentType: mime, upsert: false })
  if (error) throw uploadError(error)
  return path
}

export const researchApi = {
  files: async (filter: FilesFilter, before: string | null): Promise<FilesPage> => {
    const raw = await rpc<FilesPage>('research_files', {
      p_status: filter.status,
      p_entity: filter.entity,
      p_limit: RESEARCH_PAGE_SIZE,
      p_before: before,
    })
    return { ...raw, items: raw.items ?? [], counts: raw.counts ?? {} }
  },
  report: async (id: string) => detail(await rpc<ReportDetail>('research_report', { p_id: id })),
  upload: async (file: File, agentId: string, documents: File[] = []) => {
    const path = objectPath(agentId, uuid())
    const { error } = await supabase()
      .storage.from(RESEARCH_BUCKET)
      .upload(path, new Blob([file], { type: 'application/zip' }), {
        contentType: 'application/zip',
        upsert: false,
      })
    if (error) throw uploadError(error)
    const objects: { object: string }[] = []
    for (const document of documents) {
      objects.push({ object: await uploadDocument(document) })
    }
    return rpc<FileView>('research_upload', { p_object: path, p_documents: objects })
  },
  retry: (id: string) => rpc<FileView>('research_retry', { p_id: id }),
  addDocument: async (reportId: string, file: File, name: string | null) => {
    const path = await uploadDocument(file)
    return detail(
      await rpc<ReportDetail>('research_add_document', { p_report: reportId, p_object: path, p_name: name }),
    )
  },
  removeDocument: async (id: string) => {
    const raw = await rpc<ReportDetail | null>('research_remove_document', { p_id: id })
    return raw ? detail(raw) : null
  },
  createPost: async (id: string) => detail(await rpc<ReportDetail>('research_create_post', { p_report: id })),
  config: () => rpc<ResearchConfig>('research_config'),
  saveConfig: (account: string | null, autoPublish: boolean, notifyWatchers: boolean) =>
    rpc<ResearchConfig>('research_save_config', {
      p_official_account: account,
      p_auto_publish: autoPublish,
      p_notify_watchers: notifyWatchers,
    }),
}
