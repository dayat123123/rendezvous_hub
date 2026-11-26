import { readCardDocument } from '../../card-logic'
import { CardPreview } from '../../components/card-preview'
import { useReportText } from './report-text'

export function DocumentPreview({
  document,
  summary,
  stock,
}: {
  document: unknown
  summary: string
  stock?: string
}) {
  const { t } = useReportText()
  const doc = readCardDocument(document)
  if (!doc) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs text-muted-foreground">{t('moderation.research.preview.legacy')}</p>
        <p className="rounded-md border bg-card p-3 text-sm break-words whitespace-pre-wrap">{summary}</p>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">{t('moderation.research.preview.hint')}</p>
      <CardPreview document={doc} stock={stock} />
    </div>
  )
}
