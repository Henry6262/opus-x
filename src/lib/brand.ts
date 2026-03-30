const trimHandle = (value: string): string => value.replace(/^@/, "");

export const brand = {
  productName: process.env.NEXT_PUBLIC_BRAND_NAME || "SuperRouter",
  shortName: process.env.NEXT_PUBLIC_BRAND_SHORT_NAME || "SuperRouter",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://superrouter.fun",
  themeColor: process.env.NEXT_PUBLIC_BRAND_PRIMARY || "#68ac6e",
  backgroundColor: process.env.NEXT_PUBLIC_BRAND_BACKGROUND || "#0a0a0b",
  twitterHandle: process.env.NEXT_PUBLIC_BRAND_TWITTER || "@superrouter",
  twitterUrl: process.env.NEXT_PUBLIC_BRAND_TWITTER_URL || "https://x.com/SuperRouterSol",
  moltbookUsername:
    process.env.NEXT_PUBLIC_BRAND_MOLTBOOK_USERNAME || "SuperRouter",
  premiumCallsLabel:
    process.env.NEXT_PUBLIC_PREMIUM_CALLS_LABEL || "SR Calls",
  profileLabel: process.env.NEXT_PUBLIC_BRAND_PROFILE_LABEL || "SUPER ROUTER",
  mascotImagePath:
    process.env.NEXT_PUBLIC_BRAND_MASCOT_PATH || "/character/super-router.png",
};

export const brandSocial = {
  twitterAt: brand.twitterHandle.startsWith("@")
    ? brand.twitterHandle
    : `@${brand.twitterHandle}`,
  twitterSlug: trimHandle(brand.twitterHandle),
};
