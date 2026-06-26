import { getBaseUrl, getAuthHeaders, handleResponse } from './api.config';
import { createUsageLimitError, isClientPremium } from './subscription.service';

export interface FoodItem {
  id: string;
  name: string;
  verified: boolean;
  calories: number;
  servingSize: string;
  servingSizeGrams: number;
  macros: { protein: number; carbs: number; fat: number };
  imageUrl?: string;
}

/**
 * Fetch a 1-hour signed Pexels image URL for a persisted food_items row.
 * Returns null when the server has no image / no Pexels key.
 */
export async function fetchFoodItemImage(
  foodItemId: string,
  session: any,
  q?: string,
): Promise<string | null> {
  const headers = await getAuthHeaders(session);
  const res = await fetch(`${getBaseUrl()}/api/food-items/${foodItemId}/image`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ q: q ?? '' }),
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => ({}));
  return data?.signedUrl ?? null;
}

/**
 * Fetch a signed image URL by free-form food name. Used by FoodDetailScreen
 * when the item isn't anchored to a persisted recipe row yet.
 */
export async function fetchFoodImage(q: string, session: any): Promise<string | null> {
  if (!q.trim()) return null;
  const headers = await getAuthHeaders(session);
  const res = await fetch(`${getBaseUrl()}/api/food/image`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ q }),
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => ({}));
  return data?.signedUrl ?? null;
}

export async function searchFoodSuggestions(q: string, session: any): Promise<string[]> {
  const headers = await getAuthHeaders(session);
  const res = await fetch(`${getBaseUrl()}/api/food-search`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ q, mode: 'suggestions' }),
  });
  const data = await handleResponse<{ suggestions: string[] }>(res);
  return data.suggestions ?? [];
}

export async function searchFood(
  q: string,
  session: any,
): Promise<{ bestMatch: FoodItem | null; results: FoodItem[] }> {
  const headers = await getAuthHeaders(session);
  const doFetch = () =>
    fetch(`${getBaseUrl()}/api/food-search`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ q, mode: 'results' }),
    });

  let res = await doFetch();

  // Non-premium users are gated server-side — surface the paywall.
  if (res.status === 403) {
    const data = await res.json().catch(() => ({}));
    if (data.reason === 'limit_reached') {
      // Webhook lag: client already knows premium but server profile is stale.
      // Wait briefly for the webhook, then retry once before giving up.
      if (isClientPremium()) {
        await new Promise((r) => setTimeout(r, 3000));
        res = await doFetch();
        if (res.status === 403) {
          const retry = await res.json().catch(() => ({}));
          if (retry.reason === 'limit_reached') throw createUsageLimitError(retry);
        }
      } else {
        throw createUsageLimitError(data);
      }
    }
  }

  return handleResponse<{ bestMatch: FoodItem | null; results: FoodItem[] }>(res);
}
