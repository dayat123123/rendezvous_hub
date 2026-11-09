import { DownloadIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { downloadText } from '@/lib/download'

export function CsvButton({
  label,
  disabled,
  fileName,
  build,
}: {
  label: string
  disabled?: boolean
  fileName: string
  build: () => string
}) {
  const { t } = useTranslation()
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={disabled}
      aria-label={t('help.admin.reports.exportNamed', { name: label })}
      onClick={() => downloadText(fileName, build(), 'text/csv;charset=utf-8')}
    >
      <DownloadIcon />
      {t('reports.exportCsv')}
    </Button>
  )
}

export function TableHeading({ id, title, action }: { id: string; title: string; action: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 id={id} className="text-sm font-semibold">
        {title}
      </h3>
      {action}
    </div>
  )
}
