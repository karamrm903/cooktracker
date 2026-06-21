-- Food-search caches per-serving macros with one-decimal precision (e.g. 36.2g).
-- The live recipes table drifted to bigint macro columns, so inserts of decimal
-- macros fail: "invalid input syntax for type bigint: 36.2". Align the column
-- types with the original NUMERIC intent so caching works.
ALTER TABLE public.recipes
  ALTER COLUMN calories TYPE NUMERIC USING calories::NUMERIC,
  ALTER COLUMN protein  TYPE NUMERIC USING protein::NUMERIC,
  ALTER COLUMN carbs    TYPE NUMERIC USING carbs::NUMERIC,
  ALTER COLUMN fat      TYPE NUMERIC USING fat::NUMERIC;

-- Notify PostgREST to reload the schema cache so it sees the new types instantly.
NOTIFY pgrst, 'reload schema';
