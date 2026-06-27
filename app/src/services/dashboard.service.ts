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
const _dashInFlight = new Map<string, Promise<DashboardData>>();

// Short result cache. Re-focusing Dashboard / switching tabs fires a refresh
// each time; without this every focus is a fresh round-trip to a slow server.
// TTL is brief and explicitly invalidated on any meal mutation, so a stale read
// can never revert an optimistic add/remove.
const DASH_TTL_MS = 20_000;
const _dashCache = new Map<string, { at: number; data: DashboardData }>();

export const dashboardService = {
  getDashboard: async (session: any, date: string): Promise<DashboardData> => {
    const key = `${session?.access_token ?? ''}|${date}`;

    const cached = _dashCache.get(key);
    if (cached && Date.now() - cached.at < DASH_TTL_MS) return cached.data;

    const existing = _dashInFlight.get(key);
    if (existing) return existing;

    const p = (async () => {
      const headers = await getAuthHeaders(session);
      const response = await fetch(`${getBaseUrl()}/api/dashboard?targetDate=${date}`, { headers });
      const data = await handleResponse<DashboardData>(response);
      _dashCache.set(key, { at: Date.now(), data });
      return data;
    })().finally(() => {
      _dashInFlight.delete(key);
    });

    _dashInFlight.set(key, p);
    return p;
  },

  // Drop cached dashboards so the next refresh re-fetches. Call after any meal
  // mutation. Pass a token to scope the clear to one user; omit to clear all.
  invalidate: (token?: string) => {
    if (!token) {
      _dashCache.clear();
      return;
    }
    for (const key of _dashCache.keys()) {
      if (key.startsWith(`${token}|`)) _dashCache.delete(key);
    }
  },
};
