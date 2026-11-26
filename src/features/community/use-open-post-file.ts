import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { postFilesApi } from './post-files-api'

export function useOpenPostFile() {
  const { t } = useTranslation()
  return (path: string) => {
    const target = window.open('about:blank', '_blank')
    postFilesApi
      .postFileUrl(path)
      .then((url) => {
        if (!target) {
          window.location.assign(url)
          return
        }
        target.opener = null
        target.location.href = url
      })
      .catch(() => {
        target?.close()
        toast.error(t('moderation.postFiles.openFailed'))
      })
  }
}
