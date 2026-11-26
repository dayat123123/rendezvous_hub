import { useTranslation } from 'react-i18next'

import { stamp } from '@/lib/time'

import { currencySymbol, periodParts, ratioKind, scaleMoney, sourceName } from '../logic'
import {
  fileErrorCodes,
  metricKeys,
  warningCodes,
  type FileErrorCode,
  type FileView,
  type MetricKey,
  type ReportRef,
  type WarningCode,
} from '../types'

const among = <T extends string>(list: readonly T[], value: string): value is T =>
  (list as readonly string[]).includes(value)

export function useReportText() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'en' ? 'en-US' : 'id-ID'
  const fixed = (value: number, decimals: number) =>
    new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value)
  const signed = (value: number, text: string) => (value < 0 ? `-${text}` : text)

  const period = (report: Pick<ReportRef, 'period' | 'period_end'>) => {
    const parts = periodParts(report.period, report.period_end)
    return parts.kind === 'annual'
      ? t('moderation.finreport.period.annual', { year: parts.year })
      : t('moderation.finreport.period.quarter', {
          roman: parts.roman,
          quarter: parts.quarter,
          year: parts.year,
        })
  }

  const reportName = (report: Pick<ReportRef, 'entity_code' | 'period' | 'period_end'>) =>
    `${report.entity_code} · ${period(report)}`

  const money = (value: number | undefined, currency: string) => {
    if (value === undefined) return '–'
    const scaled = scaleMoney(value, currency)
    const unit = scaled.unit ? ` ${t(`moderation.finreport.metrics.units.${scaled.unit}`)}` : ''
    return signed(
      value,
      `${currencySymbol(currency)}${fixed(Math.abs(scaled.amount), scaled.decimals)}${unit}`,
    )
  }

  const perShare = (value: number | undefined, currency: string) => {
    if (value === undefined) return '–'
    const size = Math.abs(value)
    return signed(value, `${currencySymbol(currency)}${fixed(size, size >= 100 ? 0 : 2)}`)
  }

  const change = (ratio: number | null) =>
    ratio === null
      ? '–'
      : new Intl.NumberFormat(locale, {
          style: 'percent',
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
          signDisplay: 'exceptZero',
        }).format(ratio)

  const ratio = (key: string, value: number | undefined) => {
    if (value === undefined) return '–'
    if (ratioKind(key) === 'multiple') return `${fixed(value, 2)}x`
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value)
  }

  const metricName = (key: string) =>
    among<MetricKey>(metricKeys, key) ? t(`moderation.finreport.metrics.names.${key}`) : key

  const warningShort = (code: string) =>
    among<WarningCode>(warningCodes, code) ? t(`moderation.finreport.warnings.short.${code}`) : code

  const fileError = (code: string) =>
    among<FileErrorCode>(fileErrorCodes, code) ? t(`moderation.finreport.fileErrors.${code}`) : code

  const source = (file: Pick<FileView, 'source' | 'key' | 'uploaded_by'>) => {
    const name = sourceName(file)
    if (file.source === 'api')
      return name
        ? t('moderation.finreport.sources.api', { name })
        : t('moderation.finreport.sources.apiUnknown')
    return name
      ? t('moderation.finreport.sources.hub', { name })
      : t('moderation.finreport.sources.hubUnknown')
  }

  return {
    t,
    stamp,
    period,
    reportName,
    money,
    perShare,
    change,
    ratio,
    metricName,
    warningShort,
    fileError,
    source,
  }
}
