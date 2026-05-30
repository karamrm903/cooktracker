// ─────────────────────────────────────────────────────────────────────────────
//  Subscription pricing config
//
//  Structure is designed to be swapped for backend / remote-config data later.
//  To add a new currency: add an entry here + add its region(s) in locale.ts.
// ─────────────────────────────────────────────────────────────────────────────

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'RON';

export interface PricingEntry {
  /** ISO 4217 currency code used for Intl formatting */
  currency: CurrencyCode;
  /** Discounted yearly charge — what the user actually pays */
  yearly: number;
  /** Yearly price divided by 12, shown as "X / month" in the UI */
  monthlyEquivalent: number;
  /** Inflated "original" monthly price shown as strikethrough */
  originalMonthlyDisplay: number;
}

/**
 * Static pricing map. Replace values here (or swap the whole object from a
 * remote config / API response) to update pricing across the app instantly.
 *
 * NOTE: monthlyEquivalent should equal yearly / 12, rounded to 2 dp.
 */
export const PRICING: Record<CurrencyCode, PricingEntry> = {
  USD: {
    currency: 'USD',
    yearly: 29.99,
    monthlyEquivalent: 2.49,
    originalMonthlyDisplay: 14.99,
  },
  EUR: {
    currency: 'EUR',
    yearly: 27.99,
    monthlyEquivalent: 2.33,
    originalMonthlyDisplay: 13.99,
  },
  GBP: {
    currency: 'GBP',
    yearly: 23.99,
    monthlyEquivalent: 1.99,
    originalMonthlyDisplay: 11.99,
  },
  RON: {
    currency: 'RON',
    yearly: 99.99,
    monthlyEquivalent: 8.33,
    originalMonthlyDisplay: 149.99,
  },
};

/** Fallback used when the user's region cannot be mapped to a currency. */
export const DEFAULT_CURRENCY: CurrencyCode = 'USD';
