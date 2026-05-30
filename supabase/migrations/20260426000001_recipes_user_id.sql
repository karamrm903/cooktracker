-- Add user_id to recipes table and enable RLS
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recipes_select" ON public.recipes;
CREATE POLICY "recipes_select" ON public.recipes
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "recipes_insert" ON public.recipes;
CREATE POLICY "recipes_insert" ON public.recipes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "recipes_update" ON public.recipes;
CREATE POLICY "recipes_update" ON public.recipes
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "recipes_delete" ON public.recipes;
CREATE POLICY "recipes_delete" ON public.recipes
  FOR DELETE USING (auth.uid() = user_id);
