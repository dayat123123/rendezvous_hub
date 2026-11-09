export const contentTabs = ['topics'] as const
export type ContentTab = (typeof contentTabs)[number]

export const isContentTab = (value: unknown): value is ContentTab =>
  (contentTabs as readonly unknown[]).includes(value)
