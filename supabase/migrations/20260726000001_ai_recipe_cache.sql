-- Cache for AI-generated recipe sets keyed by hashed wizard inputs (budget,
-- vibes, dietary, equipment). Repeat requests skip the Claude call and reuse
-- the same 6 recipe rows already sitting in the shared global pool.

-- recipe_ids stored as text[] so this table stays agnostic to the recipes.id
-- column type (uuid, bigint, etc.) — server casts on read.
CREATE TABLE IF NOT EXISTS public.ai_recipe_cache (
  hash        text PRIMARY KEY,
  recipe_ids  text[] NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_recipe_cache ENABLE ROW LEVEL SECURITY;
-- No client policies — access is server-only via the service-role adminClient.
