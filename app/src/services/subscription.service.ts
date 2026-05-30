import { getBaseUrl, getAuthHeaders } from "./api.config";
import { store } from "../store";
import { setSubscription } from "../store/slices/subscriptionSlice";
import { profileService } from "./profile.service";

function accessGranted(status: string, expiresAt: string | null): boolean {
  if (status === "active" || status === "trial") return true;
  if (status === "cancelled" && expiresAt && new Date(expiresAt) > new Date())
    return true;
  return false;
}

export interface UsageLimitError extends Error {
  isUsageLimit: true;
  feature: string;
  limit: number;
  used: number;
  resetAt: string;
}

export function createUsageLimitError(data: any): UsageLimitError {
  const err = new Error(
    `Free limit reached for ${data.feature}`,
  ) as UsageLimitError;
  err.isUsageLimit = true;
  err.feature = data.feature;
  err.limit = data.limit;
  err.used = data.used;
  err.resetAt = data.resetAt;
  return err;
}

// Client-side premium check — covers the post-purchase window where Redux/RC
// already know the user is premium but the server profile hasn't received the
// webhook update yet (sandbox can take 5-60s).
export function isClientPremium(): boolean {
  const { status, expiresAt } = store.getState().subscription;
  if (status === "active" || status === "trial") return true;
  if (status === "cancelled" && expiresAt && new Date(expiresAt) > new Date())
    return true;
  return false;
}

export const subscriptionService = {
  /**
   * Check + increment the recipe import counter before starting the pipeline.
   * Returns { allowed: true, remaining: N } or throws UsageLimitError.
   * Fails open on network error — never blocks the user due to our server being down.
   */
  checkRecipeImport: async (
    session: any,
  ): Promise<{ allowed: true; remaining: number }> => {
    // Bypass server check when client already knows user is premium.
    // Avoids the webhook-lag race where server still says 'free' for seconds
    // after a successful purchase.
    if (isClientPremium()) {
      return { allowed: true, remaining: Infinity };
    }

    try {
      const headers = await getAuthHeaders(session);
      const res = await fetch(`${getBaseUrl()}/api/recipe-import/begin`, {
        method: "POST",
        headers,
      });

      const data = await res.json();

      if (res.status === 403 && data.reason === "limit_reached") {
        throw createUsageLimitError(data);
      }

      if (!res.ok) {
        // Fail open on unexpected server errors
        console.warn(
          "[subscriptionService] checkRecipeImport non-OK:",
          res.status,
        );
        return { allowed: true, remaining: 0 };
      }

      return { allowed: true, remaining: data.remaining ?? 0 };
    } catch (err: any) {
      if (err.isUsageLimit) throw err;
      // Network error or unexpected — fail open
      console.warn(
        "[subscriptionService] checkRecipeImport failed open:",
        err.message,
      );
      return { allowed: true, remaining: 0 };
    }
  },

  /**
   * Poll the backend profile after a purchase until the RevenueCat webhook
   * lands and the server-side subscription_status grants access. The purchase
   * sheet already dispatched the RC status to Redux; this confirms the BE state
   * (which the usage gates rely on) and keeps Redux in sync as it flips.
   *
   * Stops early once access is granted; otherwise gives up after `attempts`.
   * Preserves the locally-known plan (BE profile doesn't return plan type).
   * Returns the final granting status, or null if it never landed.
   */
  pollSubscriptionStatus: async (
    session: any,
    {
      attempts = 3,
      intervalMs = 3000,
    }: { attempts?: number; intervalMs?: number } = {},
  ): Promise<string | null> => {
    if (!session?.access_token) return null;

    for (let i = 0; i < attempts; i++) {
      try {
        const profile: any = await profileService.getProfile(session);
        const status = profile?.subscription_status ?? "free";
        const expiresAt = profile?.subscription_expires_at ?? null;

        // Only commit once the BE actually grants access. Dispatching a
        // not-yet-granting 'free' here would downgrade the optimistic 'active'
        // already set by the purchase flow, causing the UI to flicker back.
        if (accessGranted(status, expiresAt)) {
          store.dispatch(
            setSubscription({
              status,
              expiresAt,
              trialEndsAt: profile?.trial_ends_at ?? null,
              plan: store.getState().subscription.plan,
              recipeImportCount: profile?.recipe_import_count ?? 0,
              searchCountToday: profile?.search_count_today ?? 0,
            }),
          );
          return status;
        }
      } catch (err: any) {
        console.warn("[subscriptionService] poll attempt failed:", err.message);
      }
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, intervalMs));
    }
    return null;
  },

  /**
   * Restore RevenueCat purchases and sync to Redux.
   * TODO: Uncomment when react-native-purchases is installed.
   */
  restorePurchases: async (): Promise<any> => {
    const Purchases = (await import("react-native-purchases")).default;
    const customerInfo = await Purchases.restorePurchases();
    return customerInfo;
  },

  /**
   * Delete user account: removes all data and signs out.
   */
  deleteAccount: async (session: any): Promise<void> => {
    const headers = await getAuthHeaders(session);
    const res = await fetch(`${getBaseUrl()}/api/account`, {
      method: "DELETE",
      headers,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? `Account deletion failed: ${res.status}`);
    }
  },
};

export function isUsageLimitError(err: any): err is UsageLimitError {
  return err?.isUsageLimit === true;
}
