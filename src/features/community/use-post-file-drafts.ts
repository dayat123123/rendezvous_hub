import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { formatBytes } from '@/lib/time'
import { uuid } from '@/lib/utils'

import {
  MAX_FILE_NAME,
  MAX_POST_FILES,
  fileDraftsFrom,
  postErrorText,
  postFileExt,
  postFileProblem,
  type FileDraft,
} from './post-files'
import { postFilesApi } from './post-files-api'
import type { CommunityPost } from './types'

export function usePostFileDrafts(post: CommunityPost | null) {
  const { t } = useTranslation()
  const [files, setFiles] = useState<FileDraft[]>(() =>
    post ? fileDraftsFrom(post.attachments, post.account.id) : [],
  )
  const patch = (id: string, change: Partial<FileDraft>) =>
    setFiles((current) => current.map((file) => (file.id === id ? { ...file, ...change } : file)))

  const add = (accountId: string, picked: File[]) => {
    if (!accountId) {
      toast.error(t('moderation.postFiles.accountFirst'))
      return
    }
    const room = MAX_POST_FILES - files.length
    if (picked.length > room) toast.error(t('moderation.postFiles.problems.tooMany', { max: MAX_POST_FILES }))
    for (const file of picked.slice(0, Math.max(0, room))) {
      const problem = postFileProblem(file)
      if (problem) {
        toast.error(
          t(`moderation.postFiles.problems.${problem.code}`, {
            name: file.name,
            max: 'max' in problem ? formatBytes(problem.max) : undefined,
          }),
        )
        continue
      }
      const id = uuid()
      setFiles((current) => [
        ...current,
        {
          id,
          name: file.name.trim().slice(0, MAX_FILE_NAME),
          size: file.size,
          ext: postFileExt(file.name),
          path: null,
          accountId,
          state: 'uploading',
          error: null,
        },
      ])
      postFilesApi
        .uploadPostFile(accountId, file)
        .then(({ path }) => patch(id, { path, state: 'done' }))
        .catch((error: unknown) => patch(id, { state: 'failed', error: postErrorText(error) }))
    }
  }

  return {
    files,
    add,
    rename: (id: string, name: string) => patch(id, { name }),
    remove: (id: string) => setFiles((current) => current.filter((file) => file.id !== id)),
  }
}

export type PostFileDrafts = ReturnType<typeof usePostFileDrafts>
