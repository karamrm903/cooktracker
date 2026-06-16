import { getBaseUrl, getAuthHeaders, handleResponse } from './api.config';
import { createUsageLimitError, isClientPremium } from './subscription.service';

export interface ExploreRecipe {
  id: string;
  name: string;
  emoji: string;
  calories: number;
  time: string;
  difficulty: string;
  category: string;
  macros: { protein: number; carbs: number; fat: number };
  ingredients: string[];
  steps: Array<{ text: string; timerMinutes: number | null; timerLabel: string | null }>;
  nutrition: { total: { calories: number; protein: number; carbs: number; fat: number } };
  estimatedGrams: number;
}

export const exploreService = {
  getConfig: async (): Promise<{ searchResultsCount: number }> => {
    const response = await fetch(`${getBaseUrl()}/api/config`);
    return response.ok ? response.json() : { searchResultsCount: 2 };
  },

  // GET /api/explore/swipe — curated swipe deck (no images on this payload).
  fetchSwipeDeck: async (
    session: any,
    opts: { category?: string; q?: string; limit?: number } = {},
  ): Promise<{ cards: ExploreRecipe[] }> => {
    const headers = await getAuthHeaders(session);
    const params = new URLSearchParams();
    if (opts.category && opts.category !== 'all') params.set('category', opts.category);
    if (opts.q) params.set('q', opts.q);
    if (opts.limit) params.set('limit', String(opts.limit));
    const qs = params.toString();
    const res = await fetch(
      `${getBaseUrl()}/api/explore/swipe${qs ? `?${qs}` : ''}`,
      { headers },
    );
    const data = await handleResponse<{ cards: ExploreRecipe[] }>(res);
    return { cards: data.cards ?? [] };
  },

  fetchTrending: async (session: any): Promise<{ items: ExploreRecipe[] }> => {
    const headers = await getAuthHeaders(session);
    const res = await fetch(`${getBaseUrl()}/api/explore/trending`, { headers });
    const data = await handleResponse<{ items: ExploreRecipe[] }>(res);
    return { items: data.items ?? [] };
  },

  // POST /api/recipes/:id/image — lazy fetch 1h signed Pexels URL.
  fetchRecipeImage: async (
    session: any,
    recipeId: string,
    q?: string,
  ): Promise<string | null> => {
    const headers = await getAuthHeaders(session);
    const res = await fetch(`${getBaseUrl()}/api/recipes/${recipeId}/image`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ q: q ?? '' }),
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => ({}));
    return data?.signedUrl ?? null;
  },

  // POST /api/recipes/images — bulk sign for preload (dashboard → explore handoff).
  fetchRecipeImagesBulk: async (
    session: any,
    ids: string[],
  ): Promise<Record<string, string | null>> => {
    if (!ids.length) return {};
    const headers = await getAuthHeaders(session);
    const res = await fetch(`${getBaseUrl()}/api/recipes/images`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) return {};
    const data = await res.json().catch(() => ({}));
    return data?.images ?? {};
  },

  searchFood: async (
    session: any,
    query: string,
    locale: string,
  ): Promise<{ results: ExploreRecipe[] }> => {
    const doFetch = async () => {
      const headers = await getAuthHeaders(session);
      return fetch(`${getBaseUrl()}/api/search`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ q: query, locale }),
      });
    };

    let response = await doFetch();

    if (response.status === 403) {
      const data = await response.json().catch(() => ({}));
      if (data.reason === 'limit_reached') {
        // Webhook lag: server still thinks free, but client already knows premium.
        // Wait briefly for the webhook to land, then retry once.
        if (isClientPremium()) {
          await new Promise((r) => setTimeout(r, 3000));
          response = await doFetch();
          if (response.status === 403) {
            const retryData = await response.json().catch(() => ({}));
            if (retryData.reason === 'limit_reached') {
              // Still rejected — Redux must be stale. Surface the paywall.
              throw createUsageLimitError(retryData);
            }
          }
        } else {
          throw createUsageLimitError(data);
        }
      }
    }

    const result = await handleResponse<{ results: ExploreRecipe[] }>(response);
    return { results: result.results ?? [] };
  },
};
