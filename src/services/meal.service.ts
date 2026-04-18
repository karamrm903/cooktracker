import { getBaseUrl, getAuthHeaders, handleResponse } from './api.config';
import { Meal } from '../types';

export const mealService = {
  getMeals: async (session: any, date: string): Promise<Meal[]> => {
    const headers = await getAuthHeaders(session);
    const response = await fetch(`${getBaseUrl()}/api/meals?date=${date}`, { headers });
    const data = await handleResponse<{ meals: Meal[] }>(response);
    return data.meals;
  },

  addMeal: async (session: any, meal: Omit<Meal, 'id'>): Promise<Meal> => {
    const headers = await getAuthHeaders(session);
    const response = await fetch(`${getBaseUrl()}/api/meals`, {
      method: 'POST',
      headers,
      body: JSON.stringify(meal),
    });
    const data = await handleResponse<{ meal: Meal }>(response);
    return data.meal;
  },

  updateMeal: async (
    session: any,
    id: string,
    updates: {
      calories?: number;
      protein?: number;
      carbs?: number;
      fat?: number;
      gramsEaten?: number;
      mealType?: string;
      meal?: string;
      emoji?: string;
    }
  ): Promise<Meal> => {
    const headers = await getAuthHeaders(session);
    const response = await fetch(`${getBaseUrl()}/api/meals/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates),
    });
    const data = await handleResponse<{ meal: Meal }>(response);
    return data.meal;
  },

  deleteMeal: async (session: any, id: string): Promise<void> => {
    const headers = await getAuthHeaders(session);
    const response = await fetch(`${getBaseUrl()}/api/meals/${id}`, {
      method: 'DELETE',
      headers,
    });
    await handleResponse<{ success: boolean }>(response);
  },
};
