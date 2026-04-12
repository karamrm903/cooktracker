import { getBaseUrl, getAuthHeaders, handleResponse } from './api.config';
import { UserProfile } from '../types';

export const profileService = {
  /**
   * Fetches the user's profile from the backend.
   */
  getProfile: async (session: any): Promise<UserProfile> => {
    const headers = await getAuthHeaders(session);
    const response = await fetch(`${getBaseUrl()}/api/profile`, {
      method: 'GET',
      headers,
    });
    const data = await handleResponse<{ profile: UserProfile }>(response);
    return data.profile;
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
    return data.profile;
  },
};
