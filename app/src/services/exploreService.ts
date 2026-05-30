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
