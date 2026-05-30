import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  setSubscription,
  setSubscriptionLoading,
  setSubscriptionSynced,
  SubscriptionStatus,
  SubscriptionPlan,
} from '../store/slices/subscriptionSlice';
import { RootState } from '../store';
import { profileService } from '../services/profile.service';
import { supabase } from '../lib/supabase';
import Purchases from 'react-native-purchases';
import { RC_ENTITLEMENT_ID } from '../config/revenuecat';

const CACHE_KEY = '@nutrily_sub_cache';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min

function resolveIsSubscribed(status: SubscriptionStatus, expiresAt: string | null): boolean {
  if (status === 'active' || status === 'trial') return true;
  if (status === 'cancelled' && expiresAt && new Date(expiresAt) > new Date()) return true;
  return false;
}

/**
 * Display status. A 'cancelled' sub only keeps access until expiresAt — once
 * that passes (or it's missing) it's effectively 'expired'. Without this the UI
 * would show "Premium (Cancels Soon)" for a lapsed sub while access is denied.
 */
function resolveEffectiveStatus(status: SubscriptionStatus, expiresAt: string | null): SubscriptionStatus {
  if (status === 'cancelled' && !(expiresAt && new Date(expiresAt) > new Date())) {
    return 'expired';
  }
  return status;
}

/**
 * Builds the sync function. Reconciles BOTH sources into a SINGLE dispatch so
 * the UI never flickers through intermediate states:
 *   1. Server profile (DB) — authoritative for usage gating, but lags the
 *      RevenueCat webhook by seconds.
 *   2. RevenueCat SDK — authoritative for the active entitlement + plan type.
 *
 * RC wins when it reports an active entitlement (it reflects a purchase
 * immediately, before the webhook lands). The result is dispatched exactly once.
 */
function useSyncFn() {
  const dispatch = useDispatch();
  const session = useSelector((s: RootState) => s.auth.session);

  return useCallback(async () => {
    if (!session?.access_token) return;

    dispatch(setSubscriptionLoading(true));
    try {
      const profile: any = await profileService.getProfile(session);

      let status: SubscriptionStatus = profile?.subscription_status ?? 'free';
      let expiresAt: string | null = profile?.subscription_expires_at ?? null;
      const trialEndsAt: string | null = profile?.trial_ends_at ?? null;
      let plan: SubscriptionPlan = null;
      const recipeImportCount = profile?.recipe_import_count ?? 0;
      const searchCountToday = profile?.search_count_today ?? 0;

      // RC override — never throws past this block, so a flaky RC call falls
      // back to the profile values rather than discarding the whole sync.
      try {
        const ci = await Purchases.getCustomerInfo();
        const ent = ci.entitlements.active[RC_ENTITLEMENT_ID];
        if (ent) {
          // A cancelled-but-not-yet-expired sub is still an *active* RC
          // entitlement with willRenew=false. Map that to 'cancelled' so it
          // doesn't overwrite the BE 'cancelled' status back to 'active'.
          status = ent.periodType === 'TRIAL'
            ? 'trial'
            : ent.willRenew
            ? 'active'
            : 'cancelled';
          const activeSub = (ci.activeSubscriptions[0] ?? '').toLowerCase();
          plan = activeSub.includes('weekly')
            ? 'weekly'
            : activeSub.includes('monthly')
            ? 'monthly'
            : 'yearly';
          if (ent.expirationDate) expiresAt = ent.expirationDate;
        }
      } catch (rcErr: any) {
        console.warn('[useSubscription] RC sync failed:', rcErr.message);
      }

      const payload = { status, expiresAt, trialEndsAt, plan, recipeImportCount, searchCountToday };
      dispatch(setSubscription(payload));
      dispatch(setSubscriptionSynced(true));
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ ...payload, cachedAt: Date.now() }));
    } catch (err: any) {
      console.warn('[useSubscription] profile sync failed:', err.message);
      // Network failure — restore the last good cached value rather than
      // downgrading the user to 'free'.
      try {
        const raw = await AsyncStorage.getItem(CACHE_KEY);
        if (raw) {
          const cached = JSON.parse(raw);
          if (Date.now() - cached.cachedAt < CACHE_TTL_MS) {
            const { cachedAt: _, ...rest } = cached;
            dispatch(setSubscription(rest));
          }
        }
      } catch {}
    } finally {
      dispatch(setSubscriptionLoading(false));
    }
  }, [session, dispatch]);
}

/**
 * Read-only subscription state. Safe to use in any component — it NEVER triggers
 * a network sync, so mounting many consumers can't thrash the global state.
 * `sync` is exposed for explicit refreshes (e.g. after a restore).
 */
export function useSubscription() {
  const sub = useSelector((s: RootState) => s.subscription);
  const sync = useSyncFn();

  return {
    isSubscribed: resolveIsSubscribed(sub.status, sub.expiresAt),
    isTrial: sub.status === 'trial',
    // Display status — downgrades a lapsed 'cancelled' to 'expired' so labels
    // match access (isSubscribed already accounts for expiry).
    status: resolveEffectiveStatus(sub.status, sub.expiresAt),
    expiresAt: sub.expiresAt,
    trialEndsAt: sub.trialEndsAt,
    plan: sub.plan,
    recipeImportCount: sub.recipeImportCount,
    searchCountToday: sub.searchCountToday,
    isLoading: sub.isLoading,
    // True once a real sync has resolved status (not just cache). Use to gate
    // UI that must not flash before the true subscription status is known.
    hasResolved: sub.synced,
    sync,
  };
}

/**
 * The single syncing source. Mount ONCE near the app root. Hydrates from cache
 * immediately, syncs on mount, and re-syncs whenever the app returns to the
 * foreground. No other component should drive subscription syncing.
 */
export function useSubscriptionSync() {
  const dispatch = useDispatch();
  const session = useSelector((s: RootState) => s.auth.session);
  const userId = session?.user?.id ?? null;
  const accessToken = session?.access_token ?? null;
  const sync = useSyncFn();

  useEffect(() => {
    let mounted = true;

    AsyncStorage.getItem(CACHE_KEY).then((raw) => {
      if (!raw || !mounted) return;
      try {
        const cached = JSON.parse(raw);
        if (Date.now() - cached.cachedAt < CACHE_TTL_MS) {
          const { cachedAt: _, ...rest } = cached;
          dispatch(setSubscription(rest));
        }
      } catch {}
    });

    sync();

    // Re-sync when the app returns to the foreground (backstop + reconnect).
    const appStateListener = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync();
    });

    // Supabase Realtime: push the user's `users` row changes (written by the
    // RevenueCat webhook) to the open app instantly — no polling. The event is
    // just a trigger; sync() does the BE+RC reconcile. SUBSCRIBED fires an
    // initial sync to catch anything changed while disconnected (e.g. killed).
    let channel: ReturnType<typeof supabase.channel> | null = null;
    if (userId && accessToken) {
      // Authorize Realtime with the user's JWT so RLS-filtered changes are
      // delivered for this user's row.
      try { supabase.realtime.setAuth(accessToken); } catch {}

      channel = supabase
        .channel(`user-sub-${userId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${userId}` },
          () => { sync(); },
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') sync();
        });
    }

    return () => {
      mounted = false;
      appStateListener.remove();
      if (channel) supabase.removeChannel(channel);
    };
  }, [sync, dispatch, userId, accessToken]);

  return sync;
}
