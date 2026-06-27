import { getBaseUrl, getAuthHeaders, handleResponse } from './api.config';
import { UserProfile } from '../types';

// Session-scoped profile cache + in-flight dedup. Many screens (Dashboard,
// useSubscription, Plan, Profile…) ask for the profile around the same time on
// launch — without this they each fire their own GET and flood a slow server.
const PROFILE_TTL = 60_000; // 1 min
let _profileCache: { token: string; data: UserProfile; ts: number } | null = null;
let _profileInFlight: Promise<UserProfile> | null = null;

export const profileService = {
  /**
   * Fetches the user's profile — cached for a minute and deduped so concurrent
   * callers share a single request.
   */
  getProfile: async (session: any): Promise<UserProfile> => {
    const token = session?.access_token ?? '';

    if (
      _profileCache &&
      _profileCache.token === token &&
      Date.now() - _profileCache.ts < PROFILE_TTL
    ) {
      return _profileCache.data;
    }
    if (_profileInFlight) return _profileInFlight;

    _profileInFlight = (async () => {
      const headers = await getAuthHeaders(session);
      const response = await fetch(`${getBaseUrl()}/api/profile`, {
        method: 'GET',
        headers,
      });
      const data = await handleResponse<{ profile: UserProfile }>(response);
      _profileCache = { token, data: data.profile, ts: Date.now() };
      return data.profile;
    })().finally(() => {
      _profileInFlight = null;
    });

    return _profileInFlight;
  },

  /**
   * Updates the user's locale preference on the backend.
   */
  updateLocale: async (session: any, locale: string): Promise<void> => {
    const headers = await getAuthHeaders(session);
    await fetch(`${getBaseUrl()}/api/profile`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ locale }),
    });
    _profileCache = null; // profile changed — drop the cache
  },

  /**
   * Updates or creates the user's profile on the backend.
   */
  updateProfile: async (session: any, profile: Partial<UserProfile>): Promise<UserProfile> => {
    const headers = await getAuthHeaders(session);
    const response = await fetch(`${getBaseUrl()}/api/profile`, {
      method: 'POST',
      headers,
      body: JSON.stringify(profile),
    });
    const data = await handleResponse<{ profile: UserProfile }>(response);
    // Refresh the cache with the authoritative result.
    _profileCache = {
      token: session?.access_token ?? '',
      data: data.profile,
      ts: Date.now(),
    };
    return data.profile;
  },
};
