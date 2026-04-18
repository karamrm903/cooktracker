import { getBaseUrl, getAuthHeaders, handleResponse } from './api.config';
import { Meal } from '../types';

export interface DashboardTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface DashboardData {
  meals: Meal[];
  totals: DashboardTotals;
  streak: number;
}

export const dashboardService = {
  getDashboard: async (session: any, date: string): Promise<DashboardData> => {
    const headers = await getAuthHeaders(session);
    const response = await fetch(`${getBaseUrl()}/api/dashboard?targetDate=${date}`, { headers });
    return handleResponse<DashboardData>(response);
  },
};
