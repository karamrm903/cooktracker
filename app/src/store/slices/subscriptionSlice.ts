import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type SubscriptionStatus = 'free' | 'trial' | 'active' | 'cancelled' | 'expired';
export type SubscriptionPlan = 'weekly' | 'monthly' | 'yearly' | null;

interface SubscriptionState {
  status: SubscriptionStatus;
  expiresAt: string | null;
  trialEndsAt: string | null;
  plan: SubscriptionPlan;
  /** Monthly recipe import usage from profile */
  recipeImportCount: number;
  recipeImportResetAt: string | null;
  /** Daily search usage from profile */
  searchCountToday: number;
  isLoading: boolean;
  lastSyncedAt: string | null;
  /** True once a real network sync has resolved status at least once this
   *  session (NOT set by cache hydration). Gates the Premium tab so it never
   *  flashes before the true status is known. */
  synced: boolean;
}

const initialState: SubscriptionState = {
  status: 'free',
  expiresAt: null,
  trialEndsAt: null,
  plan: null,
  recipeImportCount: 0,
  recipeImportResetAt: null,
  searchCountToday: 0,
  isLoading: false,
  lastSyncedAt: null,
  synced: false,
};

const subscriptionSlice = createSlice({
  name: 'subscription',
  initialState,
  reducers: {
    setSubscription: (
      state,
      action: PayloadAction<{
        status: SubscriptionStatus;
        expiresAt?: string | null;
        trialEndsAt?: string | null;
        plan?: SubscriptionPlan;
        recipeImportCount?: number;
        recipeImportResetAt?: string | null;
        searchCountToday?: number;
      }>
    ) => {
      const p = action.payload;
      state.status = p.status;
      state.expiresAt = p.expiresAt ?? null;
      state.trialEndsAt = p.trialEndsAt ?? null;
      state.plan = p.plan ?? null;
      if (p.recipeImportCount !== undefined) state.recipeImportCount = p.recipeImportCount;
      if (p.recipeImportResetAt !== undefined) state.recipeImportResetAt = p.recipeImportResetAt;
      if (p.searchCountToday !== undefined) state.searchCountToday = p.searchCountToday;
      state.lastSyncedAt = new Date().toISOString();
    },
    setSubscriptionLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setSubscriptionSynced: (state, action: PayloadAction<boolean>) => {
      state.synced = action.payload;
    },
    clearSubscription: () => initialState,
  },
});

export const {
  setSubscription,
  setSubscriptionLoading,
  setSubscriptionSynced,
  clearSubscription,
} = subscriptionSlice.actions;

export default subscriptionSlice.reducer;
