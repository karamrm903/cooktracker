-- Add saved_category TEXT column if it is missing in the database table
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS saved_category TEXT;

-- Notify PostgREST to reload the schema cache so it sees the new column instantly
NOTIFY pgrst, 'reload schema';
