-- ── Food items ────────────────────────────────────────────────────────────────
-- Dedicated cache for nutrition-log "food search" items, split out of the
-- `recipes` table (which previously held them under saved_category='food_search').
-- These rows are global cache only (no user_id): macros + serving size + image.
-- Real recipes (steps/ingredients) stay in `recipes`.
--
-- Suggestion stubs are rows with NULL calories (title-only); they get backfilled
-- into full items on first results-mode search. image_url stays NULL until the
-- first lazy Pexels fetch (now WebP, ~10-25KB instead of the old ~90KB JPGs).

CREATE TABLE IF NOT EXISTS public.food_items (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  name_lower    TEXT        NOT NULL,
  calories      NUMERIC,
  protein       NUMERIC,
  carbs         NUMERIC,
  fat           NUMERIC,
  serving_size  TEXT,
  serving_grams NUMERIC,
  verified      BOOLEAN     DEFAULT TRUE,
  image_url     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lookup + dedupe key. Global cache, so name alone is unique (no user scoping).
CREATE UNIQUE INDEX IF NOT EXISTS food_items_name_lower_key
  ON public.food_items (name_lower);

-- RLS on, no policies: the app never reads this table directly — all access is
-- server-side via the service-role adminClient, which bypasses RLS. Clients are
-- denied by default.
ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;

-- ── Migrate existing food_search rows out of `recipes` ──────────────────────────
-- Copy nutrition data only. image_url is intentionally dropped (NULL) so the old
-- ~90KB JPGs die and images re-fetch as WebP on first tap. ON CONFLICT guards
-- against duplicate titles collapsing into the unique name_lower index.
INSERT INTO public.food_items
  (name, name_lower, calories, protein, carbs, fat, serving_size, serving_grams, verified)
SELECT
  r.title,
  lower(r.title),
  r.calories,
  r.protein,
  r.carbs,
  r.fat,
  r.nutrition->>'servingSize',
  NULLIF(r.nutrition->>'servingSizeGrams', '')::NUMERIC,
  COALESCE((r.nutrition->>'verified')::BOOLEAN, TRUE)
FROM public.recipes r
WHERE r.saved_category = 'food_search'
  AND r.user_id IS NULL
ON CONFLICT (name_lower) DO NOTHING;

-- Drop the migrated rows from recipes — it is now recipes-only.
DELETE FROM public.recipes
WHERE saved_category = 'food_search'
  AND user_id IS NULL;
