-- ── Subscription + Usage Columns ─────────────────────────────────────────────
-- Adds subscription status, expiry dates, and per-user usage counters.
-- subscription_status: free | trial | active | cancelled | expired
-- Cancelled users retain access until subscription_expires_at.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS subscription_status     TEXT NOT NULL DEFAULT 'free'
    CHECK (subscription_status IN ('free','trial','active','cancelled','expired')),
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_ends_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revenuecat_id           TEXT,

  -- Monthly counter: how many recipe-import-via-URL uses this month
  ADD COLUMN IF NOT EXISTS recipe_import_count     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recipe_import_reset_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Daily counter: how many Explore searches today
  ADD COLUMN IF NOT EXISTS search_count_today      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS search_reset_at         DATE NOT NULL DEFAULT CURRENT_DATE;

CREATE INDEX IF NOT EXISTS users_revenuecat_id
  ON public.users (revenuecat_id);

CREATE INDEX IF NOT EXISTS users_subscription_status
  ON public.users (subscription_status);
