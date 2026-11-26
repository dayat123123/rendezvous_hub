import { ApiError, toApiError } from '@/lib/errors'
import { supabase } from '@/lib/supabase'
import { uuid } from '@/lib/utils'

import {
  POST_FILE_URL_SECONDS,
  POST_FILES_BUCKET,
  postFileExt,
  postFileMime,
  postFilePath,
} from './post-files'

type StorageFailure = { status?: number; statusCode?: string }

function storageError(error: StorageFailure) {
  const code = Number(error.statusCode)
  const status = code > 0 ? code : error.status
  if (status === 413) return new ApiError('file_too_large', undefined, 413)
  if (status === 415) return new ApiError('invalid_file_type', undefined, 415)
  if (status === 401 || status === 403) return new ApiError('upload_forbidden', undefined, status)
  return toApiError(error)
}

export const postFilesApi = {
  uploadPostFile: async (accountId: string, file: File) => {
    const ext = postFileExt(file.name)
    if (!ext) throw new ApiError('invalid_file_type', undefined, 415)
    const path = postFilePath(accountId, uuid(), ext)
    const mime = postFileMime(ext)
    const { error } = await supabase()
      .storage.from(POST_FILES_BUCKET)
      .upload(path, new Blob([file], { type: mime }), { contentType: mime, upsert: false })
    if (error) throw storageError(error)
    return { path, ext }
  },
  postFileUrl: async (path: string) => {
    const { data, error } = await supabase()
      .storage.from(POST_FILES_BUCKET)
      .createSignedUrl(path, POST_FILE_URL_SECONDS)
    if (error) throw toApiError(error)
    return data.signedUrl
  },
}
