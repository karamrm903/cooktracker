-- Store per-recipe plan metadata (day tag, estimated price) alongside the
-- cached recipe id set. Kept in the cache row (not on the recipes table)
-- because these values are plan-specific: the same recipe can appear on a
-- different day/price under a different budget or vibe combo.

ALTER TABLE public.ai_recipe_cache
  ADD COLUMN IF NOT EXISTS metadata jsonb;
