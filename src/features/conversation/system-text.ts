import type { ChatMessage } from './types'

export function systemText(message: Pick<ChatMessage, 'body' | 'payload'>, language: string) {
  const texts = message.payload.texts
  if (texts && typeof texts === 'object') {
    const localized = (texts as Record<string, unknown>)[language]
    if (typeof localized === 'string' && localized.trim() !== '') return localized
  }
  return message.body
}
