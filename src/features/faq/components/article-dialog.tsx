import { zodResolver } from '@hookform/resolvers/zod'
import { ImagePlusIcon, LoaderCircleIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/controls'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FieldMessage, FormError } from '@/features/settings/components/settings-ui'
import { errorText } from '@/lib/error-text'
import { useTopicConfigs } from '@/features/settings/hooks'
import { cn } from '@/lib/utils'

import { faqApi } from '../api'
import { useSaveFaqArticle } from '../hooks'
import { parseKeywords } from '../logic'
import { FaqMarkdown } from '../markdown'
import type { FaqArticle, FaqCategory } from '../types'

const NO_TOPIC = '-'
const htmlTag = /<[A-Za-z/!?]/
const plainLink = /(^|[^!])\[[^\]]*\]\(\s*(?!https:\/\/)/i
const foreignImage =
  /!\[[^\]]*\]\(\s*(?!https?:\/\/[^\s/?#]+(?:\/[^\s?#]*)?\/storage\/v1\/object\/public\/faq-images\/)/

type Message =
  | 'faq.questionHint'
  | 'faq.answerHint'
  | 'faq.answerHtml'
  | 'faq.answerLink'
  | 'faq.answerImage'
  | 'faq.categoryRequired'
  | 'faq.keywordsHint'

const answer = z
  .string()
  .trim()
  .min(1, 'faq.answerHint')
  .max(8000, 'faq.answerHint')
  .refine((value) => !htmlTag.test(value), 'faq.answerHtml')
  .refine((value) => !plainLink.test(value), 'faq.answerLink')
  .refine((value) => !foreignImage.test(value), 'faq.answerImage')

const articleSchema = z.object({
  category_id: z.string().min(1, 'faq.categoryRequired'),
  topic_code: z.string(),
  question_id: z.string().trim().min(5, 'faq.questionHint').max(200, 'faq.questionHint'),
  question_en: z.string().trim().min(5, 'faq.questionHint').max(200, 'faq.questionHint'),
  answer_id: answer,
  answer_en: answer,
  keywords: z.string().refine((value) => {
    const keywords = parseKeywords(value)
    return keywords.length <= 20 && keywords.every((keyword) => keyword.length <= 40)
  }, 'faq.keywordsHint'),
  sort_order: z
    .string()
    .trim()
    .refine((value) => /^\d{1,3}$/.test(value)),
})

type ArticleForm = z.infer<typeof articleSchema>

export function ArticleDialog({
  article,
  categories,
  onClose,
}: {
  article: FaqArticle | null
  categories: FaqCategory[]
  onClose: () => void
}) {
  const { t } = useTranslation()
  const topics = useTopicConfigs()
  const save = useSaveFaqArticle()
  const [preview, setPreview] = useState<'id' | 'en'>('id')
  const [uploading, setUploading] = useState<'answer_id' | 'answer_en' | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const target = useRef<'answer_id' | 'answer_en'>('answer_id')
  const form = useForm<ArticleForm>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      category_id: article?.category_id ?? categories.find((category) => category.active)?.id ?? '',
      topic_code: article?.topic_code ?? NO_TOPIC,
      question_id: article?.question_id ?? '',
      question_en: article?.question_en ?? '',
      answer_id: article?.answer_id ?? '',
      answer_en: article?.answer_en ?? '',
      keywords: article?.keywords.join(', ') ?? '',
      sort_order: String(article?.sort_order ?? 0),
    },
  })
  const errors = form.formState.errors
  const message = (value?: string) => (value ? t(value as Message) : undefined)
  const [questionId, questionEn, answerId, answerEn] = useWatch({
    control: form.control,
    name: ['question_id', 'question_en', 'answer_id', 'answer_en'],
  })
  const previewQuestion = preview === 'id' ? questionId : questionEn
  const previewAnswer = preview === 'id' ? answerId : answerEn

  const submit = form.handleSubmit(async (values) => {
    try {
      await save.mutateAsync({
        id: article?.id ?? null,
        version: article?.version ?? null,
        category_id: values.category_id,
        topic_code: values.topic_code === NO_TOPIC ? null : values.topic_code,
        question_id: values.question_id.trim(),
        question_en: values.question_en.trim(),
        answer_id: values.answer_id.trim(),
        answer_en: values.answer_en.trim(),
        keywords: parseKeywords(values.keywords),
        sort_order: Number(values.sort_order),
      })
      toast.success(article ? t('faq.saved') : t('faq.savedDraft'))
      onClose()
    } catch {
      return
    }
  })

  const insertImage = async (file: File) => {
    const name = target.current
    setUploading(name)
    try {
      const url = await faqApi.uploadImage(file)
      const field = document.getElementById(`faq-${name}`) as HTMLTextAreaElement | null
      const current = form.getValues(name)
      const at = field?.selectionStart ?? current.length
      const before = current.slice(0, at).replace(/\s*$/, '')
      const after = current.slice(at).replace(/^\s*/, '')
      const alt =
        file.name
          .replace(/\.[^.]+$/, '')
          .replace(/[[\]()]/g, '')
          .slice(0, 60) || 'gambar'
      const image = `![${alt}](${url})`
      form.setValue(name, [before, image, after].filter(Boolean).join('\n\n'), {
        shouldDirty: true,
        shouldValidate: form.formState.isSubmitted,
      })
      setPreview(name === 'answer_id' ? 'id' : 'en')
      toast.success(t('faq.imageInserted'))
    } catch (error) {
      toast.error(errorText(error))
    } finally {
      setUploading(null)
    }
  }

  const textField = (name: 'question_id' | 'question_en', label: string) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`faq-${name}`}>{label}</Label>
      <Input
        id={`faq-${name}`}
        maxLength={200}
        aria-invalid={errors[name] ? true : undefined}
        {...form.register(name)}
      />
      <FieldMessage error={message(errors[name]?.message)} />
    </div>
  )
  const answerField = (name: 'answer_id' | 'answer_en', label: string) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`faq-${name}`}>{label}</Label>
      <Textarea
        id={`faq-${name}`}
        rows={8}
        maxLength={8000}
        aria-invalid={errors[name] ? true : undefined}
        {...form.register(name)}
      />
      <FieldMessage error={message(errors[name]?.message)} hint={t('faq.answerFormat')} />
      <div>
        <Button
          type="button"
          size="xs"
          variant="outline"
          disabled={uploading !== null}
          onClick={() => {
            target.current = name
            fileInput.current?.click()
          }}
        >
          {uploading === name ? <LoaderCircleIcon className="animate-spin" /> : <ImagePlusIcon />}
          {name === 'answer_id' ? t('faq.insertImageId') : t('faq.insertImageEn')}
        </Button>
      </div>
    </div>
  )

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-4xl"
        closeLabel={t('app.close')}
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>{article ? t('faq.editArticle') : t('faq.addArticle')}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={(event) => void submit(event)} noValidate>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            data-testid="faq-image-input"
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (file) void insertImage(file)
            }}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="faq-category">{t('faq.category')}</Label>
              <Controller
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="faq-category" aria-invalid={errors.category_id ? true : undefined}>
                      <SelectValue placeholder={t('faq.chooseCategory')} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name_id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldMessage error={message(errors.category_id?.message)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="faq-topic">{t('faq.topic')}</Label>
              <Controller
                control={form.control}
                name="topic_code"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="faq-topic">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_TOPIC}>{t('faq.noTopic')}</SelectItem>
                      {(topics.data ?? []).map((topic) => (
                        <SelectItem key={topic.code} value={topic.code}>
                          {topic.name_id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldMessage hint={t('faq.topicHint')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="faq-order">{t('faq.order')}</Label>
              <Input
                id="faq-order"
                inputMode="numeric"
                maxLength={3}
                aria-invalid={errors.sort_order ? true : undefined}
                {...form.register('sort_order')}
              />
              <FieldMessage
                error={errors.sort_order ? t('settings.numberRange', { min: 0, max: 999 }) : undefined}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {textField('question_id', t('faq.questionId'))}
            {textField('question_en', t('faq.questionEn'))}
            {answerField('answer_id', t('faq.answerId'))}
            {answerField('answer_en', t('faq.answerEn'))}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="faq-keywords">{t('faq.keywords')}</Label>
            <Input
              id="faq-keywords"
              aria-invalid={errors.keywords ? true : undefined}
              {...form.register('keywords')}
            />
            <FieldMessage error={message(errors.keywords?.message)} hint={t('faq.keywordsHelp')} />
          </div>
          <section aria-label={t('faq.preview')} className="flex flex-col gap-2 rounded-lg border p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">{t('faq.preview')}</h3>
              <div role="group" aria-label={t('faq.previewLanguage')} className="flex gap-1">
                {(['id', 'en'] as const).map((language) => (
                  <Button
                    key={language}
                    type="button"
                    size="xs"
                    variant={preview === language ? 'secondary' : 'ghost'}
                    aria-pressed={preview === language}
                    onClick={() => setPreview(language)}
                  >
                    {language.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>
            <div className="mx-auto w-full max-w-sm rounded-xl border bg-card p-4">
              <p className={cn('mb-2 text-base font-semibold', !previewQuestion && 'text-muted-foreground')}>
                {previewQuestion || t('faq.previewEmpty')}
              </p>
              {previewAnswer ? <FaqMarkdown text={previewAnswer} /> : null}
            </div>
          </section>
          <FormError error={save.error} />
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={save.isPending} onClick={onClose}>
              {t('app.cancel')}
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? <LoaderCircleIcon className="animate-spin" /> : null}
              {article ? t('app.save') : t('faq.saveDraft')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
