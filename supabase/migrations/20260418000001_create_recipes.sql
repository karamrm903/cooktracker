-- ── Recipes ───────────────────────────────────────────────────────────────────
-- Stores saved recipes per user. user_id + RLS added in 20260426000001.
-- Unique constraint (user_id, title) added in 20260427000002.

CREATE TABLE IF NOT EXISTS public.recipes (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT        NOT NULL,
  ingredients   TEXT,
  instructions  TEXT,
  steps         JSONB,
  nutrition     JSONB,
  calories      NUMERIC,
  protein       NUMERIC,
  carbs         NUMERIC,
  fat           NUMERIC,
  emoji         TEXT,
  source_url    TEXT,
  saved_category TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
