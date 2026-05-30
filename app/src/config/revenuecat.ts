/**
 * RevenueCat configuration constants.
 * These must match exactly what is configured in the RevenueCat dashboard.
 */

/** Entitlement identifier — set in RC Dashboard → Entitlements */
export const RC_ENTITLEMENT_ID = "Macros Ai Pro";

/** App Store product IDs — must match App Store Connect exactly */
export const RC_PRODUCT_IDS = {
  weekly: "com.macrosai.nutrily.premium.weekly",
  monthly: "com.macrosai.nutrily.premium.monthly",
  yearly: "com.macrosai.nutrily.premium.yearly",
} as const;
