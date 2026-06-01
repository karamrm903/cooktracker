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
   * Signs up a new user. Sends an OTP code via email (no magic link).
   * Configure Supabase email template "Confirm signup" with `{{ .Token }}`.
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
  },

  /**
   * Sends a password reset email containing a 6-digit OTP code (no magic link).
   * Configure Supabase email template "Reset Password" with `{{ .Token }}`.
   */
  resetPasswordForEmail: async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  },

  /**
   * Verifies an OTP code from an email. After success, a session is created.
   * type: 'signup' for account confirmation, 'recovery' for password reset, 'email' for email-change.
   */
  verifyOtp: async (
    email: string,
    token: string,
    type: 'signup' | 'recovery' | 'email',
  ) => {
    const { data, error } = await supabase.auth.verifyOtp({ email, token, type });
    if (error) throw error;
    return data;
  },

  /**
   * Resends a signup confirmation OTP code.
   */
  resendSignupOtp: async (email: string) => {
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) throw error;
  },

  /**
   * Updates the current user's password (requires an active recovery session).
   */
  updatePassword: async (newPassword: string) => {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return data;
  },
};
