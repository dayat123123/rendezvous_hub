import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/controls'

export type PermissionOption = { value: string; label: string; hint?: string }

export function PermissionGroup({
  title,
  hint,
  options,
  value,
  onChange,
}: {
  title: string
  hint: string
  options: readonly PermissionOption[]
  value: readonly string[]
  onChange: (next: string[]) => void
}) {
  const { t } = useTranslation()
  const id = useId()
  const all = options.every((option) => value.includes(option.value))
  const none = !options.some((option) => value.includes(option.value))
  const count = options.filter((option) => value.includes(option.value)).length
  return (
    <fieldset aria-labelledby={`${id}-title`} className="flex flex-col gap-2 rounded-md border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span id={`${id}-title`} className="text-sm font-medium">
          {title}
        </span>
        <span className="tabular text-xs text-muted-foreground">
          {t('settings.permissionCount', { chosen: count, total: options.length })}
        </span>
        <span className="ml-auto flex gap-1">
          <Button
            type="button"
            size="xs"
            variant="ghost"
            disabled={all}
            aria-label={t('settings.selectAllOf', { group: title })}
            onClick={() => onChange(options.map((option) => option.value))}
          >
            {t('settings.selectAll')}
          </Button>
          <Button
            type="button"
            size="xs"
            variant="ghost"
            disabled={none}
            aria-label={t('settings.clearAllOf', { group: title })}
            onClick={() => onChange([])}
          >
            {t('settings.clearAll')}
          </Button>
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <div className="flex flex-col gap-1.5">
        {options.map((option) => (
          <label key={option.value} className="flex items-start gap-2 text-row">
            <Checkbox
              className="mt-0.5"
              checked={value.includes(option.value)}
              onCheckedChange={(checked) =>
                onChange(
                  checked === true
                    ? options
                        .map((item) => item.value)
                        .filter((item) => item === option.value || value.includes(item))
                    : value.filter((item) => item !== option.value),
                )
              }
            />
            <span>
              <span className="block">{option.label}</span>
              {option.hint ? (
                <span className="block text-xs text-muted-foreground">{option.hint}</span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
