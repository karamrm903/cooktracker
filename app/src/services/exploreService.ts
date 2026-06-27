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
  imageUrl?: string | null; // signed image URL, included inline by the swipe/trending routes
}

// In-memory signed-URL cache. Module scope → lives for the whole app session
// and resets on relaunch, so revisiting Explore / See-All within one launch
// never re-signs the same recipe image.
const _recipeImageUrlCache = new Map<string, string | null>();
// Tracks requests currently in flight (single or bulk) so concurrent callers for
// the same id share one network round-trip instead of each firing their own.
const _recipeImageInFlight = new Map<string, Promise<string | null>>();

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

  // Session-cached variant of fetchRecipeImage — resolves once per recipe per
  // app launch, and dedupes concurrent requests for the same id.
  fetchRecipeImageCached: (
    session: any,
    recipeId: string,
    q?: string,
  ): Promise<string | null> => {
    if (_recipeImageUrlCache.has(recipeId)) {
      return Promise.resolve(_recipeImageUrlCache.get(recipeId) ?? null);
    }
    const existing = _recipeImageInFlight.get(recipeId);
    if (existing) return existing;

    const p = exploreService
      .fetchRecipeImage(session, recipeId, q)
      .then((url) => {
        _recipeImageUrlCache.set(recipeId, url);
        _recipeImageInFlight.delete(recipeId);
        return url;
      })
      .catch((err) => {
        _recipeImageInFlight.delete(recipeId);
        throw err;
      });
    _recipeImageInFlight.set(recipeId, p);
    return p;
  },

  // Seed the shared cache with URLs already known (e.g. inline imageUrl from the
  // swipe deck) so later per-card / bulk lookups are instant and skip the network.
  seedImageCache: (entries: Record<string, string | null>) => {
    for (const [id, url] of Object.entries(entries)) {
      _recipeImageUrlCache.set(String(id), url ?? null);
    }
  },

  // Batch-load signed image URLs for many recipes in ONE request. Already-cached
  // and in-flight ids are skipped; the rest are fetched via the bulk endpoint and
  // seeded into the shared cache (so per-card lookups become instant, no network).
  // Returns the combined { id → url } map for the requested ids.
  loadRecipeImages: async (
    session: any,
    ids: string[],
  ): Promise<Record<string, string | null>> => {
    const unique = Array.from(new Set(ids.map(String)));
    const missing = unique.filter(
      (id) => !_recipeImageUrlCache.has(id) && !_recipeImageInFlight.has(id),
    );

    if (missing.length) {
      const bulk = exploreService.fetchRecipeImagesBulk(session, missing);
      // Register each missing id as in-flight against the single bulk request so
      // any card that asks meanwhile waits on this instead of firing its own.
      missing.forEach((id) => {
        const p = bulk
          .then((map) => {
            const url = map[id] ?? null;
            _recipeImageUrlCache.set(id, url);
            _recipeImageInFlight.delete(id);
            return url;
          })
          .catch((err) => {
            _recipeImageInFlight.delete(id);
            throw err;
          });
        _recipeImageInFlight.set(id, p);
      });
      await bulk.catch(() => {});
    }

    // Wait for any still-pending ids (covers ids already in-flight from elsewhere).
    await Promise.all(
      unique.map((id) =>
        _recipeImageUrlCache.has(id)
          ? null
          : (_recipeImageInFlight.get(id) ?? Promise.resolve()),
      ),
    ).catch(() => {});

    const result: Record<string, string | null> = {};
    unique.forEach((id) => {
      result[id] = _recipeImageUrlCache.get(id) ?? null;
    });
    return result;
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
