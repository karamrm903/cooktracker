-- Allow any authenticated user to read globally cached / curated recipes
-- (rows where user_id IS NULL). Per-user rows are still guarded by the
-- existing "recipes_select" policy. Writes for global rows stay server-only.

DROP POLICY IF EXISTS "recipes_select_global" ON public.recipes;
CREATE POLICY "recipes_select_global" ON public.recipes
  FOR SELECT USING (user_id IS NULL);
