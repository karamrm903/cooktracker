import { getBaseUrl, getAuthHeaders, handleResponse } from './api.config';
import { Meal } from '../types';

export const mealService = {
  getMeals: async (session: any, date: string): Promise<Meal[]> => {
    const headers = await getAuthHeaders(session);
    const response = await fetch(`${getBaseUrl()}/api/meals?date=${date}`, { headers });
    const data = await handleResponse<{ meals: Meal[] }>(response);
    return data.meals;
  },

  getHistory: async (session: any, page: number = 1, limit: number = 10): Promise<{ history: any[]; hasMore: boolean; totalDays: number }> => {
    const headers = await getAuthHeaders(session);
    const response = await fetch(`${getBaseUrl()}/api/calories/history?page=${page}&limit=${limit}`, { headers });
    return handleResponse<{ history: any[]; hasMore: boolean; totalDays: number }>(response);
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

  savePlan: async (session: any, dateKey: string, meals: Omit<Meal, 'id'>[]): Promise<{ count: number; meals: Meal[] }> => {
    const headers = await getAuthHeaders(session);
    const response = await fetch(`${getBaseUrl()}/api/plan/save`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ dateKey, meals }),
    });
    return handleResponse<{ count: number; meals: Meal[] }>(response);
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
