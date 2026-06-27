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

// In-flight dedup so the launch burst (MealLogsContext effect + Dashboard focus
// + tab re-renders all asking at once) collapses to a single request per date.
// No result cache — meal mutations must reflect immediately on the next refresh.
const _dashInFlight = new Map<string, Promise<DashboardData>>();

export const dashboardService = {
  getDashboard: async (session: any, date: string): Promise<DashboardData> => {
    const key = `${session?.access_token ?? ''}|${date}`;
    const existing = _dashInFlight.get(key);
    if (existing) return existing;

    const p = (async () => {
      const headers = await getAuthHeaders(session);
      const response = await fetch(`${getBaseUrl()}/api/dashboard?targetDate=${date}`, { headers });
      return handleResponse<DashboardData>(response);
    })().finally(() => {
      _dashInFlight.delete(key);
    });

    _dashInFlight.set(key, p);
    return p;
  },
};
