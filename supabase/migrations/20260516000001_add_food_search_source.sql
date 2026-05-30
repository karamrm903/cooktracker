ALTER TABLE logged_meals DROP CONSTRAINT IF EXISTS logged_meals_source_check;
ALTER TABLE logged_meals
  ADD CONSTRAINT logged_meals_source_check
  CHECK (source IN ('recipe', 'manual', 'plan', 'food_search'));
