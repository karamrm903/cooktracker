import { supabase } from '../lib/supabase';
import { saveAuthAccessToken, clearAuthAccessToken } from '../lib/authStorage';
import { SignInWithPasswordCredentials } from '@supabase/supabase-js';

export const authService = {
  /**
   * Signs in a user with email and password.
   */
  signIn: async (credentials: SignInWithPasswordCredentials) => {
    const { data, error } = await supabase.auth.signInWithPassword(credentials);
    if (error) throw error;
    return data;
  },

  /**
   * Signs up a new user.
   */
  signUp: async (credentials: any) => {
    const { data, error } = await supabase.auth.signUp(credentials);
    if (error) throw error;
    return data;
  },

  /**
   * Initiates OAuth sign-in.
   */
  signInWithOAuth: async (options: any) => {
    const { data, error } = await supabase.auth.signInWithOAuth(options);
    if (error) throw error;
    return data;
  },

  /**
   * Signs in using a Google ID token from Native Google Sign-In.
   */
  signInWithGoogleIdToken: async (idToken: string) => {
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });
    if (error) throw error;
    return data;
  },

  /**
   * Cleans up all auth-related storage and signs out from Supabase.
   */
  signOut: async (): Promise<void> => {
    try {
      await clearAuthAccessToken();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error during sign out:', error);
      throw error;
    }
  },

  /**
   * Persists a new session token.
   */
  persistToken: async (token: string): Promise<void> => {
    await saveAuthAccessToken(token);
  },

  /**
   * Gets the current session.
   */
  getSession: async () => {
    return supabase.auth.getSession();
  },

  /**
   * Updates current session.
   */
  setSession: async (access_token: string, refresh_token: string) => {
    const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) throw error;
    return data;
  }
};
