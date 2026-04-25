-- ── Users ─────────────────────────────────────────────────────────────────────
-- Linked to Supabase auth.users; stores nutrition targets set during onboarding.
CREATE TABLE IF NOT EXISTS public.users (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  gender         TEXT,
  age            INTEGER,
  height_cm      NUMERIC,
  weight_kg      NUMERIC,
  goal           TEXT,
  activity_level TEXT,
  calories          INTEGER NOT NULL DEFAULT 0,
  protein           INTEGER NOT NULL DEFAULT 0,
  carbs             INTEGER NOT NULL DEFAULT 0,
  fat               INTEGER NOT NULL DEFAULT 0,
  streak            INTEGER NOT NULL DEFAULT 1,
  last_logged_date  DATE,
  locale            VARCHAR(5)  NOT NULL DEFAULT 'en',
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_self_all" ON public.users;
CREATE POLICY "users_self_all"
  ON public.users FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── Logged Meals ───────────────────────────────────────────────────────────────
-- One row per logged meal. full_recipe_nutrition stores the original full-recipe
-- macros so the app can re-compute portions when gramsEaten changes.
CREATE TABLE IF NOT EXISTS public.logged_meals (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                    TEXT        NOT NULL,
  emoji                   TEXT,
  calories                INTEGER     NOT NULL DEFAULT 0,
  protein                 NUMERIC     NOT NULL DEFAULT 0,
  carbs                   NUMERIC     NOT NULL DEFAULT 0,
  fat                     NUMERIC     NOT NULL DEFAULT 0,
  meal_type               TEXT        NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner','snack')),
  meal                    TEXT,
  time                    TEXT,
  date_key                TEXT        NOT NULL,
  logged_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source                  TEXT        CHECK (source IN ('recipe','manual')),
  recipe_id               TEXT,
  grams_eaten             NUMERIC,
  estimated_recipe_grams  NUMERIC,
  full_recipe_nutrition   JSONB
);

CREATE INDEX IF NOT EXISTS logged_meals_user_date
  ON public.logged_meals (user_id, date_key);

ALTER TABLE public.logged_meals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "meals_self_select" ON public.logged_meals;
CREATE POLICY "meals_self_select"
  ON public.logged_meals FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "meals_self_insert" ON public.logged_meals;
CREATE POLICY "meals_self_insert"
  ON public.logged_meals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "meals_self_update" ON public.logged_meals;
CREATE POLICY "meals_self_update"
  ON public.logged_meals FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "meals_self_delete" ON public.logged_meals;
CREATE POLICY "meals_self_delete"
  ON public.logged_meals FOR DELETE
  USING (auth.uid() = user_id);
