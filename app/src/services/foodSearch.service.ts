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
