import { getBaseUrl, getAuthHeaders, handleResponse } from './api.config';

export interface AIRecipeInput {
  budget: number;
  vibes: string[];
  dietary: string[];
  equipment: string[];
  force?: boolean;
}

export interface AIRecipe {
  id: string;
  dbId: string;
  name: string;
  emoji?: string | null;
  calories: number;
  macros: { protein: number; carbs: number; fat: number };
  ingredients: any[];
  steps: Array<{ text: string; timerMinutes?: number | null }>;
  nutrition?: any;
  imageUrl?: string | null;
  day?: string | null;
  price?: number | null;
}

export interface ShoppingItem {
  category: string;
  name: string;
  qty: string;
  emoji?: string | null;
}

export interface AIRecipePlan {
  recipes: AIRecipe[];
  cached: boolean;
  budget: number;
  totalPrice: number;
  shoppingList: ShoppingItem[];
}

export const aiRecipeService = {
  generate: async (session: any, input: AIRecipeInput): Promise<AIRecipePlan> => {
    const headers = await getAuthHeaders(session);
    const res = await fetch(`${getBaseUrl()}/api/ai-recipes/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify(input),
    });
    const data = await handleResponse<AIRecipePlan>(res);
    return {
      recipes: data.recipes ?? [],
      cached: !!data.cached,
      budget: data.budget ?? input.budget,
      totalPrice: Number(data.totalPrice) || 0,
      shoppingList: Array.isArray(data.shoppingList) ? data.shoppingList : [],
    };
  },
};
