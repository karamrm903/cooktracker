-- Remove existing duplicate rows (keep most recent per user+title)
DELETE FROM recipes
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, title) id
  FROM recipes
  ORDER BY user_id, title, created_at DESC
);

-- Add unique constraint so same user can't have two recipes with identical title
ALTER TABLE recipes
  ADD CONSTRAINT recipes_user_title_unique UNIQUE (user_id, title);
