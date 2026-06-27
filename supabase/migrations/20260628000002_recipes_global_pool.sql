-- Make `recipes` a single shared global pool. Every authenticated user should
-- see every recipe (Explore deck + library), so real recipe rows are reassigned
-- to user_id = NULL — already readable by anyone via the recipes_select_global
-- policy. Cache rows (ai_cache / food_search) are left untouched so they never
-- leak into Explore.

-- 1. Globalize ownership of real recipe rows.
UPDATE public.recipes
SET user_id = NULL
WHERE user_id IS NOT NULL
  AND (saved_category IS NULL
       OR saved_category NOT IN ('ai_cache', 'food_search'));

-- 2. Dedupe global recipes that now collide on title (keep the newest), so the
--    same recipe saved by different users doesn't appear multiple times.
DELETE FROM public.recipes
WHERE user_id IS NULL
  AND (saved_category IS NULL OR saved_category NOT IN ('ai_cache', 'food_search'))
  AND id NOT IN (
    SELECT DISTINCT ON (title) id
    FROM public.recipes
    WHERE user_id IS NULL
      AND (saved_category IS NULL OR saved_category NOT IN ('ai_cache', 'food_search'))
    ORDER BY title, created_at DESC
  );
