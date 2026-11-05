export const featuresCampaignsTabs = ['features', 'banners'] as const
export type FeaturesCampaignsTab = (typeof featuresCampaignsTabs)[number]

export const isFeaturesCampaignsTab = (value: unknown): value is FeaturesCampaignsTab =>
  (featuresCampaignsTabs as readonly unknown[]).includes(value)
