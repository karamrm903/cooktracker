import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { OnboardingPayload } from '../../types';

interface AuthState {
  user: any | null;
  session: any | null;
  /** Mirrors AsyncStorage; must match session.access_token to enter MainTabs. */
  persistedAccessToken: string | null;
  hasCompletedOnboarding: boolean;
  isHydrated: boolean;
  onboardingPayload: OnboardingPayload | null;
}

const initialState: AuthState = {
  user: null,
  session: null,
  persistedAccessToken: null,
  hasCompletedOnboarding: false,
  isHydrated: false,
  onboardingPayload: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthSession: (state, action: PayloadAction<{ user: any; session: any } | null>) => {
      if (action.payload) {
        state.user = action.payload.user;
        state.session = action.payload.session;
      } else {
        state.user = null;
        state.session = null;
      }
    },
    setOnboardingStatus: (state, action: PayloadAction<boolean>) => {
      state.hasCompletedOnboarding = action.payload;
    },
    setOnboardingPayload: (state, action: PayloadAction<OnboardingPayload>) => {
      state.onboardingPayload = action.payload;
    },
    setPersistedAccessToken: (state, action: PayloadAction<string | null>) => {
      state.persistedAccessToken = action.payload;
    },
    setHydrated: (state) => {
      state.isHydrated = true;
    },
  },
});

export const {
  setAuthSession,
  setOnboardingStatus,
  setOnboardingPayload,
  setPersistedAccessToken,
  setHydrated,
} = authSlice.actions;

export default authSlice.reducer;
