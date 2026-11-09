import { LoaderCircleIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@/components/ui/controls'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FieldMessage, FormError } from '@/features/settings/components/settings-ui'
import { iconGlyphs } from '@/features/settings/components/topic-icons'
import { topicIcons, type TopicIcon } from '@/features/settings/types'

import { useSaveFaqCategory } from '../hooks'
import type { FaqCategory } from '../types'

const codePattern = /^[a-z][a-z0-9_]{1,31}$/

export function CategoryDialog({ category, onClose }: { category: FaqCategory | null; onClose: () => void }) {
  const { t } = useTranslation()
  const save = useSaveFaqCategory()
  const [code, setCode] = useState(category?.code ?? '')
  const [nameId, setNameId] = useState(category?.name_id ?? '')
  const [nameEn, setNameEn] = useState(category?.name_en ?? '')
  const [icon, setIcon] = useState<TopicIcon>(category?.icon ?? 'help')
  const [order, setOrder] = useState(String(category?.sort_order ?? 0))
  const [active, setActive] = useState(category?.active ?? true)
  const [touched, setTouched] = useState(false)
  const name = (value: string) => value.trim().length >= 2 && value.trim().length <= 60
  const valid = {
    code: codePattern.test(code.trim()),
    nameId: name(nameId),
    nameEn: name(nameEn),
    order: /^\d{1,3}$/.test(order.trim()),
  }
  const Glyph = iconGlyphs[icon]

  const submit = async () => {
    setTouched(true)
    if (!Object.values(valid).every(Boolean)) return
    try {
      await save.mutateAsync({
        id: category?.id ?? null,
        code: code.trim(),
        name_id: nameId.trim(),
        name_en: nameEn.trim(),
        icon,
        sort_order: Number(order.trim()),
        active,
      })
      toast.success(t('faq.categorySaved'))
      onClose()
    } catch {
      return
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg" closeLabel={t('app.close')} aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{category ? t('faq.editCategory') : t('faq.addCategory')}</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="faq-category-code">{t('faq.categoryCode')}</Label>
            <Input
              id="faq-category-code"
              maxLength={32}
              value={code}
              aria-invalid={touched && !valid.code ? true : undefined}
              onChange={(event) => setCode(event.target.value)}
            />
            <FieldMessage
              error={touched && !valid.code ? t('settings.invalidTopicCode') : undefined}
              hint={t('faq.categoryCodeHint')}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="faq-category-name-id">{t('faq.categoryNameId')}</Label>
              <Input
                id="faq-category-name-id"
                maxLength={60}
                value={nameId}
                aria-invalid={touched && !valid.nameId ? true : undefined}
                onChange={(event) => setNameId(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="faq-category-name-en">{t('faq.categoryNameEn')}</Label>
              <Input
                id="faq-category-name-en"
                maxLength={60}
                value={nameEn}
                aria-invalid={touched && !valid.nameEn ? true : undefined}
                onChange={(event) => setNameEn(event.target.value)}
              />
            </div>
          </div>
          <FieldMessage
            error={touched && (!valid.nameId || !valid.nameEn) ? t('faq.categoryNameHint') : undefined}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="faq-category-icon">{t('faq.categoryIcon')}</Label>
              <Select value={icon} onValueChange={(value) => setIcon(value as TopicIcon)}>
                <SelectTrigger id="faq-category-icon">
                  <span className="flex items-center gap-2">
                    <Glyph className="size-4" aria-hidden="true" />
                    <SelectValue />
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {topicIcons.map((item) => (
                    <SelectItem key={item} value={item}>
                      {t(`settings.topicIcons.${item}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="faq-category-order">{t('faq.order')}</Label>
              <Input
                id="faq-category-order"
                inputMode="numeric"
                maxLength={3}
                value={order}
                aria-invalid={touched && !valid.order ? true : undefined}
                onChange={(event) => setOrder(event.target.value)}
              />
            </div>
            <label className="flex h-9 items-center justify-between gap-3 self-end text-sm font-medium">
              {t('faq.categoryActive')}
              <Switch checked={active} onCheckedChange={setActive} />
            </label>
          </div>
          <FormError error={save.error} />
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={save.isPending} onClick={onClose}>
              {t('app.cancel')}
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? <LoaderCircleIcon className="animate-spin" /> : null}
              {t('app.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
