export const appTabs = ['features', 'banners', 'connection'] as const
export type AppTab = (typeof appTabs)[number]

export const isAppTab = (value: unknown): value is AppTab => (appTabs as readonly unknown[]).includes(value)
