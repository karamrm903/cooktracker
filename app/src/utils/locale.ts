// ─────────────────────────────────────────────────────────────────────────────
//  Locale detection + currency resolution utilities
//
//  Uses the built-in Intl API (available in Hermes / RN 0.70+).
//  No external packages required.
// ─────────────────────────────────────────────────────────────────────────────

import { PRICING, DEFAULT_CURRENCY, type CurrencyCode, type PricingEntry } from '../config/pricing';

// ── Region → currency map ─────────────────────────────────────────────────────

/** Eurozone country codes (ISO 3166-1 alpha-2). */
const EUROZONE_REGIONS = new Set([
  'AT', 'BE', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE',
  'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES',
]);

/**
 * Maps a 2-letter ISO region code to a supported currency code.
 * Add entries here as new currencies are added to PRICING.
 */
function regionToCurrency(region: string): CurrencyCode {
  if (region === 'US') return 'USD';
  if (region === 'GB') return 'GBP';
  if (region === 'RO') return 'RON';
  if (EUROZONE_REGIONS.has(region)) return 'EUR';
  return DEFAULT_CURRENCY;
}

// ── Locale detection ──────────────────────────────────────────────────────────

/**
 * Returns the device locale string (e.g. 'en-US', 'ro-RO', 'de-DE').
 * Falls back to 'en-US' if Intl is unavailable.
 */
export function getDeviceLocale(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    return 'en-US';
  }
}

/**
 * Extracts the 2-letter region code from a locale string.
 * Handles both 'en-US' (BCP 47) and 'en_US' (legacy) formats.
 */
export function getRegionFromLocale(locale: string): string {
  const normalized = locale.replace('_', '-');
  const parts = normalized.split('-');
  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i].length === 2) return parts[i].toUpperCase();
  }
  return 'US';
}

// ── Pricing resolution ────────────────────────────────────────────────────────

/**
 * Detects the user's locale and returns the matching pricing entry.
 * Falls back to USD pricing for unknown regions.
 *
 * Later: replace the body with an async fetch from your backend /
 * remote config, then pass the result down to SubscriptionScreen.
 */
export function resolveLocalePricing(): {
  pricing: PricingEntry;
  locale: string;
  currency: CurrencyCode;
} {
  const locale   = getDeviceLocale();
  const region   = getRegionFromLocale(locale);
  const currency = regionToCurrency(region);
  const pricing  = PRICING[currency];
  return { pricing, locale, currency };
}

// ── Price formatting ──────────────────────────────────────────────────────────

/**
 * Formats a number as a locale-aware currency string using Intl.NumberFormat.
 * Uses only .format() — compatible with all React Native / Hermes versions.
 *
 * Examples:
 *   formatCurrency(2.49,  'USD', 'en-US') → "$2.49"
 *   formatCurrency(2.33,  'EUR', 'de-DE') → "2,33 €"
 *   formatCurrency(1.99,  'GBP', 'en-GB') → "£1.99"
 *   formatCurrency(8.33,  'RON', 'ro-RO') → "8,33 RON"
 */
export function formatCurrency(
  amount: number,
  currency: string,
  locale: string,
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
