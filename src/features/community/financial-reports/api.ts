import { ApiError, toApiError } from '@/lib/errors'
import { rpc, supabase } from '@/lib/supabase'
import { uuid } from '@/lib/utils'

import { objectPath } from './logic'
import {
  FINREPORT_BUCKET,
  FINREPORT_PAGE_SIZE,
  type FileView,
  type FilesFilter,
  type FilesPage,
  type FinreportConfig,
  type ReportDetail,
  type ReportMetrics,
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
    warnings: raw.warnings ?? [],
    files: raw.files ?? [],
    history: raw.history ?? [],
    post: raw.post ? { ...raw.post, attachments: raw.post.attachments ?? [] } : null,
  }
}

type StorageFailure = { status?: number; statusCode?: string }

function uploadError(error: StorageFailure) {
  const status = error.status ?? Number(error.statusCode)
  if (status === 413) return new ApiError('file_too_large', undefined, 413)
  if (status === 401 || status === 403) return new ApiError('upload_forbidden', undefined, status)
  return toApiError(error)
}

export const finreportApi = {
  files: async (filter: FilesFilter, before: string | null): Promise<FilesPage> => {
    const raw = await rpc<FilesPage>('finreport_files', {
      p_status: filter.status,
      p_entity: filter.entity,
      p_limit: FINREPORT_PAGE_SIZE,
      p_before: before,
    })
    return { ...raw, items: raw.items ?? [], counts: raw.counts ?? {} }
  },
  report: async (id: string) => detail(await rpc<ReportDetail>('finreport_report', { p_id: id })),
  upload: async (file: File, agentId: string) => {
    const path = objectPath(agentId, uuid())
    const { error } = await supabase()
      .storage.from(FINREPORT_BUCKET)
      .upload(path, file, { contentType: 'application/zip', upsert: false })
    if (error) throw uploadError(error)
    return rpc<FileView>('finreport_upload', { p_object: path })
  },
  retry: (id: string) => rpc<FileView>('finreport_retry', { p_id: id }),
  createPost: async (id: string) =>
    detail(await rpc<ReportDetail>('finreport_create_post', { p_report: id })),
  config: () => rpc<FinreportConfig>('finreport_config'),
  saveConfig: (account: string | null, autoPublish: boolean) =>
    rpc<FinreportConfig>('finreport_save_config', {
      p_official_account: account,
      p_auto_publish: autoPublish,
    }),
}
