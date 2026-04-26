import { getBaseUrl, getAuthHeaders, handleResponse } from './api.config';

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
  ): Promise<ExploreRecipe[]> => {
    const headers = await getAuthHeaders(session);
    const response = await fetch(`${getBaseUrl()}/api/search`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ q: query, locale }),
    });
    const data = await handleResponse<{ results: ExploreRecipe[] }>(response);
    return data.results ?? [];
  },
};
